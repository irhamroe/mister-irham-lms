const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/question-bank - List all master questions with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { subject_id, grade_level, difficulty, question_type, search } = req.query;

    let query = `
      SELECT 
        qb.*,
        s.name as subject_name,
        u.name as teacher_name,
        (
          SELECT COUNT(DISTINCT cq.exam_id) 
          FROM cbt_questions cq 
          WHERE cq.question_text = qb.question_text
        ) as times_used
      FROM question_bank qb
      JOIN subjects s ON qb.subject_id = s.id
      JOIN users u ON qb.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
      query += ' AND qb.subject_id = ?';
      params.push(subject_id);
    }

    if (grade_level && grade_level !== 'Semua') {
      query += ' AND qb.grade_level = ?';
      params.push(grade_level);
    }

    if (difficulty && difficulty !== 'Semua') {
      query += ' AND qb.difficulty = ?';
      params.push(difficulty);
    }

    if (question_type && question_type !== 'Semua') {
      query += ' AND qb.question_type = ?';
      params.push(question_type);
    }

    if (search) {
      query += ' AND (qb.question_text LIKE ? OR qb.topic LIKE ? OR qb.source_exam_title LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY qb.id DESC';

    const questions = db.prepare(query).all(...params);

    const parsed = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/question-bank/stats - Summary statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM question_bank').get().count;
    const mcCount = db.prepare('SELECT COUNT(*) as count FROM question_bank WHERE question_type = "MULTIPLE_CHOICE"').get().count;
    const essayCount = db.prepare('SELECT COUNT(*) as count FROM question_bank WHERE question_type = "ESSAY"').get().count;

    const bySubject = db.prepare(`
      SELECT s.name, COUNT(qb.id) as count 
      FROM subjects s 
      LEFT JOIN question_bank qb ON s.id = qb.subject_id 
      GROUP BY s.id
    `).all();

    const byDifficulty = db.prepare(`
      SELECT difficulty, COUNT(*) as count 
      FROM question_bank 
      GROUP BY difficulty
    `).all();

    const byGrade = db.prepare(`
      SELECT grade_level, COUNT(*) as count 
      FROM question_bank 
      GROUP BY grade_level
    `).all();

    res.json({
      total,
      multiple_choice: mcCount,
      essay: essayCount,
      by_subject: bySubject,
      by_difficulty: byDifficulty,
      by_grade: byGrade
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/question-bank/:id - Single question detail
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const q = db.prepare(`
      SELECT qb.*, s.name as subject_name, u.name as teacher_name
      FROM question_bank qb
      JOIN subjects s ON qb.subject_id = s.id
      JOIN users u ON qb.teacher_id = u.id
      WHERE qb.id = ?
    `).get(req.params.id);

    if (!q) return res.status(404).json({ error: 'Soal tidak ditemukan di Bank Soal' });

    res.json({
      ...q,
      options: JSON.parse(q.options_json || '[]')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/question-bank - Create new question in master bank
router.post('/', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const {
      subject_id,
      grade_level,
      topic,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      explanation,
      difficulty,
      source_exam_title
    } = req.body;

    if (!subject_id || !question_text) {
      return res.status(400).json({ error: 'Mata pelajaran dan teks pertanyaan wajib diisi' });
    }

    const insert = db.prepare(`
      INSERT INTO question_bank (
        teacher_id, subject_id, grade_level, topic, question_text, question_type,
        options_json, correct_answer, points, explanation, difficulty, source_exam_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.user.id,
      subject_id,
      grade_level || 'Kelas X',
      topic || 'Umum',
      question_text,
      question_type || 'MULTIPLE_CHOICE',
      JSON.stringify(options || []),
      correct_answer || 'A',
      Number(points) || 10,
      explanation || '',
      difficulty || 'SEDANG',
      source_exam_title || 'Bank Soal Mandiri Guru'
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Soal berhasil disimpan ke Bank Soal Master!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/question-bank/batch-import - Import questions batch from Excel / Word
router.post('/batch-import', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { questions, default_subject_id, default_grade_level, default_package_title, default_topic } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Data soal untuk diimpor tidak boleh kosong' });
    }

    const insert = db.prepare(`
      INSERT INTO question_bank (
        teacher_id, subject_id, grade_level, topic, question_text, question_type,
        options_json, correct_answer, points, explanation, difficulty, source_exam_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const runBatch = db.transaction((list) => {
      for (const q of list) {
        if (!q.question_text || !q.question_text.trim()) continue;

        const subjectId = Number(q.subject_id || default_subject_id || 1);
        const gradeLevel = q.grade_level || default_grade_level || 'Kelas X';
        const topic = q.topic || default_topic || 'Umum';
        const title = q.source_exam_title || default_package_title || 'Bank Soal Mandiri Guru';
        const qType = q.question_type || 'MULTIPLE_CHOICE';
        const options = qType === 'MULTIPLE_CHOICE' ? (q.options || []) : [];
        const correctAnswer = qType === 'ESSAY' ? '' : (q.correct_answer || 'A');
        const points = Number(q.points) || (qType === 'ESSAY' ? 20 : 10);
        const difficulty = q.difficulty || 'SEDANG';
        const explanation = q.explanation || '';

        insert.run(
          req.user.id,
          subjectId,
          gradeLevel,
          topic,
          q.question_text.trim(),
          qType,
          JSON.stringify(options),
          correctAnswer,
          points,
          explanation,
          difficulty,
          title
        );
        importedCount++;
      }
    });

    runBatch(questions);

    res.json({
      success: true,
      importedCount,
      message: `Berhasil mengimpor ${importedCount} butir soal ke Bank Soal!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/question-bank/:id - Update question in master bank
router.put('/:id', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const {
      subject_id,
      grade_level,
      topic,
      question_text,
      question_type,
      options,
      correct_answer,
      points,
      explanation,
      difficulty,
      source_exam_title
    } = req.body;

    const existing = db.prepare('SELECT id FROM question_bank WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Soal tidak ditemukan' });

    db.prepare(`
      UPDATE question_bank SET
        subject_id = COALESCE(?, subject_id),
        grade_level = COALESCE(?, grade_level),
        topic = COALESCE(?, topic),
        question_text = COALESCE(?, question_text),
        question_type = COALESCE(?, question_type),
        options_json = COALESCE(?, options_json),
        correct_answer = COALESCE(?, correct_answer),
        points = COALESCE(?, points),
        explanation = COALESCE(?, explanation),
        difficulty = COALESCE(?, difficulty),
        source_exam_title = COALESCE(?, source_exam_title)
      WHERE id = ?
    `).run(
      subject_id,
      grade_level,
      topic,
      question_text,
      question_type,
      options ? JSON.stringify(options) : null,
      correct_answer,
      points !== undefined ? Number(points) : null,
      explanation,
      difficulty,
      source_exam_title,
      req.params.id
    );

    res.json({ success: true, message: 'Butir soal di Bank Soal berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/question-bank/:id - Delete question from master bank
router.delete('/:id', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    db.prepare('DELETE FROM question_bank WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Soal berhasil dihapus dari Bank Soal' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/question-bank/export-to-exam - Copy questions from Bank Soal to an Exam
router.post('/export-to-exam', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { exam_id, question_ids } = req.body;

    if (!exam_id || !Array.isArray(question_ids) || question_ids.length === 0) {
      return res.status(400).json({ error: 'Ujian tujuan dan butir soal yang dipilih harus disertakan' });
    }

    const exam = db.prepare('SELECT * FROM cbt_exams WHERE id = ?').get(exam_id);
    if (!exam) return res.status(404).json({ error: 'Ujian tujuan tidak ditemukan' });

    let currentMaxNumber = db.prepare('SELECT MAX(question_number) as max_num FROM cbt_questions WHERE exam_id = ?').get(exam_id).max_num || 0;

    const placeholders = question_ids.map(() => '?').join(',');
    const bankItems = db.prepare(`SELECT * FROM question_bank WHERE id IN (${placeholders})`).all(...question_ids);

    const insertQ = db.prepare(`
      INSERT INTO cbt_questions (
        exam_id, question_number, question_text, question_type, options_json, correct_answer, points, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let copiedCount = 0;
    const tx = db.transaction(() => {
      for (const item of bankItems) {
        currentMaxNumber += 1;
        insertQ.run(
          exam_id,
          currentMaxNumber,
          item.question_text,
          item.question_type,
          item.options_json,
          item.correct_answer,
          item.points,
          item.explanation
        );
        copiedCount++;
      }
    });

    tx();

    res.json({
      success: true,
      copied_count: copiedCount,
      message: `${copiedCount} butir soal berhasil disalin ke ujian "${exam.title}"!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/question-bank/import-from-exam/:examId - Import all questions from an Exam into Bank Soal
router.post('/import-from-exam/:examId', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT e.*, s.name as subject_name, c.name as class_name 
      FROM cbt_exams e
      JOIN subjects s ON e.subject_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = ?
    `).get(req.params.examId);

    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    const questions = db.prepare('SELECT * FROM cbt_questions WHERE exam_id = ?').all(exam.id);

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Ujian ini belum memiliki butir soal untuk diimpor' });
    }

    const insertQB = db.prepare(`
      INSERT INTO question_bank (
        teacher_id, subject_id, grade_level, topic, question_text, question_type,
        options_json, correct_answer, points, explanation, difficulty, source_exam_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let addedCount = 0;
    let skippedCount = 0;

    const tx = db.transaction(() => {
      for (const q of questions) {
        // Check if question text already exists in question bank
        const exists = db.prepare('SELECT id FROM question_bank WHERE question_text = ? AND subject_id = ?').get(q.question_text, exam.subject_id);
        if (exists) {
          skippedCount++;
          continue;
        }

        insertQB.run(
          req.user.id,
          exam.subject_id,
          exam.class_name.includes('XI') ? 'Kelas XI' : exam.class_name.includes('XII') ? 'Kelas XII' : 'Kelas X',
          exam.title,
          q.question_text,
          q.question_type,
          q.options_json,
          q.correct_answer,
          q.points,
          q.explanation,
          'SEDANG',
          exam.title
        );
        addedCount++;
      }
    });

    tx();

    res.json({
      success: true,
      added_count: addedCount,
      skipped_count: skippedCount,
      message: `${addedCount} butir soal dari ujian "${exam.title}" berhasil disimpan ke Bank Soal Master!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/question-bank/save-from-exam-question/:questionId - Save single exam question to master bank
router.post('/save-from-exam-question/:questionId', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const q = db.prepare(`
      SELECT cq.*, e.subject_id, e.title as exam_title, c.name as class_name
      FROM cbt_questions cq
      JOIN cbt_exams e ON cq.exam_id = e.id
      JOIN classes c ON e.class_id = c.id
      WHERE cq.id = ?
    `).get(req.params.questionId);

    if (!q) return res.status(404).json({ error: 'Butir soal tidak ditemukan' });

    // Check duplicate
    const exists = db.prepare('SELECT id FROM question_bank WHERE question_text = ?').get(q.question_text);
    if (exists) {
      return res.status(400).json({ error: 'Soal ini sudah ada di dalam Bank Soal Master!' });
    }

    const insert = db.prepare(`
      INSERT INTO question_bank (
        teacher_id, subject_id, grade_level, topic, question_text, question_type,
        options_json, correct_answer, points, explanation, difficulty, source_exam_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      req.user.id,
      q.subject_id,
      q.class_name.includes('XI') ? 'Kelas XI' : q.class_name.includes('XII') ? 'Kelas XII' : 'Kelas X',
      q.exam_title,
      q.question_text,
      q.question_type,
      q.options_json,
      q.correct_answer,
      q.points,
      q.explanation,
      'SEDANG',
      q.exam_title
    );

    res.json({ success: true, message: 'Soal berhasil disimpan ke Bank Soal Master!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
