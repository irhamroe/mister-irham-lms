import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './services/firebase'
import App from './App.jsx'

// Clean up any stale legacy demo caches from earlier sessions
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
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
