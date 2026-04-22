const { Router } = require('express');
const store = require('../store');
const config = require('../config');

const router = Router();

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Mock auth — accept any credentials
  const user = { id: 'user-1', name: 'Demo User', email: email || 'demo@buildmyhome.ai', avatar: 'D', role: 'architect' };
  const token = 'bmh-token-' + Date.now();
  store.sessions.set(token, user.id);
  res.json({ user, token });
});

// POST /auth/register
router.post('/register', (req, res) => {
  const { name, email } = req.body;
  const user = { id: 'user-' + Date.now(), name: name || 'New User', email, avatar: (name || 'N')[0].toUpperCase(), role: 'architect' };
  store.users.set(user.id, user);
  const token = 'bmh-token-' + Date.now();
  store.sessions.set(token, user.id);
  res.json({ user, token });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) store.sessions.delete(token);
  res.json({ success: true });
});

// GET /auth/profile
router.get('/profile', (req, res) => {
  res.json({ id: 'user-1', name: 'Demo User', email: 'demo@buildmyhome.ai', avatar: 'D', role: 'architect' });
});

// PUT /auth/profile
router.put('/profile', (req, res) => {
  const updates = req.body;
  const user = { id: 'user-1', name: 'Demo User', email: 'demo@buildmyhome.ai', avatar: 'D', role: 'architect', ...updates };
  res.json(user);
});

module.exports = router;
