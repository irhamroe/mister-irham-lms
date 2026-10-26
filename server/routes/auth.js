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

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
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

// GET /api/auth/demo-users (For quick testing/demo role switcher)
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, name, role, nis_nip, kelas, gender, no_absen, email, avatar
      FROM users
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'guru' THEN 2 
          WHEN 'siswa' THEN 3 
        END, id ASC
    `).all();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/switch-account (Quick login as any user for testing)
router.post('/switch-account', (req, res) => {
  try {
    const { userId } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/classes-subjects
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
