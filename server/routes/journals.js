const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/journals - List journals with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { teacher_id, class_id, subject_id, date, search } = req.query;
    let query = `
      SELECT 
        j.*,
        c.name as class_name,
        s.name as subject_name,
        u.name as teacher_name
      FROM teaching_journals j
      JOIN classes c ON j.class_id = c.id
      JOIN subjects s ON j.subject_id = s.id
      JOIN users u ON j.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'guru') {
      query += ' AND j.teacher_id = ?';
      params.push(req.user.id);
    } else if (teacher_id) {
      query += ' AND j.teacher_id = ?';
      params.push(teacher_id);
    }

    if (class_id) {
      query += ' AND j.class_id = ?';
      params.push(class_id);
    }

    if (subject_id) {
      query += ' AND j.subject_id = ?';
      params.push(subject_id);
    }

    if (date) {
      query += ' AND j.date = ?';
      params.push(date);
    }

    if (search) {
      query += ' AND (j.topic LIKE ? OR j.activities LIKE ? OR j.student_notes LIKE ? OR j.absent_students LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY j.date DESC, j.id DESC';
    const journals = db.prepare(query).all(...params);

    // Live sync attendance condition for each journal (e.g., if students checked in late)
    const findSessionStmt = db.prepare(`
      SELECT s.id, s.session_title, s.time_start, s.time_end
      FROM attendance_sessions s
      WHERE s.class_id = ? AND s.date = ?
      ORDER BY (s.subject_id = ?) DESC, s.id DESC
      LIMIT 1
    `);

    const classStudentsStmt = db.prepare(`
      SELECT id, name, no_absen
      FROM users
      WHERE role = 'siswa' AND kelas = ?
      ORDER BY CASE WHEN no_absen IS NOT NULL AND no_absen > 0 THEN CAST(no_absen AS INTEGER) ELSE 9999 END ASC, name ASC
    `);

    const recordsStmt = db.prepare(`
      SELECT student_id, status, notes
      FROM attendance_records
      WHERE session_id = ?
    `);

    const updateJournalStatsStmt = db.prepare(`
      UPDATE teaching_journals
      SET count_present = ?, count_absent = ?, absent_students = ?
      WHERE id = ?
    `);

    for (const j of journals) {
      const sess = findSessionStmt.get(j.class_id, j.date, j.subject_id);
      if (sess) {
        const records = recordsStmt.all(sess.id);
        if (records.length > 0) {
          const students = classStudentsStmt.all(j.class_name);
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
            } else if (status === 'Belum Presensi') {
              absentList.push(`${st.name} (Belum Presensi / Alpa)`);
            }
          });

          const absentCount = absentList.length;
          const absentText = absentList.length > 0 ? absentList.join(', ') : 'Nihil (Semua siswa hadir)';

          if (j.count_present !== presentCount || j.count_absent !== absentCount || j.absent_students !== absentText) {
            try {
              updateJournalStatsStmt.run(presentCount, absentCount, absentText, j.id);
            } catch (e) {}
          }

          j.count_present = presentCount;
          j.count_absent = absentCount;
          j.absent_students = absentText;
        }
      }
    }

    res.json(journals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journals - Create journal entry (Guru & Admin)
router.post('/', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const {
      class_id,
      subject_id,
      date,
      time_slot,
      topic,
      learning_outcomes,
      activities,
      student_notes,
      follow_up,
      count_present,
      count_absent,
      absent_students
    } = req.body;

    if (!class_id || !subject_id || !date || !topic || !activities) {
      return res.status(400).json({ error: 'Data jurnal pokok belum lengkap' });
    }

    const insert = db.prepare(`
      INSERT INTO teaching_journals (
        teacher_id, class_id, subject_id, date, time_slot, topic,
        learning_outcomes, activities, student_notes, follow_up,
        count_present, count_absent, absent_students
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.user.id,
      class_id,
      subject_id,
      date,
      time_slot || 'Jam ke 1-2',
      topic,
      learning_outcomes || '',
      activities,
      student_notes || '',
      follow_up || '',
      count_present !== undefined ? Number(count_present) : 0,
      count_absent !== undefined ? Number(count_absent) : 0,
      absent_students || ''
    );

    const newJournal = db.prepare(`
      SELECT j.*, c.name as class_name, s.name as subject_name, u.name as teacher_name
      FROM teaching_journals j
      JOIN classes c ON j.class_id = c.id
      JOIN subjects s ON j.subject_id = s.id
      JOIN users u ON j.teacher_id = u.id
      WHERE j.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newJournal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journals/:id - Update journal
router.put('/:id', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const journal = db.prepare('SELECT * FROM teaching_journals WHERE id = ?').get(req.params.id);
    if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan' });

    if (req.user.role !== 'admin' && journal.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya dapat mengubah jurnal Anda sendiri' });
    }

    const {
      class_id,
      subject_id,
      date,
      time_slot,
      topic,
      learning_outcomes,
      activities,
      student_notes,
      follow_up,
      count_present,
      count_absent,
      absent_students
    } = req.body;

    db.prepare(`
      UPDATE teaching_journals SET
        class_id = ?, subject_id = ?, date = ?, time_slot = ?, topic = ?,
        learning_outcomes = ?, activities = ?, student_notes = ?, follow_up = ?,
        count_present = ?, count_absent = ?, absent_students = ?
      WHERE id = ?
    `).run(
      class_id || journal.class_id,
      subject_id || journal.subject_id,
      date || journal.date,
      time_slot || journal.time_slot,
      topic || journal.topic,
      learning_outcomes !== undefined ? learning_outcomes : journal.learning_outcomes,
      activities || journal.activities,
      student_notes !== undefined ? student_notes : journal.student_notes,
      follow_up !== undefined ? follow_up : journal.follow_up,
      count_present !== undefined ? Number(count_present) : journal.count_present,
      count_absent !== undefined ? Number(count_absent) : journal.count_absent,
      absent_students !== undefined ? absent_students : journal.absent_students,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT j.*, c.name as class_name, s.name as subject_name, u.name as teacher_name
      FROM teaching_journals j
      JOIN classes c ON j.class_id = c.id
      JOIN subjects s ON j.subject_id = s.id
      JOIN users u ON j.teacher_id = u.id
      WHERE j.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/journals/:id
router.delete('/:id', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const journal = db.prepare('SELECT * FROM teaching_journals WHERE id = ?').get(req.params.id);
    if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan' });

    if (req.user.role !== 'admin' && journal.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus jurnal Anda sendiri' });
    }

    db.prepare('DELETE FROM teaching_journals WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Jurnal berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/stats
router.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM teaching_journals').get().count;
    const thisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM teaching_journals 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get().count;

    res.json({ total, thisMonth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
