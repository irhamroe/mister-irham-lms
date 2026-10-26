const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/grades/weights - Get weight configuration
router.get('/weights', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    if (!class_id || !subject_id) {
      return res.status(400).json({ error: 'class_id dan subject_id wajib disertakan' });
    }

    let config = db.prepare(`
      SELECT * FROM grade_weights 
      WHERE class_id = ? AND subject_id = ?
    `).get(class_id, subject_id);

    if (!config) {
      // Default fallback
      config = {
        class_id: Number(class_id),
        subject_id: Number(subject_id),
        attendance_weight: 15,
        assignment_weight: 35,
        formatif_weight: 25,
        sumatif_weight: 25,
        kkm: 75
      };
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades/weights - Save/update custom weights
router.post('/weights', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const {
      class_id,
      subject_id,
      attendance_weight,
      assignment_weight,
      formatif_weight,
      sumatif_weight,
      kkm
    } = req.body;

    const totalWeight = Number(attendance_weight) + Number(assignment_weight) + Number(formatif_weight) + Number(sumatif_weight);
    if (totalWeight <= 0) {
      return res.status(400).json({ error: 'Total bobot harus lebih besar dari 0%' });
    }

    const upsert = db.prepare(`
      INSERT INTO grade_weights (
        teacher_id, class_id, subject_id, attendance_weight, assignment_weight, formatif_weight, sumatif_weight, kkm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(teacher_id, class_id, subject_id)
      DO UPDATE SET
        attendance_weight = excluded.attendance_weight,
        assignment_weight = excluded.assignment_weight,
        formatif_weight = excluded.formatif_weight,
        sumatif_weight = excluded.sumatif_weight,
        kkm = excluded.kkm
    `);

    upsert.run(
      req.user.id,
      class_id,
      subject_id,
      Number(attendance_weight),
      Number(assignment_weight),
      Number(formatif_weight),
      Number(sumatif_weight),
      Number(kkm) || 75
    );

    res.json({ success: true, message: 'Bobot penilaian berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/ledger - Full gradebook spreadsheet
router.get('/ledger', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    if (!class_id || !subject_id) {
      return res.status(400).json({ error: 'class_id dan subject_id wajib disertakan' });
    }

    const targetClass = db.prepare('SELECT name FROM classes WHERE id = ?').get(class_id);
    if (!targetClass) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    // Fetch weight config
    let weights = db.prepare(`
      SELECT * FROM grade_weights WHERE class_id = ? AND subject_id = ?
    `).get(class_id, subject_id);

    if (!weights) {
      weights = {
        attendance_weight: 15,
        assignment_weight: 35,
        formatif_weight: 25,
        sumatif_weight: 25,
        kkm: 75
      };
    }

    // Fetch students
    let studentQuery = `
      SELECT id, name, nis_nip as nis, kelas, gender, avatar 
      FROM users 
      WHERE role = 'siswa' AND kelas = ?
    `;
    const params = [targetClass.name];

    // If student logged in, only return their row or all with highlight
    if (req.user.role === 'siswa') {
      studentQuery += ' AND id = ?';
      params.push(req.user.id);
    } else {
      studentQuery += ' ORDER BY name ASC';
    }

    const students = db.prepare(studentQuery).all(...params);

    // Fetch all grade items for this class & subject
    const rawGrades = db.prepare(`
      SELECT * FROM grades 
      WHERE class_id = ? AND subject_id = ?
      ORDER BY category ASC, id ASC
    `).all(class_id, subject_id);

    // Distinct grade columns / activities
    const distinctColumns = [];
    const seenCol = new Set();
    rawGrades.forEach(g => {
      const key = `${g.category}:::${g.title}`;
      if (!seenCol.has(key)) {
        seenCol.add(key);
        distinctColumns.push({
          category: g.category,
          title: g.title,
          max_score: g.max_score
        });
      }
    });

    // Fetch attendance sessions & student records for attendance score
    const sessions = db.prepare(`
      SELECT id FROM attendance_sessions WHERE class_id = ? AND subject_id = ?
    `).all(class_id, subject_id);

    const sessionIds = sessions.map(s => s.id);
    let attRecords = [];
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      attRecords = db.prepare(`
        SELECT student_id, status FROM attendance_records WHERE session_id IN (${placeholders})
      `).all(...sessionIds);
    }

    const totalWeight = weights.attendance_weight + weights.assignment_weight + weights.formatif_weight + weights.sumatif_weight;

    const rows = students.map(st => {
      // 1. Attendance score
      const stAtts = attRecords.filter(r => r.student_id === st.id);
      const hadirCount = stAtts.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length;
      const attendanceScore = sessionIds.length > 0 ? Math.round((hadirCount / sessionIds.length) * 100) : 100;

      // 2. Scores by category
      const studentGrades = rawGrades.filter(g => g.student_id === st.id);
      const gradeMap = {};
      studentGrades.forEach(g => {
        gradeMap[`${g.category}:::${g.title}`] = g.score;
      });

      const tugasScores = studentGrades.filter(g => g.category === 'TUGAS').map(g => g.score);
      const formatifScores = studentGrades.filter(g => g.category === 'FORMATIF').map(g => g.score);
      const sumatifScores = studentGrades.filter(g => g.category.startsWith('SUMATIF')).map(g => g.score);

      const avgTugas = tugasScores.length > 0 ? Math.round(tugasScores.reduce((a, b) => a + b, 0) / tugasScores.length) : 0;
      const avgFormatif = formatifScores.length > 0 ? Math.round(formatifScores.reduce((a, b) => a + b, 0) / formatifScores.length) : 0;
      const avgSumatif = sumatifScores.length > 0 ? Math.round(sumatifScores.reduce((a, b) => a + b, 0) / sumatifScores.length) : 0;

      // 3. Final Score (NA)
      let finalScore = 0;
      if (totalWeight > 0) {
        finalScore = Math.round(
          (attendanceScore * weights.attendance_weight +
           avgTugas * weights.assignment_weight +
           avgFormatif * weights.formatif_weight +
           avgSumatif * weights.sumatif_weight) / totalWeight
        );
      }

      // 4. Predicate
      let predicate = 'D';
      if (finalScore >= 90) predicate = 'A';
      else if (finalScore >= 80) predicate = 'B';
      else if (finalScore >= weights.kkm) predicate = 'C';

      const isPassed = finalScore >= weights.kkm;

      return {
        student: st,
        attendanceScore,
        avgTugas,
        avgFormatif,
        avgSumatif,
        finalScore,
        predicate,
        isPassed,
        items: gradeMap
      };
    });

    res.json({
      weights,
      columns: distinctColumns,
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades - Add or update a grade entry
router.post('/', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { student_id, subject_id, class_id, category, title, score, max_score, notes } = req.body;
    if (!student_id || !subject_id || !class_id || !category || !title || score === undefined) {
      return res.status(400).json({ error: 'Data nilai belum lengkap' });
    }

    // Check existing
    const existing = db.prepare(`
      SELECT id FROM grades 
      WHERE student_id = ? AND subject_id = ? AND class_id = ? AND category = ? AND title = ?
    `).get(student_id, subject_id, class_id, category, title);

    if (existing) {
      db.prepare(`
        UPDATE grades SET score = ?, max_score = ?, notes = ? WHERE id = ?
      `).run(Number(score), Number(max_score) || 100, notes || '', existing.id);
      return res.json({ success: true, message: 'Nilai berhasil diperbarui', id: existing.id });
    } else {
      const insert = db.prepare(`
        INSERT INTO grades (student_id, subject_id, class_id, category, title, score, max_score, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(
        student_id, subject_id, class_id, category, title,
        Number(score), Number(max_score) || 100, notes || ''
      );
      return res.status(201).json({ success: true, message: 'Nilai berhasil disimpan', id: result.lastInsertRowid });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades/batch - Batch update grades (for entire column)
router.post('/batch', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { class_id, subject_id, category, title, max_score, entries } = req.body;
    // entries: array of { student_id, score, notes }

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Entries harus berupa array' });
    }

    const checkStmt = db.prepare(`
      SELECT id FROM grades 
      WHERE student_id = ? AND subject_id = ? AND class_id = ? AND category = ? AND title = ?
    `);

    const updateStmt = db.prepare(`
      UPDATE grades SET score = ?, max_score = ?, notes = ? WHERE id = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO grades (student_id, subject_id, class_id, category, title, score, max_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runBatch = db.transaction((rows) => {
      for (const row of rows) {
        if (row.score !== '' && row.score !== null && row.score !== undefined) {
          const exist = checkStmt.get(row.student_id, subject_id, class_id, category, title);
          if (exist) {
            updateStmt.run(Number(row.score), Number(max_score) || 100, row.notes || '', exist.id);
          } else {
            insertStmt.run(row.student_id, subject_id, class_id, category, title, Number(row.score), Number(max_score) || 100, row.notes || '');
          }
        }
      }
    });

    runBatch(entries);
    res.json({ success: true, message: 'Semua nilai berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
