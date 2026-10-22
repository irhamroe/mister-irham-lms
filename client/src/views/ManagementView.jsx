import React, { useState, useEffect } from 'react';
import {
  School,
  Users,
  UserCog,
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
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ManagementView({ initialTab = 'classes' }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab); // 'classes' | 'subjects' | 'students' | 'users'
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
  const [classForm, setClassForm] = useState({ name: '', level: 'Kelas 10', academic_year: '2024/2025' });

  // Subject Management State (Data Mapel)
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', teacher_id: '' });

  // Student Management State
  const [studentsList, setStudentsList] = useState([]);
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    username: '',
    nis: '',
    kelas: '',
    email: '',
    phone: '',
    password: ''
  });

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
    if (activeTab === 'students') loadStudents();
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
      setClassesList(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !studentForm.kelas) {
        setStudentForm(prev => ({ ...prev, kelas: data[0].name }));
      }
    } catch (err) {
      showToast('error', 'Gagal memuat kelas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateClass() {
    setEditingClass(null);
    setClassForm({ name: '', level: 'Kelas 10', academic_year: '2024/2025' });
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
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  // ================= SUBJECTS CRUD =================
  async function loadSubjects() {
    try {
      setLoading(true);
      const data = await api.getManagementSubjects({ search: subjectSearch ? subjectSearch.trim() : undefined });
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
      if (editingSubject) {
        await api.updateManagementSubject(editingSubject.id, subjectForm);
        showToast('success', 'Data mata pelajaran berhasil diperbarui!');
      } else {
        await api.createManagementSubject(subjectForm);
        showToast('success', 'Mata pelajaran baru berhasil ditambahkan!');
      }
      setShowSubjectModal(false);
      loadSubjects();
      loadStats();
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
          loadStats();
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
  }, [studentClassFilter, studentSearch]);

  function handleOpenCreateStudent() {
    setEditingStudent(null);
    const defaultClass = classesList[0]?.name || 'X-IPA-1';
    setStudentForm({
      name: '',
      username: '',
      nis: '',
      kelas: defaultClass,
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

  function handleOpenEditUser(u) {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      username: u.username,
      role: u.role,
      nis_nip: u.nip || '',
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
        await api.updateManagementUser(editingUser.id, userForm);
        showToast('success', 'Data pengguna berhasil diperbarui!');
      } else {
        await api.createManagementUser(userForm);
        showToast('success', 'Akun pengguna baru berhasil ditambahkan!');
      }
      setShowUserModal(false);
      loadUsers();
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
          loadStats();
        } catch (err) {
          showToast('error', err.message);
        }
      }
    });
  }

  return (
    <div className="content-view">
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeTab === 'classes' && <><School size={22} color="var(--primary)" /> Data Kelas</>}
            {activeTab === 'subjects' && <><BookOpen size={22} color="var(--primary)" /> Data Mapel</>}
            {activeTab === 'students' && <><Users size={22} color="var(--primary)" /> Data Siswa</>}
            {activeTab === 'users' && <><UserCog size={22} color="var(--primary)" /> Management User</>}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {activeTab === 'classes' && 'Pengelolaan daftar rombongan belajar, tingkat jenjang, dan data akademik'}
            {activeTab === 'subjects' && 'Pengelolaan mata pelajaran kurikulum, kode mapel, dan alokasi guru pengampu'}
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

          {activeTab === 'students' && (
            <button className="btn btn-primary" onClick={handleOpenCreateStudent}>
              <Plus size={16} /> Tambah Siswa Baru
            </button>
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleOpenCreateUser}>
              <Plus size={16} /> Tambah Akun Pengguna
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Counters */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 22 }}>
          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #6366f1' }}>
            <div className="stat-icon indigo" style={{ width: 40, height: 40 }}>
              <School size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Rombel Kelas</h4>
              <div className="stat-value">{stats.totalClasses}</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
            <div className="stat-icon cyan" style={{ width: 40, height: 40 }}>
              <BookOpen size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Mata Pelajaran</h4>
              <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.totalSubjects || subjectsList.length}</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
            <div className="stat-icon emerald" style={{ width: 40, height: 40 }}>
              <Users size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Siswa Terdaftar</h4>
              <div className="stat-value" style={{ color: '#10b981' }}>{stats.totalStudents}</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
            <div className="stat-icon amber" style={{ width: 40, height: 40 }}>
              <Briefcase size={20} />
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
                {classesList.map(c => <option key={c.id} value={c.name}>Kelas {c.name}</option>)}
              </select>
            </div>

            <span className="badge badge-primary">{studentsList.length} Siswa Ditemukan</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Peserta Didik</th>
                  <th>NIS</th>
                  <th>Kelas</th>
                  <th>Username</th>
                  <th>Kontak & Email</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st, idx) => (
                  <tr key={st.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={st.avatar} alt={st.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
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
                      <span className="badge badge-neutral">Kelas {st.kelas}</span>
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
                ))}
              </tbody>
            </table>
          </div>
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
                        <img src={u.avatar} alt={u.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        <div>
                          <strong style={{ fontSize: '0.9rem', display: 'block' }}>{u.name}</strong>
                          {u.kelas && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kelas: {u.kelas}</span>}
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
                    <label className="form-label">Tahun Ajaran</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="2024/2025"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                      {classesList.map(c => <option key={c.id} value={c.name}>Kelas {c.name}</option>)}
                    </select>
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
          MODERN CONFIRM MODAL (FLAT DESIGN)
         ======================================================== */}
      {confirmDialog && (
        <div className="modal-backdrop" style={{ zIndex: 99990 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: 440,
              padding: '24px 28px',
              borderRadius: 12,
              border: '2px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: confirmDialog.type === 'danger' ? '#fee2e2' : '#dbeafe',
                color: confirmDialog.type === 'danger' ? '#ef4444' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              {confirmDialog.type === 'danger' ? (
                <AlertTriangle size={28} strokeWidth={2.5} />
              ) : (
                <Info size={28} strokeWidth={2.5} />
              )}
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minWidth: 100 }}
                onClick={() => setConfirmDialog(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className={confirmDialog.type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
                style={{ minWidth: 130 }}
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
