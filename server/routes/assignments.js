const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const googleDriveService = require('../services/googleDriveService');

// ==========================================
// GOOGLE DRIVE INTEGRATION SETTINGS
// ==========================================

// GET /api/assignments/drive-settings
router.get('/drive-settings', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const settings = googleDriveService.getDriveSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/drive-settings
router.post('/drive-settings', authenticateToken, requireRole(['admin', 'guru']), (req, res) => {
  try {
    const { webhookUrl, parentFolderId } = req.body;
    const updated = googleDriveService.saveDriveSettings({ webhookUrl, parentFolderId });
    res.json({ success: true, message: 'Pengaturan Google Drive berhasil disimpan!', settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/drive-settings/test
router.post('/drive-settings/test', authenticateToken, requireRole(['admin', 'guru']), async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const result = await googleDriveService.testDriveConnection(webhookUrl);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

// POST /api/assignments - Create new assignment(s) with automatic Task & Class folder creation (Guru/Admin)
router.post('/', authenticateToken, requireRole(['admin', 'guru']), async (req, res) => {
  try {
    const { class_id, class_ids, subject_id, title, instructions, due_date, max_points, attachments } = req.body;

    // Normalize class_ids (support array or single class_id)
    let targetClassIds = [];
    if (Array.isArray(class_ids) && class_ids.length > 0) {
      targetClassIds = class_ids.map(Number).filter(id => !isNaN(id) && id > 0);
    } else if (class_id) {
      const parsedId = Number(class_id);
      if (!isNaN(parsedId) && parsedId > 0) {
        targetClassIds = [parsedId];
      }
    }

    if (targetClassIds.length === 0 || !subject_id || !title || !due_date) {
      return res.status(400).json({ error: 'Data tugas belum lengkap (Judul, Minimal 1 Kelas, Mapel, Tenggat Waktu wajib)' });
    }

    // Get class names for all target classes
    const placeholders = targetClassIds.map(() => '?').join(',');
    const targetClasses = db.prepare(`SELECT id, name FROM classes WHERE id IN (${placeholders})`).all(...targetClassIds);
    if (targetClasses.length === 0) {
      return res.status(404).json({ error: 'Kelas sasaran tidak ditemukan' });
    }

    const classNames = targetClasses.map(c => c.name);

    // 1. Automatically create folder structure: Folder Tugas -> Subfolder for each selected class
    const driveFolderResult = await googleDriveService.createTaskAndClassFolders({
      folderTask: title,
      folderClasses: classNames,
      folderClass: classNames[0]
    });

    const insert = db.prepare(`
      INSERT INTO assignments (teacher_id, class_id, subject_id, title, instructions, due_date, max_points, attachments_json, drive_folder_url, task_folder_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdAssignments = [];
    const classFoldersMap = driveFolderResult.classFolders || {};

    const insertTx = db.transaction(() => {
      for (const cls of targetClasses) {
        const clsFolderUrl = classFoldersMap[cls.name]?.url 
          || (classNames.length === 1 ? driveFolderResult.classFolderUrl : null)
          || driveFolderResult.taskFolderUrl;

        const result = insert.run(
          req.user.id,
          cls.id,
          subject_id,
          title,
          instructions || '',
          due_date,
          Number(max_points) || 100,
          JSON.stringify(attachments || []),
          clsFolderUrl,
          driveFolderResult.taskFolderUrl
        );

        const newAssignment = db.prepare(`
          SELECT a.*, c.name as class_name, s.name as subject_name, u.name as teacher_name
          FROM assignments a
          JOIN classes c ON a.class_id = c.id
          JOIN subjects s ON a.subject_id = s.id
          JOIN users u ON a.teacher_id = u.id
          WHERE a.id = ?
        `).get(result.lastInsertRowid);

        createdAssignments.push({
          ...newAssignment,
          attachments: JSON.parse(newAssignment.attachments_json || '[]'),
          drive_folder_url: clsFolderUrl,
          task_folder_url: driveFolderResult.taskFolderUrl,
          class_folder_url: clsFolderUrl
        });
      }
    });

    insertTx();

    res.status(201).json({
      success: true,
      count: createdAssignments.length,
      assignments: createdAssignments,
      ...(createdAssignments[0] || {}),
      drive_creation: driveFolderResult
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
      SELECT id, name, nis_nip as nis, kelas, no_absen, avatar 
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

    const studentSubmissions = students.map((st, idx) => {
      const sub = subMap[st.id];
      let status = 'NOT_SUBMITTED';
      if (sub) {
        status = sub.status; // SUBMITTED or GRADED
      } else if (new Date() > new Date(assignment.due_date)) {
        status = 'MISSING';
      }
      const calculatedAbsen = st.no_absen || (idx + 1);
      return {
        student: {
          ...st,
          absen: String(calculatedAbsen).padStart(2, '0')
        },
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

// POST /api/assignments/:id/submit - Student Turn In with Google Drive Sync
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { content, attachments = [], student_absen, file } = req.body;
    const assignment = db.prepare(`
      SELECT a.*, c.name as class_name 
      FROM assignments a 
      JOIN classes c ON a.class_id = c.id 
      WHERE a.id = ?
    `).get(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    // Determine student nomor absen
    let finalAbsen = student_absen || req.user.no_absen;
    if (!finalAbsen) {
      const classStudents = db.prepare(`
        SELECT id FROM users 
        WHERE role = 'siswa' AND kelas = ? 
        ORDER BY name ASC
      `).all(assignment.class_name);
      const studentIdx = classStudents.findIndex(s => s.id === req.user.id);
      finalAbsen = studentIdx !== -1 ? studentIdx + 1 : 1;
    }

    const processedAttachments = Array.isArray(attachments) ? [...attachments] : [];

    // If student uploaded a file (base64)
    if (file && (file.base64 || file.data)) {
      const driveUpload = await googleDriveService.uploadSubmissionFile({
        folderTask: assignment.title,
        folderClass: assignment.class_name,
        studentAbsen: finalAbsen,
        studentName: req.user.name,
        originalFileName: file.name || 'tugas.pdf',
        fileBase64: file.base64 || file.data,
        mimeType: file.type || 'application/pdf'
      });

      processedAttachments.unshift({
        name: driveUpload.fileName,
        original_name: file.name || 'tugas.pdf',
        size: file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB',
        drive_url: driveUpload.driveUrl,
        drive_file_id: driveUpload.fileId,
        drive_status: driveUpload.driveStatus,
        task_folder_url: driveUpload.taskFolderUrl,
        class_folder_url: driveUpload.classFolderUrl,
        folder_task: driveUpload.folderTask,
        folder_class: driveUpload.folderClass,
        student_absen: driveUpload.studentAbsen,
        student_name: req.user.name
      });

      // Update assignment drive_folder_url if available
      if (driveUpload.taskFolderUrl && driveUpload.taskFolderUrl !== '#' && !assignment.drive_folder_url) {
        db.prepare('UPDATE assignments SET drive_folder_url = ? WHERE id = ?').run(driveUpload.taskFolderUrl, assignment.id);
      }
    }

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
      JSON.stringify(processedAttachments),
      status
    );

    res.json({
      success: true,
      message: 'Tugas berhasil diserahkan dan diproses ke Google Drive!',
      attachments: processedAttachments
    });
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

// POST /api/assignments/:id/create-folders - Ensure / sync Task Folder & Class Folder creation
router.post('/:id/create-folders', authenticateToken, requireRole(['admin', 'guru']), async (req, res) => {
  try {
    const assignment = db.prepare(`
      SELECT a.*, c.name as class_name 
      FROM assignments a 
      JOIN classes c ON a.class_id = c.id 
      WHERE a.id = ?
    `).get(req.params.id);

    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    const driveFolderResult = await googleDriveService.createTaskAndClassFolders({
      folderTask: assignment.title,
      folderClass: assignment.class_name,
      folderClasses: [assignment.class_name]
    });

    const classFolderUrl = driveFolderResult.classFolders?.[assignment.class_name]?.url || driveFolderResult.classFolderUrl;
    const taskFolderUrl = driveFolderResult.taskFolderUrl;

    db.prepare('UPDATE assignments SET drive_folder_url = ?, task_folder_url = ? WHERE id = ?')
      .run(classFolderUrl, taskFolderUrl, assignment.id);

    res.json({
      success: true,
      message: 'Folder tugas dan folder kelas berhasil dipastikan/dibuat!',
      drive_folder_url: classFolderUrl,
      task_folder_url: taskFolderUrl,
      drive_creation: driveFolderResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id/local-files - List all submitted files stored in local task/class directory
router.get('/:id/local-files', authenticateToken, (req, res) => {
  try {
    const assignment = db.prepare(`
      SELECT a.*, c.name as class_name 
      FROM assignments a 
      JOIN classes c ON a.class_id = c.id 
      WHERE a.id = ?
    `).get(req.params.id);

    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    const cleanFolderTask = googleDriveService.sanitizeName(assignment.title) || 'Tugas Kelas';
    const cleanFolderClass = googleDriveService.sanitizeName(assignment.class_name) || 'Semua Kelas';
    const localDir = path.join(__dirname, '..', 'uploads', 'assignments', cleanFolderTask, cleanFolderClass);

    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const files = fs.readdirSync(localDir).map(file => {
      const filePath = path.join(localDir, file);
      const stat = fs.statSync(filePath);
      return {
        name: file,
        size: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
        sizeBytes: stat.size,
        updatedAt: stat.mtime,
        url: `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}/${encodeURIComponent(cleanFolderClass)}/${encodeURIComponent(file)}`
      };
    });

    res.json({
      task: cleanFolderTask,
      class: cleanFolderClass,
      folderPath: `/uploads/assignments/${encodeURIComponent(cleanFolderTask)}/${encodeURIComponent(cleanFolderClass)}`,
      files
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
