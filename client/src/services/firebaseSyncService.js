// Realtime synchronization bridge using Firebase Realtime Database
// Ensures all devices (Admin, Guru, Siswa on PC, mobile, tablets, incognito) stay in sync in real time.
import { ref, onValue, set, get } from 'firebase/database';
import { database } from './firebase';

export const SYNC_MAP = {
  'lms_mock_attendance_sessions_v3': 'lms_v3/attendance_sessions',
  'lms_mock_attendance_records_v3': 'lms_v3/attendance_records',
  'lms_mock_assignments_v3': 'lms_v3/assignments',
  'lms_mock_assignment_submissions_v3': 'lms_v3/assignment_submissions',
  'lms_mock_subjects_v3': 'lms_v3/subjects',
  'lms_mock_classes_v3': 'lms_v3/classes',
  'lms_mock_users_v3': 'lms_v3/users',
  'lms_mock_cbt_exams_v3': 'lms_v3/cbt_exams',
  'lms_mock_cbt_questions_v3': 'lms_v3/cbt_questions',
  'lms_mock_question_bank_v3': 'lms_v3/question_bank',
  'lms_mock_journals_v3': 'lms_v3/journals',
  'lms_google_drive_settings': 'lms_v3/google_drive_settings'
};

let isInitialized = false;
let isRemoteUpdating = false;

// Write local state change to Firebase Realtime Database
export async function syncToFirebase(storageKey, data) {
  if (isRemoteUpdating) return;
  const path = SYNC_MAP[storageKey];
  if (!path || !database) return;

  try {
    const dbRef = ref(database, path);
    // Sanitize data for Firebase (no undefined values)
    const sanitized = JSON.parse(JSON.stringify(data));
    await set(dbRef, sanitized);
  } catch (err) {
    console.warn(`[FirebaseSync] Error syncing ${path} to cloud:`, err.message);
  }
}

// Initialize continuous listeners for cloud changes
export function initFirebaseSync(defaultFallbacks = {}) {
  if (isInitialized || typeof window === 'undefined' || !database) return;
  isInitialized = true;

  Object.entries(SYNC_MAP).forEach(([storageKey, path]) => {
    const dbRef = ref(database, path);

    // Initial check: if cloud has no data yet, push local storage or defaults to cloud
    get(dbRef).then((snapshot) => {
      if (!snapshot.exists()) {
        try {
          const localRaw = localStorage.getItem(storageKey);
          let initialData = localRaw ? JSON.parse(localRaw) : null;
          if (!initialData || (Array.isArray(initialData) && initialData.length === 0)) {
            initialData = defaultFallbacks[storageKey] || null;
          }
          if (initialData) {
            set(dbRef, JSON.parse(JSON.stringify(initialData))).catch(() => {});
          }
        } catch (e) {}
      }
    }).catch(() => {});

    // Live continuous listener for real-time synchronization across all devices
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        try {
          isRemoteUpdating = true;
          localStorage.setItem(storageKey, JSON.stringify(val));
        } catch (e) {
          console.warn(`[FirebaseSync] Local storage write failed for ${storageKey}:`, e);
        } finally {
          isRemoteUpdating = false;
        }

        // Notify active views in the application
        window.dispatchEvent(new CustomEvent('lms-sync-update', {
          detail: { storageKey, path, data: val }
        }));
      }
    }, (error) => {
      console.warn(`[FirebaseSync] Listener error for ${path}:`, error.message);
    });
  });
}

