const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-production-key-change-later';

function generateToken(user) {
  return jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(403).json({ error: 'Invalid token.' });
  }
}

module.exports = { generateToken, verifyToken };