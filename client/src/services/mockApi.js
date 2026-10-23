// Fallback mock API for standalone / offline / static deployment (e.g. Vercel)
// All changes are persisted to localStorage so that user interactions work seamlessly!

const STORAGE_KEYS = {
  USERS: 'lms_mock_users',
  CLASSES: 'lms_mock_classes',
  SUBJECTS: 'lms_mock_subjects',
  JOURNALS: 'lms_mock_journals',
  ATTENDANCE: 'lms_mock_attendance_sessions',
  ATT_RECORDS: 'lms_mock_attendance_records',
  ASSIGNMENTS: 'lms_mock_assignments',
  EXAMS: 'lms_mock_cbt_exams',
  QUESTIONS: 'lms_mock_cbt_questions',
  QUESTION_BANK: 'lms_mock_question_bank',
  CURRENT_USER_ID: 'lms_mock_current_user_id'
};

const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    name: 'Administrator LMS',
    role: 'admin',
    nis_nip: 'ADM001',
    kelas: null,
    email: 'admin@sekolah.sch.id',
    phone: '08120000001',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    created_at: '2026-10-01'
  },
  {
    id: 2,
    username: 'guru_budi',
    name: 'Budi Santoso, S.Pd.',
    role: 'guru',
    nis_nip: '198501012010011001',
    kelas: 'X-IPA-1',
    email: 'budi@sekolah.sch.id',
    phone: '08120000002',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=budi',
    created_at: '2026-10-01'
  },
  {
    id: 3,
    username: 'guru_siti',
    name: 'Siti Rahmawati, M.Pd.',
    role: 'guru',
    nis_nip: '198705122011012002',
    kelas: 'X-IPA-2',
    email: 'siti@sekolah.sch.id',
    phone: '08120000003',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=siti',
    created_at: '2026-10-01'
  },
  {
    id: 4,
    username: 'siswa_ahmad',
    name: 'Ahmad Faiz Pratama',
    role: 'siswa',
    nis: '1001',
    nis_nip: '1001',
    kelas: 'X-IPA-1',
    email: 'siswa_ahmad@siswa.sekolah.sch.id',
    phone: '081399990001',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_ahmad',
    created_at: '2026-10-01'
  },
  {
    id: 5,
    username: 'siswa_dewi',
    name: 'Dewi Anjani Kusuma',
    role: 'siswa',
    nis: '1002',
    nis_nip: '1002',
    kelas: 'X-IPA-1',
    email: 'siswa_dewi@siswa.sekolah.sch.id',
    phone: '081399990002',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_dewi',
    created_at: '2026-10-01'
  },
  {
    id: 6,
    username: 'siswa_rendy',
    name: 'Rendy Kurniawan',
    role: 'siswa',
    nis: '1003',
    nis_nip: '1003',
    kelas: 'X-IPA-1',
    email: 'siswa_rendy@siswa.sekolah.sch.id',
    phone: '081399990003',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_rendy',
    created_at: '2026-10-01'
  },
  {
    id: 7,
    username: 'siswa_putri',
    name: 'Putri Ayu Wandira',
    role: 'siswa',
    nis: '1004',
    nis_nip: '1004',
    kelas: 'X-IPA-1',
    email: 'siswa_putri@siswa.sekolah.sch.id',
    phone: '081399990004',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_putri',
    created_at: '2026-10-01'
  },
  {
    id: 8,
    username: 'siswa_reza',
    name: 'Reza Aditya Nugraha',
    role: 'siswa',
    nis: '1005',
    nis_nip: '1005',
    kelas: 'X-IPA-1',
    email: 'siswa_reza@siswa.sekolah.sch.id',
    phone: '081399990005',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_reza',
    created_at: '2026-10-01'
  },
  {
    id: 9,
    username: 'siswa_zahra',
    name: 'Zahra Nurul Izzah',
    role: 'siswa',
    nis: '1006',
    nis_nip: '1006',
    kelas: 'X-IPA-1',
    email: 'siswa_zahra@siswa.sekolah.sch.id',
    phone: '081399990006',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_zahra',
    created_at: '2026-10-01'
  },
  {
    id: 10,
    username: 'siswa_dimas',
    name: 'Dimas Bagus Anggoro',
    role: 'siswa',
    nis: '1007',
    nis_nip: '1007',
    kelas: 'X-IPA-1',
    email: 'siswa_dimas@siswa.sekolah.sch.id',
    phone: '081399990007',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_dimas',
    created_at: '2026-10-01'
  },
  {
    id: 11,
    username: 'siswa_naya',
    name: 'Kanaya Safitri',
    role: 'siswa',
    nis: '1008',
    nis_nip: '1008',
    kelas: 'X-IPA-1',
    email: 'siswa_naya@siswa.sekolah.sch.id',
    phone: '081399990008',
    avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=siswa_naya',
    created_at: '2026-10-01'
  }
];

const DEFAULT_CLASSES = [
  { id: 1, name: 'X-IPA-1', level: 'Kelas 10', academic_year: '2024/2025', student_count: 8, subject_count: 2 },
  { id: 2, name: 'X-IPA-2', level: 'Kelas 10', academic_year: '2024/2025', student_count: 0, subject_count: 1 },
  { id: 3, name: 'XI-IPA-1', level: 'Kelas 11', academic_year: '2024/2025', student_count: 0, subject_count: 0 }
];

const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Matematika Wajib', code: 'MAT-10', teacher_id: 2, teacher_name: 'Budi Santoso, S.Pd.' },
  { id: 2, name: 'Fisika Peminatan', code: 'FIS-10', teacher_id: 2, teacher_name: 'Budi Santoso, S.Pd.' },
  { id: 3, name: 'Bahasa Indonesia', code: 'BIN-10', teacher_id: 3, teacher_name: 'Siti Rahmawati, M.Pd.' }
];

const DEFAULT_JOURNALS = [
  {
    id: 1,
    teacher_id: 2,
    teacher_name: 'Budi Santoso, S.Pd.',
    class_id: 1,
    class_name: 'X-IPA-1',
    subject_id: 1,
    subject_name: 'Matematika Wajib',
    date: '2026-10-20',
    time_slot: 'Jam ke 1-2 (07.30 - 09.00)',
    topic: 'Sistem Persamaan Linear Tiga Variabel (SPLTV)',
    learning_outcomes: 'Peserta didik mampu memodelkan masalah kontekstual ke dalam SPLTV.',
    activities: '1. Apersepsi konsep SPLDV. 2. Diskusi kelompok studi kasus harga barang. 3. Presentasi perwakilan siswa.',
    student_notes: 'Rendy dan Reza masih sedikit bingung pada metode substitusi.',
    follow_up: 'Memberikan lembar kerja pengayaan mandiri dan tutor sebaya.'
  },
  {
    id: 2,
    teacher_id: 2,
    teacher_name: 'Budi Santoso, S.Pd.',
    class_id: 1,
    class_name: 'X-IPA-1',
    subject_id: 1,
    subject_name: 'Matematika Wajib',
    date: '2026-10-22',
    time_slot: 'Jam ke 3-4 (09.15 - 10.45)',
    topic: 'Metode Eliminasi & Substitusi Gabungan SPLTV',
    learning_outcomes: 'Peserta didik terampil menyelesaikan himpunan penyelesaian SPLTV.',
    activities: 'Latihan soal bergradasi dan kuis interaktif formatif.',
    student_notes: 'Semua siswa hadir dan antusias mencoba kuis cepat di papan tulis.',
    follow_up: 'Persiapan kuis CBT akhir pekan.'
  }
];

const DEFAULT_EXAMS = [
  {
    id: 1,
    title: 'Penilaian Sumatif Tengah Semester: Matematika Wajib',
    description: 'Materi SPLTV dan Fungsi Kuadrat. Dilarang membuka tab lain selama ujian.',
    class_id: 1,
    class_name: 'X-IPA-1',
    subject_id: 1,
    subject_name: 'Matematika Wajib',
    teacher_id: 2,
    token: 'MAT789',
    duration_minutes: 60,
    start_time: '2026-10-20 07:30',
    end_time: '2026-10-31 16:00',
    status: 'ACTIVE',
    question_count: 3,
    total_points: 30
  }
];

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    exam_id: 1,
    question_number: 1,
    question_text: 'Himpunan penyelesaian dari sistem persamaan x + y + z = 6, 2x - y + z = 3, dan x + 2y - z = 2 adalah...',
    question_type: 'MULTIPLE_CHOICE',
    options_json: JSON.stringify([
      { id: 'A', text: '{ (1, 2, 3) }' },
      { id: 'B', text: '{ (2, 1, 3) }' },
      { id: 'C', text: '{ (1, 3, 2) }' },
      { id: 'D', text: '{ (3, 2, 1) }' },
      { id: 'E', text: '{ (2, 3, 1) }' }
    ]),
    correct_answer: 'A',
    points: 10,
    explanation: 'Dengan menjumlahkan persamaan 1 dan 3, lalu substitusi nilai ke persamaan 2.'
  },
  {
    id: 2,
    exam_id: 1,
    question_number: 2,
    question_text: 'Jika titik puncak suatu grafik fungsi kuadrat f(x) = ax² + bx + c berada pada koordinat (2, -1) dan melalui (0, 3), maka nilai a adalah...',
    question_type: 'MULTIPLE_CHOICE',
    options_json: JSON.stringify([
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
      { id: 'C', text: '-1' },
      { id: 'D', text: '0.5' },
      { id: 'E', text: '-2' }
    ]),
    correct_answer: 'A',
    points: 10,
    explanation: 'f(x) = a(x - xp)² + yp => 3 = a(0 - 2)² - 1 => 4 = 4a => a = 1.'
  },
  {
    id: 3,
    exam_id: 1,
    question_number: 3,
    question_text: 'Sebuah toko buku menjual 2 buku tulis dan 1 pensil seharga Rp 10.000, serta 3 buku tulis dan 2 pensil seharga Rp 17.000. Berapakah harga 1 buku tulis?',
    question_type: 'MULTIPLE_CHOICE',
    options_json: JSON.stringify([
      { id: 'A', text: 'Rp 2.000' },
      { id: 'B', text: 'Rp 3.000' },
      { id: 'C', text: 'Rp 3.500' },
      { id: 'D', text: 'Rp 4.000' },
      { id: 'E', text: 'Rp 4.500' }
    ]),
    correct_answer: 'B',
    points: 10,
    explanation: '2b + p = 10.000 (x2) => 4b + 2p = 20.000. Dikurangi 3b + 2p = 17.000 menghasilkan b = 3.000.'
  }
];

const DEFAULT_QUESTION_BANK = [
  {
    id: 1,
    teacher_id: 2,
    teacher_name: 'Budi Santoso, S.Pd.',
    subject_id: 1,
    subject_name: 'Matematika Wajib',
    grade_level: 'Kelas X',
    topic: 'Sistem Persamaan Linear Tiga Variabel',
    question_text: 'Diberikan sistem persamaan x + y + z = 9, 2x - y + 2z = 8, dan -x + 3y - z = 4. Nilai dari x + y adalah...',
    question_type: 'MULTIPLE_CHOICE',
    options_json: JSON.stringify([
      { id: 'A', text: '5' },
      { id: 'B', text: '6' },
      { id: 'C', text: '7' },
      { id: 'D', text: '8' },
      { id: 'E', text: '9' }
    ]),
    correct_answer: 'A',
    points: 10,
    explanation: 'Eliminasi z dari persamaan 1 dan 3 menghasilkan 4y = 13... temukan solusinya.',
    difficulty: 'SEDANG',
    source_exam_title: 'Koleksi Soal HOTS Semester 1',
    created_at: '2026-10-15'
  },
  {
    id: 2,
    teacher_id: 2,
    teacher_name: 'Budi Santoso, S.Pd.',
    subject_id: 2,
    subject_name: 'Fisika Peminatan',
    grade_level: 'Kelas X',
    topic: 'Kinematika Gerak Lurus',
    question_text: 'Sebuah benda bergerak lurus dengan percepatan konstan 2 m/s². Jika kecepatan awalnya 4 m/s, berapa jarak yang ditempuh setelah 5 detik?',
    question_type: 'MULTIPLE_CHOICE',
    options_json: JSON.stringify([
      { id: 'A', text: '35 m' },
      { id: 'B', text: '45 m' },
      { id: 'C', text: '50 m' },
      { id: 'D', text: '60 m' },
      { id: 'E', text: '75 m' }
    ]),
    correct_answer: 'B',
    points: 10,
    explanation: 's = v0 * t + 0.5 * a * t² = 4*5 + 0.5*2*25 = 20 + 25 = 45 meter.',
    difficulty: 'SEDANG',
    source_exam_title: 'Bank Soal Fisika Dasar',
    created_at: '2026-10-16'
  }
];

const DEFAULT_ASSIGNMENTS = [
  {
    id: 1,
    class_id: 1,
    class_name: 'X-IPA-1',
    subject_id: 1,
    subject_name: 'Matematika Wajib',
    teacher_id: 2,
    title: 'Tugas Terstruktur 1: Pemodelan SPLTV Kasus Kontekstual',
    description: 'Selesaikan 3 soal aplikasi SPLTV pada buku paket halaman 45 dalam bentuk PDF.',
    deadline: '2026-10-30 23:59',
    max_score: 100,
    status: 'ACTIVE',
    submission_count: 5,
    graded_count: 3
  }
];

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setStored(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // Parse body safely
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      body = {};
    }
  }

  // Current user helper
  const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS);
  let currentUserId = Number(localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 2);
  let currentUser = users.find(u => u.id === currentUserId) || users[1] || users[0];

  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================
  if (path === '/auth/demo-users') {
    // Only return the 4 prominent personas for switching
    const demoIds = [1, 2, 3, 4];
    const demos = users.filter(u => demoIds.includes(u.id));
    return demos.length ? demos : users.slice(0, 4);
  }

  if (path === '/auth/switch-account') {
    const targetId = Number(body.userId || body.id);
    const target = users.find(u => u.id === targetId) || users[0];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, target.id.toString());
    return {
      token: `mock_token_${target.id}`,
      user: target
    };
  }

  if (path === '/auth/login') {
    const { username } = body;
    const target = users.find(u => u.username === username) || users[1];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, target.id.toString());
    return {
      token: `mock_token_${target.id}`,
      user: target
    };
  }

  if (path === '/auth/me') {
    return { user: currentUser };
  }

  if (path === '/auth/meta') {
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    return { classes, subjects };
  }

  // ==========================================
  // MANAGEMENT ENDPOINTS
  // ==========================================
  if (path === '/management/stats') {
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    return {
      totalClasses: classes.length,
      totalSubjects: subjects.length,
      totalStudents: users.filter(u => u.role === 'siswa').length,
      totalTeachers: users.filter(u => u.role === 'guru').length,
      totalAdmins: users.filter(u => u.role === 'admin').length
    };
  }

  // CLASSES
  if (path === '/management/classes') {
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    if (method === 'GET') {
      return classes.map(c => ({
        ...c,
        student_count: users.filter(u => u.role === 'siswa' && u.kelas === c.name).length
      }));
    }
    if (method === 'POST') {
      const newClass = {
        id: Date.now(),
        name: body.name.trim(),
        level: body.level.trim(),
        academic_year: body.academic_year || '2024/2025',
        student_count: 0,
        subject_count: 0
      };
      classes.push(newClass);
      setStored(STORAGE_KEYS.CLASSES, classes);
      return newClass;
    }
  }

  if (path.startsWith('/management/classes/')) {
    const id = Number(path.split('/')[3]);
    let classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    if (method === 'PUT') {
      classes = classes.map(c => c.id === id ? { ...c, ...body } : c);
      setStored(STORAGE_KEYS.CLASSES, classes);
      return classes.find(c => c.id === id);
    }
    if (method === 'DELETE') {
      classes = classes.filter(c => c.id !== id);
      setStored(STORAGE_KEYS.CLASSES, classes);
      return { success: true };
    }
  }

  // SUBJECTS
  if (path === '/management/subjects') {
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    if (method === 'GET') {
      const search = params.get('search');
      if (search) {
        return subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
      }
      return subjects;
    }
    if (method === 'POST') {
      const teacher = users.find(u => u.id === Number(body.teacher_id));
      const newSubj = {
        id: Date.now(),
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        teacher_id: body.teacher_id ? Number(body.teacher_id) : null,
        teacher_name: teacher ? teacher.name : 'Belum Ditentukan'
      };
      subjects.push(newSubj);
      setStored(STORAGE_KEYS.SUBJECTS, subjects);
      return newSubj;
    }
  }

  if (path.startsWith('/management/subjects/')) {
    const id = Number(path.split('/')[3]);
    let subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    if (method === 'PUT') {
      const teacher = users.find(u => u.id === Number(body.teacher_id));
      subjects = subjects.map(s => s.id === id ? {
        ...s,
        ...body,
        teacher_name: teacher ? teacher.name : s.teacher_name
      } : s);
      setStored(STORAGE_KEYS.SUBJECTS, subjects);
      return subjects.find(s => s.id === id);
    }
    if (method === 'DELETE') {
      subjects = subjects.filter(s => s.id !== id);
      setStored(STORAGE_KEYS.SUBJECTS, subjects);
      return { success: true };
    }
  }

  // STUDENTS
  if (path === '/management/students') {
    if (method === 'GET') {
      let students = users.filter(u => u.role === 'siswa');
      const kelas = params.get('kelas');
      const search = params.get('search');
      if (kelas) students = students.filter(s => s.kelas === kelas);
      if (search) {
        const q = search.toLowerCase();
        students = students.filter(s => s.name.toLowerCase().includes(q) || s.nis?.includes(q) || s.username?.toLowerCase().includes(q));
      }
      return students;
    }
    if (method === 'POST') {
      const newStudent = {
        id: Date.now(),
        username: body.username.trim().toLowerCase(),
        name: body.name.trim(),
        role: 'siswa',
        nis: body.nis.trim(),
        nis_nip: body.nis.trim(),
        kelas: body.kelas.trim(),
        email: body.email ? body.email.trim() : `${body.username}@siswa.sekolah.sch.id`,
        phone: body.phone ? body.phone.trim() : '',
        avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${body.username.trim()}`,
        created_at: new Date().toISOString().split('T')[0]
      };
      users.push(newStudent);
      setStored(STORAGE_KEYS.USERS, users);
      return newStudent;
    }
  }

  if (path.startsWith('/management/students/')) {
    const id = Number(path.split('/')[3]);
    if (method === 'PUT') {
      const updatedUsers = users.map(u => u.id === id ? { ...u, ...body, nis_nip: body.nis || u.nis } : u);
      setStored(STORAGE_KEYS.USERS, updatedUsers);
      return updatedUsers.find(u => u.id === id);
    }
    if (method === 'DELETE') {
      const updatedUsers = users.filter(u => u.id !== id);
      setStored(STORAGE_KEYS.USERS, updatedUsers);
      return { success: true };
    }
  }

  // USERS (ADMIN/GURU/ALL)
  if (path === '/management/users') {
    if (method === 'GET') {
      let filtered = [...users];
      const role = params.get('role');
      const search = params.get('search');
      if (role) filtered = filtered.filter(u => u.role === role);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.nis_nip && u.nis_nip.includes(q)));
      }
      return filtered;
    }
    if (method === 'POST') {
      const newUser = {
        id: Date.now(),
        username: body.username.trim().toLowerCase(),
        name: body.name.trim(),
        role: body.role || 'guru',
        nis_nip: body.nis_nip ? body.nis_nip.trim() : '',
        kelas: body.kelas || null,
        email: body.email ? body.email.trim() : `${body.username}@sekolah.sch.id`,
        phone: body.phone ? body.phone.trim() : '',
        avatar: body.role === 'admin'
          ? `https://api.dicebear.com/7.x/bottts/svg?seed=${body.username}`
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.username}`,
        created_at: new Date().toISOString().split('T')[0]
      };
      users.push(newUser);
      setStored(STORAGE_KEYS.USERS, users);
      return newUser;
    }
  }

  if (path.startsWith('/management/users/')) {
    const id = Number(path.split('/')[3]);
    if (method === 'PUT') {
      const updated = users.map(u => u.id === id ? { ...u, ...body } : u);
      setStored(STORAGE_KEYS.USERS, updated);
      return updated.find(u => u.id === id);
    }
    if (method === 'DELETE') {
      const updated = users.filter(u => u.id !== id);
      setStored(STORAGE_KEYS.USERS, updated);
      return { success: true };
    }
  }

  // ==========================================
  // JOURNALS
  // ==========================================
  if (path === '/journals') {
    let journals = getStored(STORAGE_KEYS.JOURNALS, DEFAULT_JOURNALS);
    if (method === 'GET') return journals;
    if (method === 'POST') {
      const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
      const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
      const cls = classes.find(c => c.id === Number(body.class_id));
      const subj = subjects.find(s => s.id === Number(body.subject_id));
      const newJournal = {
        id: Date.now(),
        teacher_id: currentUser.id,
        teacher_name: currentUser.name,
        class_id: Number(body.class_id),
        class_name: cls ? cls.name : 'X-IPA-1',
        subject_id: Number(body.subject_id),
        subject_name: subj ? subj.name : 'Matematika',
        ...body
      };
      journals.unshift(newJournal);
      setStored(STORAGE_KEYS.JOURNALS, journals);
      return newJournal;
    }
  }

  if (path.startsWith('/journals/')) {
    const id = Number(path.split('/')[2]);
    let journals = getStored(STORAGE_KEYS.JOURNALS, DEFAULT_JOURNALS);
    if (method === 'PUT') {
      journals = journals.map(j => j.id === id ? { ...j, ...body } : j);
      setStored(STORAGE_KEYS.JOURNALS, journals);
      return journals.find(j => j.id === id);
    }
    if (method === 'DELETE') {
      journals = journals.filter(j => j.id !== id);
      setStored(STORAGE_KEYS.JOURNALS, journals);
      return { success: true };
    }
  }

  // ==========================================
  // CBT & EXAMS
  // ==========================================
  if (path === '/cbt/exams') {
    let exams = getStored(STORAGE_KEYS.EXAMS, DEFAULT_EXAMS);
    if (method === 'GET') return exams;
    if (method === 'POST') {
      const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
      const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
      const cls = classes.find(c => c.id === Number(body.class_id));
      const subj = subjects.find(s => s.id === Number(body.subject_id));
      const newExam = {
        id: Date.now(),
        ...body,
        class_name: cls ? cls.name : 'X-IPA-1',
        subject_name: subj ? subj.name : 'Matematika',
        teacher_id: currentUser.id,
        status: 'UPCOMING',
        question_count: 0,
        total_points: 0
      };
      exams.unshift(newExam);
      setStored(STORAGE_KEYS.EXAMS, exams);
      return newExam;
    }
  }

  if (path.startsWith('/cbt/exams/')) {
    const parts = path.split('/');
    const examId = Number(parts[3]);
    let exams = getStored(STORAGE_KEYS.EXAMS, DEFAULT_EXAMS);
    let questions = getStored(STORAGE_KEYS.QUESTIONS, DEFAULT_QUESTIONS);

    if (parts[4] === 'status') {
      exams = exams.map(e => e.id === examId ? { ...e, status: body.status } : e);
      setStored(STORAGE_KEYS.EXAMS, exams);
      return exams.find(e => e.id === examId);
    }

    if (parts[4] === 'questions' && method === 'POST') {
      const newQ = {
        id: Date.now(),
        exam_id: examId,
        question_number: questions.filter(q => q.exam_id === examId).length + 1,
        ...body
      };
      questions.push(newQ);
      setStored(STORAGE_KEYS.QUESTIONS, questions);
      return newQ;
    }

    if (parts[4] === 'monitor') {
      const exam = exams.find(e => e.id === examId) || exams[0];
      const studentsInClass = users.filter(u => u.role === 'siswa' && (!exam.class_name || u.kelas === exam.class_name));
      const proctorList = studentsInClass.map((st, idx) => {
        let status = 'IN_PROGRESS';
        let answered = 2;
        let progress = 67;
        let violations = 0;
        let score = null;
        let device = 'Chrome 128 • Windows 11';

        if (idx === 1 || idx === 6) {
          status = 'SUBMITTED';
          answered = 3;
          progress = 100;
          score = 85 + idx;
          device = 'Edge 128 • Windows 10';
        } else if (idx === 2) {
          status = 'BLOCKED';
          answered = 1;
          progress = 33;
          violations = 2;
          device = 'Chrome 127 • Android 14';
        } else if (idx === 5 || idx === 7) {
          status = 'NOT_STARTED';
          answered = 0;
          progress = 0;
          device = null;
        }

        return {
          student: st,
          status,
          answered_count: answered,
          doubtful_count: idx === 2 ? 1 : 0,
          progress_percent: progress,
          remaining_seconds: 2400,
          violation_count: violations,
          score,
          device_info: device,
          last_active_at: new Date().toISOString()
        };
      });

      const stats = {
        total: studentsInClass.length,
        not_started: proctorList.filter(p => p.status === 'NOT_STARTED').length,
        in_progress: proctorList.filter(p => p.status === 'IN_PROGRESS').length,
        blocked: proctorList.filter(p => p.status === 'BLOCKED').length,
        submitted: proctorList.filter(p => p.status === 'SUBMITTED').length,
        avg_score: 85
      };

      const logs = [
        {
          id: 1,
          student_id: 6,
          student_name: 'Rendy Kurniawan',
          nis: '1003',
          event_type: 'TAB_SWITCH',
          details: 'Meninggalkan tab pengerjaan ujian selama 4 detik (Peringatan ke-2, Layar Dikunci)',
          created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          student_id: 8,
          student_name: 'Reza Aditya Nugraha',
          nis: '1005',
          event_type: 'FULLSCREEN_EXIT',
          details: 'Keluar dari mode layar penuh (fullscreen exit)',
          created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          student_id: 5,
          student_name: 'Dewi Anjani Kusuma',
          nis: '1002',
          event_type: 'SUBMIT',
          details: 'Menyelesaikan dan mengumpulkan lembar jawaban ujian',
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      ];

      return {
        exam,
        total_questions: questions.filter(q => q.exam_id === exam.id).length || 3,
        students: proctorList,
        logs,
        stats
      };
    }

    // Default exam details
    const exam = exams.find(e => e.id === examId) || exams[0];
    const examQuestions = questions.filter(q => q.exam_id === examId);
    return {
      ...exam,
      questions: examQuestions
    };
  }

  // QUESTION BANK
  if (path === '/question-bank') {
    let qb = getStored(STORAGE_KEYS.QUESTION_BANK, DEFAULT_QUESTION_BANK);
    if (method === 'GET') {
      const subject_id = params.get('subject_id');
      const difficulty = params.get('difficulty');
      const search = params.get('search');
      let filtered = [...qb];
      if (subject_id) filtered = filtered.filter(q => q.subject_id === Number(subject_id));
      if (difficulty) filtered = filtered.filter(q => q.difficulty === difficulty);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(item => item.question_text.toLowerCase().includes(q) || (item.topic && item.topic.toLowerCase().includes(q)));
      }
      return filtered;
    }
    if (method === 'POST') {
      const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
      const subj = subjects.find(s => s.id === Number(body.subject_id));
      const newItem = {
        id: Date.now(),
        teacher_id: currentUser.id,
        teacher_name: currentUser.name,
        subject_name: subj ? subj.name : 'Matematika Wajib',
        created_at: new Date().toISOString().split('T')[0],
        ...body
      };
      qb.unshift(newItem);
      setStored(STORAGE_KEYS.QUESTION_BANK, qb);
      return newItem;
    }
  }

  if (path === '/question-bank/stats') {
    const qb = getStored(STORAGE_KEYS.QUESTION_BANK, DEFAULT_QUESTION_BANK);
    return {
      total: qb.length,
      easy: qb.filter(q => q.difficulty === 'MUDAH').length,
      medium: qb.filter(q => q.difficulty === 'SEDANG').length,
      hard: qb.filter(q => q.difficulty === 'SULIT' || q.difficulty === 'HOTS').length
    };
  }

  if (path.startsWith('/question-bank/')) {
    const id = Number(path.split('/')[2]);
    let qb = getStored(STORAGE_KEYS.QUESTION_BANK, DEFAULT_QUESTION_BANK);
    if (method === 'PUT') {
      qb = qb.map(q => q.id === id ? { ...q, ...body } : q);
      setStored(STORAGE_KEYS.QUESTION_BANK, qb);
      return qb.find(q => q.id === id);
    }
    if (method === 'DELETE') {
      qb = qb.filter(q => q.id !== id);
      setStored(STORAGE_KEYS.QUESTION_BANK, qb);
      return { success: true };
    }
  }

  // ASSIGNMENTS
  if (path === '/assignments') {
    let assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS);
    if (method === 'GET') return assignments;
    if (method === 'POST') {
      const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
      const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
      const cls = classes.find(c => c.id === Number(body.class_id));
      const subj = subjects.find(s => s.id === Number(body.subject_id));
      const newAssign = {
        id: Date.now(),
        ...body,
        class_name: cls ? cls.name : 'X-IPA-1',
        subject_name: subj ? subj.name : 'Matematika',
        submission_count: 0,
        graded_count: 0
      };
      assignments.unshift(newAssign);
      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);
      return newAssign;
    }
  }

  // ATTENDANCE
  if (path === '/attendance/sessions') {
    return [
      {
        id: 1,
        class_id: 1,
        class_name: 'X-IPA-1',
        subject_id: 1,
        subject_name: 'Matematika Wajib',
        teacher_id: 2,
        teacher_name: 'Budi Santoso, S.Pd.',
        date: '2026-10-22',
        time_start: '07:30',
        time_end: '09:00',
        session_title: 'Pertemuan 2: Metode Eliminasi dan Substitusi SPLTV',
        session_code: 'MAT912',
        is_open: 1,
        count_hadir: 7,
        count_total_recorded: 8,
        count_class_students: 8
      }
    ];
  }

  if (path.startsWith('/attendance/sessions/')) {
    const id = Number(path.split('/')[3]);
    const studentsInClass = users.filter(u => u.role === 'siswa' && u.kelas === 'X-IPA-1');
    return {
      session: {
        id,
        session_title: 'Pertemuan 2: Metode Eliminasi dan Substitusi SPLTV',
        session_code: 'MAT912',
        is_open: 1,
        class_id: 1,
        subject_id: 1
      },
      records: studentsInClass.map((s, idx) => ({
        student_id: s.id,
        student_name: s.name,
        nis: s.nis,
        status: idx === 2 ? 'Sakit' : 'Hadir',
        notes: idx === 2 ? 'Izin dokter' : 'Tepat waktu'
      }))
    };
  }

  // GRADES
  if (path === '/grades/ledger') {
    const studentsInClass = users.filter(u => u.role === 'siswa' && u.kelas === 'X-IPA-1');
    return {
      weights: {
        attendance_weight: 15,
        assignment_weight: 35,
        formatif_weight: 25,
        sumatif_weight: 25,
        kkm: 75
      },
      rows: studentsInClass.map((s, idx) => ({
        student: s,
        attendanceScore: 92,
        avgTugas: 85 + (idx % 10),
        avgFormatif: 80 + (idx % 15),
        avgSumatif: 88,
        finalScore: 86,
        predicate: 'A',
        isPassed: true
      }))
    };
  }

  // Fallback default
  return { success: true };
}
