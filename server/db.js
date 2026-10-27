const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'lms.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'guru', 'siswa')) NOT NULL,
      nis_nip TEXT,
      kelas TEXT,
      gender TEXT DEFAULT 'L',
      no_absen INTEGER,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- CLASSES TABLE
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      level TEXT NOT NULL,
      academic_year TEXT NOT NULL
    );

    -- SUBJECTS TABLE
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- PRESENSI / ATTENDANCE SESSIONS
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      session_title TEXT NOT NULL,
      session_code TEXT,
      is_open INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ATTENDANCE RECORDS
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat')) NOT NULL,
      notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, student_id),
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- JURNAL MENGAJAR GURU
    CREATE TABLE IF NOT EXISTS teaching_journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      topic TEXT NOT NULL,
      learning_outcomes TEXT,
      activities TEXT NOT NULL,
      student_notes TEXT,
      follow_up TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- GRADE WEIGHTS CONFIGURATION
    CREATE TABLE IF NOT EXISTS grade_weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      attendance_weight REAL DEFAULT 15,
      assignment_weight REAL DEFAULT 35,
      formatif_weight REAL DEFAULT 25,
      sumatif_weight REAL DEFAULT 25,
      kkm REAL DEFAULT 75,
      UNIQUE(teacher_id, class_id, subject_id),
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- GRADES LEDGER
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      category TEXT CHECK(category IN ('TUGAS', 'FORMATIF', 'SUMATIF_LM', 'SUMATIF_PAS')) NOT NULL,
      title TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL DEFAULT 100,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    -- ASSIGNMENTS (TUGAS ALA GOOGLE CLASSROOM)
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      due_date TEXT NOT NULL,
      max_points INTEGER DEFAULT 100,
      attachments_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- ASSIGNMENT SUBMISSIONS
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      content TEXT,
      attachments_json TEXT DEFAULT '[]',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT CHECK(status IN ('SUBMITTED', 'GRADED', 'LATE')) DEFAULT 'SUBMITTED',
      score REAL,
      teacher_feedback TEXT,
      graded_at DATETIME,
      UNIQUE(assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- CBT EXAMS (UJIAN ONLINE)
    CREATE TABLE IF NOT EXISTS cbt_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      token TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      start_time TEXT,
      end_time TEXT,
      randomize_questions INTEGER DEFAULT 1,
      randomize_options INTEGER DEFAULT 1,
      max_violations INTEGER DEFAULT 3,
      status TEXT CHECK(status IN ('DRAFT', 'ACTIVE', 'FINISHED')) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- CBT QUESTIONS (BANK SOAL)
    CREATE TABLE IF NOT EXISTS cbt_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT CHECK(question_type IN ('MULTIPLE_CHOICE', 'ESSAY')) DEFAULT 'MULTIPLE_CHOICE',
      options_json TEXT, -- array of { id: 'A', text: '...' }
      correct_answer TEXT, -- 'A', 'B', etc.
      points REAL DEFAULT 10,
      explanation TEXT,
      FOREIGN KEY (exam_id) REFERENCES cbt_exams(id) ON DELETE CASCADE
    );

    -- CBT SESSIONS (STUDENT EXAM SESSIONS)
    CREATE TABLE IF NOT EXISTS cbt_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      remaining_seconds INTEGER,
      status TEXT CHECK(status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'BLOCKED')) DEFAULT 'NOT_STARTED',
      answers_json TEXT DEFAULT '{}', -- { question_id: { answer: 'A', doubtful: false } }
      score REAL DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      device_info TEXT,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, student_id),
      FOREIGN KEY (exam_id) REFERENCES cbt_exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- CBT PROCTOR LOGS (LIVE MONITORING EVENTS)
    CREATE TABLE IF NOT EXISTS cbt_proctor_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, -- 'TAB_SWITCH', 'BLUR', 'FULLSCREEN_EXIT', 'TIME_EXTEND', 'FORCE_SUBMIT', 'RESET_LOGIN'
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES cbt_exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- MASTER QUESTION BANK (BANK SOAL TERPADU & REUSABLE LINTAS KELAS)
    CREATE TABLE IF NOT EXISTS question_bank (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      grade_level TEXT DEFAULT 'Kelas X', -- 'Kelas X', 'Kelas XI', 'Kelas XII', 'Semua Tingkat'
      topic TEXT,
      question_text TEXT NOT NULL,
      question_type TEXT CHECK(question_type IN ('MULTIPLE_CHOICE', 'ESSAY')) DEFAULT 'MULTIPLE_CHOICE',
      options_json TEXT, -- array of { id: 'A', text: '...' }
      correct_answer TEXT, -- 'A', 'B', etc.
      points REAL DEFAULT 10,
      explanation TEXT,
      difficulty TEXT CHECK(difficulty IN ('MUDAH', 'SEDANG', 'SULIT', 'HOTS')) DEFAULT 'SEDANG',
      source_exam_title TEXT, -- e.g. 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- SYSTEM SETTINGS TABLE (Google Drive, App Configs, etc.)
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe schema migrations
  try {
    db.exec('ALTER TABLE users ADD COLUMN no_absen INTEGER');
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'L'");
  } catch (e) {}
  try {
    db.prepare(`
      UPDATE users SET gender = 'P' 
      WHERE (gender IS NULL OR gender = '' OR gender = 'female' OR gender = 'L') AND username IN ('siswa_dewi', 'siswa_putri', 'siswa_zahra', 'siswa_naya', 'guru_siti')
    `).run();
    db.prepare(`
      UPDATE users SET gender = 'L' 
      WHERE gender IS NULL OR gender = '' OR gender = 'male'
    `).run();
  } catch (e) {}
  try {
    db.exec('ALTER TABLE assignments ADD COLUMN drive_folder_url TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE assignments ADD COLUMN task_folder_url TEXT');
  } catch (e) {}

  seedData();
  seedQuestionBank();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial LMS database...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  // 1. Classes
  const insertClass = db.prepare('INSERT INTO classes (name, level, academic_year) VALUES (?, ?, ?)');
  const c1 = insertClass.run('X-IPA-1', 'Kelas 10', '2026/2027').lastInsertRowid;
  const c2 = insertClass.run('X-IPA-2', 'Kelas 10', '2026/2027').lastInsertRowid;
  const c3 = insertClass.run('XI-IPA-1', 'Kelas 11', '2026/2027').lastInsertRowid;

  // 2. Users (Admin, Guru, Siswa)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, email, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run('admin', passwordHash, 'Administrator LMS', 'admin', 'ADM001', null, 'L', 'admin@sekolah.sch.id', '08120000001', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin');

  // Teachers
  const g1 = insertUser.run('guru_budi', passwordHash, 'Budi Santoso, S.Pd.', 'guru', '198501012010011001', 'X-8', 'L', 'budi@sekolah.sch.id', '08120000002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=budi').lastInsertRowid;
  const g2 = insertUser.run('guru_siti', passwordHash, 'Siti Rahmawati, M.Pd.', 'guru', '198705122011012002', 'X-9', 'P', 'siti@sekolah.sch.id', '08120000003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=siti').lastInsertRowid;

  // Students (Imported Real Students)
  try {
    const { parseAndSeed } = require('./scripts/seed_students');
    parseAndSeed();
  } catch (e) {
    console.error('Error seeding students:', e);
  }

  // 3. Subjects
  const insertSubj = db.prepare('INSERT INTO subjects (name, code, teacher_id) VALUES (?, ?, ?)');
  const sub1 = insertSubj.run('Matematika Wajib', 'MAT-10', g1).lastInsertRowid;
  const sub2 = insertSubj.run('Fisika Peminatan', 'FIS-10', g1).lastInsertRowid;
  const sub3 = insertSubj.run('Bahasa Indonesia', 'BIN-10', g2).lastInsertRowid;

  // 4. Grade Weights
  const insertWeight = db.prepare(`
    INSERT INTO grade_weights (teacher_id, class_id, subject_id, attendance_weight, assignment_weight, formatif_weight, sumatif_weight, kkm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertWeight.run(g1, c1, sub1, 15, 30, 25, 30, 75);
  insertWeight.run(g1, c1, sub2, 10, 30, 30, 30, 75);
  insertWeight.run(g2, c1, sub3, 15, 35, 25, 25, 75);

  // 5. Presensi Sesi & Data Contoh
  const insertSession = db.prepare(`
    INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, date, time_start, time_end, session_title, session_code, is_open)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sess1 = insertSession.run(c1, sub1, g1, '2026-10-18', '07:30', '09:00', 'Pertemuan 1: Sistem Persamaan Linear Tiga Variabel', 'MAT789', 0).lastInsertRowid;
  const sess2 = insertSession.run(c1, sub1, g1, '2026-10-20', '07:30', '09:00', 'Pertemuan 2: Metode Eliminasi dan Substitusi', 'MAT912', 1).lastInsertRowid;

  const insertAttRecord = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status, notes)
    VALUES (?, ?, ?, ?)
  `);
  
  // Records for session 1
  insertAttRecord.run(sess1, studentIds[0].id, 'Hadir', 'Tepat waktu');
  insertAttRecord.run(sess1, studentIds[1].id, 'Hadir', 'Tepat waktu');
  insertAttRecord.run(sess1, studentIds[2].id, 'Sakit', 'Ada surat dokter');
  insertAttRecord.run(sess1, studentIds[3].id, 'Hadir', 'Tepat waktu');
  insertAttRecord.run(sess1, studentIds[4].id, 'Terlambat', 'Terlambat 10 menit');
  insertAttRecord.run(sess1, studentIds[5].id, 'Hadir', 'Tepat waktu');
  insertAttRecord.run(sess1, studentIds[6].id, 'Izin', 'Kegiatan lomba OSIS');
  insertAttRecord.run(sess1, studentIds[7].id, 'Hadir', 'Tepat waktu');

  // Records for session 2 (live open)
  insertAttRecord.run(sess2, studentIds[0].id, 'Hadir', 'Presensi mandiri');
  insertAttRecord.run(sess2, studentIds[1].id, 'Hadir', 'Presensi mandiri');
  insertAttRecord.run(sess2, studentIds[3].id, 'Hadir', 'Presensi mandiri');

  // 6. Jurnal Mengajar Guru
  const insertJournal = db.prepare(`
    INSERT INTO teaching_journals (teacher_id, class_id, subject_id, date, time_slot, topic, learning_outcomes, activities, student_notes, follow_up)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertJournal.run(
    g1, c1, sub1, '2026-10-18', 'Jam ke 1-2 (07.30 - 09.00)',
    'Konsep Dasar SPLTV dalam Kehidupan Nyata',
    'Siswa mampu memodelkan masalah kontekstual ke dalam bentuk sistem persamaan linear',
    'Apersepsi masalah belanja pasar, diskusi kelompok pemodelan matematika, presentasi 2 kelompok perwakilan.',
    'Rendy izin sakit. Reza masih butuh bimbingan dalam menentukan variabel persamaan.',
    'Diberikan lembar latihan terstruktur dan pendampingan tutor sebaya.'
  );
  insertJournal.run(
    g1, c1, sub1, '2026-10-20', 'Jam ke 1-2 (07.30 - 09.00)',
    'Penyelesaian SPLTV Metode Gabungan Eliminasi-Substitusi',
    'Siswa terampil menentukan himpunan penyelesaian SPLTV dengan cepat dan teliti',
    'Demonstrasi langkah eliminasi bertingkat, pengerjaan kuis kilat interaktif menggunakan LMS, pembahasan soal HOTS.',
    'Siswa sangat antusias dengan kuis interaktif. 85% siswa mencapai KKM pada latihan harian.',
    'Lanjutkan ke materi pertidaksamaan linear dua variabel pekan depan.'
  );

  // 7. Assignments (Google Classroom Style)
  const insertAssign = db.prepare(`
    INSERT INTO assignments (teacher_id, class_id, subject_id, title, instructions, due_date, max_points, attachments_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const a1 = insertAssign.run(
    g1, c1, sub1,
    'Tugas 1: Pemodelan SPLTV Kasus Perekonomian UMKM',
    'Silakan unduh studi kasus terlampir. Buat model matematika SPLTV dan tentukan solusi keuntungan maksimum. Tuliskan langkah pengerjaan dengan rapi, foto atau scan dalam format PDF/JPG lalu unggah di sini sebelum tenggat waktu.',
    '2026-10-25 23:59',
    100,
    JSON.stringify([
      { name: 'Studi_Kasus_UMKM_SPLTV.pdf', url: 'https://example.com/files/spltv.pdf', size: '1.2 MB' }
    ])
  ).lastInsertRowid;

  const a2 = insertAssign.run(
    g1, c1, sub1,
    'Tugas 2: Resume Metode Determinan Matriks (Metode Cramer)',
    'Pelajari materi matriks dan buat rangkuman 1-2 halaman mengenai cara menyelesaikan SPLTV menggunakan aturan Cramer disertai 1 contoh soal.',
    '2026-10-28 17:00',
    100,
    JSON.stringify([])
  ).lastInsertRowid;

  // Assignment Submissions & Grades
  const insertSubm = db.prepare(`
    INSERT INTO assignment_submissions (assignment_id, student_id, content, attachments_json, submitted_at, status, score, teacher_feedback, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSubm.run(
    a1, studentIds[0].id,
    'Berikut tugas pemodelan SPLTV Pak Budi. Saya menggunakan metode eliminasi kemudian substitusi variabel z.',
    JSON.stringify([{ name: 'Ahmad_Faiz_Tugas_SPLTV.pdf', url: '#', size: '850 KB' }]),
    '2026-10-21 08:30:00',
    'GRADED',
    95,
    'Luar biasa Ahmad! Pemodelan sangat rapi dan jawaban akhir tepat.',
    '2026-10-21 09:15:00'
  );
  insertSubm.run(
    a1, studentIds[1].id,
    'Tugas saya kumpulkan, mohon koreksinya jika ada perhitungan determinan yang keliru.',
    JSON.stringify([{ name: 'Dewi_Anjani_Jawaban.pdf', url: '#', size: '1.1 MB' }]),
    '2026-10-21 08:45:00',
    'GRADED',
    90,
    'Sangat baik Dewi, sedikit koreksi pada notasi himpunan penyelesaian.',
    '2026-10-21 09:20:00'
  );
  insertSubm.run(
    a1, studentIds[2].id,
    'Pak, ini jawaban tugas saya menyusul karena kemarin sakit.',
    JSON.stringify([{ name: 'Rendy_SPLTV.jpg', url: '#', size: '2.4 MB' }]),
    '2026-10-21 10:00:00',
    'SUBMITTED',
    null,
    null,
    null
  );

  // 8. Grades Ledger (Sample entries)
  const insertGrade = db.prepare(`
    INSERT INTO grades (student_id, subject_id, class_id, category, title, score, max_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Format grades for students
  for (let i = 0; i < studentIds.length; i++) {
    const s = studentIds[i];
    // Tugas 1
    insertGrade.run(s.id, sub1, c1, 'TUGAS', 'Tugas 1: Pemodelan SPLTV', 80 + (i % 4) * 5, 100, 'Tugas terstruktur');
    // Formatif 1
    insertGrade.run(s.id, sub1, c1, 'FORMATIF', 'Asesmen Formatif 1 (Kuis)', 75 + (i * 3) % 25, 100, 'Kuis SPLTV');
    // Sumatif Lingkup Materi 1
    insertGrade.run(s.id, sub1, c1, 'SUMATIF_LM', 'Sumatif Bab 1 (SPLTV)', 78 + (i * 2) % 22, 100, 'Ujian blok materi');
  }

  // 9. CBT Exam Setup (Rich test ready for Live Monitoring!)
  const insertExam = db.prepare(`
    INSERT INTO cbt_exams (
      teacher_id, class_id, subject_id, title, description, token, duration_minutes,
      start_time, end_time, randomize_questions, randomize_options, max_violations, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const exam1 = insertExam.run(
    g1, c1, sub1,
    'Asesmen Sumatif Tengah Semester: Matematika Wajib X',
    'Ujian CBT resmi Matematika Wajib materi Sistem Persamaan Linear dan Pertidaksamaan Kuadrat. Dilarang membuka tab lain atau keluar dari mode layar penuh selama pengerjaan berlangsung.',
    'CBT2026',
    45, // 45 minutes
    '2026-10-21 07:00',
    '2026-10-21 12:00',
    1,
    1,
    3,
    'ACTIVE'
  ).lastInsertRowid;

  // Insert Questions for CBT Exam
  const insertQ = db.prepare(`
    INSERT INTO cbt_questions (exam_id, question_number, question_text, question_type, options_json, correct_answer, points, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleQuestions = [
    {
      q: 'Diketahui sistem persamaan linear tiga variabel:\n2x + y - z = 5\nx - 2y + 3z = 4\n3x - y + 2z = 9\nNilai dari x + y + z adalah...',
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'A', text: '4' },
        { id: 'B', text: '5' },
        { id: 'C', text: '6' },
        { id: 'D', text: '7' },
        { id: 'E', text: '8' }
      ],
      ans: 'C',
      pts: 15,
      exp: 'Dengan eliminasi persamaan (1) dan (3), diperoleh x=2, y=1, z=3, sehingga x+y+z = 6.'
    },
    {
      q: 'Tiga bersaudara Ali, Budi, dan Cici mengumpulkan uang tabungan. Jumlah tabungan Ali dan Budi adalah Rp300.000. Jumlah tabungan Budi dan Cici adalah Rp450.000, sedangkan jumlah tabungan Ali dan Cici adalah Rp350.000. Berapakah besar tabungan Budi?',
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'A', text: 'Rp100.000' },
        { id: 'B', text: 'Rp150.000' },
        { id: 'C', text: 'Rp200.000' },
        { id: 'D', text: 'Rp250.000' },
        { id: 'E', text: 'Rp300.000' }
      ],
      ans: 'C',
      pts: 15,
      exp: 'Jumlah seluruh tabungan (A+B+C) = (300.000 + 450.000 + 350.000) / 2 = 550.000. Tabungan Budi = (A+B+C) - (A+C) = 550.000 - 350.000 = 200.000.'
    },
    {
      q: 'Himpunan penyelesaian dari pertidaksamaan kuadrat x² - 5x - 14 ≤ 0 adalah...',
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'A', text: '{x | -2 ≤ x ≤ 7, x ∈ R}' },
        { id: 'B', text: '{x | -7 ≤ x ≤ 2, x ∈ R}' },
        { id: 'C', text: '{x | x ≤ -2 atau x ≥ 7, x ∈ R}' },
        { id: 'D', text: '{x | x ≤ -7 atau x ≥ 2, x ∈ R}' },
        { id: 'E', text: '{x | -2 < x < 7, x ∈ R}' }
      ],
      ans: 'A',
      pts: 15,
      exp: 'Faktorisasi: (x - 7)(x + 2) ≤ 0. Titik pembuat nol adalah x = -2 dan x = 7. Daerah bertanda negatif di antara -2 dan 7.'
    },
    {
      q: 'Grafik fungsi kuadrat f(x) = ax² + bx + c memiliki titik puncak di (2, -9) dan memotong sumbu Y di titik (0, -5). Nilai a + b + c adalah...',
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'A', text: '-8' },
        { id: 'B', text: '-5' },
        { id: 'C', text: '-3' },
        { id: 'D', text: '0' },
        { id: 'E', text: '4' }
      ],
      ans: 'A',
      pts: 20,
      exp: 'Bentuk rumus: f(x) = a(x - xp)² + yp => f(x) = a(x - 2)² - 9. Lewat (0, -5) => -5 = a(0 - 2)² - 9 => 4a = 4 => a = 1. f(x) = 1(x - 2)² - 9 = x² - 4x - 5. Maka a=1, b=-4, c=-5. a+b+c = 1 - 4 - 5 = -8.'
    },
    {
      q: 'Manakah di antara pernyataan berikut yang BENAR mengenai sistem pertidaksamaan linear dua variabel?',
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'A', text: 'Daerah penyelesaian selalu berupa daerah tertutup (bounded region)' },
        { id: 'B', text: 'Titik uji (0,0) tidak dapat digunakan jika garis batas tidak melalui titik pusat' },
        { id: 'C', text: 'Garis batas digambar putus-putus jika pertidaksamaan memuat tanda < atau >' },
        { id: 'D', text: 'Jumlah pertidaksamaan linear harus selalu sama dengan jumlah variabel' },
        { id: 'E', text: 'Nilai optimum selalu terjadi di dalam daerah penyelesaian bukan di titik pojok' }
      ],
      ans: 'C',
      pts: 15,
      exp: 'Tanda ketidaksamaan murni (< atau >) menandakan garis batas bukan bagian penyelesaian sehingga digambar putus-putus.'
    },
    {
      q: 'Jelaskan langkah-langkah sistematis dalam menyelesaikan permasalahan nyata menggunakan pemodelan matematika SPLTV!',
      type: 'ESSAY',
      options: [],
      ans: 'Menentukan variabel (x,y,z), menyusun model persamaan matematika berdasarkan informasi soal, menyelesaikan sistem persamaan dengan metode eliminasi/substitusi, menginterpretasikan hasil kembali ke konteks masalah nyata.',
      pts: 20,
      exp: 'Kriteria penilaian: Ketepatan langkah identifikasi variabel (5), konstruksi model (5), metode penyelesaian (5), interpretasi kontekstual (5).'
    }
  ];

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    insertQ.run(
      exam1,
      i + 1,
      q.q,
      q.type,
      JSON.stringify(q.options),
      q.ans,
      q.pts,
      q.exp
    );
  }

  // 10. Pre-seed some CBT student sessions so teacher sees LIVE MONITOR immediately!
  const insertCBTSession = db.prepare(`
    INSERT INTO cbt_sessions (
      exam_id, student_id, start_time, remaining_seconds, status, answers_json, score, violation_count, device_info, last_active_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProctorLog = db.prepare(`
    INSERT INTO cbt_proctor_logs (exam_id, student_id, event_type, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Ahmad: Active, 4/6 answered, 0 violations
  insertCBTSession.run(
    exam1, studentIds[0].id, '2026-10-21 07:15:00', 1850, 'IN_PROGRESS',
    JSON.stringify({ 1: { answer: 'C', doubtful: false }, 2: { answer: 'C', doubtful: false }, 3: { answer: 'A', doubtful: false }, 4: { answer: 'A', doubtful: true } }),
    45, 0, 'Chrome 122 on Windows 11', '2026-10-21 07:22:00'
  );

  // Dewi: Active, 5/6 answered, 1 violation (tab switch)
  insertCBTSession.run(
    exam1, studentIds[1].id, '2026-10-21 07:10:00', 1420, 'IN_PROGRESS',
    JSON.stringify({ 1: { answer: 'C', doubtful: false }, 2: { answer: 'C', doubtful: false }, 3: { answer: 'A', doubtful: false }, 4: { answer: 'A', doubtful: false }, 5: { answer: 'C', doubtful: false } }),
    65, 1, 'Edge 121 on Windows 10', '2026-10-21 07:22:30'
  );
  insertProctorLog.run(exam1, studentIds[1].id, 'TAB_SWITCH', 'Pindah tab ke browser lain selama 3 detik', '2026-10-21 07:18:22');

  // Rendy: Blocked / Warning (3 violations!)
  insertCBTSession.run(
    exam1, studentIds[2].id, '2026-10-21 07:12:00', 1600, 'BLOCKED',
    JSON.stringify({ 1: { answer: 'B', doubtful: false }, 2: { answer: 'A', doubtful: false } }),
    0, 3, 'Chrome Mobile on Android 14', '2026-10-21 07:19:10'
  );
  insertProctorLog.run(exam1, studentIds[2].id, 'TAB_SWITCH', 'Membuka aplikasi lain (WhatsApp)', '2026-10-21 07:14:15');
  insertProctorLog.run(exam1, studentIds[2].id, 'FULLSCREEN_EXIT', 'Keluar dari mode layar penuh', '2026-10-21 07:16:30');
  insertProctorLog.run(exam1, studentIds[2].id, 'TAB_SWITCH', 'Membuka tab baru browser (Toleransi habis)', '2026-10-21 07:19:10');

  // Putri: Submitted! (Finished with score 90)
  insertCBTSession.run(
    exam1, studentIds[3].id, '2026-10-21 07:05:00', 0, 'SUBMITTED',
    JSON.stringify({ 1: { answer: 'C', doubtful: false }, 2: { answer: 'C', doubtful: false }, 3: { answer: 'A', doubtful: false }, 4: { answer: 'A', doubtful: false }, 5: { answer: 'C', doubtful: false }, 6: { answer: 'Langkah sistematis: 1. Definisikan variabel x,y,z...', doubtful: false } }),
    90, 0, 'Firefox 123 on macOS', '2026-10-21 07:35:00'
  );

  // Reza: In progress
  insertCBTSession.run(
    exam1, studentIds[4].id, '2026-10-21 07:20:00', 2100, 'IN_PROGRESS',
    JSON.stringify({ 1: { answer: 'C', doubtful: false }, 2: { answer: 'D', doubtful: true } }),
    15, 0, 'Chrome 122 on Windows 11', '2026-10-21 07:22:15'
  );

  // Zahra, Dimas, Naya: Not started yet

  console.log('Database seeded successfully with Users, Classes, Subjects, Journals, Attendance, Assignments, and CBT Exam with Live Monitor sessions!');
}

function seedQuestionBank() {
  try {
    const qCount = db.prepare('SELECT COUNT(*) as count FROM question_bank').get().count;
    if (qCount > 0) return;

    const teacher = db.prepare("SELECT id FROM users WHERE role = 'guru' LIMIT 1").get();
    const teacherId = teacher ? teacher.id : 2;

    const ensureSubject = (name, code) => {
      let s = db.prepare('SELECT id FROM subjects WHERE name = ? OR name LIKE ?').get(name, `%${name}%`);
      if (!s) {
        const res = db.prepare('INSERT INTO subjects (name, code, teacher_id) VALUES (?, ?, ?)').run(name, code, teacherId);
        return res.lastInsertRowid;
      }
      return s.id;
    };

    const mathId = ensureSubject('Matematika Wajib', 'MAT-10');
    const fisikaId = ensureSubject('Fisika Peminatan', 'FIS-10');
    const bindoId = ensureSubject('Bahasa Indonesia', 'BIN-10');
    const biologiId = ensureSubject('Biologi', 'BIO-10');
    const kimiaId = ensureSubject('Kimia', 'KIM-10');
    const bingId = ensureSubject('Bahasa Inggris', 'BIG-10');

    const insertQB = db.prepare(`
      INSERT INTO question_bank (
        teacher_id, subject_id, grade_level, topic, question_text, question_type,
        options_json, correct_answer, points, explanation, difficulty, source_exam_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const masterQuestions = [
      // Matematika
      {
        sub: mathId,
        grade: 'Kelas X',
        topic: 'SPLTV (Sistem Persamaan Tiga Variabel)',
        text: 'Diketahui sistem persamaan linear tiga variabel:\n2x + y - z = 5\nx - 2y + 3z = 4\n3x - y + 2z = 9\nNilai dari x + y + z adalah...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: '4' },
          { id: 'B', text: '5' },
          { id: 'C', text: '6' },
          { id: 'D', text: '7' },
          { id: 'E', text: '8' }
        ],
        ans: 'C',
        pts: 15,
        exp: 'Dengan metode eliminasi-substitusi diperoleh x=2, y=1, z=3. Jumlah x+y+z = 2+1+3 = 6.',
        diff: 'SEDANG',
        source: 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      },
      {
        sub: mathId,
        grade: 'Kelas X',
        topic: 'Aplikasi SPLTV (Soal Cerita)',
        text: 'Tiga bersaudara Ali, Budi, dan Cici mengumpulkan uang tabungan. Jumlah tabungan Ali dan Budi adalah Rp300.000. Jumlah tabungan Budi dan Cici adalah Rp450.000, sedangkan jumlah tabungan Ali dan Cici adalah Rp350.000. Berapakah besar tabungan Budi?',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: 'Rp100.000' },
          { id: 'B', text: 'Rp150.000' },
          { id: 'C', text: 'Rp200.000' },
          { id: 'D', text: 'Rp250.000' },
          { id: 'E', text: 'Rp300.000' }
        ],
        ans: 'C',
        pts: 15,
        exp: 'Jumlah tabungan bertiga: (300rb + 450rb + 350rb) / 2 = 550rb. Maka Budi = 550rb - (Ali+Cici) = 550rb - 350rb = Rp200.000.',
        diff: 'HOTS',
        source: 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      },
      {
        sub: mathId,
        grade: 'Kelas X',
        topic: 'Pertidaksamaan Kuadrat',
        text: 'Himpunan penyelesaian dari pertidaksamaan kuadrat x² - 5x - 14 ≤ 0 adalah...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: '{x | -2 ≤ x ≤ 7, x ∈ R}' },
          { id: 'B', text: '{x | -7 ≤ x ≤ 2, x ∈ R}' },
          { id: 'C', text: '{x | x ≤ -2 atau x ≥ 7, x ∈ R}' },
          { id: 'D', text: '{x | x ≤ -7 atau x ≥ 2, x ∈ R}' },
          { id: 'E', text: '{x | -2 < x < 7, x ∈ R}' }
        ],
        ans: 'A',
        pts: 15,
        exp: 'Faktorisasi: (x - 7)(x + 2) ≤ 0. Pembuat nol x = -2 dan x = 7. Uji tanda memberikan interval bertanda negatif [-2, 7].',
        diff: 'MUDAH',
        source: 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      },
      {
        sub: mathId,
        grade: 'Kelas X',
        topic: 'Fungsi Kuadrat',
        text: 'Grafik fungsi kuadrat f(x) = ax² + bx + c memiliki titik puncak di (2, -9) dan memotong sumbu Y di titik (0, -5). Nilai a + b + c adalah...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: '-8' },
          { id: 'B', text: '-5' },
          { id: 'C', text: '-3' },
          { id: 'D', text: '0' },
          { id: 'E', text: '4' }
        ],
        ans: 'A',
        pts: 20,
        exp: 'Gunakan bentuk verteks: f(x) = a(x - 2)² - 9. Substitusi (0, -5) didapat a=1. Persamaannya f(x) = x² - 4x - 5. Maka a+b+c = 1 - 4 - 5 = -8.',
        diff: 'SULIT',
        source: 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      },
      {
        sub: mathId,
        grade: 'Kelas X',
        topic: 'Pemodelan SPLTV',
        text: 'Jelaskan langkah-langkah sistematis dalam menyelesaikan permasalahan nyata menggunakan pemodelan matematika SPLTV!',
        type: 'ESSAY',
        opts: [],
        ans: '1. Mengidentifikasi besaran dan menetapkan variabel (x, y, z).\n2. Menerjemahkan kalimat cerita ke model aljabar sistem persamaan linear.\n3. Mengoperasikan metode eliminasi dan substitusi bertahap.\n4. Memeriksa kembali solusi dan menuliskan kesimpulan sesuai konteks permasalahan.',
        pts: 20,
        exp: 'Rubrik: Identifikasi variabel (5), konstruksi model matematika (5), metode eliminasi-substitusi (5), kesimpulan kontekstual (5).',
        diff: 'HOTS',
        source: 'Asesmen Sumatif Akhir Semester: Matematika Wajib'
      },
      // Fisika
      {
        sub: fisikaId,
        grade: 'Kelas XI',
        topic: 'Hukum Newton & Dinamika Gerak',
        text: 'Sebuah balok bermassa 5 kg ditarik dengan gaya mendatar F = 30 N di atas lantai kasar dengan koefisien gesek kinetis μk = 0,2. Jika percepatan gravitasi bumi g = 10 m/s², maka percepatan yang dialami balok tersebut adalah...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: '2 m/s²' },
          { id: 'B', text: '4 m/s²' },
          { id: 'C', text: '5 m/s²' },
          { id: 'D', text: '6 m/s²' },
          { id: 'E', text: '8 m/s²' }
        ],
        ans: 'B',
        pts: 15,
        exp: 'Gaya gesek f = μk × N = 0,2 × (5 × 10) = 10 N. Gaya resultan ∑F = F - f = 30 - 10 = 20 N. Percepatan a = ∑F / m = 20 / 5 = 4 m/s².',
        diff: 'SEDANG',
        source: 'Bank Soal Fisika Mekanika'
      },
      {
        sub: fisikaId,
        grade: 'Kelas XII',
        topic: 'Elektrostatika & Hukum Coulomb',
        text: 'Dua buah muatan titik masing-masing q1 = +4 μC dan q2 = -9 μC terpisah pada jarak 30 cm di udara (k = 9 × 10⁹ N.m²/C²). Besar dan sifat gaya elektrostatik antara kedua muatan adalah...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: '3,6 N (Tolak-menolak)' },
          { id: 'B', text: '3,6 N (Tarik-menarik)' },
          { id: 'C', text: '7,2 N (Tolak-menolak)' },
          { id: 'D', text: '7,2 N (Tarik-menarik)' },
          { id: 'E', text: '1,2 N (Tarik-menarik)' }
        ],
        ans: 'B',
        pts: 15,
        exp: 'F = k × |q1 × q2| / r² = 9×10⁹ × (4×10⁻⁶ × 9×10⁻⁶) / (0,3)² = 3,6 N. Karena muatan berlainan jenis (+ dan -), sifat gayanya adalah tarik-menarik.',
        diff: 'SEDANG',
        source: 'Bank Soal Fisika Listrik Statis'
      },
      // Biologi
      {
        sub: biologiId,
        grade: 'Kelas XII',
        topic: 'Metabolisme Sel (Fotosintesis)',
        text: 'Pada proses fotosintesis tumbuhan C3, reaksi fotolisis air dan aliran elektron nonsiklik pada tilakoid kloroplas menghasilkan dua komponen berenergi tinggi yang esensial untuk fiksasi CO2 pada siklus Calvin, yaitu...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: 'Glukosa dan Oksigen (O2)' },
          { id: 'B', text: 'ATP dan NADPH' },
          { id: 'C', text: 'NADH dan FADH2' },
          { id: 'D', text: 'Asam Piruvat dan Asetil Ko-A' },
          { id: 'E', text: 'RuBP dan PGAL' }
        ],
        ans: 'B',
        pts: 15,
        exp: 'Reaksi terang fotofosforilasi non-siklik menghasilkan ATP dan NADPH sebagai donor energi dan daya reduksi dalam stroma pada siklus Calvin.',
        diff: 'SEDANG',
        source: 'Bank Soal Biologi Seluler'
      },
      {
        sub: biologiId,
        grade: 'Kelas XI',
        topic: 'Sistem Sirkulasi Manusia',
        text: 'Jelaskan perbedaan struktur anatomis serta fungsi fisiologis antara pembuluh darah arteri (nadi) dan vena (balik) pada manusia!',
        type: 'ESSAY',
        opts: [],
        ans: 'Arteri memiliki dinding tebal berotot elastis, membawa darah kaya O2 keluar dari jantung (bertekanan tinggi), katup hanya di pangkal aorta. Vena memiliki dinding tipis kurang elastis, membawa darah kembali ke jantung (bertekanan rendah), memiliki banyak katup di sepanjang pembuluh untuk mencegah aliran balik.',
        pts: 20,
        exp: 'Rubrik penilaian: Perbedaan ketebalan dinding & elastisitas (5), arah aliran darah & kandungan gas (5), tekanan darah (5), keberadaan katup (5).',
        diff: 'HOTS',
        source: 'Bank Soal Fisiologi Hewan'
      },
      // Bahasa Indonesia
      {
        sub: bindoId,
        grade: 'Kelas X',
        topic: 'Teks Laporan Hasil Observasi (LHO)',
        text: 'Perhatikan kalimat berikut:\n"Hutan mangrove adalah ekosistem lahan basah pantai yang didominasi oleh spesies pohon tropis berakar napas yang mampu beradaptasi pada salinitas air payau."\n\nBerdasarkan kaidah teks laporan hasil observasi, kalimat tersebut berfungsi sebagai...',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: 'Kalimat definisi pada bagian pernyataan umum/klasifikasi' },
          { id: 'B', text: 'Kalimat deskripsi bagian aspek morfologi' },
          { id: 'C', text: 'Kalimat simpulan penutup argumentasi' },
          { id: 'D', text: 'Kalimat persuasif ajakan pelestarian lingkungan' },
          { id: 'E', text: 'Kalimat opini subjektif peneliti' }
        ],
        ans: 'A',
        pts: 10,
        exp: 'Kalimat menggunakan kopula "adalah" untuk menerangkan pengertian objek kajian secara objektif pada pembuka teks LHO.',
        diff: 'MUDAH',
        source: 'Bank Soal Bahasa Indonesia Kurikulum Merdeka'
      },
      // Bahasa Inggris
      {
        sub: bingId,
        grade: 'Kelas XI',
        topic: 'Analytical Exposition Text',
        text: 'What is the communicative purpose of an Analytical Exposition text in academic English writing?',
        type: 'MULTIPLE_CHOICE',
        opts: [
          { id: 'A', text: 'To entertain readers with an engaging narrative sequence' },
          { id: 'B', text: 'To persuade readers that an issue or phenomenon is crucially important by presenting supported arguments' },
          { id: 'C', text: 'To instruct the reader step-by-step on how to assemble or operate a machine' },
          { id: 'D', text: 'To describe a particular historical monument in vivid sensory detail' },
          { id: 'E', text: 'To retell past chronological experiences with personal reflection' }
        ],
        ans: 'B',
        pts: 10,
        exp: 'Analytical exposition aims to persuade readers/listeners by arguing a specific thesis backed by logical arguments and evidence.',
        diff: 'SEDANG',
        source: 'Bank Soal Bahasa Inggris Tingkat Lanjut'
      }
    ];

    masterQuestions.forEach(q => {
      insertQB.run(
        teacherId,
        q.sub,
        q.grade,
        q.topic,
        q.text,
        q.type,
        JSON.stringify(q.opts),
        q.ans,
        q.pts,
        q.exp,
        q.diff,
        q.source
      );
    });

    console.log(`Master Question Bank seeded successfully with ${masterQuestions.length} reusable questions.`);
  } catch (err) {
    console.error('Error seeding Question Bank:', err.message);
  }
}

initDatabase();

module.exports = db;

