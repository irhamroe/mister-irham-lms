import { handleMockRequest } from './mockApi';

const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('lms_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('lms_token', token);
  } else {
    localStorage.removeItem('lms_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return await response.json();
    }

    // If server responded with a genuine JSON error response (e.g. 400 Bad Request with error message)
    if (contentType.includes('application/json')) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error) {
        throw new Error(errorData.error);
      }
    }

    // If backend is not running or gateway timeout (500/502/504 proxy error), fallback to mockApi
    return await handleMockRequest(endpoint, options);
  } catch (err) {
    // If it's a specific validation/auth error message from server, re-throw so user sees it
    if (err.message && 
        !err.message.includes('fetch') && 
        !err.message.includes('Failed to fetch') && 
        !err.message.includes('NetworkError') && 
        !err.message.includes('Gateway') && 
        !err.message.includes('ECONNREFUSED') &&
        !err.message.includes('Error 50')) {
      throw err;
    }
    // Backend server is unreachable, fall back to mockApi
    return await handleMockRequest(endpoint, options);
  }
}

function toQueryString(params = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined') {
      clean[k] = v;
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? '?' + qs : '';
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),
  getMeta: () => request('/auth/meta'),

  // Attendance
  getAttendanceSessions: (params = {}) => request(`/attendance/sessions${toQueryString(params)}`),
  createAttendanceSession: (payload) => request('/attendance/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  toggleAttendanceSession: (id) => request(`/attendance/sessions/${id}/toggle`, { method: 'PUT' }),
  getAttendanceSessionDetails: (id) => request(`/attendance/sessions/${id}`),
  studentCheckIn: (id, code) => request(`/attendance/sessions/${id}/check-in`, { method: 'POST', body: JSON.stringify({ code }) }),
  updateAttendanceRecords: (id, records) => request(`/attendance/sessions/${id}/records`, { method: 'PUT', body: JSON.stringify({ records }) }),
  getAttendanceSummary: (class_id, subject_id) => request(`/attendance/summary?class_id=${class_id}&subject_id=${subject_id}`),

  // Journals
  getJournals: (params = {}) => request(`/journals${toQueryString(params)}`),
  createJournal: (payload) => request('/journals', { method: 'POST', body: JSON.stringify(payload) }),
  updateJournal: (id, payload) => request(`/journals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteJournal: (id) => request(`/journals/${id}`, { method: 'DELETE' }),

  // Grades
  getGradeWeights: (class_id, subject_id) => request(`/grades/weights?class_id=${class_id}&subject_id=${subject_id}`),
  updateGradeWeights: (payload) => request('/grades/weights', { method: 'POST', body: JSON.stringify(payload) }),
  getGradeLedger: (class_id, subject_id) => request(`/grades/ledger?class_id=${class_id}&subject_id=${subject_id}`),
  saveGrade: (payload) => request('/grades', { method: 'POST', body: JSON.stringify(payload) }),
  saveBatchGrades: (payload) => request('/grades/batch', { method: 'POST', body: JSON.stringify(payload) }),

  // Assignments & Google Drive Integration
  getAssignments: (params = {}) => request(`/assignments${toQueryString(params)}`),
  createAssignment: (payload) => request('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  getAssignmentDetails: (id) => request(`/assignments/${id}`),
  submitAssignment: (id, payload) => request(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  gradeAssignment: (id, payload) => request(`/assignments/${id}/grade`, { method: 'POST', body: JSON.stringify(payload) }),
  getDriveSettings: () => request('/assignments/drive-settings'),
  saveDriveSettings: (payload) => request('/assignments/drive-settings', { method: 'POST', body: JSON.stringify(payload) }),
  testDriveConnection: (payload) => request('/assignments/drive-settings/test', { method: 'POST', body: JSON.stringify(payload) }),
  createAssignmentFolders: (id) => request(`/assignments/${id}/create-folders`, { method: 'POST' }),
  getLocalAssignmentFiles: (id) => request(`/assignments/${id}/local-files`),

  // CBT
  getCbtExams: (params = {}) => request(`/cbt/exams${toQueryString(params)}`),
  createCbtExam: (payload) => request('/cbt/exams', { method: 'POST', body: JSON.stringify(payload) }),
  updateCbtExamStatus: (id, status) => request(`/cbt/exams/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getCbtExamDetails: (id) => request(`/cbt/exams/${id}`),
  addCbtQuestion: (id, payload) => request(`/cbt/exams/${id}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteCbtQuestion: (id) => request(`/cbt/questions/${id}`, { method: 'DELETE' }),
  startCbtExam: (id, payload) => request(`/cbt/exams/${id}/start`, { method: 'POST', body: JSON.stringify(payload) }),
  saveCbtAnswer: (id, payload) => request(`/cbt/exams/${id}/save-answer`, { method: 'POST', body: JSON.stringify(payload) }),
  reportCbtViolation: (id, payload) => request(`/cbt/exams/${id}/violation`, { method: 'POST', body: JSON.stringify(payload) }),
  submitCbtExam: (id) => request(`/cbt/exams/${id}/submit`, { method: 'POST' }),
  getCbtMonitor: (id) => request(`/cbt/exams/${id}/monitor`),
  executeCbtAction: (id, payload) => request(`/cbt/exams/${id}/action`, { method: 'POST', body: JSON.stringify(payload) }),

  // Question Bank (Bank Soal Terpadu)
  getQuestionBank: (params = {}) => request(`/question-bank${toQueryString(params)}`),
  getQuestionBankStats: () => request('/question-bank/stats'),
  getQuestionBankItem: (id) => request(`/question-bank/${id}`),
  createQuestionBankItem: (payload) => request('/question-bank', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestionBankItem: (id, payload) => request(`/question-bank/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuestionBankItem: (id) => request(`/question-bank/${id}`, { method: 'DELETE' }),
  exportQuestionBankToExam: (payload) => request('/question-bank/export-to-exam', { method: 'POST', body: JSON.stringify(payload) }),
  importQuestionsFromExamToBank: (examId) => request(`/question-bank/import-from-exam/${examId}`, { method: 'POST' }),
  saveExamQuestionToBank: (questionId) => request(`/question-bank/save-from-exam-question/${questionId}`, { method: 'POST' }),
  importQuestionBankBatch: (payload) => request('/question-bank/batch-import', { method: 'POST', body: JSON.stringify(payload) }),

  // Management
  getManagementStats: () => request('/management/stats'),
  getManagementClasses: () => request('/management/classes'),
  createManagementClass: (payload) => request('/management/classes', { method: 'POST', body: JSON.stringify(payload) }),
  updateManagementClass: (id, payload) => request(`/management/classes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteManagementClass: (id) => request(`/management/classes/${id}`, { method: 'DELETE' }),

  getManagementStudents: (params = {}) => request(`/management/students${toQueryString(params)}`),
  createManagementStudent: (payload) => request('/management/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateManagementStudent: (id, payload) => request(`/management/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteManagementStudent: (id) => request(`/management/students/${id}`, { method: 'DELETE' }),
  importManagementStudentsBatch: (students) => request('/management/students/batch-import', { method: 'POST', body: JSON.stringify({ students }) }),

  getManagementUsers: (params = {}) => request(`/management/users${toQueryString(params)}`),
  createManagementUser: (payload) => request('/management/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateManagementUser: (id, payload) => request(`/management/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteManagementUser: (id) => request(`/management/users/${id}`, { method: 'DELETE' }),

  getManagementSubjects: (params = {}) => request(`/management/subjects${toQueryString(params)}`),
  createManagementSubject: (payload) => request('/management/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  updateManagementSubject: (id, payload) => request(`/management/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteManagementSubject: (id) => request(`/management/subjects/${id}`, { method: 'DELETE' })
};

export default api;

