const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'lms_secret_key_super_secure_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token kadaluarsa atau tidak valid' });
    }
    
    // Fetch fresh user data from DB
    const freshUser = db.prepare('SELECT id, username, name, role, nis_nip, kelas, email, avatar FROM users WHERE id = ?').get(user.id);
    if (!freshUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
    req.user = freshUser;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk fitur ini' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
