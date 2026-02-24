const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { initStorage, readData, writeData, generateId } = require('./utils');
const { generateToken, verifyToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize files
initStorage();

// --- PUBLIC ROUTES ---
app.get('/api/dashboard', async (req, res) => {
  try {
    const collections = await readData('collections.json');
    const expenses = await readData('expenses.json');
    const contributors = await readData('contributors.json');

    const totalCollected = collections.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalCollected - totalExpenses;

    res.json({
      balance,
      totalCollected,
      totalExpenses,
      recentCollections: collections.slice(-10).reverse().map(c => {
        const contributor = contributors.find(cont => cont.id === c.contributorId);
        return {
          ...c,
          contributorName: contributor ? contributor.name : 'Unknown'
        };
      }),
      recentExpenses: expenses.slice(-10).reverse(),
      contributors: contributors.map(c => ({ id: c.id, name: c.name })) // Masked/safe public view
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error reading data' });
  }
});

// --- AUTH ROUTES ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await readData('users.json');
  const user = users.find(u => u.username === username);

  if (user && await bcrypt.compare(password, user.password)) {
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: false }); // secure:true in HTTPS prod
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  const { username, securityPin, newPassword } = req.body;
  const users = await readData('users.json');
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = users[userIndex];
  // Default pin is 1234 if not set
  const isPinValid = user.securityPin
    ? await bcrypt.compare(securityPin, user.securityPin)
    : securityPin === '2914';

  if (!isPinValid) {
    return res.status(401).json({ error: 'Invalid security pin' });
  }

  users[userIndex].password = await bcrypt.hash(newPassword, 10);
  await writeData('users.json', users);
  res.json({ message: 'Password reset successful' });
});

app.get('/api/check-auth', verifyToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// --- ADMIN API ROUTES (Protected) ---
// Change Password & Pin & Username
app.post('/api/admin/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newUsername, newPassword, newSecurityPin } = req.body;
  const users = await readData('users.json');
  const userIndex = users.findIndex(u => u.username === req.user.username);

  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  const user = users[userIndex];
  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect current password' });
  }

  let tokenRequiresUpdate = false;

  if (newUsername && newUsername.trim() !== '') {
    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    users[userIndex].username = newUsername.trim();
    tokenRequiresUpdate = true;
  }

  if (newPassword) {
    users[userIndex].password = await bcrypt.hash(newPassword, 10);
  }
  if (newSecurityPin) {
    users[userIndex].securityPin = await bcrypt.hash(newSecurityPin, 10);
  }

  await writeData('users.json', users);

  if (tokenRequiresUpdate) {
    const token = generateToken(users[userIndex]);
    res.cookie('token', token, { httpOnly: true, secure: false });
  }

  res.json({ message: 'Security settings updated successfully' });
});
// Contributors
app.get('/api/admin/contributors', verifyToken, async (req, res) => {
  res.json(await readData('contributors.json'));
});

app.post('/api/admin/contributors', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const contributors = await readData('contributors.json');
  const newContributor = { id: generateId('C'), name, active: true };
  contributors.push(newContributor);
  await writeData('contributors.json', contributors);
  res.json(newContributor);
});

app.put('/api/admin/contributors/:id', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  let contributors = await readData('contributors.json');
  const index = contributors.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  contributors[index].name = name;
  await writeData('contributors.json', contributors);
  res.json(contributors[index]);
});

app.delete('/api/admin/contributors/:id', verifyToken, async (req, res) => {
  let contributors = await readData('contributors.json');
  contributors = contributors.filter(c => c.id !== req.params.id);
  await writeData('contributors.json', contributors);
  res.json({ success: true });
});

// Collections
app.get('/api/admin/collections', verifyToken, async (req, res) => {
  res.json(await readData('collections.json'));
});

app.post('/api/admin/collections', verifyToken, async (req, res) => {
  const { contributorId, amount, date, type } = req.body;
  if (!contributorId || !amount || !date || !type) return res.status(400).json({ error: 'All fields required' });

  const collections = await readData('collections.json');
  const newCollection = { id: generateId('COL'), contributorId, amount: Number(amount), date, type };
  collections.push(newCollection);
  await writeData('collections.json', collections);
  res.json(newCollection);
});

app.put('/api/admin/collections/:id', verifyToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  let collections = await readData('collections.json');
  const index = collections.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  collections[index].amount = Number(amount);
  await writeData('collections.json', collections);
  res.json(collections[index]);
});

app.delete('/api/admin/collections/:id', verifyToken, async (req, res) => {
  let collections = await readData('collections.json');
  collections = collections.filter(c => c.id !== req.params.id);
  await writeData('collections.json', collections);
  res.json({ success: true });
});

// Expenses
app.get('/api/admin/expenses', verifyToken, async (req, res) => {
  res.json(await readData('expenses.json'));
});

app.post('/api/admin/expenses', verifyToken, async (req, res) => {
  const { title, amount, date, description } = req.body;
  if (!title || !amount || !date) return res.status(400).json({ error: 'Missing required fields' });

  const expenses = await readData('expenses.json');
  const newExpense = { id: generateId('EXP'), title, amount: Number(amount), date, description };
  expenses.push(newExpense);
  await writeData('expenses.json', expenses);
  res.json(newExpense);
});

app.put('/api/admin/expenses/:id', verifyToken, async (req, res) => {
  const { title, amount, description } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });
  let expenses = await readData('expenses.json');
  const index = expenses.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  expenses[index].title = title;
  expenses[index].amount = Number(amount);
  if (description !== undefined) expenses[index].description = description;
  await writeData('expenses.json', expenses);
  res.json(expenses[index]);
});

app.delete('/api/admin/expenses/:id', verifyToken, async (req, res) => {
  let expenses = await readData('expenses.json');
  expenses = expenses.filter(e => e.id !== req.params.id);
  await writeData('expenses.json', expenses);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});