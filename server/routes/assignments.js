const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/assignments - List assignments
router.get('/', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    let query = `
      SELECT 
        a.*,
        c.name as class_name,
        s.name as subject_name,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as turned_in_count,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND status = 'GRADED') as graded_count,
        (SELECT COUNT(*) FROM users WHERE role = 'siswa' AND kelas = c.name) as total_students
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      JOIN subjects s ON a.subject_id = s.id
      JOIN users u ON a.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'siswa') {
      const studentClass = db.prepare('SELECT id FROM classes WHERE name = ?').get(req.user.kelas);
      if (studentClass) {
        query += ' AND a.class_id = ?';
        params.push(studentClass.id);
      }
    } else if (class_id) {
      query += ' AND a.class_id = ?';
      params.push(class_id);
    }

    if (subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(subject_id);
    }

    query += ' ORDER BY a.due_date DESC, a.id DESC';
    const assignments = db.prepare(query).all(...params);

    // If student, attach their specific submission status
    if (req.user.role === 'siswa') {
      const submissions = db.prepare(`
        SELECT * FROM assignment_submissions WHERE student_id = ?
      `).all(req.user.id);
      const subMap = {};
      submissions.forEach(s => { subMap[s.assignment_id] = s; });

      const enriched = assignments.map(a => {
        const sub = subMap[a.id];
        let studentStatus = 'ASSIGNED'; // Ditugaskan
        if (sub) {
          studentStatus = sub.status; // SUBMITTED or GRADED
        } else {
          // Check if late
          const due = new Date(a.due_date);
          if (new Date() > due) {
            studentStatus = 'MISSING'; // Belum Mengumpulkan & Terlambat
          }
        }
        return {
          ...a,
          attachments: JSON.parse(a.attachments_json || '[]'),
          my_submission: sub ? {
            ...sub,
            attachments: JSON.parse(sub.attachments_json || '[]')
          } : null,
          student_status: studentStatus
        };
      });
      return res.json(enriched);
    }

    // Teacher/Admin response
    const enriched = assignments.map(a => ({
      ...a,
      attachments: JSON.parse(a.attachments_json || '[]')
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments - Create new assignment (Guru/Admin)
router.post('/', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { class_id, subject_id, title, instructions, due_date, max_points, attachments } = req.body;
    if (!class_id || !subject_id || !title || !due_date) {
      return res.status(400).json({ error: 'Data tugas belum lengkap (Judul, Kelas, Mapel, Tenggat Waktu wajib)' });
    }

    const insert = db.prepare(`
      INSERT INTO assignments (teacher_id, class_id, subject_id, title, instructions, due_date, max_points, attachments_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.user.id,
      class_id,
      subject_id,
      title,
      instructions || '',
      due_date,
      Number(max_points) || 100,
      JSON.stringify(attachments || [])
    );

    const newAssignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...newAssignment,
      attachments: JSON.parse(newAssignment.attachments_json || '[]')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id - Detail assignment with all student submissions
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const assignment = db.prepare(`
      SELECT 
        a.*,
        c.name as class_name,
        s.name as subject_name,
        u.name as teacher_name
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      JOIN subjects s ON a.subject_id = s.id
      JOIN users u ON a.teacher_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    assignment.attachments = JSON.parse(assignment.attachments_json || '[]');

    // Get all students in the targeted class
    const students = db.prepare(`
      SELECT id, name, nis_nip as nis, kelas, avatar 
      FROM users 
      WHERE role = 'siswa' AND kelas = ?
      ORDER BY name ASC
    `).all(assignment.class_name);

    // Get all submissions for this assignment
    const submissions = db.prepare(`
      SELECT s.*, u.name as student_name, u.nis_nip as nis, u.avatar
      FROM assignment_submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ?
    `).all(req.params.id);

    const subMap = {};
    submissions.forEach(sub => {
      subMap[sub.student_id] = {
        ...sub,
        attachments: JSON.parse(sub.attachments_json || '[]')
      };
    });

    const studentSubmissions = students.map(st => {
      const sub = subMap[st.id];
      let status = 'NOT_SUBMITTED';
      if (sub) {
        status = sub.status; // SUBMITTED or GRADED
      } else if (new Date() > new Date(assignment.due_date)) {
        status = 'MISSING';
      }
      return {
        student: st,
        submission: sub || null,
        status
      };
    });

    const stats = {
      total: students.length,
      turned_in: submissions.filter(s => s.status === 'SUBMITTED').length,
      graded: submissions.filter(s => s.status === 'GRADED').length,
      missing: students.length - submissions.length
    };

    res.json({
      assignment,
      submissions: studentSubmissions,
      stats,
      my_submission: subMap[req.user.id] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/:id/submit - Student Turn In
router.post('/:id/submit', authenticateToken, (req, res) => {
  try {
    const { content, attachments } = req.body;
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    const isLate = new Date() > new Date(assignment.due_date);
    const status = isLate ? 'LATE' : 'SUBMITTED';

    const upsert = db.prepare(`
      INSERT INTO assignment_submissions (assignment_id, student_id, content, attachments_json, submitted_at, status)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(assignment_id, student_id)
      DO UPDATE SET
        content = excluded.content,
        attachments_json = excluded.attachments_json,
        submitted_at = CURRENT_TIMESTAMP,
        status = excluded.status
    `);

    upsert.run(
      req.params.id,
      req.user.id,
      content || '',
      JSON.stringify(attachments || []),
      status
    );

    res.json({ success: true, message: 'Tugas berhasil diserahkan!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/:id/grade - Teacher grades a student's submission
router.post('/:id/grade', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { student_id, score, teacher_feedback } = req.body;
    if (!student_id || score === undefined) {
      return res.status(400).json({ error: 'student_id dan score wajib diisi' });
    }

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    // Update submission status to GRADED
    db.prepare(`
      UPDATE assignment_submissions SET
        score = ?,
        teacher_feedback = ?,
        status = 'GRADED',
        graded_at = CURRENT_TIMESTAMP
      WHERE assignment_id = ? AND student_id = ?
    `).run(Number(score), teacher_feedback || '', req.params.id, student_id);

    // Also automatically register or sync in grades ledger table under category TUGAS
    const gradeTitle = `Tugas: ${assignment.title}`;
    const checkGrade = db.prepare(`
      SELECT id FROM grades 
      WHERE student_id = ? AND subject_id = ? AND class_id = ? AND title = ?
    `).get(student_id, assignment.subject_id, assignment.class_id, gradeTitle);

    if (checkGrade) {
      db.prepare('UPDATE grades SET score = ? WHERE id = ?').run(Number(score), checkGrade.id);
    } else {
      db.prepare(`
        INSERT INTO grades (student_id, subject_id, class_id, category, title, score, max_score, notes)
        VALUES (?, ?, ?, 'TUGAS', ?, ?, ?, 'Otomatis dari Pengumpulan Tugas LMS')
      `).run(student_id, assignment.subject_id, assignment.class_id, gradeTitle, Number(score), assignment.max_points);
    }

    res.json({ success: true, message: 'Nilai dan masukan tugas berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
