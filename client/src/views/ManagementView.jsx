import React, { useState, useEffect } from 'react';
import {
  School,
  Users,
  UserCog,
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Key,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Building2,
  Filter,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { downloadStudentExcelTemplate, parseStudentExcel } from '../services/fileImportHelper';
import { StudentAvatar } from '../components/StudentAvatar';
import { sortClassesNatural } from '../utils/sortHelper';

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function ManagementView({ initialTab = 'classes' }) {
  const { user, fetchMetadata, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab); // 'classes' | 'subjects' | 'teachers' | 'students' | 'users'
  const [stats, setStats] = useState(null);

  // Modern Toast & Confirm Dialog State
  const [toast, setToast] = useState(null); // { id, type, title, message }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmText, type, onConfirm }

  function showToast(type, message, title = '') {
    const id = Date.now();
    const defaultTitle = type === 'success' ? 'Berhasil' : type === 'error' ? 'Pemberitahuan' : 'Informasi';
    setToast({ id, type, title: title || defaultTitle, message });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 3800);
  }

  function askConfirm({ title, message, confirmText = 'Konfirmasi', type = 'danger', onConfirm }) {
    setConfirmDialog({ title, message, confirmText, type, onConfirm });
  }

  // Class Management State
  const [classesList, setClassesList] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({ name: '', level: 'Kelas 10', academic_year: '2026/2027' });

  // Subject Management State (Data Mapel)
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', teacher_id: '' });

  // Student Management State
  const [studentsList, setStudentsList] = useState([]);
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentGenderFilter, setStudentGenderFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(25);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    username: '',
    nis: '',
    kelas: '',
    gender: 'L',
    no_absen: '',
    email: '',
    phone: '',
    password: ''
  });

  // Student Import Excel State
  const [showImportStudentModal, setShowImportStudentModal] = useState(false);
  const [importStudentTargetClass, setImportStudentTargetClass] = useState('');
  const [importStudentPreview, setImportStudentPreview] = useState([]);
  const [importStudentFileName, setImportStudentFileName] = useState('');
  const [isImportingStudents, setIsImportingStudents] = useState(false);
  const [importStudentFilterStatus, setImportStudentFilterStatus] = useState('ALL');

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    role: 'guru',
    nis_nip: '',
    kelas: '',
    email: '',
    phone: '',
    password: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadStats();
    if (activeTab === 'classes') loadClasses();
    if (activeTab === 'subjects') {
      loadSubjects();
      loadTeachers();
    }
    if (activeTab === 'teachers') {
      loadTeachers();
      loadSubjects();
    }
    if (activeTab === 'students') {
      loadClasses();
      loadStudents();
    }
    if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  async function loadStats() {
    try {
      const data = await api.getManagementStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  // ================= CLASSES CRUD =================
  async function loadClasses() {
    try {
      setLoading(true);
      const data = await api.getManagementClasses();
      const sorted = sortClassesNatural(Array.isArray(data) ? data : []);
      setClassesList(sorted);
      if (sorted.length > 0 && !studentForm.kelas) {
        setStudentForm(prev => ({ ...prev, kelas: sorted[0].name }));
      }
    } catch (err) {
      showToast('error', 'Gagal memuat kelas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateClass() {
    setEditingClass(null);
    setClassForm({ name: '', level: 'Kelas 10', academic_year: '2026/2027' });
    setShowClassModal(true);
  }

  function handleOpenEditClass(c) {
    setEditingClass(c);
    setClassForm({ name: c.name, level: c.level, academic_year: c.academic_year });
    setShowClassModal(true);
  }

  async function handleSaveClass(e) {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.updateManagementClass(editingClass.id, classForm);
        showToast('success', 'Data kelas berhasil diperbarui!');
      } else {
        await api.createManagementClass(classForm);
        showToast('success', 'Kelas baru berhasil ditambahkan!');
      }
      setShowClassModal(false);
      loadClasses();
      loadStats();
      if (fetchMetadata) fetchMetadata();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function handleDeleteClass(c) {
    askConfirm({
      title: 'Hapus Kelas',
      message: `Apakah Anda yakin ingin menghapus rombel '${c.name}'? Data akademik yang terkait mungkin akan terpengaruh.`,
      confirmText: 'Ya, Hapus Kelas',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteManagementClass(c.id);
          showToast('success', `Kelas '${c.name}' berhasil dihapus`);
          loadClasses();
          loadStats();
          if (fetchMetadata) fetchMetadata();
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  // ================= SUBJECTS CRUD =================
  async function loadSubjects(searchOverride) {
    try {
      setLoading(true);
      const q = searchOverride !== undefined ? searchOverride : (activeTab === 'subjects' ? subjectSearch : undefined);
      const data = await api.getManagementSubjects({ search: q ? q.trim() : undefined });
      setSubjectsList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', 'Gagal memuat mata pelajaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeachers() {
    try {
      const data = await api.getManagementUsers({ role: 'guru' });
      setTeachersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error load teachers:', err);
    }
  }

  useEffect(() => {
    if (activeTab === 'subjects') {
      loadSubjects();
    }
  }, [subjectSearch]);

  function handleOpenCreateSubject() {
    setEditingSubject(null);
    setSubjectForm({
      name: '',
      code: '',
      teacher_id: teachersList[0]?.id || ''
    });
    setShowSubjectModal(true);
  }

  function handleOpenEditSubject(subj) {
    setEditingSubject(subj);
    setSubjectForm({
      name: subj.name,
      code: subj.code,
      teacher_id: subj.teacher_id || ''
    });
    setShowSubjectModal(true);
  }

  async function handleSaveSubject(e) {
    e.preventDefault();
    try {
      const selectedTeacher = teachersList.find(t => String(t.id) === String(subjectForm.teacher_id));
      const payload = {
        ...subjectForm,
        teacher_id: subjectForm.teacher_id ? Number(subjectForm.teacher_id) : null,
        teacher_name: selectedTeacher ? selectedTeacher.name : 'Belum Ditentukan'
      };
      if (editingSubject) {
        await api.updateManagementSubject(editingSubject.id, payload);
        showToast('success', 'Data mata pelajaran berhasil diperbarui!');
      } else {
        await api.createManagementSubject(payload);
        showToast('success', 'Mata pelajaran baru berhasil ditambahkan!');
      }
      setShowSubjectModal(false);
      loadSubjects();
      loadTeachers();
      loadStats();
      if (fetchMetadata) fetchMetadata();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function handleDeleteSubject(id, name) {
    askConfirm({
      title: 'Hapus Mata Pelajaran',
      message: `Apakah Anda yakin ingin menghapus mata pelajaran '${name}'? Seluruh alokasi mapel ini akan dihapus.`,
      confirmText: 'Ya, Hapus Mapel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteManagementSubject(id);
          showToast('success', `Mata pelajaran '${name}' berhasil dihapus`);
          loadSubjects();
          loadTeachers();
          loadStats();
          if (fetchMetadata) fetchMetadata();
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  // ================= STUDENTS CRUD =================
  async function loadStudents() {
    try {
      setLoading(true);
      const data = await api.getManagementStudents({
        kelas: studentClassFilter || undefined,
        gender: studentGenderFilter || undefined,
        search: studentSearch ? studentSearch.trim() : undefined
      });
      setStudentsList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', 'Gagal memuat siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    }
  }, [studentClassFilter, studentGenderFilter, studentSearch]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentClassFilter, studentGenderFilter, studentSearch, studentPageSize]);

  function handleOpenCreateStudent() {
    setEditingStudent(null);
    const defaultClass = classesList[0]?.name || 'X-8';
    setStudentForm({
      name: '',
      username: '',
      nis: '',
      kelas: defaultClass,
      gender: 'L',
      no_absen: '',
      email: '',
      phone: '',
      password: ''
    });
    setShowStudentModal(true);
  }

  function handleOpenEditStudent(st) {
    setEditingStudent(st);
    setStudentForm({
      name: st.name,
      username: st.username,
      nis: st.nis || '',
      kelas: st.kelas || '',
      gender: (st.gender === 'P' || st.gender === 'Perempuan' || st.gender === 'female') ? 'P' : 'L',
      no_absen: (st.no_absen !== undefined && st.no_absen !== null) ? st.no_absen : '',
      email: st.email || '',
      phone: st.phone || '',
      password: ''
    });
    setShowStudentModal(true);
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.updateManagementStudent(editingStudent.id, studentForm);
        showToast('success', 'Data siswa berhasil diperbarui!');
      } else {
        await api.createManagementStudent(studentForm);
        showToast('success', 'Siswa baru berhasil ditambahkan!');
      }
      setShowStudentModal(false);
      loadStudents();
      loadStats();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function handleDeleteStudent(id, name) {
    askConfirm({
      title: 'Hapus Data Siswa',
      message: `Apakah Anda yakin ingin menghapus data siswa '${name}'?`,
      confirmText: 'Ya, Hapus Siswa',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteManagementStudent(id);
          showToast('success', `Data siswa '${name}' berhasil dihapus`);
          loadStudents();
          loadStats();
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  // ================= IMPORT SISWA EXCEL =================
  function handleOpenImportStudentModal() {
    setImportStudentTargetClass(studentClassFilter || classesList[0]?.name || '');
    setImportStudentPreview([]);
    setImportStudentFileName('');
    setImportStudentFilterStatus('ALL');
    setShowImportStudentModal(true);
  }

  async function handleStudentFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStudentFileName(file.name);
    try {
      const parsed = await parseStudentExcel(file, importStudentTargetClass);
      setImportStudentPreview(parsed);
      const validCount = parsed.filter(p => p.isValid).length;
      showToast('info', `Berhasil membaca ${parsed.length} baris (${validCount} baris valid).`);
    } catch (err) {
      showToast('error', 'Gagal membaca file Excel: ' + err.message);
      setImportStudentPreview([]);
    }
  }

  function handleTargetClassChange(newClass) {
    setImportStudentTargetClass(newClass);
    if (importStudentPreview.length > 0) {
      setImportStudentPreview(prev => prev.map(p => {
        const kelas = newClass || p.kelas;
        const isValid = Boolean(p.name && p.nis && kelas);
        const errors = [];
        if (!p.name) errors.push('Nama wajib diisi');
        if (!p.nis) errors.push('NIS wajib diisi');
        if (!kelas) errors.push('Kelas wajib diisi');
        return { ...p, kelas, isValid, errors };
      }));
    }
  }

  async function handleExecuteImportStudents() {
    const validStudents = importStudentPreview.filter(p => p.isValid);
    if (validStudents.length === 0) {
      showToast('error', 'Tidak ada data siswa valid untuk diimpor.');
      return;
    }

    try {
      setIsImportingStudents(true);
      const res = await api.importManagementStudentsBatch(validStudents);
      showToast('success', res.message || `Berhasil mengimpor ${validStudents.length} siswa!`);
      setShowImportStudentModal(false);
      loadStudents();
      loadStats();
    } catch (err) {
      showToast('error', 'Impor gagal: ' + err.message);
    } finally {
      setIsImportingStudents(false);
    }
  }

  // ================= USERS CRUD =================
  async function loadUsers() {
    try {
      setLoading(true);
      const data = await api.getManagementUsers({
        role: userRoleFilter || undefined,
        search: userSearch ? userSearch.trim() : undefined
      });
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', 'Gagal memuat pengguna: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [userRoleFilter, userSearch]);

  function handleOpenCreateUser() {
    setEditingUser(null);
    setUserForm({
      name: '',
      username: '',
      role: 'guru',
      nis_nip: '',
      kelas: '',
      email: '',
      phone: '',
      password: ''
    });
    setShowUserModal(true);
  }

  function handleOpenCreateTeacher() {
    setEditingUser(null);
    setUserForm({
      name: '',
      username: '',
      role: 'guru',
      nis_nip: '',
      kelas: '',
      email: '',
      phone: '',
      password: ''
    });
    setShowUserModal(true);
  }

  function handleOpenEditUser(u) {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      username: u.username,
      role: u.role,
      nis_nip: u.nis_nip || u.nip || '',
      kelas: u.kelas || '',
      email: u.email || '',
      phone: u.phone || '',
      password: ''
    });
    setShowUserModal(true);
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      if (editingUser) {
        const updated = await api.updateManagementUser(editingUser.id, userForm);
        showToast('success', 'Data pengguna berhasil diperbarui!');
        if (user && (user.id === editingUser.id || user.username === editingUser.username)) {
          if (updateUser) updateUser(updated || userForm);
        }
      } else {
        await api.createManagementUser(userForm);
        showToast('success', 'Akun pengguna baru berhasil ditambahkan!');
      }
      setShowUserModal(false);
      loadUsers();
      loadTeachers();
      loadStats();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function handleDeleteUser(id, name) {
    askConfirm({
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun pengguna '${name}'?`,
      confirmText: 'Ya, Hapus Akun',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteManagementUser(id);
          showToast('success', `Akun '${name}' berhasil dihapus`);
          loadUsers();
          loadTeachers();
          loadStats();
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  // Student Pagination Calculations
  const totalStudents = studentsList.length;
  const totalStudentPages = Math.max(1, Math.ceil(totalStudents / studentPageSize));
  const safeStudentPage = Math.min(Math.max(1, studentPage), totalStudentPages);
  const startStudentIdx = (safeStudentPage - 1) * studentPageSize;
  const paginatedStudents = studentsList.slice(startStudentIdx, startStudentIdx + studentPageSize);
  const endStudentIdx = Math.min(startStudentIdx + studentPageSize, totalStudents);

  // Teacher Filter
  const filteredTeachers = teachersList.filter(t => {
    if (!teacherSearch) return true;
    const q = teacherSearch.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.username && t.username.toLowerCase().includes(q)) ||
      (t.nip && String(t.nip).toLowerCase().includes(q)) ||
      (t.nis_nip && String(t.nis_nip).toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="content-view">
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeTab === 'classes' && <><School size={22} color="var(--primary)" /> Data Kelas</>}
            {activeTab === 'subjects' && <><BookOpen size={22} color="var(--primary)" /> Data Mapel</>}
            {activeTab === 'teachers' && <><UserCheck size={22} color="var(--primary)" /> Data Guru</>}
            {activeTab === 'students' && <><Users size={22} color="var(--primary)" /> Data Siswa</>}
            {activeTab === 'users' && <><UserCog size={22} color="var(--primary)" /> Management User</>}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {activeTab === 'classes' && 'Pengelolaan daftar rombongan belajar, tingkat jenjang, dan data akademik'}
            {activeTab === 'subjects' && 'Pengelolaan mata pelajaran kurikulum, kode mapel, dan alokasi guru pengampu'}
            {activeTab === 'teachers' && 'Pengelolaan data tenaga pendidik, NIP/NUPTK, kontak, dan penugasan mata pelajaran'}
            {activeTab === 'students' && 'Registrasi peserta didik, nomor induk siswa (NIS), dan alokasi kelas'}
            {activeTab === 'users' && 'Pengelolaan akun pengguna (Admin, Guru, Siswa), hak akses, dan kredensial'}
          </p>
        </div>

        <div>
          {activeTab === 'classes' && (
            <button className="btn btn-primary" onClick={handleOpenCreateClass}>
              <Plus size={16} /> Tambah Kelas Baru
            </button>
          )}

          {activeTab === 'subjects' && (
            <button className="btn btn-primary" onClick={handleOpenCreateSubject}>
              <Plus size={16} /> Tambah Mapel Baru
            </button>
          )}

          {activeTab === 'teachers' && user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleOpenCreateTeacher}>
              <Plus size={16} /> Tambah Guru Baru
            </button>
          )}

          {activeTab === 'students' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={handleOpenImportStudentModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#10b981', color: '#10b981' }}
              >
                <FileSpreadsheet size={16} /> Impor dari Excel
              </button>
              <button className="btn btn-primary" onClick={handleOpenCreateStudent}>
                <Plus size={16} /> Tambah Siswa Baru
              </button>
            </div>
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleOpenCreateUser}>
              <Plus size={16} /> Tambah Akun Pengguna
            </button>
          )}
        </div>
      </div>

      {/* Mobile-Friendly Management Category Tab Bar */}
      <div className="tabs-nav management-tab-bar" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <School size={15} /> Data Kelas
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={15} /> Data Mapel
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Users size={15} /> Data Siswa
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveTab('teachers')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <UserCheck size={15} /> Data Guru
        </button>
        {user?.role === 'admin' && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <UserCog size={15} /> Management User
          </button>
        )}
      </div>

      {/* KPI Stats Counters */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 22 }}>
          <div
            className="stat-card"
            style={{ padding: '14px 18px', borderLeft: '4px solid #6366f1', cursor: 'pointer' }}
            onClick={() => setActiveTab('classes')}
            title="Klik untuk membuka Data Kelas"
          >
            <div className="stat-icon indigo" style={{ width: 40, height: 40 }}>
              <School size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Rombel Kelas</h4>
              <div className="stat-value">{stats.totalClasses}</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6', cursor: 'pointer' }}
            onClick={() => setActiveTab('subjects')}
            title="Klik untuk membuka Data Mapel"
          >
            <div className="stat-icon cyan" style={{ width: 40, height: 40 }}>
              <BookOpen size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Mata Pelajaran</h4>
              <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.totalSubjects || subjectsList.length}</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ padding: '14px 18px', borderLeft: '4px solid #10b981', cursor: 'pointer' }}
            onClick={() => setActiveTab('students')}
            title="Klik untuk membuka Data Siswa"
          >
            <div className="stat-icon emerald" style={{ width: 40, height: 40 }}>
              <Users size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Siswa Terdaftar</h4>
              <div className="stat-value" style={{ color: '#10b981' }}>{stats.totalStudents}</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}
            onClick={() => setActiveTab('teachers')}
            title="Klik untuk membuka Data Guru"
          >
            <div className="stat-icon amber" style={{ width: 40, height: 40 }}>
              <UserCheck size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Guru Pengajar</h4>
              <div className="stat-value" style={{ color: '#d97706' }}>{stats.totalTeachers}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          1. TAB: MANAJEMEN KELAS
         ======================================================== */}
      {activeTab === 'classes' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Rombongan Belajar (Kelas)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Pengaturan nama rombel, tingkat fase, dan tahun akademik.
              </p>
            </div>
            <span className="badge badge-primary">{classesList.length} Kelas Terdaftar</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Nama Rombel / Kelas</th>
                  <th>Tingkatan</th>
                  <th>Tahun Akademik</th>
                  <th style={{ textAlign: 'center' }}>Jumlah Siswa</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {classesList.map((c, idx) => (
                  <tr key={c.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{c.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{c.level}</span>
                    </td>
                    <td>{c.academic_year}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>
                        {c.student_count || 0} Siswa
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24 }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditClass(c)} title="Edit Kelas">
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteClass(c)}
                          title="Hapus Kelas"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          2. TAB: DATA MAPEL (MATA PELAJARAN)
         ======================================================== */}
      {activeTab === 'subjects' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama atau kode mapel..."
                  style={{ paddingLeft: 34, width: 260 }}
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                />
              </div>
            </div>

            <span className="badge badge-primary">{subjectsList.length} Mapel Terdaftar</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Kode Mapel</th>
                  <th>Nama Mata Pelajaran</th>
                  <th>Guru Pengampu</th>
                  <th style={{ textAlign: 'center' }}>Bank Soal</th>
                  <th style={{ textAlign: 'center' }}>Ujian CBT</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {subjectsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                      Belum ada data mata pelajaran yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  subjectsList.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                          {s.code}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{s.name}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: s.teacher_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {s.teacher_name || 'Belum Ditentukan'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-neutral">
                          {s.question_count || 0} Butir
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">
                          {s.exam_count || 0} Sesi
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 24 }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditSubject(s)} title="Edit Mapel">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteSubject(s.id, s.name)}
                            title="Hapus Mapel"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          2B. TAB: MANAJEMEN GURU (DATA GURU)
         ======================================================== */}
      {activeTab === 'teachers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama guru, NIP, email..."
                  style={{ paddingLeft: 34, width: 280 }}
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
              </div>
            </div>

            <span className="badge badge-primary">{filteredTeachers.length} Guru Terdaftar</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Nama Tenaga Pendidik</th>
                  <th>NIP / NUPTK</th>
                  <th>Mata Pelajaran Diampu</th>
                  <th>Username</th>
                  <th>Kontak & Email</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <UserCheck size={36} color="var(--text-subtle)" />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tidak ada data guru ditemukan</div>
                        <span style={{ fontSize: '0.82rem' }}>Coba ubah kata kunci pencarian guru</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t, idx) => {
                    const taughtSubjects = subjectsList.filter(s => {
                      const idMatch = s.teacher_id && t.id && String(s.teacher_id) === String(t.id);
                      const nameMatch = s.teacher_name && t.name && s.teacher_name.trim().toLowerCase() === t.name.trim().toLowerCase();
                      return Boolean(idMatch || nameMatch);
                    });
                    return (
                      <tr key={t.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <StudentAvatar name={t.name} size={34} />
                            <div>
                              <strong style={{ fontSize: '0.92rem', display: 'block', color: 'var(--text-main)' }}>{t.name}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tenaga Pendidik (Guru)</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1E40AF', background: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>
                            {t.nip || t.nis_nip || '-'}
                          </code>
                        </td>
                        <td>
                          {taughtSubjects.length > 0 ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {taughtSubjects.map(sub => (
                                <span
                                  key={sub.id}
                                  className="badge badge-primary"
                                  style={{ fontSize: '0.74rem', padding: '2px 7px' }}
                                  title={`${sub.code}: ${sub.name}`}
                                >
                                  {sub.code || sub.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Belum ditugaskan
                            </span>
                          )}
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                            {t.username}
                          </code>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>
                            <div>{t.email || '-'}</div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{t.phone || '-'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 24 }}>
                          {user?.role === 'admin' ? (
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditUser(t)}
                                title="Edit Data Guru"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              {t.id !== user.id && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleDeleteUser(t.id, t.name)}
                                  title="Hapus Guru"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenEditUser(t)}
                              title="Lihat Detail Guru"
                            >
                              <Info size={13} /> Detail
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          3. TAB: MANAJEMEN SISWA
         ======================================================== */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama, NIS, username..."
                  style={{ paddingLeft: 34, width: 230 }}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={studentClassFilter}
                onChange={(e) => setStudentClassFilter(e.target.value)}
              >
                <option value="">Semua Kelas</option>
                {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={studentGenderFilter}
                onChange={(e) => setStudentGenderFilter(e.target.value)}
              >
                <option value="">Semua JK</option>
                <option value="L">L</option>
                <option value="P">P</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>Tampilkan:</span>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem', height: 32 }}
                  value={studentPageSize}
                  onChange={(e) => {
                    setStudentPageSize(Number(e.target.value));
                    setStudentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>/ hal</span>
              </div>
              <span className="badge badge-primary">{studentsList.length} Siswa Ditemukan</span>
            </div>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 85, textAlign: 'center' }}>No. Absen</th>
                  <th>Peserta Didik</th>
                  <th>NIS</th>
                  <th>Kelas</th>
                  <th>Jenis Kelamin</th>
                  <th>Username</th>
                  <th>Kontak & Email</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <Users size={36} color="var(--text-subtle)" />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tidak ada data siswa ditemukan</div>
                        <span style={{ fontSize: '0.82rem' }}>Coba ubah kata kunci pencarian atau filter kelas</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st, idx) => (
                    <tr key={st.id}>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            height: '28px',
                            padding: '0 6px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            background: 'var(--bg-subtle, #F1F5F9)',
                            color: 'var(--text-main, #334155)',
                            border: '1px solid var(--border-color, #CBD5E1)'
                          }}
                          title={`Nomor Absen: ${st.no_absen || (startStudentIdx + idx + 1)}`}
                        >
                          {st.no_absen || (startStudentIdx + idx + 1)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <StudentAvatar name={st.name} size={32} />
                          <div>
                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>{st.name}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Role: Siswa</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{st.nis}</span>
                      </td>
                      <td>
                        <span
                          className="badge badge-neutral"
                          style={{
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            letterSpacing: '0.02em',
                            fontWeight: 700
                          }}
                        >
                          {st.kelas ? String(st.kelas).replace(/^Kelas\s+/i, '').replace(/\s*-\s*/g, '-').trim() : '-'}
                        </span>
                      </td>
                      <td>
                        {st.gender === 'P' || st.gender === 'Perempuan' || st.gender === 'female' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '24px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#FDF2F8',
                              color: '#DB2777',
                              border: '1px solid #FBCFE8'
                            }}
                            title="Perempuan (P)"
                          >
                            P
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '24px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #BFDBFE'
                            }}
                            title="Laki-laki (L)"
                          >
                            L
                          </span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                          {st.username}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <div>{st.email || '-'}</div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{st.phone || '-'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 24 }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditStudent(st)} title="Edit Siswa">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            title="Hapus Siswa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalStudents > 0 && (
            <div className="pagination-footer">
              <div className="pagination-info">
                Menampilkan <strong>{startStudentIdx + 1} - {endStudentIdx}</strong> dari <strong>{totalStudents}</strong> siswa
                {studentClassFilter && <span> (Kelas {studentClassFilter})</span>}
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setStudentPage(1)}
                  disabled={safeStudentPage === 1}
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                  disabled={safeStudentPage === 1}
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers(safeStudentPage, totalStudentPages).map((p, pIdx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${pIdx}`} className="pagination-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      className={`pagination-btn ${p === safeStudentPage ? 'active' : ''}`}
                      onClick={() => setStudentPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))}
                  disabled={safeStudentPage === totalStudentPages}
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setStudentPage(totalStudentPages)}
                  disabled={safeStudentPage === totalStudentPages}
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. TAB: MANAJEMEN USER / PENGGUNA
         ======================================================== */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari user, NIP, email..."
                  style={{ paddingLeft: 34, width: 230 }}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">Semua Peran (Role)</option>
                <option value="admin">Administrator</option>
                <option value="guru">Guru Pengajar</option>
                <option value="siswa">Peserta Didik (Siswa)</option>
              </select>
            </div>

            <span className="badge badge-primary">{usersList.length} Akun Terdaftar</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Nama Pengguna</th>
                  <th>Peran (Role)</th>
                  <th>Username</th>
                  <th>NIP / Identitas</th>
                  <th>Email & Telepon</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u, idx) => (
                  <tr key={u.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <StudentAvatar name={u.name} size={32} />
                        <div>
                          <strong style={{ fontSize: '0.9rem', display: 'block' }}>{u.name}</strong>
                          {u.role === 'siswa' && u.kelas && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kelas: {u.kelas}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'guru' ? 'badge-primary' : 'badge-neutral'}`} style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                        {u.role === 'admin' ? 'Administrator' : u.role === 'guru' ? 'Guru Mapel' : 'Siswa'}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                        {u.username}
                      </code>
                    </td>
                    <td>{u.nip || '-'}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div>{u.email || '-'}</div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{u.phone || '-'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24 }}>
                      {user?.role === 'admin' ? (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditUser(u)} title="Edit User">
                            <Edit2 size={13} /> Edit
                          </button>
                          {u.id !== user.id && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title="Hapus Akun"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hak Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: KELAS (TAMBAH / EDIT)
         ======================================================== */}
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {editingClass ? 'Edit Data Kelas' : 'Tambah Rombel Kelas Baru'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowClassModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveClass}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Rombel / Kelas</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: X-IPA-3 atau XI-IPS-1"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Tingkatan Jenjang</label>
                    <select
                      className="form-control"
                      value={classForm.level}
                      onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                    >
                      <option value="Kelas 10">Kelas 10 (Fase E)</option>
                      <option value="Kelas 11">Kelas 11 (Fase F)</option>
                      <option value="Kelas 12">Kelas 12 (Fase F Lanjutan)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tahun Pelajaran</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="2026/2027"
                      value={classForm.academic_year}
                      onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowClassModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Simpan Perubahan' : 'Tambahkan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SISWA (TAMBAH / EDIT)
         ======================================================== */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {editingStudent ? 'Edit Data Siswa' : 'Registrasi Peserta Didik Baru'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowStudentModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Muhammad Farhan"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Nomor Induk Siswa (NIS)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: 1009"
                      value={studentForm.nis}
                      onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kelas Terdaftar</label>
                    <select
                      className="form-control"
                      value={studentForm.kelas}
                      onChange={(e) => setStudentForm({ ...studentForm, kelas: e.target.value })}
                      required
                    >
                      {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">No. Absen</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="form-control"
                      placeholder="1 - 36"
                      value={studentForm.no_absen}
                      onChange={(e) => setStudentForm({ ...studentForm, no_absen: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Jenis Kelamin</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: studentForm.gender === 'L' ? '2px solid #2563EB' : '1px solid #D1D5DB',
                        background: studentForm.gender === 'L' ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: studentForm.gender === 'L' ? '#1D4ED8' : '#374151',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="L"
                        checked={studentForm.gender === 'L'}
                        onChange={() => setStudentForm({ ...studentForm, gender: 'L' })}
                        style={{ display: 'none' }}
                      />
                      <span>♂ Laki-laki (L)</span>
                    </label>
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: studentForm.gender === 'P' ? '2px solid #DB2777' : '1px solid #D1D5DB',
                        background: studentForm.gender === 'P' ? '#FDF2F8' : '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: studentForm.gender === 'P' ? '#BE185D' : '#374151',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="P"
                        checked={studentForm.gender === 'P'}
                        onChange={() => setStudentForm({ ...studentForm, gender: 'P' })}
                        style={{ display: 'none' }}
                      />
                      <span>♀ Perempuan (P)</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Username Login</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="siswa_farhan"
                      value={studentForm.username}
                      onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {editingStudent ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder={editingStudent ? 'Biarkan kosong jika tidak diubah' : 'Default: password123'}
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Email Siswa (Opsional)</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="farhan@siswa.sekolah.sch.id"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">No. Telepon / WhatsApp (Opsional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0813..."
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowStudentModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: USER / AKUN (TAMBAH / EDIT)
         ======================================================== */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowUserModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Drs. Hendra Saputra, M.Pd."
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Peran (Role)</label>
                    <select
                      className="form-control"
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    >
                      <option value="guru">Guru Pengajar</option>
                      <option value="admin">Administrator</option>
                      <option value="siswa">Siswa</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Username Login</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="guru_hendra"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">NIP / Identitas Pegawai</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="198401..."
                      value={userForm.nis_nip}
                      onChange={(e) => setUserForm({ ...userForm, nis_nip: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="hendra@sekolah.sch.id"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {editingUser ? 'Reset Kata Sandi (Opsional)' : 'Kata Sandi'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder={editingUser ? 'Kosongkan jika tetap' : 'Default: password123'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUserModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Simpan Perubahan User' : 'Buat Akun Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MATA PELAJARAN (TAMBAH / EDIT)
         ======================================================== */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {editingSubject ? 'Edit Data Mapel' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowSubjectModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Mata Pelajaran</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Matematika Peminatan"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kode Mapel (Singkatan Unik)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: MTK-PEM-10"
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Guru Pengampu</label>
                  <select
                    className="form-control"
                    value={subjectForm.teacher_id}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacher_id: e.target.value })}
                  >
                    <option value="">-- Pilih Guru Pengampu --</option>
                    {teachersList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowSubjectModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubject ? 'Simpan Perubahan' : 'Tambah Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: IMPORT DATA SISWA DARI EXCEL
         ======================================================== */}
      {showImportStudentModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 860, width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    Impor Data Siswa dari File Excel
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Unggah file .xlsx, .xls, atau .csv untuk menambahkan peserta didik secara massal
                  </p>
                </div>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted)' }}
                onClick={() => setShowImportStudentModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
                {/* 1. Unduh Template */}
                <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                    <strong style={{ fontSize: '0.88rem' }}>Unduh Format Template</strong>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                    Gunakan template resmi agar kolom Nama, NIS, Kelas, dsb. terbaca dengan sempurna.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={downloadStudentExcelTemplate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <Download size={14} /> Unduh Template (.xlsx)
                  </button>
                </div>

                {/* 2. Pengaturan Kelas */}
                <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                    <strong style={{ fontSize: '0.88rem' }}>Alokasi Kelas</strong>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                    Pilih rombel jika file Excel tidak mencantumkan kelas:
                  </p>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.84rem' }}
                    value={importStudentTargetClass}
                    onChange={(e) => handleTargetClassChange(e.target.value)}
                  >
                    <option value="">Gunakan Kolom Kelas di File Excel</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.name}>Set Semua ke Kelas {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropzone File */}
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  marginBottom: 16,
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('student-excel-file-input')?.click()}
              >
                <input
                  id="student-excel-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={handleStudentFileUpload}
                />
                <Upload size={32} color="#059669" style={{ margin: '0 auto 8px', display: 'block' }} />
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: 4 }}>
                  {importStudentFileName ? importStudentFileName : 'Klik atau Tarik File Excel ke Sini'}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Mendukung file Microsoft Excel (.xlsx, .xls) atau Comma-Separated Values (.csv)
                </p>
              </div>

              {/* Preview Table */}
              {importStudentPreview.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">{importStudentPreview.length} Baris Terbaca</span>
                      <span className="badge badge-success">
                        {importStudentPreview.filter(p => p.isValid).length} Siap Diimpor
                      </span>
                      {importStudentPreview.some(p => !p.isValid) && (
                        <span className="badge badge-danger">
                          {importStudentPreview.filter(p => !p.isValid).length} Perlu Dilengkapi
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${importStudentFilterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setImportStudentFilterStatus('ALL')}
                      >
                        Semua ({importStudentPreview.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${importStudentFilterStatus === 'VALID' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setImportStudentFilterStatus('VALID')}
                      >
                        Valid ({importStudentPreview.filter(p => p.isValid).length})
                      </button>
                      {importStudentPreview.some(p => !p.isValid) && (
                        <button
                          type="button"
                          className={`btn btn-sm ${importStudentFilterStatus === 'INVALID' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setImportStudentFilterStatus('INVALID')}
                        >
                          Bermasalah ({importStudentPreview.filter(p => !p.isValid).length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-color)' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 45 }}>No</th>
                          <th>Nama Siswa</th>
                          <th>NIS</th>
                          <th>Kelas</th>
                          <th>Jenis Kelamin</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th style={{ width: 100 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importStudentPreview
                          .filter(st => {
                            if (importStudentFilterStatus === 'VALID') return st.isValid;
                            if (importStudentFilterStatus === 'INVALID') return !st.isValid;
                            return true;
                          })
                          .map(st => (
                            <tr key={st.rowNumber} style={{ background: !st.isValid ? '#fff1f2' : 'transparent' }}>
                              <td>{st.rowNumber}</td>
                              <td><strong>{st.name || '-'}</strong></td>
                              <td><span style={{ fontFamily: 'var(--font-mono)' }}>{st.nis || '-'}</span></td>
                              <td><span className="badge badge-neutral">{st.kelas || '-'}</span></td>
                              <td>
                                {st.gender === 'P' ? (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#FDF2F8', color: '#DB2777', padding: '2px 8px', borderRadius: 4, border: '1px solid #FBCFE8' }}>
                                    P
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 4, border: '1px solid #BFDBFE' }}>
                                    L
                                  </span>
                                )}
                              </td>
                              <td><code>{st.username || '-'}</code></td>
                              <td style={{ fontSize: '0.78rem' }}>{st.email || '-'}</td>
                              <td>
                                {st.isValid ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Siap</span>
                                ) : (
                                  <span className="badge badge-danger" title={st.errors.join(', ')} style={{ fontSize: '0.7rem' }}>
                                    {st.errors[0]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {importStudentPreview.length > 0 && (
                  <span>
                    Total <strong>{importStudentPreview.filter(p => p.isValid).length}</strong> siswa siap disimpan.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowImportStudentModal(false)}
                  disabled={isImportingStudents}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExecuteImportStudents}
                  disabled={isImportingStudents || importStudentPreview.filter(p => p.isValid).length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#059669', borderColor: '#059669' }}
                >
                  <Upload size={16} />
                  {isImportingStudents ? 'Menyimpan...' : `Impor ${importStudentPreview.filter(p => p.isValid).length} Siswa Sekarang`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODERN TOAST NOTIFICATION (FLAT DESIGN)
         ======================================================== */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 28,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 18px',
            background: '#ffffff',
            borderRadius: 10,
            border: `2px solid ${
              toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#2563eb'
            }`,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            maxWidth: 400,
            minWidth: 300,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} strokeWidth={2.5} />
            ) : toast.type === 'error' ? (
              <AlertTriangle size={20} strokeWidth={2.5} />
            ) : (
              <Info size={20} strokeWidth={2.5} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
              {toast.title}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {toast.message}
            </div>
          </div>

          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Tutup Notifikasi"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================
          MODERN CONFIRM MODAL DIALOG (CENTERED POPUP OVERLAY)
         ======================================================== */}
      {confirmDialog && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 20,
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div
            className="modal-dialog"
            style={{
              maxWidth: 420,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 18,
              border: '1px solid #E2E8F0',
              padding: '28px 24px 22px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              animation: 'modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
          >
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title="Tutup dialog"
            >
              <X size={16} />
            </button>

            {/* Warning / Info Icon with soft colored ring */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: confirmDialog.type === 'danger' ? '#FEF2F2' : '#EFF6FF',
                border: `6px solid ${confirmDialog.type === 'danger' ? '#FEE2E2' : '#DBEAFE'}`,
                color: confirmDialog.type === 'danger' ? '#DC2626' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: confirmDialog.type === 'danger' ? '0 8px 16px rgba(239, 68, 68, 0.15)' : '0 8px 16px rgba(37, 99, 235, 0.15)'
              }}
            >
              {confirmDialog.type === 'danger' ? (
                <AlertTriangle size={30} strokeWidth={2.4} />
              ) : (
                <Info size={30} strokeWidth={2.4} />
              )}
            </div>

            {/* Title */}
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              {confirmDialog.title}
            </h3>

            {/* Description */}
            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, padding: '0 8px' }}>
              {confirmDialog.message}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  borderColor: '#CBD5E1',
                  color: '#475569',
                  background: '#FFFFFF'
                }}
                onClick={() => setConfirmDialog(null)}
              >
                Batal
              </button>
              <button
                type="button"
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#FFFFFF',
                  background: confirmDialog.type === 'danger' ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: confirmDialog.type === 'danger' ? '0 4px 14px rgba(220, 38, 38, 0.35)' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  if (action) await action();
                }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
