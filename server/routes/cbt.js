const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/cbt/exams - List CBT exams
router.get('/exams', authenticateToken, (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    let query = `
      SELECT 
        e.*,
        c.name as class_name,
        s.name as subject_name,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM cbt_questions WHERE exam_id = e.id) as question_count,
        (SELECT COUNT(*) FROM cbt_sessions WHERE exam_id = e.id AND status = 'SUBMITTED') as submitted_count,
        (SELECT COUNT(*) FROM cbt_sessions WHERE exam_id = e.id AND status = 'IN_PROGRESS') as active_count,
        (SELECT COUNT(*) FROM users WHERE role = 'siswa' AND kelas = c.name) as total_students
      FROM cbt_exams e
      JOIN classes c ON e.class_id = c.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN users u ON e.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'siswa') {
      const studentClass = db.prepare('SELECT id FROM classes WHERE name = ?').get(req.user.kelas);
      if (studentClass) {
        query += ' AND e.class_id = ?';
        params.push(studentClass.id);
      }
    } else if (class_id) {
      query += ' AND e.class_id = ?';
      params.push(class_id);
    }

    if (subject_id) {
      query += ' AND e.subject_id = ?';
      params.push(subject_id);
    }

    query += ' ORDER BY e.id DESC';
    const exams = db.prepare(query).all(...params);

    // If student, attach their session status
    if (req.user.role === 'siswa') {
      const sessions = db.prepare('SELECT * FROM cbt_sessions WHERE student_id = ?').all(req.user.id);
      const sessionMap = {};
      sessions.forEach(s => { sessionMap[s.exam_id] = s; });

      const enriched = exams.map(e => ({
        ...e,
        my_session: sessionMap[e.id] || null
      }));
      return res.json(enriched);
    }

    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams - Create new CBT Exam (Guru/Admin)
router.post('/exams', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const {
      class_id,
      subject_id,
      title,
      description,
      token,
      duration_minutes,
      randomize_questions,
      randomize_options,
      max_violations
    } = req.body;

    if (!class_id || !subject_id || !title || !duration_minutes) {
      return res.status(400).json({ error: 'Data ujian belum lengkap' });
    }

    const examToken = (token || Math.random().toString(36).substring(2, 8)).toUpperCase();

    const insert = db.prepare(`
      INSERT INTO cbt_exams (
        teacher_id, class_id, subject_id, title, description, token, duration_minutes,
        randomize_questions, randomize_options, max_violations, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `);

    const result = insert.run(
      req.user.id,
      class_id,
      subject_id,
      title,
      description || '',
      examToken,
      Number(duration_minutes),
      randomize_questions ? 1 : 0,
      randomize_options ? 1 : 0,
      Number(max_violations) || 3
    );

    const newExam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cbt/exams/:id/status - Update exam status (ACTIVE, FINISHED, DRAFT)
router.put('/exams/:id/status', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'FINISHED', 'DRAFT'].includes(status)) {
      return res.status(400).json({ error: 'Status ujian tidak valid (Harus ACTIVE, FINISHED, atau DRAFT)' });
    }

    const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    db.prepare('UPDATE cbt_exams SET status = ? WHERE id = ?').run(status, req.params.id);

    if (req.io) {
      req.io.to(`exam:${req.params.id}`).emit('exam_status_changed', {
        exam_id: req.params.id,
        status,
        message: status === 'FINISHED' 
          ? 'Ujian CBT telah dihentikan oleh guru pengawas.' 
          : status === 'ACTIVE'
          ? 'Ujian CBT telah diaktifkan kembali.'
          : 'Ujian dialihkan ke status Draft.'
      });
    }

    res.json({
      success: true,
      message: status === 'FINISHED' ? 'Ujian berhasil dihentikan' : 'Status ujian berhasil diubah',
      status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cbt/exams/:id - Exam metadata with questions
router.get('/exams/:id', authenticateToken, (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT 
        e.*,
        c.name as class_name,
        s.name as subject_name,
        u.name as teacher_name
      FROM cbt_exams e
      JOIN classes c ON e.class_id = c.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN users u ON e.teacher_id = u.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    let questions = db.prepare(`
      SELECT * FROM cbt_questions WHERE exam_id = ? ORDER BY question_number ASC
    `).all(req.params.id);

    const parsedQuestions = questions.map(q => {
      const opts = JSON.parse(q.options_json || '[]');
      // Hide correct answer for student unless submitted
      if (req.user.role === 'siswa') {
        const session = db.prepare('SELECT status FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);
        const isSubmitted = session && session.status === 'SUBMITTED';
        return {
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          question_type: q.question_type,
          options: opts,
          points: q.points,
          correct_answer: isSubmitted ? q.correct_answer : undefined,
          explanation: isSubmitted ? q.explanation : undefined
        };
      }
      return {
        ...q,
        options: opts
      };
    });

    res.json({ exam, questions: parsedQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/questions - Add question
router.post('/exams/:id/questions', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { question_text, question_type, options, correct_answer, points, explanation } = req.body;
    if (!question_text) return res.status(400).json({ error: 'Teks soal wajib diisi' });

    const maxQNum = db.prepare('SELECT MAX(question_number) as max_num FROM cbt_questions WHERE exam_id = ?').get(req.params.id).max_num || 0;

    const insert = db.prepare(`
      INSERT INTO cbt_questions (exam_id, question_number, question_text, question_type, options_json, correct_answer, points, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.params.id,
      maxQNum + 1,
      question_text,
      question_type || 'MULTIPLE_CHOICE',
      JSON.stringify(options || []),
      correct_answer || 'A',
      Number(points) || 10,
      explanation || ''
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Soal berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cbt/questions/:id - Delete question
router.delete('/questions/:id', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    db.prepare('DELETE FROM cbt_questions WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Soal berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/start - Student enters token and starts exam
router.post('/exams/:id/start', authenticateToken, (req, res) => {
  try {
    const { token, device_info } = req.body;
    const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    if (exam.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Ujian saat ini sedang tidak aktif' });
    }

    if (exam.token !== token) {
      return res.status(400).json({ error: 'Token ujian salah! Silakan tanyakan kepada pengawas/guru.' });
    }

    // Check or create session
    let session = db.prepare('SELECT * FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(exam.id, req.user.id);

    if (!session) {
      const initialSeconds = exam.duration_minutes * 60;
      const insert = db.prepare(`
        INSERT INTO cbt_sessions (
          exam_id, student_id, start_time, remaining_seconds, status, answers_json, score, violation_count, device_info, last_active_at
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'IN_PROGRESS', '{}', 0, 0, ?, CURRENT_TIMESTAMP)
      `);
      const result = insert.run(exam.id, req.user.id, initialSeconds, device_info || 'Browser');
      session = db.prepare('SELECT * FROM cbt_sessions WHERE id = ?').get(result.lastInsertRowid);
    } else if (session.status === 'BLOCKED') {
      return res.status(403).json({
        error: 'Ujian Anda TERKUNCI karena terdeteksi melakukan pelanggaran layar! Silakan lapor kepada guru/pengawas untuk meminta reset login.',
        session: {
          ...session,
          answers: JSON.parse(session.answers_json || '{}')
        }
      });
    }

    // Fetch questions
    let questions = db.prepare('SELECT id, question_number, question_text, question_type, options_json, points FROM cbt_questions WHERE exam_id = ? ORDER BY question_number ASC').all(exam.id);

    const formattedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json || '[]')
    }));

    res.json({
      exam,
      session: {
        ...session,
        answers: JSON.parse(session.answers_json || '{}')
      },
      questions: formattedQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/save-answer - Autosave student answer
router.post('/exams/:id/save-answer', authenticateToken, (req, res) => {
  try {
    const { question_id, answer, doubtful, remaining_seconds } = req.body;
    const session = db.prepare('SELECT * FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(req.params.id, req.user.id);

    if (!session) return res.status(404).json({ error: 'Sesi ujian belum dimulai' });
    if (session.status === 'SUBMITTED') return res.status(400).json({ error: 'Ujian sudah diserahkan' });
    if (session.status === 'BLOCKED') return res.status(403).json({ error: 'Ujian terkunci' });

    const currentAnswers = JSON.parse(session.answers_json || '{}');
    currentAnswers[question_id] = {
      answer,
      doubtful: !!doubtful,
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      UPDATE cbt_sessions SET
        answers_json = ?,
        remaining_seconds = ?,
        last_active_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(currentAnswers), remaining_seconds !== undefined ? remaining_seconds : session.remaining_seconds, session.id);

    res.json({ success: true, answers: currentAnswers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/violation - Anti-cheat violation report
router.post('/exams/:id/violation', authenticateToken, (req, res) => {
  try {
    const { event_type, details } = req.body; // 'TAB_SWITCH', 'FULLSCREEN_EXIT', etc.
    const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
    const session = db.prepare('SELECT * FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(req.params.id, req.user.id);

    if (!session || !exam) return res.status(404).json({ error: 'Sesi tidak valid' });

    const newViolationCount = (session.violation_count || 0) + 1;
    let newStatus = session.status;
    if (newViolationCount >= exam.max_violations) {
      newStatus = 'BLOCKED';
    }

    db.prepare(`
      UPDATE cbt_sessions SET
        violation_count = ?,
        status = ?,
        last_active_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newViolationCount, newStatus, session.id);

    // Insert proctor log
    db.prepare(`
      INSERT INTO cbt_proctor_logs (exam_id, student_id, event_type, details)
      VALUES (?, ?, ?, ?)
    `).run(exam.id, req.user.id, event_type || 'TAB_SWITCH', details || 'Meninggalkan layar ujian');

    res.json({
      success: true,
      violation_count: newViolationCount,
      max_violations: exam.max_violations,
      status: newStatus,
      is_blocked: newStatus === 'BLOCKED'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/submit - Final exam submission and grading
router.post('/exams/:id/submit', authenticateToken, (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
    const session = db.prepare('SELECT * FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(req.params.id, req.user.id);

    if (!session || !exam) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

    // Fetch all questions with correct answers to compute score
    const questions = db.prepare('SELECT id, question_type, correct_answer, points FROM cbt_questions WHERE exam_id = ?').all(exam.id);
    const answers = JSON.parse(session.answers_json || '{}');

    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points;
      if (q.question_type === 'MULTIPLE_CHOICE') {
        const studentAns = answers[q.id]?.answer;
        if (studentAns && studentAns.toUpperCase() === q.correct_answer?.toUpperCase()) {
          earnedPoints += q.points;
        }
      }
    });

    // Score on 0-100 scale
    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    db.prepare(`
      UPDATE cbt_sessions SET
        status = 'SUBMITTED',
        score = ?,
        end_time = CURRENT_TIMESTAMP,
        remaining_seconds = 0
      WHERE id = ?
    `).run(finalScore, session.id);

    // Sync score to grades table (Sumatif)
    const gradeTitle = `CBT: ${exam.title}`;
    const existGrade = db.prepare('SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND class_id = ? AND title = ?').get(req.user.id, exam.subject_id, exam.class_id, gradeTitle);

    if (existGrade) {
      db.prepare('UPDATE grades SET score = ? WHERE id = ?').run(finalScore, existGrade.id);
    } else {
      db.prepare(`
        INSERT INTO grades (student_id, subject_id, class_id, category, title, score, max_score, notes)
        VALUES (?, ?, ?, 'SUMATIF_LM', ?, ?, 100, 'Hasil Ujian CBT Online')
      `).run(req.user.id, exam.subject_id, exam.class_id, gradeTitle, finalScore);
    }

    res.json({
      success: true,
      message: 'Ujian berhasil diselesaikan dan dikumpulkan!',
      score: finalScore,
      earnedPoints,
      totalPoints
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cbt/exams/:id/monitor - Real-time Proctoring Monitor State (for Guru/Admin)
router.get('/exams/:id/monitor', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT e.*, c.name as class_name, s.name as subject_name, u.name as teacher_name
      FROM cbt_exams e
      JOIN classes c ON e.class_id = c.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN users u ON e.teacher_id = u.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    // Total questions
    const questions = db.prepare('SELECT id, question_number, question_type, points FROM cbt_questions WHERE exam_id = ? ORDER BY question_number ASC').all(exam.id);
    const totalQuestions = questions.length;

    // All students in target class
    const students = db.prepare(`
      SELECT id, name, nis_nip as nis, kelas, avatar 
      FROM users 
      WHERE role = 'siswa' AND kelas = ?
      ORDER BY name ASC
    `).all(exam.class_name);

    // All sessions
    const sessions = db.prepare(`
      SELECT * FROM cbt_sessions WHERE exam_id = ?
    `).all(exam.id);

    const sessionMap = {};
    sessions.forEach(s => { sessionMap[s.student_id] = s; });

    // Build enriched student proctoring list
    const proctorList = students.map(st => {
      const sess = sessionMap[st.id];
      if (!sess) {
        return {
          student: st,
          status: 'NOT_STARTED',
          answered_count: 0,
          doubtful_count: 0,
          progress_percent: 0,
          remaining_seconds: exam.duration_minutes * 60,
          violation_count: 0,
          score: null,
          device_info: null,
          last_active_at: null,
          session_id: null
        };
      }

      const answers = JSON.parse(sess.answers_json || '{}');
      const answeredKeys = Object.keys(answers);
      const answeredCount = answeredKeys.length;
      const doubtfulCount = Object.values(answers).filter(a => a.doubtful).length;
      const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      return {
        student: st,
        status: sess.status, // NOT_STARTED, IN_PROGRESS, BLOCKED, SUBMITTED
        answered_count: answeredCount,
        doubtful_count: doubtfulCount,
        progress_percent: progressPct,
        remaining_seconds: sess.remaining_seconds,
        violation_count: sess.violation_count,
        score: sess.status === 'SUBMITTED' ? sess.score : null,
        device_info: sess.device_info,
        last_active_at: sess.last_active_at,
        session_id: sess.id
      };
    });

    // Recent proctor violation logs
    const logs = db.prepare(`
      SELECT l.*, u.name as student_name, u.nis_nip as nis
      FROM cbt_proctor_logs l
      JOIN users u ON l.student_id = u.id
      WHERE l.exam_id = ?
      ORDER BY l.id DESC
      LIMIT 30
    `).all(exam.id);

    // Summary stats
    const stats = {
      total: students.length,
      not_started: proctorList.filter(p => p.status === 'NOT_STARTED').length,
      in_progress: proctorList.filter(p => p.status === 'IN_PROGRESS').length,
      blocked: proctorList.filter(p => p.status === 'BLOCKED').length,
      submitted: proctorList.filter(p => p.status === 'SUBMITTED').length,
      avg_score: Math.round(
        proctorList.filter(p => p.score !== null).reduce((acc, p) => acc + p.score, 0) /
        (proctorList.filter(p => p.score !== null).length || 1)
      )
    };

    res.json({
      exam,
      total_questions: totalQuestions,
      students: proctorList,
      logs,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cbt/exams/:id/action - Teacher remote proctor action (RESET, FORCE_SUBMIT, EXTEND_TIME)
router.post('/exams/:id/action', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { student_id, action, minutes } = req.body;
    // action: 'RESET_LOGIN', 'FORCE_SUBMIT', 'EXTEND_TIME'

    const session = db.prepare('SELECT * FROM cbt_sessions WHERE exam_id = ? AND student_id = ?').get(req.params.id, student_id);
    if (!session) return res.status(404).json({ error: 'Sesi siswa tidak ditemukan' });

    if (action === 'RESET_LOGIN') {
      db.prepare(`
        UPDATE cbt_sessions SET
          status = 'IN_PROGRESS',
          violation_count = 0,
          last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(session.id);

      db.prepare(`
        INSERT INTO cbt_proctor_logs (exam_id, student_id, event_type, details)
        VALUES (?, ?, 'RESET_LOGIN', 'Guru membuka kunci / reset login siswa')
      `).run(req.params.id, student_id);

      return res.json({ success: true, message: 'Status ujian siswa berhasil dibuka kunci (Unlock)!' });
    }

    if (action === 'FORCE_SUBMIT') {
      const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(req.params.id);
      const questions = db.prepare('SELECT id, question_type, correct_answer, points FROM cbt_questions WHERE exam_id = ?').all(exam.id);
      const answers = JSON.parse(session.answers_json || '{}');

      let totalPoints = 0;
      let earnedPoints = 0;
      questions.forEach(q => {
        totalPoints += q.points;
        if (q.question_type === 'MULTIPLE_CHOICE' && answers[q.id]?.answer?.toUpperCase() === q.correct_answer?.toUpperCase()) {
          earnedPoints += q.points;
        }
      });
      const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      db.prepare(`
        UPDATE cbt_sessions SET
          status = 'SUBMITTED',
          score = ?,
          end_time = CURRENT_TIMESTAMP,
          remaining_seconds = 0
        WHERE id = ?
      `).run(finalScore, session.id);

      db.prepare(`
        INSERT INTO cbt_proctor_logs (exam_id, student_id, event_type, details)
        VALUES (?, ?, 'FORCE_SUBMIT', 'Guru memaksakan pengumpulan ujian secara remote')
      `).run(req.params.id, student_id);

      return res.json({ success: true, message: 'Ujian siswa berhasil dipaksa selesai (Force Submit)!' });
    }

    if (action === 'EXTEND_TIME') {
      const extraSeconds = (Number(minutes) || 5) * 60;
      const newRemaining = Math.max(session.remaining_seconds || 0, 0) + extraSeconds;

      db.prepare(`
        UPDATE cbt_sessions SET
          remaining_seconds = ?
        WHERE id = ?
      `).run(newRemaining, session.id);

      db.prepare(`
        INSERT INTO cbt_proctor_logs (exam_id, student_id, event_type, details)
        VALUES (?, ?, 'TIME_EXTEND', 'Guru menambahkan waktu pengerjaan ' + ? + ' menit')
      `).run(req.params.id, student_id, minutes || 5);

      return res.json({ success: true, message: `Waktu pengerjaan berhasil ditambah ${minutes || 5} menit!` });
    }

    res.status(400).json({ error: 'Aksi proctor tidak valid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
