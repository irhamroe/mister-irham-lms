const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { generateInitialsAvatarDataUrl } = require('./utils/avatar');

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
  try {
    db.exec("UPDATE users SET kelas = NULL WHERE role != 'siswa'");
    db.exec("DELETE FROM classes WHERE name LIKE '%IPA%'");
    
    // Migrate student avatars to 2-letter initials
    const dicebearStudents = db.prepare("SELECT id, name FROM users WHERE role = 'siswa' AND (avatar LIKE '%dicebear%' OR avatar IS NULL)").all();
    if (dicebearStudents.length > 0) {
      const updateAvatar = db.prepare("UPDATE users SET avatar = ? WHERE id = ?");
      const runAvatarUpdate = db.transaction((list) => {
        for (const st of list) {
          updateAvatar.run(generateInitialsAvatarDataUrl(st.name), st.id);
        }
      });
      runAvatarUpdate(dicebearStudents);
    }

    // Ensure teacher irham exists
    const existingIrham = db.prepare("SELECT id FROM users WHERE username = 'irham'").get();
    if (!existingIrham) {
      const salt = bcrypt.genSaltSync(10);
      const pass = bcrypt.hashSync('password123', salt);
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, email, phone, avatar)
        VALUES ('irham', ?, 'Moh. Irham Rozaqi, S.Kom. Gr.', 'guru', '199001012015011001', NULL, 'L', 'irham@sekolah.sch.id', '08123456789', 'https://api.dicebear.com/7.x/avataaars/svg?seed=irham')
      `).run(pass);
    }
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
  const c1 = insertClass.run('X-8', 'Kelas 10', '2026/2027').lastInsertRowid;
  const c2 = insertClass.run('X-9', 'Kelas 10', '2026/2027').lastInsertRowid;
  const c3 = insertClass.run('X-10', 'Kelas 10', '2026/2027').lastInsertRowid;

  // 2. Users (Admin, Guru, Siswa)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, email, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run('admin', passwordHash, 'Administrator LMS', 'admin', 'ADM001', null, 'L', 'admin@sekolah.sch.id', '08120000001', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin');

  // Teachers (Teachers do not have student class/kelas = null)
  const g1 = insertUser.run('guru_budi', passwordHash, 'Budi Santoso, S.Pd.', 'guru', '198501012010011001', null, 'L', 'budi@sekolah.sch.id', '08120000002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=budi').lastInsertRowid;
  const g2 = insertUser.run('guru_siti', passwordHash, 'Siti Rahmawati, M.Pd.', 'guru', '198705122011012002', null, 'P', 'siti@sekolah.sch.id', '08120000003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=siti').lastInsertRowid;

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

  console.log('Database seeded successfully with Users, Classes, and Subjects!');
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

