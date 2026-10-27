const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateInitialsAvatarDataUrl } = require('../utils/avatar');
const { sortClassesNatural } = require('../utils/sortHelper');

// Apply auth middleware: Admin and Guru have access, certain delete/admin functions for admin only
router.use(authenticateToken);

// ==========================================
// 1. STATS SUMMARY
// ==========================================
router.get('/stats', (req, res) => {
  try {
    const totalClasses = db.prepare('SELECT COUNT(*) as count FROM classes').get().count;
    const totalSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'siswa'").get().count;
    const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'guru'").get().count;
    const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;

    res.json({
      totalClasses,
      totalSubjects,
      totalStudents,
      totalTeachers,
      totalAdmins
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. MANAJEMEN KELAS
// ==========================================
// GET /api/management/classes
router.get('/classes', (req, res) => {
  try {
    const rawClasses = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM users WHERE role = 'siswa' AND kelas = c.name) as student_count,
        (SELECT COUNT(*) FROM subjects WHERE id IN (SELECT subject_id FROM attendance_sessions WHERE class_id = c.id)) as subject_count
      FROM classes c
    `).all();

    const classes = sortClassesNatural(rawClasses);
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/management/classes
router.post('/classes', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, level, academic_year } = req.body;
    if (!name || !level) {
      return res.status(400).json({ error: 'Nama kelas dan tingkatan wajib diisi' });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM classes WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: `Kelas dengan nama '${name}' sudah terdaftar` });
    }

    const insert = db.prepare('INSERT INTO classes (name, level, academic_year) VALUES (?, ?, ?)');
    const result = insert.run(name.trim(), level.trim(), academic_year || '2026/2027');

    const newClass = db.prepare(`
      SELECT c.*, 0 as student_count FROM classes c WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/management/classes/:id
router.put('/classes/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, level, academic_year } = req.body;
    const target = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    // If name changed, check uniqueness & update student kelas references
    if (name && name.trim() !== target.name) {
      const existing = db.prepare('SELECT id FROM classes WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
      if (existing) {
        return res.status(400).json({ error: `Kelas dengan nama '${name}' sudah ada` });
      }

      // Update student table where kelas matches
      db.prepare("UPDATE users SET kelas = ? WHERE role = 'siswa' AND kelas = ?").run(name.trim(), target.name);
    }

    db.prepare(`
      UPDATE classes SET
        name = ?,
        level = ?,
        academic_year = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : target.name,
      level ? level.trim() : target.level,
      academic_year ? academic_year.trim() : target.academic_year,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM users WHERE role = 'siswa' AND kelas = c.name) as student_count
      FROM classes c
      WHERE c.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/management/classes/:id
router.delete('/classes/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const target = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    // Check if students exist in class
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'siswa' AND kelas = ?").get(target.name).count;
    if (studentCount > 0) {
      return res.status(400).json({
        error: `Tidak dapat menghapus kelas '${target.name}' karena masih memiliki ${studentCount} siswa terdaftar. Pindahkan siswa terlebih dahulu.`
      });
    }

    db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Kelas ${target.name} berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. MANAJEMEN SISWA
// ==========================================
// GET /api/management/students
router.get('/students', (req, res) => {
  try {
    const { kelas, gender, search } = req.query;
    let query = `
      SELECT id, username, name, role, nis_nip as nis, kelas, gender, no_absen, email, phone, avatar, created_at
      FROM users
      WHERE role = 'siswa'
    `;
    const params = [];

    if (kelas && kelas !== 'undefined') {
      const normalizedClass = kelas.replace(/\s+/g, '');
      query += ' AND (kelas = ? OR REPLACE(kelas, " ", "") = ?)';
      params.push(kelas.trim(), normalizedClass);
    }

    if (gender && gender !== 'undefined') {
      query += ' AND gender = ?';
      params.push(gender);
    }

    if (search && search.trim() && search.trim() !== 'undefined') {
      query += ' AND (name LIKE ? OR username LIKE ? OR nis_nip LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY kelas ASC, CASE WHEN no_absen IS NOT NULL AND no_absen > 0 THEN CAST(no_absen AS INTEGER) ELSE 9999 END ASC, name ASC';
    const students = db.prepare(query).all(...params);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/management/students
router.post('/students', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, username, nis, kelas, gender, no_absen, email, phone, password } = req.body;
    if (!name || !username || !nis || !kelas) {
      return res.status(400).json({ error: 'Nama, username, NIS, dan kelas wajib diisi' });
    }

    // Check unique username
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' sudah digunakan` });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'password123', salt);
    const avatar = generateInitialsAvatarDataUrl(name.trim());
    const normalizedGender = (gender === 'P' || gender === 'Perempuan' || gender === 'female') ? 'P' : 'L';

    const insert = db.prepare(`
      INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, no_absen, email, phone, avatar)
      VALUES (?, ?, ?, 'siswa', ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      username.trim().toLowerCase(),
      passwordHash,
      name.trim(),
      nis.trim(),
      kelas.trim(),
      normalizedGender,
      no_absen ? parseInt(no_absen, 10) : null,
      email ? email.trim() : `${username.trim()}@siswa.sekolah.sch.id`,
      phone ? phone.trim() : '',
      avatar
    );

    const newStudent = db.prepare(`
      SELECT id, username, name, role, nis_nip as nis, kelas, gender, no_absen, email, phone, avatar, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/management/students/batch-import - Import students from Excel
router.post('/students/batch-import', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Data siswa untuk diimpor tidak boleh kosong' });
    }

    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);

    const checkExisting = db.prepare('SELECT id, username FROM users WHERE username = ?');
    const insert = db.prepare(`
      INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, no_absen, email, phone, avatar)
      VALUES (?, ?, ?, 'siswa', ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    let skippedCount = 0;

    const runBatch = db.transaction((list) => {
      for (const st of list) {
        if (!st.name || !st.nis || !st.kelas) {
          skippedCount++;
          continue;
        }

        let username = (st.username || `siswa_${st.nis}`).trim().toLowerCase();
        let candidate = username;
        let counter = 1;
        while (checkExisting.get(candidate)) {
          candidate = `${username}_${counter}`;
          counter++;
        }
        username = candidate;

        const email = st.email ? st.email.trim() : `${username}@siswa.sekolah.sch.id`;
        const phone = st.phone ? st.phone.trim() : '';
        const passwordHash = st.password ? bcrypt.hashSync(st.password, salt) : defaultPasswordHash;
        const avatar = generateInitialsAvatarDataUrl(st.name.trim());

        const rawGender = st.gender || st['Jenis Kelamin'] || st['Gender'] || st['L/P'] || '';
        const genderUpper = String(rawGender).trim().toUpperCase();
        const gender = (genderUpper === 'P' || genderUpper.startsWith('PEREMPUAN') || genderUpper === 'FEMALE' || genderUpper === 'WANITA' || genderUpper === 'F') ? 'P' : 'L';
        const noAbsen = st.no_absen ? parseInt(st.no_absen, 10) : null;

        insert.run(
          username,
          passwordHash,
          st.name.trim(),
          String(st.nis).trim(),
          String(st.kelas).trim(),
          gender,
          noAbsen,
          email,
          phone,
          avatar
        );
        importedCount++;
      }
    });

    runBatch(students);

    res.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Berhasil mengimpor ${importedCount} data siswa! (${skippedCount} baris dilewati/tidak lengkap)`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/management/students/:id
router.put('/students/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, username, nis, kelas, gender, no_absen, email, phone, password } = req.body;
    const target = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'siswa'").get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });

    if (username && username.trim().toLowerCase() !== target.username) {
      const exist = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim().toLowerCase(), req.params.id);
      if (exist) return res.status(400).json({ error: `Username '${username}' sudah digunakan` });
    }

    let passwordHash = target.password_hash;
    if (password && password.trim().length > 0) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    let normalizedGender = target.gender || 'L';
    if (gender) {
      normalizedGender = (gender === 'P' || gender === 'Perempuan' || gender === 'female') ? 'P' : 'L';
    }

    db.prepare(`
      UPDATE users SET
        username = ?,
        password_hash = ?,
        name = ?,
        nis_nip = ?,
        kelas = ?,
        gender = ?,
        no_absen = ?,
        email = ?,
        phone = ?
      WHERE id = ?
    `).run(
      username ? username.trim().toLowerCase() : target.username,
      passwordHash,
      name ? name.trim() : target.name,
      nis ? nis.trim() : target.nis_nip,
      kelas ? kelas.trim() : target.kelas,
      normalizedGender,
      no_absen !== undefined ? (no_absen ? parseInt(no_absen, 10) : null) : target.no_absen,
      email !== undefined ? email.trim() : target.email,
      phone !== undefined ? phone.trim() : target.phone,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT id, username, name, role, nis_nip as nis, kelas, gender, no_absen, email, phone, avatar, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/management/students/:id
router.delete('/students/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const target = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'siswa'").get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Siswa '${target.name}' berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. MANAJEMEN USER / PENGGUNA (Admin, Guru, Staf)
// ==========================================
// GET /api/management/users
router.get('/users', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { role, search } = req.query;
    let query = `
      SELECT id, username, name, role, nis_nip as nip, kelas, email, phone, avatar, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'undefined') {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search && search.trim() && search.trim() !== 'undefined') {
      query += ' AND (name LIKE ? OR username LIKE ? OR email LIKE ? OR nis_nip LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += `
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'guru' THEN 2 
          WHEN 'siswa' THEN 3 
        END, id ASC
    `;

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/management/users
router.post('/users', requireRole(['admin']), (req, res) => {
  try {
    const { name, username, role, nis_nip, email, phone, password, kelas } = req.body;
    if (!name || !username || !role) {
      return res.status(400).json({ error: 'Nama, username, dan peran (role) wajib diisi' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' sudah digunakan` });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'password123', salt);
    const avatar = generateInitialsAvatarDataUrl(name.trim());

    const insert = db.prepare(`
      INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, email, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      username.trim().toLowerCase(),
      passwordHash,
      name.trim(),
      role,
      nis_nip ? nis_nip.trim() : '',
      kelas || null,
      email ? email.trim() : `${username.trim()}@sekolah.sch.id`,
      phone ? phone.trim() : '',
      avatar
    );

    const newUser = db.prepare(`
      SELECT id, username, name, role, nis_nip as nip, kelas, email, phone, avatar, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/management/users/:id
router.put('/users/:id', requireRole(['admin']), (req, res) => {
  try {
    const { name, username, role, nis_nip, email, phone, password, kelas } = req.body;
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    if (username && username.trim().toLowerCase() !== target.username) {
      const exist = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim().toLowerCase(), req.params.id);
      if (exist) return res.status(400).json({ error: `Username '${username}' sudah digunakan` });
    }

    let passwordHash = target.password_hash;
    if (password && password.trim().length > 0) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    const newName = name ? name.trim() : target.name;
    const newAvatar = (name && name.trim() !== target.name) ? generateInitialsAvatarDataUrl(newName) : target.avatar;

    db.prepare(`
      UPDATE users SET
        username = ?,
        password_hash = ?,
        name = ?,
        role = ?,
        nis_nip = ?,
        kelas = ?,
        email = ?,
        phone = ?,
        avatar = ?
      WHERE id = ?
    `).run(
      username ? username.trim().toLowerCase() : target.username,
      passwordHash,
      newName,
      role || target.role,
      nis_nip !== undefined ? nis_nip.trim() : target.nis_nip,
      kelas !== undefined ? kelas : target.kelas,
      email !== undefined ? email.trim() : target.email,
      phone !== undefined ? phone.trim() : target.phone,
      newAvatar,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT id, username, name, role, nis_nip as nip, kelas, email, phone, avatar, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/management/users/:id
router.delete('/users/:id', requireRole(['admin']), (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif' });
    }

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Pengguna '${target.name}' berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. MANAJEMEN MATA PELAJARAN (MAPEL)
// ==========================================
// GET /api/management/subjects
router.get('/subjects', (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        s.*,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM question_bank WHERE subject_id = s.id) as question_count,
        (SELECT COUNT(*) FROM cbt_exams WHERE subject_id = s.id) as exam_count
      FROM subjects s
      LEFT JOIN users u ON s.teacher_id = u.id
    `;
    const params = [];
    if (search && search.trim() && search.trim() !== 'undefined') {
      query += ` WHERE s.name LIKE ? OR s.code LIKE ? `;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    query += ` ORDER BY s.name ASC `;
    const subjects = db.prepare(query).all(...params);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/management/subjects
router.post('/subjects', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, code, teacher_id } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Nama mata pelajaran dan kode mapel wajib diisi' });
    }

    const existing = db.prepare('SELECT id FROM subjects WHERE code = ?').get(code.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ error: `Mata pelajaran dengan kode '${code}' sudah terdaftar` });
    }

    const insert = db.prepare('INSERT INTO subjects (name, code, teacher_id) VALUES (?, ?, ?)');
    const result = insert.run(name.trim(), code.trim().toUpperCase(), teacher_id ? Number(teacher_id) : null);

    const newSubject = db.prepare(`
      SELECT s.*, u.name as teacher_name, 0 as question_count, 0 as exam_count
      FROM subjects s
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newSubject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/management/subjects/:id
router.put('/subjects/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { name, code, teacher_id } = req.body;
    const target = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan' });

    if (code && code.trim().toUpperCase() !== target.code) {
      const existing = db.prepare('SELECT id FROM subjects WHERE code = ? AND id != ?').get(code.trim().toUpperCase(), req.params.id);
      if (existing) {
        return res.status(400).json({ error: `Kode mapel '${code}' sudah digunakan oleh mapel lain` });
      }
    }

    db.prepare(`
      UPDATE subjects SET
        name = ?,
        code = ?,
        teacher_id = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : target.name,
      code ? code.trim().toUpperCase() : target.code,
      teacher_id !== undefined ? (teacher_id ? Number(teacher_id) : null) : target.teacher_id,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT s.*, u.name as teacher_name
      FROM subjects s
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/management/subjects/:id
router.delete('/subjects/:id', requireRole(['admin', 'guru']), (req, res) => {
  try {
    const target = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan' });

    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Mata pelajaran '${target.name}' berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
