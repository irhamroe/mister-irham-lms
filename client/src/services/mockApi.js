// Fallback mock API for standalone / offline / static deployment (e.g. Vercel)
// All changes are persisted to localStorage so that user interactions work seamlessly!
import { sortClassesNatural } from '../utils/sortHelper';
import { syncToFirebase, initFirebaseSync } from './firebaseSyncService';
import bcrypt from 'bcryptjs';
import { ref, get } from 'firebase/database';
import { database } from './firebase';

const STORAGE_KEYS = {
  USERS: 'lms_mock_users_v3',
  CLASSES: 'lms_mock_classes_v3',
  SUBJECTS: 'lms_mock_subjects_v3',
  JOURNALS: 'lms_mock_journals_v3',
  ATTENDANCE: 'lms_mock_attendance_sessions_v3',
  ATT_RECORDS: 'lms_mock_attendance_records_v3',
  ASSIGNMENTS: 'lms_mock_assignments_v3',
  ASSIGNMENT_SUBMISSIONS: 'lms_mock_assignment_submissions_v3',
  EXAMS: 'lms_mock_cbt_exams_v3',
  QUESTIONS: 'lms_mock_cbt_questions_v3',
  QUESTION_BANK: 'lms_mock_question_bank_v3',
  CURRENT_USER_ID: 'lms_mock_current_user_id'
};

// Clean up any stale legacy demo caches
if (typeof localStorage !== 'undefined') {
  [
    'lms_mock_users', 'lms_mock_users_v2',
    'lms_mock_classes', 'lms_mock_classes_v2',
    'lms_mock_subjects', 'lms_mock_subjects_v2',
    'lms_mock_journals', 'lms_mock_journals_v2',
    'lms_mock_attendance_sessions', 'lms_mock_attendance_sessions_v2',
    'lms_mock_attendance_records', 'lms_mock_attendance_records_v2',
    'lms_mock_assignments', 'lms_mock_assignments_v2',
    'lms_mock_assignment_submissions', 'lms_mock_assignment_submissions_v2',
    'lms_mock_cbt_exams', 'lms_mock_cbt_exams_v2',
    'lms_mock_cbt_questions', 'lms_mock_cbt_questions_v2'
  ].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  // Ensure any cached classes are sorted naturally
  try {
    const cachedClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (cachedClasses) {
      const parsed = JSON.parse(cachedClasses);
      if (Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(sortClassesNatural(parsed)));
      }
    }
  } catch (e) {}

  // Ensure subjects only retain Informatika and purge legacy dummy subjects (Matematika, Fisika, etc.)
  try {
    const cachedSubjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (cachedSubjects) {
      const parsed = JSON.parse(cachedSubjects);
      if (Array.isArray(parsed)) {
        const onlyInformatika = parsed.filter(s =>
          s.code === 'INF-10' ||
          s.code === 'INF-11' ||
          s.code === 'INF-12' ||
          (s.name && s.name.toUpperCase().includes('INFORMATIKA'))
        );
        if (onlyInformatika.length === 0 || onlyInformatika.length < parsed.length) {
          const defaultInf = [
            { id: 7, name: 'INFORMATIKA', code: 'INF-10', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' },
            { id: 10, name: 'INFORMATIKA', code: 'INF-11', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' },
            { id: 11, name: 'INFORMATIKA', code: 'INF-12', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' }
          ];
          localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(onlyInformatika.length > 0 ? onlyInformatika : defaultInf));
        }
      }
    }
  } catch (e) {}
}

function getStudentInitials(name) {
  if (!name || typeof name !== 'string') return 'SW';
  const clean = name.replace(/[^a-zA-Z\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SW';
  if (words.length === 1) {
    const w = words[0];
    return (w.length >= 2 ? w.slice(0, 2) : w + w).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function generateInitialsAvatarDataUrl(name, size = 64) {
  const initials = getStudentInitials(name);
  const palette = [
    { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
    { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
    { bg: '#FDF4FF', text: '#A21CAF', border: '#F5D0FE' },
    { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
    { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' }
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = palette[Math.abs(hash) % palette.length];
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size / 2}" fill="${color.bg}" stroke="${color.border}" stroke-width="2"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${color.text}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_USERS = [
  {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "role": "admin",
    "nis_nip": "ADM001",
    "kelas": null,
    "gender": "L",
    "email": "admin@sekolah.sch.id",
    "phone": "08120000001",
    "avatar": generateInitialsAvatarDataUrl("Administrator"),
    "created_at": "2026-10-01"
  },
  {
    "id": 2,
    "username": "guru_budi",
    "name": "Budi Santoso, S.Pd.",
    "role": "guru",
    "nis_nip": "198501012010011001",
    "kelas": null,
    "gender": "L",
    "email": "budi@sekolah.sch.id",
    "phone": "08120000002",
    "avatar": generateInitialsAvatarDataUrl("Budi Santoso, S.Pd."),
    "created_at": "2026-10-01"
  },
  {
    "id": 3,
    "username": "guru_siti",
    "name": "Siti Rahmawati, M.Pd.",
    "role": "guru",
    "nis_nip": "198705122011012002",
    "kelas": null,
    "gender": "P",
    "email": "siti@sekolah.sch.id",
    "phone": "08120000003",
    "avatar": generateInitialsAvatarDataUrl("Siti Rahmawati, M.Pd."),
    "created_at": "2026-10-01"
  },
  {
    "id": 4,
    "username": "irham",
    "name": "Moh. Irham Rozaqi, S.Kom. Gr.",
    "role": "guru",
    "nis_nip": "198910212022211017",
    "kelas": null,
    "gender": "L",
    "email": "irham@sekolah.sch.id",
    "phone": "08123456789",
    "avatar": generateInitialsAvatarDataUrl("Moh. Irham Rozaqi, S.Kom. Gr."),
    "created_at": "2026-10-01"
  },
  {
    "id": 12,
    "username": "0111956420",
    "name": "Achmad Zakky Fanani",
    "role": "siswa",
    "nis": "0111956420",
    "nis_nip": "0111956420",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 1,
    "email": "0111956420@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0111956420",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 13,
    "username": "0118373709",
    "name": "Afiqah Liyana Zahira",
    "role": "siswa",
    "nis": "0118373709",
    "nis_nip": "0118373709",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 2,
    "email": "0118373709@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118373709",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 14,
    "username": "0105704769",
    "name": "Alda Maratus Sholiha Anshori",
    "role": "siswa",
    "nis": "0105704769",
    "nis_nip": "0105704769",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 3,
    "email": "0105704769@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105704769",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 15,
    "username": "0106666182",
    "name": "Alzena Zalfa Ramdon",
    "role": "siswa",
    "nis": "0106666182",
    "nis_nip": "0106666182",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 4,
    "email": "0106666182@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106666182",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 16,
    "username": "0118610865",
    "name": "Anisa Ornela Cahya Ningrum",
    "role": "siswa",
    "nis": "0118610865",
    "nis_nip": "0118610865",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 5,
    "email": "0118610865@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118610865",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 17,
    "username": "0118518442",
    "name": "Arlene Trianindya Arshanti",
    "role": "siswa",
    "nis": "0118518442",
    "nis_nip": "0118518442",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 6,
    "email": "0118518442@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118518442",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 18,
    "username": "0101992863",
    "name": "Ata Rayya Andromeda",
    "role": "siswa",
    "nis": "0101992863",
    "nis_nip": "0101992863",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 7,
    "email": "0101992863@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101992863",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 19,
    "username": "0113989325",
    "name": "Aurela Sahara Chinantia",
    "role": "siswa",
    "nis": "0113989325",
    "nis_nip": "0113989325",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 8,
    "email": "0113989325@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113989325",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 20,
    "username": "0101558979",
    "name": "Brandon Julio Alexander",
    "role": "siswa",
    "nis": "0101558979",
    "nis_nip": "0101558979",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 9,
    "email": "0101558979@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101558979",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 21,
    "username": "0116075224",
    "name": "Chanaya Elok Yunanda",
    "role": "siswa",
    "nis": "0116075224",
    "nis_nip": "0116075224",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 10,
    "email": "0116075224@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0116075224",
    "created_at": "2026-10-26 06:35:55"
  },
  {
    "id": 22,
    "username": "0109439316",
    "name": "Dia Ayu Lintang Kinasih",
    "role": "siswa",
    "nis": "0109439316",
    "nis_nip": "0109439316",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 11,
    "email": "0109439316@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109439316",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 23,
    "username": "0114059786",
    "name": "Erica Uki Windya Putri",
    "role": "siswa",
    "nis": "0114059786",
    "nis_nip": "0114059786",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 12,
    "email": "0114059786@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0114059786",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 24,
    "username": "0114707603",
    "name": "Fanny Elshandria Maulifa",
    "role": "siswa",
    "nis": "0114707603",
    "nis_nip": "0114707603",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 13,
    "email": "0114707603@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0114707603",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 25,
    "username": "0113991480",
    "name": "Filsah Gama Arrafi",
    "role": "siswa",
    "nis": "0113991480",
    "nis_nip": "0113991480",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 14,
    "email": "0113991480@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113991480",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 26,
    "username": "0107843357",
    "name": "Grace Dindaisa Witra",
    "role": "siswa",
    "nis": "0107843357",
    "nis_nip": "0107843357",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 15,
    "email": "0107843357@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107843357",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 27,
    "username": "0117662520",
    "name": "Imelda Putri Qorirotul Aini",
    "role": "siswa",
    "nis": "0117662520",
    "nis_nip": "0117662520",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 16,
    "email": "0117662520@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117662520",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 28,
    "username": "0111280800",
    "name": "Kanaya Ashyfaluna",
    "role": "siswa",
    "nis": "0111280800",
    "nis_nip": "0111280800",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 17,
    "email": "0111280800@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0111280800",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 29,
    "username": "0113668274",
    "name": "Kezia Novyta Restuaprillia",
    "role": "siswa",
    "nis": "0113668274",
    "nis_nip": "0113668274",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 18,
    "email": "0113668274@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113668274",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 30,
    "username": "0108723759",
    "name": "Kornelius Theodorick Wicaksana",
    "role": "siswa",
    "nis": "0108723759",
    "nis_nip": "0108723759",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 19,
    "email": "0108723759@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108723759",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 31,
    "username": "3118873428",
    "name": "Marisha Aulia Putri",
    "role": "siswa",
    "nis": "3118873428",
    "nis_nip": "3118873428",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 20,
    "email": "3118873428@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3118873428",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 32,
    "username": "0104490610",
    "name": "Michael Elifellano Tuage",
    "role": "siswa",
    "nis": "0104490610",
    "nis_nip": "0104490610",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 21,
    "email": "0104490610@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104490610",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 33,
    "username": "0109594685",
    "name": "Muhamad Wildan Syahril Adkha",
    "role": "siswa",
    "nis": "0109594685",
    "nis_nip": "0109594685",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 22,
    "email": "0109594685@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109594685",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 34,
    "username": "0101132761",
    "name": "Muhammad Ridho Saputra",
    "role": "siswa",
    "nis": "0101132761",
    "nis_nip": "0101132761",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 23,
    "email": "0101132761@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101132761",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 35,
    "username": "0105994106",
    "name": "Nadia Khalidah Putri Andini",
    "role": "siswa",
    "nis": "0105994106",
    "nis_nip": "0105994106",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 24,
    "email": "0105994106@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105994106",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 36,
    "username": "0103111392",
    "name": "Nathania Abigail Hermawan",
    "role": "siswa",
    "nis": "0103111392",
    "nis_nip": "0103111392",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 25,
    "email": "0103111392@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103111392",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 37,
    "username": "0112928199",
    "name": "Olindea Julie Aufa",
    "role": "siswa",
    "nis": "0112928199",
    "nis_nip": "0112928199",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 26,
    "email": "0112928199@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0112928199",
    "created_at": "2026-10-26 06:35:56"
  },
  {
    "id": 38,
    "username": "0106637277",
    "name": "Raditya Rajendra Putra Wardhana",
    "role": "siswa",
    "nis": "0106637277",
    "nis_nip": "0106637277",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 27,
    "email": "0106637277@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106637277",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 39,
    "username": "0106358280",
    "name": "Raysah Avisa Azalia Laksono",
    "role": "siswa",
    "nis": "0106358280",
    "nis_nip": "0106358280",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 28,
    "email": "0106358280@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106358280",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 40,
    "username": "0107806829",
    "name": "Rizky Dinar Awaluddin",
    "role": "siswa",
    "nis": "0107806829",
    "nis_nip": "0107806829",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 29,
    "email": "0107806829@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107806829",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 41,
    "username": "0118130846",
    "name": "Sandita Adila Putri Pramono",
    "role": "siswa",
    "nis": "0118130846",
    "nis_nip": "0118130846",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 30,
    "email": "0118130846@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118130846",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 42,
    "username": "0119651308",
    "name": "Sliraku Putra Waluyo Kudu Jejer Satriyo Utomo",
    "role": "siswa",
    "nis": "0119651308",
    "nis_nip": "0119651308",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 31,
    "email": "0119651308@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119651308",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 43,
    "username": "0115237049",
    "name": "Syahlan Nur Ghaffar",
    "role": "siswa",
    "nis": "0115237049",
    "nis_nip": "0115237049",
    "kelas": "X-8",
    "gender": "L",
    "no_absen": 32,
    "email": "0115237049@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115237049",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 44,
    "username": "0117682765",
    "name": "Syarifah Aulia Rahmah",
    "role": "siswa",
    "nis": "0117682765",
    "nis_nip": "0117682765",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 33,
    "email": "0117682765@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117682765",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 45,
    "username": "0106755135",
    "name": "Vilovita Noer Eva Sanjaya",
    "role": "siswa",
    "nis": "0106755135",
    "nis_nip": "0106755135",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 34,
    "email": "0106755135@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106755135",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 46,
    "username": "0104210250",
    "name": "Zahra Agnesia Rahmadania",
    "role": "siswa",
    "nis": "0104210250",
    "nis_nip": "0104210250",
    "kelas": "X-8",
    "gender": "P",
    "no_absen": 35,
    "email": "0104210250@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104210250",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 47,
    "username": "0105764039",
    "name": "Achmed Izzat Nugraha",
    "role": "siswa",
    "nis": "0105764039",
    "nis_nip": "0105764039",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 1,
    "email": "0105764039@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105764039",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 48,
    "username": "0103977128",
    "name": "Agnes Louis Jessica Oryza Sativa",
    "role": "siswa",
    "nis": "0103977128",
    "nis_nip": "0103977128",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 2,
    "email": "0103977128@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103977128",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 49,
    "username": "0116328369",
    "name": "Alena Saraswati Dynasty Violin",
    "role": "siswa",
    "nis": "0116328369",
    "nis_nip": "0116328369",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 3,
    "email": "0116328369@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0116328369",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 50,
    "username": "0103929428",
    "name": "Amalia Kasih",
    "role": "siswa",
    "nis": "0103929428",
    "nis_nip": "0103929428",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 4,
    "email": "0103929428@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103929428",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 51,
    "username": "0105330859",
    "name": "Anditha Mutiara Annisa",
    "role": "siswa",
    "nis": "0105330859",
    "nis_nip": "0105330859",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 5,
    "email": "0105330859@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105330859",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 52,
    "username": "0102043016",
    "name": "Aqilah Putri Cahyanti",
    "role": "siswa",
    "nis": "0102043016",
    "nis_nip": "0102043016",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 6,
    "email": "0102043016@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102043016",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 53,
    "username": "0107803773",
    "name": "Ardiansyah Ramadhan Mahmudi",
    "role": "siswa",
    "nis": "0107803773",
    "nis_nip": "0107803773",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 7,
    "email": "0107803773@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107803773",
    "created_at": "2026-10-26 06:35:57"
  },
  {
    "id": 54,
    "username": "0107399104",
    "name": "Athala Rania Insyira",
    "role": "siswa",
    "nis": "0107399104",
    "nis_nip": "0107399104",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 8,
    "email": "0107399104@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107399104",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 55,
    "username": "0104635318",
    "name": "Azzalia Putri Junaedi",
    "role": "siswa",
    "nis": "0104635318",
    "nis_nip": "0104635318",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 9,
    "email": "0104635318@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104635318",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 56,
    "username": "0102963639",
    "name": "Baraka Erza Ahmad Ramadhan",
    "role": "siswa",
    "nis": "0102963639",
    "nis_nip": "0102963639",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 10,
    "email": "0102963639@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102963639",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 57,
    "username": "0114287965",
    "name": "Dahayu Kalinda Labibah",
    "role": "siswa",
    "nis": "0114287965",
    "nis_nip": "0114287965",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 11,
    "email": "0114287965@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0114287965",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 58,
    "username": "3119429861",
    "name": "Dito Yuniar",
    "role": "siswa",
    "nis": "3119429861",
    "nis_nip": "3119429861",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 12,
    "email": "3119429861@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3119429861",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 59,
    "username": "0102051427",
    "name": "Evan Maalik Ramadhan",
    "role": "siswa",
    "nis": "0102051427",
    "nis_nip": "0102051427",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 13,
    "email": "0102051427@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102051427",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 60,
    "username": "0114903317",
    "name": "Fadhilatul Laila Hasan",
    "role": "siswa",
    "nis": "0114903317",
    "nis_nip": "0114903317",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 14,
    "email": "0114903317@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0114903317",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 61,
    "username": "0113122224",
    "name": "Felda Ailin Enrico",
    "role": "siswa",
    "nis": "0113122224",
    "nis_nip": "0113122224",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 15,
    "email": "0113122224@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113122224",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 62,
    "username": "0103447693",
    "name": "Habibah Aulya Putri",
    "role": "siswa",
    "nis": "0103447693",
    "nis_nip": "0103447693",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 16,
    "email": "0103447693@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103447693",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 63,
    "username": "0118859576",
    "name": "Intan Kurnia Sari",
    "role": "siswa",
    "nis": "0118859576",
    "nis_nip": "0118859576",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 17,
    "email": "0118859576@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118859576",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 64,
    "username": "0119126169",
    "name": "Kansa Zahidah Ayunda Bela",
    "role": "siswa",
    "nis": "0119126169",
    "nis_nip": "0119126169",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 18,
    "email": "0119126169@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119126169",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 65,
    "username": "0102211479",
    "name": "Khaizuran Zenas Kurnianindya",
    "role": "siswa",
    "nis": "0102211479",
    "nis_nip": "0102211479",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 19,
    "email": "0102211479@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102211479",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 66,
    "username": "0107834349",
    "name": "Letta Keyla Beiby",
    "role": "siswa",
    "nis": "0107834349",
    "nis_nip": "0107834349",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 20,
    "email": "0107834349@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107834349",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 67,
    "username": "0119011775",
    "name": "Mariska Chandra Kirana",
    "role": "siswa",
    "nis": "0119011775",
    "nis_nip": "0119011775",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 21,
    "email": "0119011775@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119011775",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 68,
    "username": "0095258943",
    "name": "Mikail Gilbrandhyka Yusfiandi",
    "role": "siswa",
    "nis": "0095258943",
    "nis_nip": "0095258943",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 22,
    "email": "0095258943@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0095258943",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 69,
    "username": "0105161449",
    "name": "Muhammad Abrisam Shiddiq",
    "role": "siswa",
    "nis": "0105161449",
    "nis_nip": "0105161449",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 23,
    "email": "0105161449@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105161449",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 70,
    "username": "0106726012",
    "name": "Muhammad Sajidan Nafis",
    "role": "siswa",
    "nis": "0106726012",
    "nis_nip": "0106726012",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 24,
    "email": "0106726012@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106726012",
    "created_at": "2026-10-26 06:35:58"
  },
  {
    "id": 71,
    "username": "0118434610",
    "name": "Nadine Franda Gultom",
    "role": "siswa",
    "nis": "0118434610",
    "nis_nip": "0118434610",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 25,
    "email": "0118434610@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118434610",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 72,
    "username": "0117747572",
    "name": "Naurah Marchyaaqiilah Nurhasanah",
    "role": "siswa",
    "nis": "0117747572",
    "nis_nip": "0117747572",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 26,
    "email": "0117747572@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117747572",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 73,
    "username": "0109523897",
    "name": "Quinsha Rania Wilhelmina",
    "role": "siswa",
    "nis": "0109523897",
    "nis_nip": "0109523897",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 27,
    "email": "0109523897@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109523897",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 74,
    "username": "0104677240",
    "name": "Renata Alodia Evelinna",
    "role": "siswa",
    "nis": "0104677240",
    "nis_nip": "0104677240",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 28,
    "email": "0104677240@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104677240",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 75,
    "username": "0103572719",
    "name": "Rizqy Surya Keylana",
    "role": "siswa",
    "nis": "0103572719",
    "nis_nip": "0103572719",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 29,
    "email": "0103572719@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103572719",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 76,
    "username": "0105311188",
    "name": "Satria Abdillah Ramadhani Hegia Putra",
    "role": "siswa",
    "nis": "0105311188",
    "nis_nip": "0105311188",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 30,
    "email": "0105311188@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105311188",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 77,
    "username": "0107894511",
    "name": "Shabrina Mutiara Ayu",
    "role": "siswa",
    "nis": "0107894511",
    "nis_nip": "0107894511",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 31,
    "email": "0107894511@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107894511",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 78,
    "username": "0103535630",
    "name": "Sultan Davin Athallah",
    "role": "siswa",
    "nis": "0103535630",
    "nis_nip": "0103535630",
    "kelas": "X-9",
    "gender": "L",
    "no_absen": 32,
    "email": "0103535630@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103535630",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 79,
    "username": "0128039822",
    "name": "Syifaur Rahma Az Zahra",
    "role": "siswa",
    "nis": "0128039822",
    "nis_nip": "0128039822",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 33,
    "email": "0128039822@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0128039822",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 80,
    "username": "0116041289",
    "name": "Viola Auliani Bensa",
    "role": "siswa",
    "nis": "0116041289",
    "nis_nip": "0116041289",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 34,
    "email": "0116041289@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0116041289",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 81,
    "username": "3106052754",
    "name": "Zahra Najwa Saraha",
    "role": "siswa",
    "nis": "3106052754",
    "nis_nip": "3106052754",
    "kelas": "X-9",
    "gender": "P",
    "no_absen": 35,
    "email": "3106052754@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3106052754",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 82,
    "username": "0107693882",
    "name": "Adabelle Chrysilla Nabigha",
    "role": "siswa",
    "nis": "0107693882",
    "nis_nip": "0107693882",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 1,
    "email": "0107693882@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107693882",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 83,
    "username": "0103184595",
    "name": "Ahmad Shon Haji",
    "role": "siswa",
    "nis": "0103184595",
    "nis_nip": "0103184595",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 2,
    "email": "0103184595@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103184595",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 84,
    "username": "0118129888",
    "name": "Alesha Azzahra",
    "role": "siswa",
    "nis": "0118129888",
    "nis_nip": "0118129888",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 3,
    "email": "0118129888@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118129888",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 85,
    "username": "3114357720",
    "name": "Amanda Ayudya Widagdo",
    "role": "siswa",
    "nis": "3114357720",
    "nis_nip": "3114357720",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 4,
    "email": "3114357720@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3114357720",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 86,
    "username": "0105446071",
    "name": "Andy Pratama",
    "role": "siswa",
    "nis": "0105446071",
    "nis_nip": "0105446071",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 5,
    "email": "0105446071@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105446071",
    "created_at": "2026-10-26 06:35:59"
  },
  {
    "id": 87,
    "username": "0113894808",
    "name": "Annazuwa Dzahin",
    "role": "siswa",
    "nis": "0113894808",
    "nis_nip": "0113894808",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 6,
    "email": "0113894808@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113894808",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 88,
    "username": "0102953181",
    "name": "Arneyla Zandira Arkananta",
    "role": "siswa",
    "nis": "0102953181",
    "nis_nip": "0102953181",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 7,
    "email": "0102953181@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102953181",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 89,
    "username": "0103773211",
    "name": "Athaya Aqilah Wibowo",
    "role": "siswa",
    "nis": "0103773211",
    "nis_nip": "0103773211",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 8,
    "email": "0103773211@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103773211",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 90,
    "username": "0111766160",
    "name": "Aurilya Ayu Dwi Marsyaningrum",
    "role": "siswa",
    "nis": "0111766160",
    "nis_nip": "0111766160",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 9,
    "email": "0111766160@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0111766160",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 91,
    "username": "0115463643",
    "name": "Brigita Fiorenza Janitra",
    "role": "siswa",
    "nis": "0115463643",
    "nis_nip": "0115463643",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 10,
    "email": "0115463643@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115463643",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 92,
    "username": "0102282537",
    "name": "Dalilah Zuema",
    "role": "siswa",
    "nis": "0102282537",
    "nis_nip": "0102282537",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 11,
    "email": "0102282537@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102282537",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 93,
    "username": "0105100898",
    "name": "Dzakiyyah Hasna Kamea",
    "role": "siswa",
    "nis": "0105100898",
    "nis_nip": "0105100898",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 12,
    "email": "0105100898@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105100898",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 94,
    "username": "0106597351",
    "name": "Euro Raftiago Jose",
    "role": "siswa",
    "nis": "0106597351",
    "nis_nip": "0106597351",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 13,
    "email": "0106597351@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106597351",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 95,
    "username": "0102146382",
    "name": "Farannisa Dahayu Helga Afroza",
    "role": "siswa",
    "nis": "0102146382",
    "nis_nip": "0102146382",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 14,
    "email": "0102146382@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102146382",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 96,
    "username": "0116462831",
    "name": "Gabriel Qabila Altafunnisa",
    "role": "siswa",
    "nis": "0116462831",
    "nis_nip": "0116462831",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 15,
    "email": "0116462831@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0116462831",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 97,
    "username": "0112480032",
    "name": "Hafiz Muhammad Rizky",
    "role": "siswa",
    "nis": "0112480032",
    "nis_nip": "0112480032",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 16,
    "email": "0112480032@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0112480032",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 98,
    "username": "0102950863",
    "name": "Irbah Nazihah El Iffah",
    "role": "siswa",
    "nis": "0102950863",
    "nis_nip": "0102950863",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 17,
    "email": "0102950863@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102950863",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 99,
    "username": "0119553629",
    "name": "Karen Hossyanna Sarosa",
    "role": "siswa",
    "nis": "0119553629",
    "nis_nip": "0119553629",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 18,
    "email": "0119553629@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119553629",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 100,
    "username": "0101790736",
    "name": "Khansa Mutia Anantara",
    "role": "siswa",
    "nis": "0101790736",
    "nis_nip": "0101790736",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 19,
    "email": "0101790736@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101790736",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 101,
    "username": "0091294336",
    "name": "Langit Biru",
    "role": "siswa",
    "nis": "0091294336",
    "nis_nip": "0091294336",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 20,
    "email": "0091294336@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0091294336",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 102,
    "username": "0102274044",
    "name": "Mas Alun Annisak",
    "role": "siswa",
    "nis": "0102274044",
    "nis_nip": "0102274044",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 21,
    "email": "0102274044@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102274044",
    "created_at": "2026-10-26 06:36:00"
  },
  {
    "id": 103,
    "username": "0117114865",
    "name": "Mikhaila Rizqia Thahar",
    "role": "siswa",
    "nis": "0117114865",
    "nis_nip": "0117114865",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 22,
    "email": "0117114865@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117114865",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 104,
    "username": "0112567801",
    "name": "Mohammad Nafis Thirafi",
    "role": "siswa",
    "nis": "0112567801",
    "nis_nip": "0112567801",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 23,
    "email": "0112567801@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0112567801",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 105,
    "username": "0102330526",
    "name": "Muhammad Haikal Rahardian Ezar",
    "role": "siswa",
    "nis": "0102330526",
    "nis_nip": "0102330526",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 24,
    "email": "0102330526@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102330526",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 106,
    "username": "3110139027",
    "name": "Naila Aulia Mukarromah",
    "role": "siswa",
    "nis": "3110139027",
    "nis_nip": "3110139027",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 25,
    "email": "3110139027@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3110139027",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 107,
    "username": "0108990657",
    "name": "Nendra Khrisna Alvin Prasetya",
    "role": "siswa",
    "nis": "0108990657",
    "nis_nip": "0108990657",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 26,
    "email": "0108990657@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108990657",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 108,
    "username": "0109231418",
    "name": "Phylia Filadhel Pearlyn Tindaon",
    "role": "siswa",
    "nis": "0109231418",
    "nis_nip": "0109231418",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 27,
    "email": "0109231418@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109231418",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 109,
    "username": "0122295584",
    "name": "Raffasya Kiano Firmana Putra",
    "role": "siswa",
    "nis": "0122295584",
    "nis_nip": "0122295584",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 28,
    "email": "0122295584@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0122295584",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 110,
    "username": "0101977157",
    "name": "Restu Sekar Andaru",
    "role": "siswa",
    "nis": "0101977157",
    "nis_nip": "0101977157",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 29,
    "email": "0101977157@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101977157",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 111,
    "username": "0119123180",
    "name": "Roland Yahya",
    "role": "siswa",
    "nis": "0119123180",
    "nis_nip": "0119123180",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 30,
    "email": "0119123180@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119123180",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 112,
    "username": "0102587641",
    "name": "Satria Alamsyah Ramadhan",
    "role": "siswa",
    "nis": "0102587641",
    "nis_nip": "0102587641",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 31,
    "email": "0102587641@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102587641",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 113,
    "username": "0107710659",
    "name": "Shallu Cintya Putri Prasetya",
    "role": "siswa",
    "nis": "0107710659",
    "nis_nip": "0107710659",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 32,
    "email": "0107710659@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107710659",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 114,
    "username": "0119920084",
    "name": "Thalita Pameila Ramandita",
    "role": "siswa",
    "nis": "0119920084",
    "nis_nip": "0119920084",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 33,
    "email": "0119920084@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119920084",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 115,
    "username": "0112191389",
    "name": "Wafi Rifian Bariq",
    "role": "siswa",
    "nis": "0112191389",
    "nis_nip": "0112191389",
    "kelas": "X-10",
    "gender": "L",
    "no_absen": 34,
    "email": "0112191389@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0112191389",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 116,
    "username": "0102259244",
    "name": "Wulan Ayu Lestari",
    "role": "siswa",
    "nis": "0102259244",
    "nis_nip": "0102259244",
    "kelas": "X-10",
    "gender": "P",
    "no_absen": 35,
    "email": "0102259244@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102259244",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 117,
    "username": "0113405715",
    "name": "Adam Cahyana Abidin",
    "role": "siswa",
    "nis": "0113405715",
    "nis_nip": "0113405715",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 1,
    "email": "0113405715@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113405715",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 118,
    "username": "0102286507",
    "name": "Ahza Alisha Zahra Hafiya",
    "role": "siswa",
    "nis": "0102286507",
    "nis_nip": "0102286507",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 2,
    "email": "0102286507@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102286507",
    "created_at": "2026-10-26 06:36:01"
  },
  {
    "id": 119,
    "username": "0111749164",
    "name": "Alfarizi Izza Felendra",
    "role": "siswa",
    "nis": "0111749164",
    "nis_nip": "0111749164",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 3,
    "email": "0111749164@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0111749164",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 120,
    "username": "0119090776",
    "name": "Aliqa Kirani Atharizqi",
    "role": "siswa",
    "nis": "0119090776",
    "nis_nip": "0119090776",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 4,
    "email": "0119090776@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119090776",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 121,
    "username": "0109419228",
    "name": "Amira Dia Pita Lohka",
    "role": "siswa",
    "nis": "0109419228",
    "nis_nip": "0109419228",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 5,
    "email": "0109419228@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109419228",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 122,
    "username": "0119598668",
    "name": "Aprillia Kusuma Dewanti",
    "role": "siswa",
    "nis": "0119598668",
    "nis_nip": "0119598668",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 6,
    "email": "0119598668@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119598668",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 123,
    "username": "0103657660",
    "name": "Arsa Lencana Wijaya",
    "role": "siswa",
    "nis": "0103657660",
    "nis_nip": "0103657660",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 7,
    "email": "0103657660@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103657660",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 124,
    "username": "0102795605",
    "name": "Ashifa Safitri Haningtyas",
    "role": "siswa",
    "nis": "0102795605",
    "nis_nip": "0102795605",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 8,
    "email": "0102795605@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102795605",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 125,
    "username": "0115024573",
    "name": "Azela Khansa Maha Dwika",
    "role": "siswa",
    "nis": "0115024573",
    "nis_nip": "0115024573",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 9,
    "email": "0115024573@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115024573",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 126,
    "username": "0117112786",
    "name": "Bryan Bhakti Samudra",
    "role": "siswa",
    "nis": "0117112786",
    "nis_nip": "0117112786",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 10,
    "email": "0117112786@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117112786",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 127,
    "username": "0101078032",
    "name": "Cheasya Dwi Putri Sadiva",
    "role": "siswa",
    "nis": "0101078032",
    "nis_nip": "0101078032",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 11,
    "email": "0101078032@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101078032",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 128,
    "username": "0101533662",
    "name": "Diandra Tristania Dwi Wirantika",
    "role": "siswa",
    "nis": "0101533662",
    "nis_nip": "0101533662",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 12,
    "email": "0101533662@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101533662",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 129,
    "username": "0101352474",
    "name": "Evelin Angel Ayta Putri",
    "role": "siswa",
    "nis": "0101352474",
    "nis_nip": "0101352474",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 13,
    "email": "0101352474@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101352474",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 130,
    "username": "0101457573",
    "name": "Faris Maulana",
    "role": "siswa",
    "nis": "0101457573",
    "nis_nip": "0101457573",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 14,
    "email": "0101457573@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101457573",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 131,
    "username": "0112775539",
    "name": "Fenisa Anggun Anasya",
    "role": "siswa",
    "nis": "0112775539",
    "nis_nip": "0112775539",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 15,
    "email": "0112775539@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0112775539",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 132,
    "username": "0115593969",
    "name": "Hanifah Az Zahra",
    "role": "siswa",
    "nis": "0115593969",
    "nis_nip": "0115593969",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 16,
    "email": "0115593969@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115593969",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 133,
    "username": "0108769512",
    "name": "Jesica Ayu Oktaviana",
    "role": "siswa",
    "nis": "0108769512",
    "nis_nip": "0108769512",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 17,
    "email": "0108769512@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108769512",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 134,
    "username": "0119980501",
    "name": "Keysha Chairunnisa Al Imam",
    "role": "siswa",
    "nis": "0119980501",
    "nis_nip": "0119980501",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 18,
    "email": "0119980501@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119980501",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 135,
    "username": "0114145014",
    "name": "Levina Aurellia Daniswara",
    "role": "siswa",
    "nis": "0114145014",
    "nis_nip": "0114145014",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 19,
    "email": "0114145014@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0114145014",
    "created_at": "2026-10-26 06:36:02"
  },
  {
    "id": 136,
    "username": "0102308202",
    "name": "Mas Ayu Prita Maharani",
    "role": "siswa",
    "nis": "0102308202",
    "nis_nip": "0102308202",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 20,
    "email": "0102308202@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102308202",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 137,
    "username": "0106939209",
    "name": "Mochammad Azhar Arasy",
    "role": "siswa",
    "nis": "0106939209",
    "nis_nip": "0106939209",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 21,
    "email": "0106939209@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106939209",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 138,
    "username": "0104800733",
    "name": "Muhammad Adly Putra Hidayat",
    "role": "siswa",
    "nis": "0104800733",
    "nis_nip": "0104800733",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 22,
    "email": "0104800733@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104800733",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 139,
    "username": "0101785858",
    "name": "Muhammad Septian Nur Falah",
    "role": "siswa",
    "nis": "0101785858",
    "nis_nip": "0101785858",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 23,
    "email": "0101785858@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101785858",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 140,
    "username": "0118753650",
    "name": "Nadintya Meyzahra Putri Subandoni",
    "role": "siswa",
    "nis": "0118753650",
    "nis_nip": "0118753650",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 24,
    "email": "0118753650@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118753650",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 141,
    "username": "0103370518",
    "name": "Nayshila Tsania Ramadhani",
    "role": "siswa",
    "nis": "0103370518",
    "nis_nip": "0103370518",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 25,
    "email": "0103370518@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103370518",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 142,
    "username": "0117724211",
    "name": "Prajwalita Lintang Kirana Bastian",
    "role": "siswa",
    "nis": "0117724211",
    "nis_nip": "0117724211",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 26,
    "email": "0117724211@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0117724211",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 143,
    "username": "0115414627",
    "name": "Rafif Bintang Adinata",
    "role": "siswa",
    "nis": "0115414627",
    "nis_nip": "0115414627",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 27,
    "email": "0115414627@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115414627",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 144,
    "username": "0118545576",
    "name": "Reyfat Arta Herdiansyah",
    "role": "siswa",
    "nis": "0118545576",
    "nis_nip": "0118545576",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 28,
    "email": "0118545576@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118545576",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 145,
    "username": "0113045720",
    "name": "Rohana Nur Irawati",
    "role": "siswa",
    "nis": "0113045720",
    "nis_nip": "0113045720",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 29,
    "email": "0113045720@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113045720",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 146,
    "username": "0103180333",
    "name": "Roman Arif Nur Riquelme",
    "role": "siswa",
    "nis": "0103180333",
    "nis_nip": "0103180333",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 30,
    "email": "0103180333@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103180333",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 147,
    "username": "0104775829",
    "name": "Sayfhana Nadhifa Dineza",
    "role": "siswa",
    "nis": "0104775829",
    "nis_nip": "0104775829",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 31,
    "email": "0104775829@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104775829",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 148,
    "username": "0109694296",
    "name": "Soraya Arthalia Putri",
    "role": "siswa",
    "nis": "0109694296",
    "nis_nip": "0109694296",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 32,
    "email": "0109694296@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109694296",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 149,
    "username": "0101221186",
    "name": "Tsabita Chaufah Azahna",
    "role": "siswa",
    "nis": "0101221186",
    "nis_nip": "0101221186",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 33,
    "email": "0101221186@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101221186",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 150,
    "username": "0105168401",
    "name": "Tytto Jeryco Putra Pratama",
    "role": "siswa",
    "nis": "0105168401",
    "nis_nip": "0105168401",
    "kelas": "X-11",
    "gender": "L",
    "no_absen": 34,
    "email": "0105168401@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105168401",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 151,
    "username": "0109647596",
    "name": "Zaizafun Syawal Kheiritaquin",
    "role": "siswa",
    "nis": "0109647596",
    "nis_nip": "0109647596",
    "kelas": "X-11",
    "gender": "P",
    "no_absen": 35,
    "email": "0109647596@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109647596",
    "created_at": "2026-10-26 06:36:03"
  },
  {
    "id": 152,
    "username": "0104167555",
    "name": "Addis Azalea Maheswari",
    "role": "siswa",
    "nis": "0104167555",
    "nis_nip": "0104167555",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 1,
    "email": "0104167555@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104167555",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 153,
    "username": "0105362195",
    "name": "Aileen Nadira Arif Chantika",
    "role": "siswa",
    "nis": "0105362195",
    "nis_nip": "0105362195",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 2,
    "email": "0105362195@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105362195",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 154,
    "username": "0105781173",
    "name": "Akbar Kaisar Herman",
    "role": "siswa",
    "nis": "0105781173",
    "nis_nip": "0105781173",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 3,
    "email": "0105781173@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105781173",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 155,
    "username": "0107056604",
    "name": "Amanda Syalima Yasmine",
    "role": "siswa",
    "nis": "0107056604",
    "nis_nip": "0107056604",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 4,
    "email": "0107056604@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107056604",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 156,
    "username": "0104908620",
    "name": "Anelsa Nujma Darmadwipa",
    "role": "siswa",
    "nis": "0104908620",
    "nis_nip": "0104908620",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 5,
    "email": "0104908620@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104908620",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 157,
    "username": "0108978593",
    "name": "Archibald Richardo Awantino",
    "role": "siswa",
    "nis": "0108978593",
    "nis_nip": "0108978593",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 6,
    "email": "0108978593@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108978593",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 158,
    "username": "0115936224",
    "name": "Arthorius Benedixtus Yoedo Soetanto",
    "role": "siswa",
    "nis": "0115936224",
    "nis_nip": "0115936224",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 7,
    "email": "0115936224@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115936224",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 159,
    "username": "0111759443",
    "name": "Askanah Sakhi Quaneisha Zahira",
    "role": "siswa",
    "nis": "0111759443",
    "nis_nip": "0111759443",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 8,
    "email": "0111759443@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0111759443",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 160,
    "username": "0127017126",
    "name": "Azkadina Keyzia Nararya Atharayhan",
    "role": "siswa",
    "nis": "0127017126",
    "nis_nip": "0127017126",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 9,
    "email": "0127017126@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0127017126",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 161,
    "username": "0119975072",
    "name": "Caesar Devi Permata Sari",
    "role": "siswa",
    "nis": "0119975072",
    "nis_nip": "0119975072",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 10,
    "email": "0119975072@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0119975072",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 162,
    "username": "0107632415",
    "name": "Deandra Putra Prasetiyo",
    "role": "siswa",
    "nis": "0107632415",
    "nis_nip": "0107632415",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 11,
    "email": "0107632415@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107632415",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 163,
    "username": "0115287328",
    "name": "Dinda Cintya Cahya Ramadhanti",
    "role": "siswa",
    "nis": "0115287328",
    "nis_nip": "0115287328",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 12,
    "email": "0115287328@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0115287328",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 164,
    "username": "0118616729",
    "name": "Fachira Nayfa Mardya Rafeyla",
    "role": "siswa",
    "nis": "0118616729",
    "nis_nip": "0118616729",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 13,
    "email": "0118616729@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118616729",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 165,
    "username": "0103686003",
    "name": "Farra Nur Tsabita",
    "role": "siswa",
    "nis": "0103686003",
    "nis_nip": "0103686003",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 14,
    "email": "0103686003@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103686003",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 166,
    "username": "0104981808",
    "name": "Galih Restu Sadewo",
    "role": "siswa",
    "nis": "0104981808",
    "nis_nip": "0104981808",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 15,
    "email": "0104981808@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104981808",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 167,
    "username": "0108611674",
    "name": "Hanindya Mega Pertiwi",
    "role": "siswa",
    "nis": "0108611674",
    "nis_nip": "0108611674",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 16,
    "email": "0108611674@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108611674",
    "created_at": "2026-10-26 06:36:04"
  },
  {
    "id": 168,
    "username": "0108531925",
    "name": "Irva Desta Anggraeni",
    "role": "siswa",
    "nis": "0108531925",
    "nis_nip": "0108531925",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 17,
    "email": "0108531925@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108531925",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 169,
    "username": "0116055900",
    "name": "Kartieka Wulan Keenantie",
    "role": "siswa",
    "nis": "0116055900",
    "nis_nip": "0116055900",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 18,
    "email": "0116055900@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0116055900",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 170,
    "username": "0108922172",
    "name": "Khansa Nadia Syifaun Nufus",
    "role": "siswa",
    "nis": "0108922172",
    "nis_nip": "0108922172",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 19,
    "email": "0108922172@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108922172",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 171,
    "username": "0102885144",
    "name": "Lintang Ayu Putri Damares",
    "role": "siswa",
    "nis": "0102885144",
    "nis_nip": "0102885144",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 20,
    "email": "0102885144@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102885144",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 172,
    "username": "0106263159",
    "name": "Lintang Karim Fanshuri",
    "role": "siswa",
    "nis": "0106263159",
    "nis_nip": "0106263159",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 21,
    "email": "0106263159@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106263159",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 173,
    "username": "3108356444",
    "name": "Mohammad Hilmy Al Baihaqi",
    "role": "siswa",
    "nis": "3108356444",
    "nis_nip": "3108356444",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 22,
    "email": "3108356444@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3108356444",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 174,
    "username": "0102371794",
    "name": "Muhammad Akhir",
    "role": "siswa",
    "nis": "0102371794",
    "nis_nip": "0102371794",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 23,
    "email": "0102371794@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102371794",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 175,
    "username": "0104865547",
    "name": "Muhammad Yusuf",
    "role": "siswa",
    "nis": "0104865547",
    "nis_nip": "0104865547",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 24,
    "email": "0104865547@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104865547",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 176,
    "username": "0104182131",
    "name": "Nadiny Efia Kumala",
    "role": "siswa",
    "nis": "0104182131",
    "nis_nip": "0104182131",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 25,
    "email": "0104182131@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104182131",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 177,
    "username": "3107439742",
    "name": "Nisvi Tania Sarifatul Hidayah",
    "role": "siswa",
    "nis": "3107439742",
    "nis_nip": "3107439742",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 26,
    "email": "3107439742@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3107439742",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 178,
    "username": "0107075500",
    "name": "Prasetyo Vicky Kurniawan",
    "role": "siswa",
    "nis": "0107075500",
    "nis_nip": "0107075500",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 27,
    "email": "0107075500@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107075500",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 179,
    "username": "0109190537",
    "name": "Radiska Putri Bintang Ayu Wicaksono",
    "role": "siswa",
    "nis": "0109190537",
    "nis_nip": "0109190537",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 28,
    "email": "0109190537@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109190537",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 180,
    "username": "0118027434",
    "name": "Reyhan Fito Muhammad Putro",
    "role": "siswa",
    "nis": "0118027434",
    "nis_nip": "0118027434",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 29,
    "email": "0118027434@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0118027434",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 181,
    "username": "0109783065",
    "name": "Rohhadatul Aisi",
    "role": "siswa",
    "nis": "0109783065",
    "nis_nip": "0109783065",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 30,
    "email": "0109783065@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109783065",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 182,
    "username": "0102810130",
    "name": "Sazhy Kirana Aryanti",
    "role": "siswa",
    "nis": "0102810130",
    "nis_nip": "0102810130",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 31,
    "email": "0102810130@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102810130",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 183,
    "username": "3120694686",
    "name": "Soraya Lestari",
    "role": "siswa",
    "nis": "3120694686",
    "nis_nip": "3120694686",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 32,
    "email": "3120694686@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3120694686",
    "created_at": "2026-10-26 06:36:05"
  },
  {
    "id": 184,
    "username": "0113577909",
    "name": "Tsabita Hilary Azaria",
    "role": "siswa",
    "nis": "0113577909",
    "nis_nip": "0113577909",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 33,
    "email": "0113577909@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0113577909",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 185,
    "username": "0102445156",
    "name": "Vicko Azam Firmansyah",
    "role": "siswa",
    "nis": "0102445156",
    "nis_nip": "0102445156",
    "kelas": "X-12",
    "gender": "L",
    "no_absen": 34,
    "email": "0102445156@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102445156",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 186,
    "username": "0101412038",
    "name": "Zaneta Carissa Putri Sandi",
    "role": "siswa",
    "nis": "0101412038",
    "nis_nip": "0101412038",
    "kelas": "X-12",
    "gender": "P",
    "no_absen": 35,
    "email": "0101412038@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0101412038",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 187,
    "username": "0096823837",
    "name": "Aira Luna Amalia",
    "role": "siswa",
    "nis": "0096823837",
    "nis_nip": "0096823837",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 1,
    "email": "0096823837@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096823837",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 188,
    "username": "0097350128",
    "name": "Aisyah Devianita Novarini",
    "role": "siswa",
    "nis": "0097350128",
    "nis_nip": "0097350128",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 2,
    "email": "0097350128@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097350128",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 189,
    "username": "0091391702",
    "name": "Aluna Chantika Aurily Agatha",
    "role": "siswa",
    "nis": "0091391702",
    "nis_nip": "0091391702",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 3,
    "email": "0091391702@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0091391702",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 190,
    "username": "0097437394",
    "name": "Aluna Kiara Putri",
    "role": "siswa",
    "nis": "0097437394",
    "nis_nip": "0097437394",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 4,
    "email": "0097437394@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097437394",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 191,
    "username": "0167805073",
    "name": "Alyssa Qotrunnada",
    "role": "siswa",
    "nis": "0167805073",
    "nis_nip": "0167805073",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 5,
    "email": "0167805073@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0167805073",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 192,
    "username": "3105397321",
    "name": "Aqilla Bilqis Putri",
    "role": "siswa",
    "nis": "3105397321",
    "nis_nip": "3105397321",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 6,
    "email": "3105397321@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3105397321",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 193,
    "username": "3104986191",
    "name": "Aurora Verda Nur Athifa",
    "role": "siswa",
    "nis": "3104986191",
    "nis_nip": "3104986191",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 7,
    "email": "3104986191@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3104986191",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 194,
    "username": "0099907460",
    "name": "Bara Akbar Shafiyullah",
    "role": "siswa",
    "nis": "0099907460",
    "nis_nip": "0099907460",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 8,
    "email": "0099907460@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0099907460",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 195,
    "username": "0108515585",
    "name": "David Briandy Pamungkas",
    "role": "siswa",
    "nis": "0108515585",
    "nis_nip": "0108515585",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 9,
    "email": "0108515585@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108515585",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 196,
    "username": "3094855961",
    "name": "Dominikus Yumai",
    "role": "siswa",
    "nis": "3094855961",
    "nis_nip": "3094855961",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 10,
    "email": "3094855961@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3094855961",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 197,
    "username": "0102219947",
    "name": "Feby Farzana",
    "role": "siswa",
    "nis": "0102219947",
    "nis_nip": "0102219947",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 11,
    "email": "0102219947@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102219947",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 198,
    "username": "0099442029",
    "name": "Fernadi Satrio Nugroho",
    "role": "siswa",
    "nis": "0099442029",
    "nis_nip": "0099442029",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 12,
    "email": "0099442029@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0099442029",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 199,
    "username": "0098202298",
    "name": "Hening Okta Dewi Prameswari",
    "role": "siswa",
    "nis": "0098202298",
    "nis_nip": "0098202298",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 13,
    "email": "0098202298@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098202298",
    "created_at": "2026-10-26 06:36:06"
  },
  {
    "id": 200,
    "username": "0092251476",
    "name": "Karuna Nathan Nijananda",
    "role": "siswa",
    "nis": "0092251476",
    "nis_nip": "0092251476",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 14,
    "email": "0092251476@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0092251476",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 201,
    "username": "0108713819",
    "name": "Keysha Sadira Kalea",
    "role": "siswa",
    "nis": "0108713819",
    "nis_nip": "0108713819",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 15,
    "email": "0108713819@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108713819",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 202,
    "username": "0106913144",
    "name": "Mauliddia Ragil Kurnia",
    "role": "siswa",
    "nis": "0106913144",
    "nis_nip": "0106913144",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 16,
    "email": "0106913144@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0106913144",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 203,
    "username": "0099710515",
    "name": "Melani Ade Sevtian",
    "role": "siswa",
    "nis": "0099710515",
    "nis_nip": "0099710515",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 17,
    "email": "0099710515@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0099710515",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 204,
    "username": "0109839680",
    "name": "Mentari Carrolinna Sibarrani",
    "role": "siswa",
    "nis": "0109839680",
    "nis_nip": "0109839680",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 18,
    "email": "0109839680@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0109839680",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 205,
    "username": "0105768392",
    "name": "Moch Maulana Afsel",
    "role": "siswa",
    "nis": "0105768392",
    "nis_nip": "0105768392",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 19,
    "email": "0105768392@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105768392",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 206,
    "username": "0105657492",
    "name": "Moringgo Febrian",
    "role": "siswa",
    "nis": "0105657492",
    "nis_nip": "0105657492",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 20,
    "email": "0105657492@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105657492",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 207,
    "username": "0096850817",
    "name": "Muhammad Haykal Almagroby",
    "role": "siswa",
    "nis": "0096850817",
    "nis_nip": "0096850817",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 21,
    "email": "0096850817@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096850817",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 208,
    "username": "0108137480",
    "name": "Naysifa Aura Firlita",
    "role": "siswa",
    "nis": "0108137480",
    "nis_nip": "0108137480",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 22,
    "email": "0108137480@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0108137480",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 209,
    "username": "0102992805",
    "name": "Nizam Maulana",
    "role": "siswa",
    "nis": "0102992805",
    "nis_nip": "0102992805",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 23,
    "email": "0102992805@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102992805",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 210,
    "username": "0103829912",
    "name": "Puput Lailatul Afidah",
    "role": "siswa",
    "nis": "0103829912",
    "nis_nip": "0103829912",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 24,
    "email": "0103829912@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0103829912",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 211,
    "username": "0104892240",
    "name": "Qinara Meisya Ayu Swara",
    "role": "siswa",
    "nis": "0104892240",
    "nis_nip": "0104892240",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 25,
    "email": "0104892240@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104892240",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 212,
    "username": "0094327887",
    "name": "Raditya Kenzie Fahreza",
    "role": "siswa",
    "nis": "0094327887",
    "nis_nip": "0094327887",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 26,
    "email": "0094327887@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0094327887",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 213,
    "username": "0107310711",
    "name": "Shelen Lifiel Chelisya",
    "role": "siswa",
    "nis": "0107310711",
    "nis_nip": "0107310711",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 27,
    "email": "0107310711@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0107310711",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 214,
    "username": "0099731593",
    "name": "Sherina Tiara Ramadhani",
    "role": "siswa",
    "nis": "0099731593",
    "nis_nip": "0099731593",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 28,
    "email": "0099731593@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0099731593",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 215,
    "username": "0102714683",
    "name": "Syavalen Zafiero Agatha",
    "role": "siswa",
    "nis": "0102714683",
    "nis_nip": "0102714683",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 29,
    "email": "0102714683@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0102714683",
    "created_at": "2026-10-26 06:36:07"
  },
  {
    "id": 216,
    "username": "0095449975",
    "name": "Tania Kikan Iloh Putri",
    "role": "siswa",
    "nis": "0095449975",
    "nis_nip": "0095449975",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 30,
    "email": "0095449975@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0095449975",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 217,
    "username": "3103767186",
    "name": "Tazkiya Shofiatus Zahro",
    "role": "siswa",
    "nis": "3103767186",
    "nis_nip": "3103767186",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 31,
    "email": "3103767186@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3103767186",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 218,
    "username": "0091599355",
    "name": "Winda Diana Novita",
    "role": "siswa",
    "nis": "0091599355",
    "nis_nip": "0091599355",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 32,
    "email": "0091599355@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0091599355",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 219,
    "username": "0096505488",
    "name": "Yessica Dwi Wulandari",
    "role": "siswa",
    "nis": "0096505488",
    "nis_nip": "0096505488",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 33,
    "email": "0096505488@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096505488",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 220,
    "username": "0104830596",
    "name": "Yulia Fabikha Nachya Hatta",
    "role": "siswa",
    "nis": "0104830596",
    "nis_nip": "0104830596",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 34,
    "email": "0104830596@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0104830596",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 221,
    "username": "0097649935",
    "name": "Zalla Dimitry Sibarana",
    "role": "siswa",
    "nis": "0097649935",
    "nis_nip": "0097649935",
    "kelas": "XI-5",
    "gender": "L",
    "no_absen": 35,
    "email": "0097649935@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097649935",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 222,
    "username": "3107737332",
    "name": "Zetta Navisha Wistara Siregar",
    "role": "siswa",
    "nis": "3107737332",
    "nis_nip": "3107737332",
    "kelas": "XI-5",
    "gender": "P",
    "no_absen": 36,
    "email": "3107737332@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3107737332",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 223,
    "username": "0089330950",
    "name": "Alief Mahendra Dynasty Viola",
    "role": "siswa",
    "nis": "0089330950",
    "nis_nip": "0089330950",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 1,
    "email": "0089330950@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0089330950",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 224,
    "username": "0088603229",
    "name": "Annisa Putri Rahmadani",
    "role": "siswa",
    "nis": "0088603229",
    "nis_nip": "0088603229",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 2,
    "email": "0088603229@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0088603229",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 225,
    "username": "0081815965",
    "name": "Astrid Putri Irdyantara Mangiwa",
    "role": "siswa",
    "nis": "0081815965",
    "nis_nip": "0081815965",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 3,
    "email": "0081815965@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081815965",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 226,
    "username": "3099814944",
    "name": "Azzahrah Azka Syahirah",
    "role": "siswa",
    "nis": "3099814944",
    "nis_nip": "3099814944",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 4,
    "email": "3099814944@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3099814944",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 227,
    "username": "0081506427",
    "name": "Bayu Putra Adinata",
    "role": "siswa",
    "nis": "0081506427",
    "nis_nip": "0081506427",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 5,
    "email": "0081506427@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081506427",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 228,
    "username": "0092951287",
    "name": "Bryans Madha Wahyu P",
    "role": "siswa",
    "nis": "0092951287",
    "nis_nip": "0092951287",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 6,
    "email": "0092951287@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0092951287",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 229,
    "username": "0096208933",
    "name": "Cahyo Rizky Wahyudi",
    "role": "siswa",
    "nis": "0096208933",
    "nis_nip": "0096208933",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 7,
    "email": "0096208933@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096208933",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 230,
    "username": "0093670458",
    "name": "Calysta Silvia Salsabila",
    "role": "siswa",
    "nis": "0093670458",
    "nis_nip": "0093670458",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 8,
    "email": "0093670458@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0093670458",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 231,
    "username": "0081808715",
    "name": "Davizha Falmay Glady Azziera",
    "role": "siswa",
    "nis": "0081808715",
    "nis_nip": "0081808715",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 9,
    "email": "0081808715@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081808715",
    "created_at": "2026-10-26 06:36:08"
  },
  {
    "id": 232,
    "username": "0083821620",
    "name": "Dewa Aksan",
    "role": "siswa",
    "nis": "0083821620",
    "nis_nip": "0083821620",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 10,
    "email": "0083821620@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0083821620",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 233,
    "username": "0095631288",
    "name": "Enrico Hendy Wijayanto",
    "role": "siswa",
    "nis": "0095631288",
    "nis_nip": "0095631288",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 11,
    "email": "0095631288@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0095631288",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 234,
    "username": "0096062466",
    "name": "Erlangga Safildan Pratama Rochim",
    "role": "siswa",
    "nis": "0096062466",
    "nis_nip": "0096062466",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 12,
    "email": "0096062466@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096062466",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 235,
    "username": "0087014303",
    "name": "Evonne Airell Devonna",
    "role": "siswa",
    "nis": "0087014303",
    "nis_nip": "0087014303",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 13,
    "email": "0087014303@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0087014303",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 236,
    "username": "0093159161",
    "name": "Febriansyah Widan Pratama",
    "role": "siswa",
    "nis": "0093159161",
    "nis_nip": "0093159161",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 14,
    "email": "0093159161@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0093159161",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 237,
    "username": "3084659595",
    "name": "Ferisya Citra Kharisma",
    "role": "siswa",
    "nis": "3084659595",
    "nis_nip": "3084659595",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 15,
    "email": "3084659595@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3084659595",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 238,
    "username": "0099837852",
    "name": "Hadi Purnomo",
    "role": "siswa",
    "nis": "0099837852",
    "nis_nip": "0099837852",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 16,
    "email": "0099837852@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0099837852",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 239,
    "username": "0087131695",
    "name": "Hafiz Ataya Firqi Ramadhani",
    "role": "siswa",
    "nis": "0087131695",
    "nis_nip": "0087131695",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 17,
    "email": "0087131695@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0087131695",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 240,
    "username": "0096187414",
    "name": "Hasna' Izah Fauqiyah",
    "role": "siswa",
    "nis": "0096187414",
    "nis_nip": "0096187414",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 18,
    "email": "0096187414@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096187414",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 241,
    "username": "0087201524",
    "name": "Ida Ayu Nadindra Kirana",
    "role": "siswa",
    "nis": "0087201524",
    "nis_nip": "0087201524",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 19,
    "email": "0087201524@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0087201524",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 242,
    "username": "0097381029",
    "name": "Isrofi Maulana Yulianto",
    "role": "siswa",
    "nis": "0097381029",
    "nis_nip": "0097381029",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 20,
    "email": "0097381029@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097381029",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 243,
    "username": "3097180907",
    "name": "Manha Sanika Zarin",
    "role": "siswa",
    "nis": "3097180907",
    "nis_nip": "3097180907",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 21,
    "email": "3097180907@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3097180907",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 244,
    "username": "0081998100",
    "name": "Mayla Zelda Kirana",
    "role": "siswa",
    "nis": "0081998100",
    "nis_nip": "0081998100",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 22,
    "email": "0081998100@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081998100",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 245,
    "username": "0092928330",
    "name": "Muhamad Alif Yanfari",
    "role": "siswa",
    "nis": "0092928330",
    "nis_nip": "0092928330",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 23,
    "email": "0092928330@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0092928330",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 246,
    "username": "0092745514",
    "name": "Muhammad Tegar Pribramso",
    "role": "siswa",
    "nis": "0092745514",
    "nis_nip": "0092745514",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 24,
    "email": "0092745514@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0092745514",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 247,
    "username": "0098032718",
    "name": "Natasya Rizkyana Putri Sadiva",
    "role": "siswa",
    "nis": "0098032718",
    "nis_nip": "0098032718",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 25,
    "email": "0098032718@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098032718",
    "created_at": "2026-10-26 06:36:09"
  },
  {
    "id": 248,
    "username": "0097704181",
    "name": "Nindy Walin Febria Rohandi",
    "role": "siswa",
    "nis": "0097704181",
    "nis_nip": "0097704181",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 26,
    "email": "0097704181@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097704181",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 249,
    "username": "0093407441",
    "name": "Raffi Atha Gagarin",
    "role": "siswa",
    "nis": "0093407441",
    "nis_nip": "0093407441",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 27,
    "email": "0093407441@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0093407441",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 250,
    "username": "0079269353",
    "name": "Rafli Akbar Kuddeh",
    "role": "siswa",
    "nis": "0079269353",
    "nis_nip": "0079269353",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 28,
    "email": "0079269353@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0079269353",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 251,
    "username": "0093726889",
    "name": "Rajaev Wilfi Talib",
    "role": "siswa",
    "nis": "0093726889",
    "nis_nip": "0093726889",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 29,
    "email": "0093726889@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0093726889",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 252,
    "username": "0094169651",
    "name": "Rasendria Zenobi",
    "role": "siswa",
    "nis": "0094169651",
    "nis_nip": "0094169651",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 30,
    "email": "0094169651@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0094169651",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 253,
    "username": "0092718016",
    "name": "Riza Rania Setyoningrum",
    "role": "siswa",
    "nis": "0092718016",
    "nis_nip": "0092718016",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 31,
    "email": "0092718016@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0092718016",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 254,
    "username": "0085516930",
    "name": "Sanitata Fellisha Rahadi",
    "role": "siswa",
    "nis": "0085516930",
    "nis_nip": "0085516930",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 32,
    "email": "0085516930@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0085516930",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 255,
    "username": "0085429692",
    "name": "Septia Bilqis Nurcahyani",
    "role": "siswa",
    "nis": "0085429692",
    "nis_nip": "0085429692",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 33,
    "email": "0085429692@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0085429692",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 256,
    "username": "0085235176",
    "name": "Shandika Dirliansyah",
    "role": "siswa",
    "nis": "0085235176",
    "nis_nip": "0085235176",
    "kelas": "XII-7",
    "gender": "L",
    "no_absen": 34,
    "email": "0085235176@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0085235176",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 257,
    "username": "0098785534",
    "name": "Shereen Nauliane Yasmine",
    "role": "siswa",
    "nis": "0098785534",
    "nis_nip": "0098785534",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 35,
    "email": "0098785534@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098785534",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 258,
    "username": "0105411194",
    "name": "Syifaul Qolbi",
    "role": "siswa",
    "nis": "0105411194",
    "nis_nip": "0105411194",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 36,
    "email": "0105411194@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0105411194",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 259,
    "username": "0081996245",
    "name": "Wanda Jamila",
    "role": "siswa",
    "nis": "0081996245",
    "nis_nip": "0081996245",
    "kelas": "XII-7",
    "gender": "P",
    "no_absen": 37,
    "email": "0081996245@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081996245",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 260,
    "username": "3092911008",
    "name": "Abdillah Wahhaja Divonegara",
    "role": "siswa",
    "nis": "3092911008",
    "nis_nip": "3092911008",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 1,
    "email": "3092911008@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3092911008",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 261,
    "username": "0098500852",
    "name": "Achmad Dimas Wahyu Harianto",
    "role": "siswa",
    "nis": "0098500852",
    "nis_nip": "0098500852",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 2,
    "email": "0098500852@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098500852",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 262,
    "username": "0095934943",
    "name": "Ahmad Fani Setiawan",
    "role": "siswa",
    "nis": "0095934943",
    "nis_nip": "0095934943",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 3,
    "email": "0095934943@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0095934943",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 263,
    "username": "0082033995",
    "name": "Akdan Diyastahzar Afandi",
    "role": "siswa",
    "nis": "0082033995",
    "nis_nip": "0082033995",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 4,
    "email": "0082033995@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0082033995",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 264,
    "username": "0094674577",
    "name": "Aldo Valentino Ferdiansyah Hadi",
    "role": "siswa",
    "nis": "0094674577",
    "nis_nip": "0094674577",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 5,
    "email": "0094674577@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0094674577",
    "created_at": "2026-10-26 06:36:10"
  },
  {
    "id": 265,
    "username": "0088950227",
    "name": "Alea Cintaku Putri Deasy",
    "role": "siswa",
    "nis": "0088950227",
    "nis_nip": "0088950227",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 6,
    "email": "0088950227@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0088950227",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 266,
    "username": "0081684410",
    "name": "Alvin Edgar Xaverius Cavalera",
    "role": "siswa",
    "nis": "0081684410",
    "nis_nip": "0081684410",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 7,
    "email": "0081684410@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081684410",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 267,
    "username": "0088192476",
    "name": "Alya Nur Arini",
    "role": "siswa",
    "nis": "0088192476",
    "nis_nip": "0088192476",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 8,
    "email": "0088192476@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0088192476",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 268,
    "username": "3091381280",
    "name": "Amelia Ledy Sekar Ayu",
    "role": "siswa",
    "nis": "3091381280",
    "nis_nip": "3091381280",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 9,
    "email": "3091381280@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3091381280",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 269,
    "username": "0086567714",
    "name": "Andin Dwisabrina Saputri",
    "role": "siswa",
    "nis": "0086567714",
    "nis_nip": "0086567714",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 10,
    "email": "0086567714@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0086567714",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 270,
    "username": "0088805404",
    "name": "Arey Dewangga",
    "role": "siswa",
    "nis": "0088805404",
    "nis_nip": "0088805404",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 11,
    "email": "0088805404@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0088805404",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 271,
    "username": "0091083049",
    "name": "Avryza Fachridho Alansyah",
    "role": "siswa",
    "nis": "0091083049",
    "nis_nip": "0091083049",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 12,
    "email": "0091083049@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0091083049",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 272,
    "username": "0097841145",
    "name": "Barra Zia'ul Haq Solikin",
    "role": "siswa",
    "nis": "0097841145",
    "nis_nip": "0097841145",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 13,
    "email": "0097841145@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097841145",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 273,
    "username": "0096942132",
    "name": "Bima Azitya Putra",
    "role": "siswa",
    "nis": "0096942132",
    "nis_nip": "0096942132",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 14,
    "email": "0096942132@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096942132",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 274,
    "username": "0088710569",
    "name": "Cika Amelia Anggraini",
    "role": "siswa",
    "nis": "0088710569",
    "nis_nip": "0088710569",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 15,
    "email": "0088710569@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0088710569",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 275,
    "username": "0084556938",
    "name": "Damar Putra Afrianto",
    "role": "siswa",
    "nis": "0084556938",
    "nis_nip": "0084556938",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 16,
    "email": "0084556938@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0084556938",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 276,
    "username": "0089371237",
    "name": "Delfira Meccayla Madina Nazahra",
    "role": "siswa",
    "nis": "0089371237",
    "nis_nip": "0089371237",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 17,
    "email": "0089371237@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0089371237",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 277,
    "username": "0098182727",
    "name": "Gading Satria Abhirama",
    "role": "siswa",
    "nis": "0098182727",
    "nis_nip": "0098182727",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 18,
    "email": "0098182727@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098182727",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 278,
    "username": "0085487102",
    "name": "Gevan Rasada Pratista Pratama",
    "role": "siswa",
    "nis": "0085487102",
    "nis_nip": "0085487102",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 19,
    "email": "0085487102@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0085487102",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 279,
    "username": "0084551868",
    "name": "Irsyad Dani Hariyanto",
    "role": "siswa",
    "nis": "0084551868",
    "nis_nip": "0084551868",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 20,
    "email": "0084551868@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0084551868",
    "created_at": "2026-10-26 06:36:11"
  },
  {
    "id": 280,
    "username": "3092536154",
    "name": "Ismi Annisa Ayu Setyoningtyas",
    "role": "siswa",
    "nis": "3092536154",
    "nis_nip": "3092536154",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 21,
    "email": "3092536154@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3092536154",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 281,
    "username": "0093956988",
    "name": "Jassons Darenika Poloma",
    "role": "siswa",
    "nis": "0093956988",
    "nis_nip": "0093956988",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 22,
    "email": "0093956988@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0093956988",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 282,
    "username": "0153339070",
    "name": "Jati Alfathan Thariqhidayat",
    "role": "siswa",
    "nis": "0153339070",
    "nis_nip": "0153339070",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 23,
    "email": "0153339070@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0153339070",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 283,
    "username": "0097771739",
    "name": "Kheisya Dina Febika Sari",
    "role": "siswa",
    "nis": "0097771739",
    "nis_nip": "0097771739",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 24,
    "email": "0097771739@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097771739",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 284,
    "username": "0098821465",
    "name": "Luhur Pambekti Murnianto",
    "role": "siswa",
    "nis": "0098821465",
    "nis_nip": "0098821465",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 25,
    "email": "0098821465@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098821465",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 285,
    "username": "0089865114",
    "name": "Much Nidhom Regan Arkhananta",
    "role": "siswa",
    "nis": "0089865114",
    "nis_nip": "0089865114",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 26,
    "email": "0089865114@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0089865114",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 286,
    "username": "0096626673",
    "name": "Muhammad Akmal Fadhlan",
    "role": "siswa",
    "nis": "0096626673",
    "nis_nip": "0096626673",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 27,
    "email": "0096626673@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0096626673",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 287,
    "username": "0084016103",
    "name": "Muhammad Fauzi",
    "role": "siswa",
    "nis": "0084016103",
    "nis_nip": "0084016103",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 28,
    "email": "0084016103@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0084016103",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 288,
    "username": "0097506788",
    "name": "Muhammad Zakykanz Nuruddin",
    "role": "siswa",
    "nis": "0097506788",
    "nis_nip": "0097506788",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 29,
    "email": "0097506788@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0097506788",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 289,
    "username": "0086082735",
    "name": "Sarah Mareta Larasati",
    "role": "siswa",
    "nis": "0086082735",
    "nis_nip": "0086082735",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 30,
    "email": "0086082735@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0086082735",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 290,
    "username": "0098497048",
    "name": "Shierley Friska Aishabillah",
    "role": "siswa",
    "nis": "0098497048",
    "nis_nip": "0098497048",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 31,
    "email": "0098497048@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0098497048",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 291,
    "username": "0082737519",
    "name": "Syafira Nur Annisa",
    "role": "siswa",
    "nis": "0082737519",
    "nis_nip": "0082737519",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 32,
    "email": "0082737519@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0082737519",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 292,
    "username": "0081380455",
    "name": "Valentino Al-Ayyubi Hariyanto",
    "role": "siswa",
    "nis": "0081380455",
    "nis_nip": "0081380455",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 33,
    "email": "0081380455@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0081380455",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 293,
    "username": "0084501599",
    "name": "Vicko Noval Pradana",
    "role": "siswa",
    "nis": "0084501599",
    "nis_nip": "0084501599",
    "kelas": "XII-8",
    "gender": "L",
    "no_absen": 34,
    "email": "0084501599@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0084501599",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 294,
    "username": "3094163982",
    "name": "Zahwa Bulan Aprilia",
    "role": "siswa",
    "nis": "3094163982",
    "nis_nip": "3094163982",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 35,
    "email": "3094163982@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=3094163982",
    "created_at": "2026-10-26 06:36:12"
  },
  {
    "id": 295,
    "username": "0085488384",
    "name": "Zulfa Zahira Dwi Santika",
    "role": "siswa",
    "nis": "0085488384",
    "nis_nip": "0085488384",
    "kelas": "XII-8",
    "gender": "P",
    "no_absen": 36,
    "email": "0085488384@siswa.sekolah.sch.id",
    "phone": "",
    "avatar": "https://api.dicebear.com/7.x/micah/svg?seed=0085488384",
    "created_at": "2026-10-26 06:36:12"
  }
];

const DEFAULT_CLASSES = [
  {
    "id": 1,
    "name": "X-8",
    "level": "Kelas 10",
    "academic_year": "2026/2027",
    "student_count": 35,
    "subject_count": 2
  },
  {
    "id": 2,
    "name": "X-9",
    "level": "Kelas 10",
    "academic_year": "2026/2027",
    "student_count": 35,
    "subject_count": 2
  },
  {
    "id": 3,
    "name": "X-10",
    "level": "Kelas 10",
    "academic_year": "2026/2027",
    "student_count": 35,
    "subject_count": 2
  },
  {
    "id": 4,
    "name": "X-11",
    "level": "Kelas 10",
    "academic_year": "2026/2027",
    "student_count": 35,
    "subject_count": 2
  },
  {
    "id": 5,
    "name": "X-12",
    "level": "Kelas 10",
    "academic_year": "2026/2027",
    "student_count": 35,
    "subject_count": 2
  },
  {
    "id": 6,
    "name": "XI-5",
    "level": "Kelas 11",
    "academic_year": "2026/2027",
    "student_count": 36,
    "subject_count": 2
  },
  {
    "id": 7,
    "name": "XII-7",
    "level": "Kelas 12",
    "academic_year": "2026/2027",
    "student_count": 37,
    "subject_count": 2
  },
  {
    "id": 8,
    "name": "XII-8",
    "level": "Kelas 12",
    "academic_year": "2026/2027",
    "student_count": 36,
    "subject_count": 2
  }
];

const DEFAULT_SUBJECTS = [
  { id: 7, name: 'INFORMATIKA', code: 'INF-10', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' },
  { id: 10, name: 'INFORMATIKA', code: 'INF-11', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' },
  { id: 11, name: 'INFORMATIKA', code: 'INF-12', teacher_id: 4, teacher_name: 'Moh. Irham Rozaqi, S.Kom. Gr.' }
];

const DEFAULT_JOURNALS = [];
const DEFAULT_EXAMS = [];
const DEFAULT_QUESTIONS = [];
const DEFAULT_ASSIGNMENTS = [];
const DEFAULT_ASSIGNMENT_SUBMISSIONS = [];
const DEFAULT_ATTENDANCE = [];
const DEFAULT_ATT_RECORDS = [];

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
  syncToFirebase(key, data);
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFirebaseSync({
      [STORAGE_KEYS.USERS]: DEFAULT_USERS,
      [STORAGE_KEYS.CLASSES]: DEFAULT_CLASSES,
      [STORAGE_KEYS.SUBJECTS]: DEFAULT_SUBJECTS
    });
  }, 100);
}

export async function handleMockRequest(endpoint, options = {}) {
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
  let rawUsers = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS);
  let hasAvatarMigrated = false;
  const users = rawUsers.map(u => {
    let updated = u;
    if (u.username === 'admin' && (u.name === 'Administrator LMS' || !u.name)) {
      hasAvatarMigrated = true;
      updated = { ...updated, name: 'Administrator', avatar: generateInitialsAvatarDataUrl('Administrator') };
    }
    if (!updated.avatar || updated.avatar.includes('dicebear')) {
      hasAvatarMigrated = true;
      updated = { ...updated, avatar: generateInitialsAvatarDataUrl(updated.name) };
    }
    if (updated.username === 'irham' && updated.nis_nip !== '198910212022211017') {
      hasAvatarMigrated = true;
      updated = { ...updated, nis_nip: '198910212022211017' };
    }
    return updated;
  });
  if (hasAvatarMigrated) {
    setStored(STORAGE_KEYS.USERS, users);
  }
  if (!users.some(u => u.username === 'irham')) {
    const irhamDefault = DEFAULT_USERS.find(u => u.username === 'irham');
    if (irhamDefault) {
      users.splice(1, 0, irhamDefault);
      setStored(STORAGE_KEYS.USERS, users);
    }
  }
  let currentUserId = Number(localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 2);
  let currentUser = users.find(u => u.id === currentUserId) || users[1] || users[0];

  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================
  if (path === '/auth/login') {
    const cleanUser = (body.username || '').trim().toLowerCase();
    const cleanPass = (body.password || '').trim();

    // Query live Firebase RTDB so all devices (laptops, phones, tablets) immediately use the latest passwords
    let activeUsers = users;
    if (database) {
      try {
        const snap = await get(ref(database, 'lms_v3/users'));
        if (snap.exists()) {
          const val = snap.val();
          const cloudList = Array.isArray(val) ? val : Object.values(val);
          if (cloudList && cloudList.length > 0) {
            // Merge with local users to preserve custom passwords/hashes across syncs
            activeUsers = cloudList.map(cloudU => {
              const localU = users.find(lu => lu.id === cloudU.id || (lu.username && cloudU.username && lu.username.toLowerCase() === cloudU.username.toLowerCase()));
              return {
                ...cloudU,
                password: cloudU.password || localU?.password || undefined,
                password_hash: cloudU.password_hash || localU?.password_hash || undefined
              };
            });
            try {
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(activeUsers));
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('Firebase RTDB login lookup skipped:', e);
      }
    }

    let target = activeUsers.find(u => 
      (u.username && u.username.toLowerCase() === cleanUser) || 
      (u.nis_nip && u.nis_nip.toLowerCase() === cleanUser)
    );
    if (!target) {
      target = DEFAULT_USERS.find(u => 
        (u.username && u.username.toLowerCase() === cleanUser) || 
        (u.nis_nip && u.nis_nip.toLowerCase() === cleanUser)
      );
    }

    if (!target) {
      throw new Error('Username atau kata sandi salah');
    }

    const customPass = (target.password && target.password.trim()) ? target.password.trim() : null;
    const customHash = target.password_hash || (customPass && customPass.startsWith('$2') ? customPass : null);
    let isValidPass = false;

    if (customHash) {
      try {
        isValidPass = bcrypt.compareSync(cleanPass, customHash);
      } catch (e) {
        isValidPass = false;
      }
    }
    if (!isValidPass && customPass && !customPass.startsWith('$2')) {
      isValidPass = (cleanPass === customPass);
    }
    if (!isValidPass && !customPass && !customHash) {
      // Default initial passwords before custom password is set
      isValidPass = 
        cleanPass === 'password123' || 
        cleanPass === 'admin' || 
        (target.username && cleanPass === target.username.toLowerCase()) || 
        (target.nis_nip && cleanPass === target.nis_nip.toLowerCase());
    }

    if (!isValidPass) {
      throw new Error('Username atau kata sandi salah');
    }

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
    const classes = sortClassesNatural(getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES));
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    return { classes, subjects };
  }

  // ==========================================
  // MANAGEMENT ENDPOINTS
  // ==========================================
  if (path === '/management/stats') {
    const classes = sortClassesNatural(getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES));
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
    const classes = sortClassesNatural(getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES));
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
        academic_year: body.academic_year || '2026/2027',
        student_count: 0,
        subject_count: 0
      };
      classes.push(newClass);
      setStored(STORAGE_KEYS.CLASSES, sortClassesNatural(classes));
      return newClass;
    }
  }

  if (path.startsWith('/management/classes/')) {
    const id = Number(path.split('/')[3]);
    let classes = sortClassesNatural(getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES));
    if (method === 'PUT') {
      classes = sortClassesNatural(classes.map(c => c.id === id ? { ...c, ...body } : c));
      setStored(STORAGE_KEYS.CLASSES, classes);
      return classes.find(c => c.id === id);
    }
    if (method === 'DELETE') {
      classes = sortClassesNatural(classes.filter(c => c.id !== id));
      setStored(STORAGE_KEYS.CLASSES, classes);
      return { success: true };
    }
  }

  // SUBJECTS
  if (path === '/management/subjects') {
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    if (method === 'GET') {
      const search = params.get('search');
      let list = subjects.map(s => {
        const teacher = users.find(u => (s.teacher_id && String(u.id) === String(s.teacher_id)) || (s.teacher_name && u.name && u.name.trim().toLowerCase() === s.teacher_name.trim().toLowerCase()));
        return {
          ...s,
          teacher_id: teacher ? teacher.id : s.teacher_id,
          teacher_name: teacher ? teacher.name : (s.teacher_name || 'Belum Ditentukan')
        };
      });
      if (search) {
        list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
      }
      return list;
    }
    if (method === 'POST') {
      const teacher = users.find(u => (body.teacher_id && String(u.id) === String(body.teacher_id)) || (body.teacher_name && u.name && u.name.trim().toLowerCase() === body.teacher_name.trim().toLowerCase()));
      const newSubj = {
        id: Date.now(),
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        teacher_id: body.teacher_id ? Number(body.teacher_id) : (teacher ? teacher.id : null),
        teacher_name: teacher ? teacher.name : (body.teacher_name || 'Belum Ditentukan')
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
      const teacher = users.find(u => (body.teacher_id && String(u.id) === String(body.teacher_id)) || (body.teacher_name && u.name && u.name.trim().toLowerCase() === body.teacher_name.trim().toLowerCase()));
      subjects = subjects.map(s => s.id === id ? {
        ...s,
        ...body,
        teacher_id: body.teacher_id !== undefined ? (body.teacher_id ? Number(body.teacher_id) : null) : (teacher ? teacher.id : s.teacher_id),
        teacher_name: teacher ? teacher.name : (body.teacher_name || s.teacher_name || 'Belum Ditentukan')
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
      const gender = params.get('gender');
      const search = params.get('search');
      if (kelas) students = students.filter(s => s.kelas === kelas);
      if (gender) students = students.filter(s => s.gender === gender);
      if (search) {
        const q = search.toLowerCase();
        students = students.filter(s => s.name.toLowerCase().includes(q) || s.nis?.includes(q) || s.username?.toLowerCase().includes(q));
      }
      students.sort((a, b) => {
        const classComp = (a.kelas || '').localeCompare(b.kelas || '');
        if (classComp !== 0 && !kelas) return classComp;
        const absA = (a.no_absen && a.no_absen > 0) ? a.no_absen : 9999;
        const absB = (b.no_absen && b.no_absen > 0) ? b.no_absen : 9999;
        if (absA !== absB) return absA - absB;
        return (a.name || '').localeCompare(b.name || '');
      });
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
        gender: body.gender || 'L',
        no_absen: body.no_absen ? parseInt(body.no_absen, 10) : (users.filter(u => u.role === 'siswa' && u.kelas === body.kelas).length + 1),
        email: body.email ? body.email.trim() : `${body.username}@siswa.sekolah.sch.id`,
        phone: body.phone ? body.phone.trim() : '',
        password: (body.password && body.password.trim()) ? body.password.trim() : 'password123',
        password_hash: (() => {
          try {
            return bcrypt.hashSync((body.password && body.password.trim()) ? body.password.trim() : 'password123', 10);
          } catch (e) { return null; }
        })(),
        avatar: generateInitialsAvatarDataUrl(body.name.trim()),
        created_at: new Date().toISOString().split('T')[0]
      };
      users.push(newStudent);
      setStored(STORAGE_KEYS.USERS, users);
      return newStudent;
    }
  }

  if (path === '/management/students/batch-import') {
    const list = Array.isArray(body.students) ? body.students : [];
    let importedCount = 0;
    list.forEach(st => {
      if (st.name && st.nis && st.kelas) {
        let username = (st.username || `siswa_${st.nis}`).trim().toLowerCase();
        let candidate = username;
        let counter = 1;
        while (users.some(u => u.username === candidate)) {
          candidate = `${username}_${counter}`;
          counter++;
        }
        username = candidate;

        const newStudent = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          username,
          name: st.name.trim(),
          role: 'siswa',
          nis: String(st.nis).trim(),
          nis_nip: String(st.nis).trim(),
          kelas: String(st.kelas).trim(),
          gender: st.gender || 'L',
          no_absen: st.no_absen ? parseInt(st.no_absen, 10) : (users.filter(u => u.role === 'siswa' && u.kelas === st.kelas).length + 1),
          email: st.email ? st.email.trim() : `${username}@siswa.sekolah.sch.id`,
          phone: st.phone ? st.phone.trim() : '',
          password: (st.password && String(st.password).trim()) ? String(st.password).trim() : 'password123',
          password_hash: (() => {
            try {
              return bcrypt.hashSync((st.password && String(st.password).trim()) ? String(st.password).trim() : 'password123', 10);
            } catch (e) { return null; }
          })(),
          avatar: generateInitialsAvatarDataUrl(st.name.trim()),
          created_at: new Date().toISOString().split('T')[0]
        };
        users.push(newStudent);
        importedCount++;
      }
    });
    setStored(STORAGE_KEYS.USERS, users);
    return {
      success: true,
      importedCount,
      message: `Berhasil mengimpor ${importedCount} data siswa ke database!`
    };
  }

  if (path.match(/^\/management\/students\/\d+$/)) {
    const id = Number(path.split('/')[3]);
    if (method === 'PUT') {
      const updatedUsers = users.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...body, nis_nip: body.nis || u.nis };
          if (body.password && body.password.trim()) {
            const cleanP = body.password.trim();
            updated.password = cleanP;
            try {
              updated.password_hash = bcrypt.hashSync(cleanP, 10);
            } catch (e) {}
          } else if (u.password_hash) {
            updated.password_hash = u.password_hash;
            if (u.password) updated.password = u.password;
          } else if (u.password) {
            updated.password = u.password;
            try {
              updated.password_hash = bcrypt.hashSync(u.password, 10);
            } catch (e) {}
          }
          return updated;
        }
        return u;
      });
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
        password: (body.password && body.password.trim()) ? body.password.trim() : 'password123',
        password_hash: (() => {
          try {
            return bcrypt.hashSync((body.password && body.password.trim()) ? body.password.trim() : 'password123', 10);
          } catch (e) { return null; }
        })(),
        avatar: generateInitialsAvatarDataUrl(body.name.trim()),
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
      const updated = users.map(u => {
        if (u.id === id) {
          const updatedUser = { ...u, ...body };
          if (body.name && body.name.trim()) {
            updatedUser.name = body.name.trim();
            updatedUser.avatar = generateInitialsAvatarDataUrl(updatedUser.name);
          }
          if (body.password && body.password.trim()) {
            const cleanP = body.password.trim();
            updatedUser.password = cleanP;
            try {
              updatedUser.password_hash = bcrypt.hashSync(cleanP, 10);
            } catch (e) {}
          } else if (u.password_hash) {
            updatedUser.password_hash = u.password_hash;
            if (u.password) updatedUser.password = u.password;
          } else if (u.password) {
            updatedUser.password = u.password;
            try {
              updatedUser.password_hash = bcrypt.hashSync(u.password, 10);
            } catch (e) {}
          }
          return updatedUser;
        }
        return u;
      });
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
    if (method === 'GET') {
      const sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
      const records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);
      const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS);

      let changed = false;
      journals = journals.map(j => {
        const sess = sessions.find(s => s.class_id === Number(j.class_id) && s.date === j.date && (Number(s.subject_id) === Number(j.subject_id) || true));
        if (sess) {
          const sessRecords = records.filter(r => r.session_id === sess.id);
          if (sessRecords.length > 0) {
            const classStudents = users.filter(u => u.role === 'siswa' && u.kelas === j.class_name);
            const recMap = {};
            sessRecords.forEach(r => { recMap[r.student_id] = r; });

            let presentCount = 0;
            const absentList = [];

            classStudents.forEach(st => {
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
              changed = true;
              return {
                ...j,
                count_present: presentCount,
                count_absent: absentCount,
                absent_students: absentText
              };
            }
          }
        }
        return j;
      });

      if (changed) {
        setStored(STORAGE_KEYS.JOURNALS, journals);
      }
      return journals;
    }
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
    if (method === 'GET') {
      const classId = params.get('class_id');
      const subjectId = params.get('subject_id');
      let filtered = [...exams];
      if (currentUser.role === 'siswa') {
        filtered = filtered.filter(e => !e.class_name || e.class_name === currentUser.kelas);
      } else if (classId) {
        filtered = filtered.filter(e => e.class_id === Number(classId));
      }
      if (subjectId) {
        filtered = filtered.filter(e => e.subject_id === Number(subjectId));
      }
      return filtered;
    }
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
        subject_name: subj ? subj.name : 'INFORMATIKA',
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

  if (path === '/question-bank/batch-import') {
    let qb = getStored(STORAGE_KEYS.QUESTION_BANK, DEFAULT_QUESTION_BANK);
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    const list = Array.isArray(body.questions) ? body.questions : [];
    let importedCount = 0;

    list.forEach(q => {
      if (q.question_text && q.question_text.trim()) {
        const subjectId = Number(q.subject_id || body.default_subject_id || 1);
        const subj = subjects.find(s => s.id === subjectId);
        const qType = q.question_type || 'MULTIPLE_CHOICE';
        const newItem = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          teacher_id: currentUser.id,
          teacher_name: currentUser.name,
          subject_id: subjectId,
          subject_name: subj ? subj.name : 'INFORMATIKA',
          grade_level: q.grade_level || body.default_grade_level || 'Kelas X',
          topic: q.topic || body.default_topic || 'Umum',
          question_text: q.question_text.trim(),
          question_type: qType,
          options: qType === 'MULTIPLE_CHOICE' ? (q.options || []) : [],
          options_json: JSON.stringify(qType === 'MULTIPLE_CHOICE' ? (q.options || []) : []),
          correct_answer: qType === 'ESSAY' ? '' : (q.correct_answer || 'A'),
          points: Number(q.points) || (qType === 'ESSAY' ? 20 : 10),
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'SEDANG',
          source_exam_title: q.source_exam_title || body.default_package_title || 'Bank Soal Mandiri Guru',
          created_at: new Date().toISOString().split('T')[0]
        };
        qb.unshift(newItem);
        importedCount++;
      }
    });

    setStored(STORAGE_KEYS.QUESTION_BANK, qb);
    return {
      success: true,
      importedCount,
      message: `Berhasil mengimpor ${importedCount} butir soal ke Bank Soal!`
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

  // GOOGLE DRIVE INTEGRATION SETTINGS
  if (path === '/assignments/drive-settings') {
    if (method === 'GET') {
      const settings = JSON.parse(localStorage.getItem('lms_google_drive_settings') || '{}');
      const webhookUrl = (settings.webhookUrl || '').trim();
      return {
        webhookUrl: webhookUrl,
        parentFolderId: settings.parentFolderId || '',
        isConfigured: Boolean(webhookUrl),
        lastTested: settings.lastTested || null
      };
    }
    if (method === 'POST') {
      const webhookUrl = (body.webhookUrl || '').trim();
      const updated = {
        webhookUrl: webhookUrl,
        parentFolderId: (body.parentFolderId || '').trim(),
        isConfigured: Boolean(webhookUrl),
        lastTested: body.lastTested || (webhookUrl ? new Date().toISOString() : null)
      };
      localStorage.setItem('lms_google_drive_settings', JSON.stringify(updated));
      syncToFirebase('lms_google_drive_settings', updated);
      return { success: true, message: 'Pengaturan Google Drive berhasil disimpan!', settings: updated };
    }
  }

  if (path === '/assignments/drive-settings/test') {
    const url = (body.webhookUrl || JSON.parse(localStorage.getItem('lms_google_drive_settings') || '{}').webhookUrl || '').trim();
    if (!url) {
      return { error: 'URL Google Apps Script belum diisi' };
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'test', timestamp: new Date().toISOString() })
      });
      const data = await res.json();

      const current = JSON.parse(localStorage.getItem('lms_google_drive_settings') || '{}');
      const updated = {
        ...current,
        webhookUrl: url,
        isConfigured: true,
        lastTested: new Date().toISOString()
      };
      localStorage.setItem('lms_google_drive_settings', JSON.stringify(updated));
      syncToFirebase('lms_google_drive_settings', updated);

      return { success: true, message: 'Koneksi ke Google Drive Apps Script berhasil!' };
    } catch (err) {
      return { error: 'Gagal menghubungi Google Apps Script: ' + err.message };
    }
  }

  // ASSIGNMENTS
  if (path === '/assignments') {
    let assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS);
    const submissions = getStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, DEFAULT_ASSIGNMENT_SUBMISSIONS);
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);

    if (method === 'GET') {
      const classId = params.get('class_id');
      const subjectId = params.get('subject_id');

      let filtered = [...assignments];
      if (currentUser.role === 'siswa') {
        filtered = filtered.filter(a => a.class_name === currentUser.kelas);
      } else if (classId) {
        filtered = filtered.filter(a => a.class_id === Number(classId));
      }
      if (subjectId) {
        filtered = filtered.filter(a => a.subject_id === Number(subjectId));
      }

      return filtered.map(a => {
        const assignSubs = submissions.filter(s => s.assignment_id === a.id);
        const mySub = assignSubs.find(s => s.student_id === currentUser.id);
        let studentStatus = 'ASSIGNED';
        if (mySub) {
          studentStatus = mySub.status;
        } else if (new Date() > new Date(a.due_date)) {
          studentStatus = 'MISSING';
        }
        return {
          ...a,
          turned_in_count: assignSubs.length,
          graded_count: assignSubs.filter(s => s.status === 'GRADED').length,
          my_submission: mySub || null,
          student_status: studentStatus
        };
      });
    }

    if (method === 'POST') {
      let targetClassIds = [];
      if (Array.isArray(body.class_ids) && body.class_ids.length > 0) {
        targetClassIds = body.class_ids.map(Number).filter(id => !isNaN(id) && id > 0);
      } else if (body.class_id) {
        targetClassIds = [Number(body.class_id)];
      }
      if (targetClassIds.length === 0) targetClassIds = [Number(classes[0]?.id || 1)];

      const subj = subjects.find(s => s.id === Number(body.subject_id)) || subjects[0] || { name: 'INFORMATIKA' };
      const taskTitle = body.title || 'Tugas Baru';
      const targetClasses = classes.filter(c => targetClassIds.includes(c.id));
      const classNames = targetClasses.length > 0 ? targetClasses.map(c => c.name) : ['X-IPA-1'];

      const driveSettings = JSON.parse(localStorage.getItem('lms_google_drive_settings') || '{}');
      
      // Check if an existing assignment with identical title already exists
      const existingTask = assignments.find(a => a.title && a.title.trim().toLowerCase() === taskTitle.trim().toLowerCase() && a.task_folder_url);
      let taskFolderUrl = existingTask ? existingTask.task_folder_url : `https://drive.google.com/drive/folders/task_${encodeURIComponent(taskTitle.trim().replace(/\s+/g, '_'))}_shared?usp=sharing`;
      
      const classFoldersMap = {};
      classNames.forEach((cName, idx) => {
        classFoldersMap[cName] = `https://drive.google.com/drive/folders/class_${cName}_${Date.now() + idx}?usp=sharing`;
      });

      if (driveSettings.webhookUrl) {
        try {
          const response = await fetch(driveSettings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'create_folders',
              parentFolderId: driveSettings.parentFolderId || '',
              folderTask: taskTitle,
              folderClass: classNames[0],
              folderClasses: classNames
            })
          });
          if (response.ok) {
            const resJson = await response.json();
            if (resJson && resJson.success) {
              if (resJson.taskFolderUrl) taskFolderUrl = resJson.taskFolderUrl;
              if (resJson.classFolders) {
                Object.keys(resJson.classFolders).forEach(k => {
                  classFoldersMap[k] = resJson.classFolders[k].url || resJson.classFolders[k];
                });
              } else if (resJson.classFolderUrl) {
                classFoldersMap[classNames[0]] = resJson.classFolderUrl;
              }
            }
          }
        } catch (e) {
          console.warn('Apps Script folder creation in mock failed:', e);
        }
      }

      const createdAssignments = [];
      targetClasses.forEach((cls) => {
        const clsFolder = classFoldersMap[cls.name] || taskFolderUrl;
        const newAssign = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          class_id: cls.id,
          class_name: cls.name,
          subject_id: Number(body.subject_id),
          subject_name: subj.name,
          teacher_id: currentUser.id,
          teacher_name: currentUser.name,
          title: taskTitle,
          instructions: body.instructions || '',
          due_date: body.due_date || '2026-10-30 23:59',
          max_points: Number(body.max_points || 100),
          attachments: Array.isArray(body.attachments) ? body.attachments : [],
          status: 'ACTIVE',
          turned_in_count: 0,
          graded_count: 0,
          drive_folder_url: clsFolder,
          class_folder_url: clsFolder,
          task_folder_url: taskFolderUrl
        };
        assignments.unshift(newAssign);
        createdAssignments.push(newAssign);
      });

      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);
      return createdAssignments[0] || {};
    }
  }

  if (path.match(/^\/assignments\/\d+\/create-folders$/)) {
    return {
      success: true,
      message: 'Folder tugas dan kelas Google Drive otomatis dipastikan / dibuat!'
    };
  }

  if (path.match(/^\/assignments\/\d+\/local-files$/)) {
    return {
      task: 'Tugas',
      class: 'Kelas',
      folderPath: '/uploads/assignments/Tugas/Kelas',
      files: []
    };
  }

  if (path.match(/^\/assignments\/\d+\/submit$/)) {
    const id = Number(path.split('/')[2]);
    let submissions = getStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, DEFAULT_ASSIGNMENT_SUBMISSIONS);
    const existingIdx = submissions.findIndex(s => s.assignment_id === id && s.student_id === currentUser.id);
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS);
    const assignment = assignments.find(a => a.id === id) || { title: 'Tugas Kelas', class_name: currentUser.kelas || 'X-IPA-1' };

    // Format student nomor absen
    const studentsInClass = users.filter(u => u.role === 'siswa' && u.kelas === (currentUser.kelas || assignment.class_name));
    const studentIdx = studentsInClass.findIndex(u => u.id === currentUser.id);
    const finalAbsen = body.student_absen || currentUser.no_absen || (studentIdx !== -1 ? studentIdx + 1 : 1);
    const absenFormatted = String(finalAbsen).padStart(2, '0');

    let processedAttachments = Array.isArray(body.attachments) ? [...body.attachments] : [];

    // Handle real or simulated file upload
    if (body.file) {
      const ext = body.file.name && body.file.name.includes('.') ? '.' + body.file.name.split('.').pop() : '.pdf';
      const targetFileName = `${absenFormatted}_ ${currentUser.name}${ext}`;
      
      const driveSettings = JSON.parse(localStorage.getItem('lms_google_drive_settings') || '{}');
      let driveUrl = `https://drive.google.com/file/d/demo_${Date.now()}/view?usp=sharing`;
      let taskFolderUrl = `https://drive.google.com/drive/folders/task_${id}?usp=sharing`;
      let classFolderUrl = `https://drive.google.com/drive/folders/class_${id}?usp=sharing`;
      let driveStatus = 'SIMULATED_DRIVE';

      if (driveSettings.webhookUrl && body.file.base64) {
        try {
          let rawBase64 = body.file.base64;
          if (rawBase64.includes(';base64,')) rawBase64 = rawBase64.split(';base64,')[1];
          const response = await fetch(driveSettings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'upload',
              parentFolderId: driveSettings.parentFolderId || '',
              folderTask: assignment.title,
              folderClass: assignment.class_name || currentUser.kelas || 'Umum',
              fileName: targetFileName,
              fileBase64: rawBase64,
              mimeType: body.file.type || 'application/pdf'
            })
          });
          if (response.ok) {
            const resJson = await response.json();
            if (resJson && resJson.success) {
              driveUrl = resJson.fileUrl;
              taskFolderUrl = resJson.taskFolderUrl;
              classFolderUrl = resJson.classFolderUrl;
              driveStatus = 'UPLOADED_DRIVE';
            }
          }
        } catch (e) {
          console.warn('Apps Script direct upload fallback:', e);
        }
      }

      processedAttachments.unshift({
        name: targetFileName,
        original_name: body.file.name || 'tugas.pdf',
        size: body.file.size ? `${(body.file.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB',
        drive_url: driveUrl,
        drive_file_id: `file_${Date.now()}`,
        drive_status: driveStatus,
        task_folder_url: taskFolderUrl,
        class_folder_url: classFolderUrl,
        folder_task: assignment.title,
        folder_class: assignment.class_name || currentUser.kelas || 'Umum',
        student_absen: absenFormatted,
        student_name: currentUser.name
      });
    }

    const newSub = {
      id: existingIdx >= 0 ? submissions[existingIdx].id : Date.now(),
      assignment_id: id,
      student_id: currentUser.id,
      content: body.content || '',
      attachments: processedAttachments,
      submitted_at: new Date().toISOString(),
      status: 'SUBMITTED',
      score: existingIdx >= 0 ? submissions[existingIdx].score : null,
      teacher_feedback: existingIdx >= 0 ? submissions[existingIdx].teacher_feedback : null,
      graded_at: existingIdx >= 0 ? submissions[existingIdx].graded_at : null
    };
    if (existingIdx >= 0) {
      submissions[existingIdx] = newSub;
    } else {
      submissions.push(newSub);
    }
    setStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, submissions);
    return { success: true, message: 'Tugas Anda berhasil diserahkan!', attachments: processedAttachments };
  }

  if (path.match(/^\/assignments\/\d+\/grade$/)) {
    const id = Number(path.split('/')[2]);
    let submissions = getStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, DEFAULT_ASSIGNMENT_SUBMISSIONS);
    const studentId = Number(body.student_id);
    const existingIdx = submissions.findIndex(s => s.assignment_id === id && s.student_id === studentId);
    if (existingIdx >= 0) {
      submissions[existingIdx] = {
        ...submissions[existingIdx],
        score: Number(body.score),
        teacher_feedback: body.teacher_feedback || '',
        status: 'GRADED',
        graded_at: new Date().toISOString()
      };
      setStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, submissions);
      return { success: true, message: 'Nilai berhasil disimpan' };
    }
    return { error: 'Submission tidak ditemukan' };
  }

  if (path.match(/^\/assignments\/\d+$/)) {
    const id = Number(path.split('/')[2]);
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS);
    const assignment = assignments.find(a => a.id === id) || assignments[0] || {
      id,
      title: 'Tugas Terstruktur',
      instructions: 'Silakan kerjakan tugas sesuai instruksi guru.',
      due_date: '2026-10-30 23:59',
      max_points: 100,
      class_name: 'X-IPA-1',
      subject_name: 'INFORMATIKA',
      attachments: []
    };

    const className = assignment.class_name || 'X-IPA-1';
    const studentsInClass = users.filter(u => u.role === 'siswa' && (u.kelas === className || !className));
    const submissions = getStored(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, DEFAULT_ASSIGNMENT_SUBMISSIONS)
      .filter(s => s.assignment_id === id);

    const subMap = {};
    submissions.forEach(sub => { subMap[sub.student_id] = sub; });

    const studentSubmissions = studentsInClass.map(st => {
      const sub = subMap[st.id];
      let status = 'NOT_SUBMITTED';
      if (sub) {
        status = sub.status;
      } else if (new Date() > new Date(assignment.due_date)) {
        status = 'MISSING';
      }
      const absen = st.no_absen || (studentsInClass.indexOf(st) + 1);
      return {
        student: {
          id: st.id,
          name: st.name,
          nis: st.nis || st.nis_nip || '',
          kelas: st.kelas,
          no_absen: absen,
          absen: String(absen).padStart(2, '0'),
          avatar: st.avatar
        },
        submission: sub || null,
        status
      };
    });

    const stats = {
      total: studentsInClass.length,
      turned_in: submissions.filter(s => s.status === 'SUBMITTED').length,
      graded: submissions.filter(s => s.status === 'GRADED').length,
      missing: studentsInClass.length - submissions.length
    };

    return {
      assignment,
      submissions: studentSubmissions,
      stats,
      my_submission: subMap[currentUser.id] || null
    };
  }

  // ATTENDANCE
  if (path === '/attendance/sessions') {
    let sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const subjects = getStored(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    const records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);

    if (method === 'GET') {
      const classId = params.get('class_id');
      const subjectId = params.get('subject_id');
      const date = params.get('date');

      let filtered = sessions;
      if (currentUser.role === 'siswa') {
        filtered = filtered.filter(s => s.class_name === currentUser.kelas);
      } else if (classId) {
        filtered = filtered.filter(s => s.class_id === Number(classId));
      }
      if (subjectId) {
        filtered = filtered.filter(s => s.subject_id === Number(subjectId));
      }
      if (date) {
        filtered = filtered.filter(s => s.date === date);
      }

      return filtered.map(s => {
        const sessRecords = records.filter(r => r.session_id === s.id);
        const classStudents = users.filter(u => u.role === 'siswa' && (u.kelas === s.class_name || !s.class_name));
        return {
          ...s,
          count_hadir: sessRecords.filter(r => r.status === 'Hadir').length,
          count_total_recorded: sessRecords.length,
          count_class_students: classStudents.length
        };
      });
    }

    if (method === 'POST') {
      const cls = classes.find(c => c.id === Number(body.class_id));
      const subj = subjects.find(s => s.id === Number(body.subject_id));
      const session_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newSession = {
        id: Date.now(),
        class_id: Number(body.class_id),
        class_name: cls ? cls.name : 'X-IPA-1',
        subject_id: Number(body.subject_id),
        subject_name: subj ? subj.name : 'INFORMATIKA',
        teacher_id: currentUser.id,
        teacher_name: currentUser.name,
        date: body.date || new Date().toISOString().split('T')[0],
        time_start: body.time_start || '07:30',
        time_end: body.time_end || '09:00',
        session_title: body.session_title || 'Sesi Presensi',
        session_code,
        is_open: 1
      };
      sessions.unshift(newSession);
      setStored(STORAGE_KEYS.ATTENDANCE, sessions);
      return newSession;
    }
  }

  if (path.match(/^\/attendance\/sessions\/\d+\/toggle$/)) {
    const id = Number(path.split('/')[3]);
    let sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
    const sess = sessions.find(s => s.id === id);
    if (!sess) return { error: 'Sesi tidak ditemukan' };
    sess.is_open = sess.is_open ? 0 : 1;
    setStored(STORAGE_KEYS.ATTENDANCE, sessions);
    return { success: true, is_open: sess.is_open };
  }

  if (path.match(/^\/attendance\/sessions\/\d+\/check-in$/)) {
    const id = Number(path.split('/')[3]);
    let sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
    const sess = sessions.find(s => s.id === id);
    if (!sess) throw new Error('Sesi presensi tidak ditemukan');
    if (!sess.is_open) throw new Error('Sesi presensi ini telah ditutup oleh guru pengampu');
    if (sess.session_code && sess.session_code.toUpperCase() !== (body.code || '').trim().toUpperCase()) {
      throw new Error('Kode presensi tidak sesuai atau salah. Silakan periksa kembali kode dari guru di kelas.');
    }
    let records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);
    const existingIdx = records.findIndex(r => r.session_id === id && r.student_id === currentUser.id);
    const newRecord = {
      session_id: id,
      student_id: currentUser.id,
      status: 'Hadir',
      notes: 'Presensi mandiri',
      recorded_at: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      records[existingIdx] = newRecord;
    } else {
      records.push(newRecord);
    }
    setStored(STORAGE_KEYS.ATT_RECORDS, records);
    return { success: true, message: 'Presensi berhasil dicatat! Status: Hadir' };
  }

  if (path.match(/^\/attendance\/sessions\/\d+\/records$/)) {
    const id = Number(path.split('/')[3]);
    let records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);
    const newRecords = Array.isArray(body.records) ? body.records : [];

    newRecords.forEach(row => {
      if (row.status && row.status !== 'Belum Presensi') {
        const studentId = row.student_id || row.id;
        const idx = records.findIndex(r => r.session_id === id && r.student_id === studentId);
        const item = {
          session_id: id,
          student_id: studentId,
          status: row.status,
          notes: row.notes || '',
          recorded_at: new Date().toISOString()
        };
        if (idx >= 0) {
          records[idx] = item;
        } else {
          records.push(item);
        }
      }
    });
    setStored(STORAGE_KEYS.ATT_RECORDS, records);
    return { success: true, message: 'Data presensi berhasil diperbarui' };
  }

  if (path.match(/^\/attendance\/sessions\/\d+$/)) {
    const id = Number(path.split('/')[3]);
    const sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
    const session = sessions.find(s => s.id === id) || sessions[0] || {
      id,
      session_title: 'Pertemuan Presensi',
      session_code: 'MAT912',
      is_open: 1,
      class_id: 1,
      class_name: 'X-IPA-1',
      subject_id: 1,
      subject_name: 'INFORMATIKA',
      date: '2026-10-22',
      time_start: '07:30',
      time_end: '09:00'
    };

    const records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);
    const sessionRecords = records.filter(r => r.session_id === id);
    const recordMap = {};
    sessionRecords.forEach(r => { recordMap[r.student_id] = r; });

    const className = session.class_name || 'X-IPA-1';
    let studentsInClass = users.filter(u => u.role === 'siswa' && (u.kelas === className || !className));
    studentsInClass.sort((a, b) => {
      const absA = (a.no_absen && a.no_absen > 0) ? a.no_absen : 9999;
      const absB = (b.no_absen && b.no_absen > 0) ? b.no_absen : 9999;
      if (absA !== absB) return absA - absB;
      return (a.name || '').localeCompare(b.name || '');
    });

    const studentList = studentsInClass.map(s => ({
      id: s.id,
      name: s.name,
      nis: s.nis || s.nis_nip || '',
      avatar: s.avatar,
      kelas: s.kelas,
      record: recordMap[s.id] || { status: 'Belum Presensi', notes: '', recorded_at: null }
    }));

    const stats = {
      total: studentList.length,
      hadir: sessionRecords.filter(r => r.status === 'Hadir').length,
      sakit: sessionRecords.filter(r => r.status === 'Sakit').length,
      izin: sessionRecords.filter(r => r.status === 'Izin').length,
      alpa: sessionRecords.filter(r => r.status === 'Alpa').length,
      terlambat: sessionRecords.filter(r => r.status === 'Terlambat').length,
      belum: studentList.length - sessionRecords.length
    };

    return {
      session,
      students: studentList,
      records: studentList.map(s => ({
        student_id: s.id,
        student_name: s.name,
        nis: s.nis,
        avatar: s.avatar,
        status: s.record.status,
        notes: s.record.notes
      })),
      stats
    };
  }

  if (path === '/attendance/summary') {
    const classId = Number(params.get('class_id') || 1);
    const subjectId = Number(params.get('subject_id') || 1);
    const classes = getStored(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const cls = classes.find(c => c.id === classId);
    const className = cls ? cls.name : 'X-IPA-1';

    const sessions = getStored(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE)
      .filter(s => s.class_id === classId && s.subject_id === subjectId);
    const records = getStored(STORAGE_KEYS.ATT_RECORDS, DEFAULT_ATT_RECORDS);
    const studentsInClass = users.filter(u => u.role === 'siswa' && (u.kelas === className || !className));

    const summary = studentsInClass.map(st => {
      const stRecords = records.filter(r => r.student_id === st.id && sessions.some(s => s.id === r.session_id));
      const hadir = stRecords.filter(r => r.status === 'Hadir').length;
      const sakit = stRecords.filter(r => r.status === 'Sakit').length;
      const izin = stRecords.filter(r => r.status === 'Izin').length;
      const alpa = stRecords.filter(r => r.status === 'Alpa').length;
      const terlambat = stRecords.filter(r => r.status === 'Terlambat').length;
      const totalSess = sessions.length;
      const percentage = totalSess > 0 ? Math.round(((hadir + terlambat) / totalSess) * 100) : 100;

      return {
        student: {
          id: st.id,
          name: st.name,
          nis: st.nis || st.nis_nip || ''
        },
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
        percentage
      };
    });

    return {
      sessions,
      summary
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
