const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/attendance/sessions - List sessions
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id, date } = req.query;
    let query = `
      SELECT 
        s.*, 
        c.name as class_name, 
        subj.name as subject_name,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id AND status = 'Hadir') as count_hadir,
        (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id) as count_total_recorded,
        (SELECT COUNT(*) FROM users WHERE role = 'siswa' AND kelas = c.name) as count_class_students
      FROM attendance_sessions s
      JOIN classes c ON s.class_id = c.id
      JOIN subjects subj ON s.subject_id = subj.id
      JOIN users u ON s.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If student, filter by their class
    if (req.user.role === 'siswa') {
      const studentClass = db.prepare('SELECT id FROM classes WHERE name = ?').get(req.user.kelas);
      if (studentClass) {
        query += ' AND s.class_id = ?';
        params.push(studentClass.id);
      }
    } else if (class_id) {
      query += ' AND s.class_id = ?';
      params.push(class_id);
    }

    if (subject_id) {
      query += ' AND s.subject_id = ?';
      params.push(subject_id);
    }

    if (date) {
      query += ' AND s.date = ?';
      params.push(date);
    }

    query += ' ORDER BY s.date DESC, s.id DESC';
    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/sessions - Create attendance session (Guru/Admin)
router.post('/sessions', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { class_id, subject_id, date, time_start, time_end, session_title } = req.body;
    if (!class_id || !subject_id || !date || !session_title) {
      return res.status(400).json({ error: 'Data sesi presensi belum lengkap' });
    }

    // Generate random 6-character session code
    const session_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const insert = db.prepare(`
      INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, date, time_start, time_end, session_title, session_code, is_open)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = insert.run(
      class_id,
      subject_id,
      req.user.id,
      date,
      time_start || '07:30',
      time_end || '09:00',
      session_title,
      session_code
    );

    const newSession = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendance/sessions/:id/toggle - Open/Close session
router.put('/sessions/:id/toggle', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

    const newStatus = session.is_open ? 0 : 1;
    db.prepare('UPDATE attendance_sessions SET is_open = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true, is_open: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/sessions/:id - Session details with all class students & their records
router.get('/sessions/:id', authenticateToken, (req, res) => {
  try {
    const session = db.prepare(`
      SELECT s.*, c.name as class_name, subj.name as subject_name, u.name as teacher_name
      FROM attendance_sessions s
      JOIN classes c ON s.class_id = c.id
      JOIN subjects subj ON s.subject_id = subj.id
      JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

    // Get all students in this class
    const students = db.prepare(`
      SELECT id, name, nis_nip as nis, kelas, gender, no_absen, avatar
      FROM users
      WHERE role = 'siswa' AND kelas = ?
      ORDER BY CASE WHEN no_absen IS NOT NULL AND no_absen > 0 THEN CAST(no_absen AS INTEGER) ELSE 9999 END ASC, name ASC
    `).all(session.class_name);

    // Get attendance records
    const records = db.prepare(`
      SELECT student_id, status, notes, recorded_at
      FROM attendance_records
      WHERE session_id = ?
    `).all(req.params.id);

    const recordMap = {};
    records.forEach(r => { recordMap[r.student_id] = r; });

    const studentList = students.map(s => ({
      ...s,
      record: recordMap[s.id] || { status: 'Belum Presensi', notes: '', recorded_at: null }
    }));

    // Stats
    const stats = {
      total: students.length,
      hadir: records.filter(r => r.status === 'Hadir').length,
      sakit: records.filter(r => r.status === 'Sakit').length,
      izin: records.filter(r => r.status === 'Izin').length,
      alpa: records.filter(r => r.status === 'Alpa').length,
      terlambat: records.filter(r => r.status === 'Terlambat').length,
      belum: students.length - records.length
    };

    res.json({ session, students: studentList, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/sessions/:id/check-in - Student self check-in
router.post('/sessions/:id/check-in', authenticateToken, (req, res) => {
  try {
    const { code } = req.body;
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesi presensi tidak ditemukan' });

    if (!session.is_open) {
      return res.status(400).json({ error: 'Sesi presensi ini telah ditutup oleh guru pengampu' });
    }

    if (session.session_code && session.session_code.toUpperCase() !== (code || '').trim().toUpperCase()) {
      return res.status(400).json({ error: 'Kode presensi tidak sesuai atau salah. Silakan periksa kembali kode dari guru di kelas.' });
    }

    const upsert = db.prepare(`
      INSERT INTO attendance_records (session_id, student_id, status, notes, recorded_at)
      VALUES (?, ?, 'Hadir', 'Presensi mandiri', CURRENT_TIMESTAMP)
      ON CONFLICT(session_id, student_id) 
      DO UPDATE SET status = 'Hadir', notes = 'Presensi mandiri (Update)', recorded_at = CURRENT_TIMESTAMP
    `);

    upsert.run(session.id, req.user.id);

    // Auto sync teaching journals on student check-in (including late check-in)
    syncTeachingJournalsFromSession(session.id);

    res.json({ success: true, message: 'Presensi berhasil dicatat! Status: Hadir' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to automatically sync teaching journals when attendance records change (e.g. late check-in)
function syncTeachingJournalsFromSession(sessionId) {
  try {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) return;

    const journals = db.prepare(`
      SELECT j.*, c.name as class_name
      FROM teaching_journals j
      JOIN classes c ON j.class_id = c.id
      WHERE j.class_id = ? AND j.date = ?
    `).all(session.class_id, session.date);

    if (journals.length === 0) return;

    const students = db.prepare(`
      SELECT id, name, no_absen
      FROM users
      WHERE role = 'siswa' AND kelas = ?
      ORDER BY CASE WHEN no_absen IS NOT NULL AND no_absen > 0 THEN CAST(no_absen AS INTEGER) ELSE 9999 END ASC, name ASC
    `).all(journals[0].class_name);

    const records = db.prepare(`
      SELECT student_id, status, notes
      FROM attendance_records
      WHERE session_id = ?
    `).all(sessionId);

    const recMap = {};
    records.forEach(r => { recMap[r.student_id] = r; });

    let presentCount = 0;
    const absentList = [];

    students.forEach(st => {
      const r = recMap[st.id];
      const status = r ? r.status : 'Belum Presensi';
      const notes = (r?.notes || '').trim();

      if (status === 'Hadir' || status === 'Terlambat') {
        presentCount++;
      } else if (['Sakit', 'Izin', 'Alpa', 'Tidak Hadir'].includes(status)) {
        absentList.push(`${st.name} (${status}${notes ? `: ${notes}` : ''})`);
      } else if (status === 'Belum Presensi' && records.length > 0) {
        absentList.push(`${st.name} (Belum Presensi / Alpa)`);
      }
    });

    const absentCount = absentList.length;
    const absentText = absentList.length > 0 ? absentList.join(', ') : 'Nihil (Semua siswa hadir)';

    const updateStmt = db.prepare(`
      UPDATE teaching_journals
      SET count_present = ?, count_absent = ?, absent_students = ?
      WHERE id = ?
    `);

    journals.forEach(j => {
      if (!j.subject_id || Number(j.subject_id) === Number(session.subject_id)) {
        updateStmt.run(presentCount, absentCount, absentText, j.id);
      }
    });
  } catch (err) {
    console.error('Error syncing journals from session:', err);
  }
}

// PUT /api/attendance/sessions/:id/records - Teacher batch/single record update
router.put('/sessions/:id/records', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { records } = req.body; // array of { student_id, status, notes }
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Data presensi harus berupa array' });
    }

    const upsert = db.prepare(`
      INSERT INTO attendance_records (session_id, student_id, status, notes, recorded_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session_id, student_id)
      DO UPDATE SET status = excluded.status, notes = excluded.notes, recorded_at = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((rows) => {
      for (const row of rows) {
        if (row.status && row.status !== 'Belum Presensi') {
          upsert.run(req.params.id, row.student_id, row.status, row.notes || '');
        }
      }
    });

    updateMany(records);

    // Auto sync teaching journals on teacher records update
    syncTeachingJournalsFromSession(req.params.id);

    res.json({ success: true, message: 'Data presensi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/summary - Recap per student / class
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    if (!class_id || !subject_id) {
      return res.status(400).json({ error: 'class_id dan subject_id wajib diisi' });
    }

    const targetClass = db.prepare('SELECT name FROM classes WHERE id = ?').get(class_id);
    if (!targetClass) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    // Total sessions for this class & subject
    const sessions = db.prepare(`
      SELECT id, date, session_title 
      FROM attendance_sessions 
      WHERE class_id = ? AND subject_id = ? 
      ORDER BY date ASC
    `).all(class_id, subject_id);

    const students = db.prepare(`
      SELECT id, name, nis_nip as nis, kelas, gender, no_absen 
      FROM users 
      WHERE role = 'siswa' AND kelas = ? 
      ORDER BY CASE WHEN no_absen IS NOT NULL AND no_absen > 0 THEN CAST(no_absen AS INTEGER) ELSE 9999 END ASC, name ASC
    `).all(targetClass.name);

    const sessionIds = sessions.map(s => s.id);
    let allRecords = [];
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      allRecords = db.prepare(`
        SELECT session_id, student_id, status 
        FROM attendance_records 
        WHERE session_id IN (${placeholders})
      `).all(...sessionIds);
    }

    const summary = students.map(st => {
      const stRecords = allRecords.filter(r => r.student_id === st.id);
      const hadir = stRecords.filter(r => r.status === 'Hadir').length;
      const sakit = stRecords.filter(r => r.status === 'Sakit').length;
      const izin = stRecords.filter(r => r.status === 'Izin').length;
      const alpa = stRecords.filter(r => r.status === 'Alpa').length;
      const terlambat = stRecords.filter(r => r.status === 'Terlambat').length;
      const totalSess = sessions.length;
      const pct = totalSess > 0 ? Math.round(((hadir + terlambat) / totalSess) * 100) : 100;

      return {
        student: st,
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
        percentage: pct
      };
    });

    res.json({ sessions, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
