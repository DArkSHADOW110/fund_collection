// Auth Check
async function checkAuth() {
  const res = await fetch('/api/check-auth');
  if (!res.ok) window.location.href = 'login.html';
}

// Global Data
let contributors = [];

// Fetch and Render
async function loadAdminData() {
  await Promise.all([
    fetchDashboardStats(),
    fetchContributors(),
    fetchCollections(),
    fetchExpenses()
  ]);
}

async function fetchDashboardStats() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();
  document.getElementById('admin-balance').textContent = `Rs. ${data.balance.toLocaleString()}`;
}

async function fetchContributors() {
  const res = await fetch('/api/admin/contributors');
  contributors = await res.json();

  // Update Select Dropdown
  const select = document.getElementById('col-contributor');
  select.innerHTML = contributors.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join('');

  // Update Table
  const tbody = document.querySelector('#admin-contributors-table tbody');
  tbody.innerHTML = contributors.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>
        <button class="btn-secondary" style="margin-right: 0.5rem; padding: 0.25rem 0.5rem;" onclick="openEditModal('contributors', '${c.id}', '${c.name.replace(/'/g, "\\'")}')">Edit</button>
        <button class="btn-danger" onclick="deleteRecord('contributors', '${c.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function fetchCollections() {
  const res = await fetch('/api/admin/collections');
  const data = await res.json();
  const tbody = document.querySelector('#admin-collections-table tbody');
  tbody.innerHTML = data.reverse().map(c => `
    <tr>
      <td>${c.id || 'N/A'}</td>
      <td>${c.date}</td>
      <td>${c.contributorId}</td>
      <td>${c.type}</td>
      <td>Rs. ${Number(c.amount).toLocaleString()}</td>
      <td>
        <button class="btn-secondary" style="margin-right: 0.5rem; padding: 0.25rem 0.5rem;" onclick="openEditModal('collections', '${c.id}', ${c.amount})">Edit</button>
        <button class="btn-danger" onclick="deleteRecord('collections', '${c.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function fetchExpenses() {
  const res = await fetch('/api/admin/expenses');
  const data = await res.json();
  const tbody = document.querySelector('#admin-expenses-table tbody');
  tbody.innerHTML = data.reverse().map(e => `
    <tr>
      <td>${e.id || 'N/A'}</td>
      <td>${e.date}</td>
      <td>${e.title}</td>
      <td>Rs. ${Number(e.amount).toLocaleString()}</td>
      <td>
        <button class="btn-secondary" style="margin-right: 0.5rem; padding: 0.25rem 0.5rem;" onclick="openEditModal('expenses', '${e.id}', '${e.title.replace(/'/g, "\\'")}', ${e.amount}, '${(e.description || '').replace(/'/g, "\\'")}')">Edit</button>
        <button class="btn-danger" onclick="deleteRecord('expenses', '${e.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Forms Submission
document.getElementById('contributor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('contributor-name').value;
  await fetch('/api/admin/contributors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  document.getElementById('contributor-name').value = '';
  loadAdminData();
});

document.getElementById('collection-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    contributorId: document.getElementById('col-contributor').value,
    type: document.getElementById('col-type').value,
    amount: document.getElementById('col-amount').value,
    date: document.getElementById('col-date').value
  };
  await fetch('/api/admin/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  document.getElementById('collection-form').reset();
  loadAdminData();
});

document.getElementById('expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('exp-title').value,
    amount: document.getElementById('exp-amount').value,
    date: document.getElementById('exp-date').value,
    description: document.getElementById('exp-desc').value
  };
  await fetch('/api/admin/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  document.getElementById('expense-form').reset();
  loadAdminData();
});

// Delete Record Generic Function
window.deleteRecord = async (type, id) => {
  if (!id || id === 'undefined') return alert("Cannot delete legacy records without ID.");
  if (confirm('Are you sure you want to delete this record?')) {
    await fetch(`/api/admin/${type}/${id}`, { method: 'DELETE' });
    loadAdminData();
  }
};

// Edit Modal Logic
let currentEditType = '';
let currentEditId = '';

window.openEditModal = (type, id, ...args) => {
  if (!id || id === 'undefined') return alert("Cannot edit legacy records without ID.");
  currentEditType = type;
  currentEditId = id;
  const modal = document.getElementById('edit-modal');
  const titleStr = document.getElementById('edit-modal-title');
  const body = document.getElementById('edit-modal-body');

  if (type === 'contributors') {
    titleStr.textContent = 'Edit Contributor Name';
    body.innerHTML = `
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="edit-name" value="${args[0]}" required>
      </div>
    `;
  } else if (type === 'collections') {
    titleStr.textContent = 'Edit Collection Amount';
    body.innerHTML = `
      <div class="form-group">
        <label>Amount (Rs)</label>
        <input type="number" id="edit-amount" value="${args[0]}" required>
      </div>
    `;
  } else if (type === 'expenses') {
    titleStr.textContent = 'Edit Expense';
    body.innerHTML = `
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="edit-title" value="${args[0]}" required>
      </div>
      <div class="form-group">
        <label>Amount (Rs)</label>
        <input type="number" id="edit-amount" value="${args[1]}" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="edit-desc" value="${args[2]}">
      </div>
    `;
  }

  modal.classList.remove('hidden');
};

window.closeEditModal = () => {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditType = '';
  currentEditId = '';
};

document.getElementById('edit-modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  let payload = {};

  if (currentEditType === 'contributors') {
    payload = { name: document.getElementById('edit-name').value };
  } else if (currentEditType === 'collections') {
    payload = { amount: document.getElementById('edit-amount').value };
  } else if (currentEditType === 'expenses') {
    payload = {
      title: document.getElementById('edit-title').value,
      amount: document.getElementById('edit-amount').value,
      description: document.getElementById('edit-desc').value
    };
  }

  try {
    const res = await fetch(`/api/admin/${currentEditType}/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeEditModal();
      loadAdminData();
    } else {
      alert('Failed to update record.');
    }
  } catch (err) {
    alert('Network error.');
  }
});

// Security Settings
document.getElementById('security-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('sec-current').value;
  const newUsername = document.getElementById('sec-username').value;
  const newPassword = document.getElementById('sec-new').value;
  const newSecurityPin = document.getElementById('sec-pin').value;
  const secMsg = document.getElementById('sec-msg');

  if (!newUsername && !newPassword && !newSecurityPin) {
    secMsg.textContent = 'Please provide a new username, password or pin to update.';
    secMsg.style.color = 'var(--danger)';
    secMsg.style.backgroundColor = 'var(--danger-bg)';
    secMsg.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newUsername, newPassword, newSecurityPin })
    });

    const data = await res.json();
    if (res.ok) {
      secMsg.textContent = 'Security settings updated successfully!';
      secMsg.style.color = 'var(--success)';
      secMsg.style.backgroundColor = 'var(--success-bg)';
      secMsg.classList.remove('hidden');
      document.getElementById('security-form').reset();

      setTimeout(() => {
        secMsg.classList.add('hidden');
        secMsg.style.color = '';
        secMsg.style.backgroundColor = '';
      }, 3000);
    } else {
      secMsg.textContent = data.error || 'Failed to update';
      secMsg.style.color = 'var(--danger)';
      secMsg.style.backgroundColor = 'var(--danger-bg)';
      secMsg.classList.remove('hidden');
    }
  } catch (error) {
    secMsg.textContent = 'Network error';
    secMsg.style.color = 'var(--danger)';
    secMsg.style.backgroundColor = 'var(--danger-bg)';
    secMsg.classList.remove('hidden');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

// Init
checkAuth().then(() => {
  document.getElementById('col-date').valueAsDate = new Date();
  document.getElementById('exp-date').valueAsDate = new Date();
  loadAdminData();
});