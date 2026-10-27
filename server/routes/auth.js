const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan kata sandi wajib diisi' });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? OR (nis_nip IS NOT NULL AND nis_nip != '' AND nis_nip = ?)").get(username, username);
    if (!user) {
      return res.status(400).json({ error: 'Username atau kata sandi salah' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Username atau kata sandi salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/meta
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const classes = db.prepare('SELECT * FROM classes ORDER BY name ASC').all();
    const subjects = db.prepare(`
      SELECT s.*, u.name as teacher_name 
      FROM subjects s 
      LEFT JOIN users u ON s.teacher_id = u.id 
      ORDER BY s.name ASC
    `).all();
    res.json({ classes, subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
