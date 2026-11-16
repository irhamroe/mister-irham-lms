import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Lock,
  Unlock,
  Save,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentAvatar } from '../components/StudentAvatar';
import { sortClassesNatural } from '../utils/sortHelper';

function getSessionTimeWarning(dateStr, startStr, endStr) {
  if (!dateStr) return null;

  if (startStr && endStr && endStr <= startStr) {
    return {
      type: 'invalid_range',
      isError: true,
      message: 'Jam Selesai harus lebih akhir dari Jam Mulai.'
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  if (dateStr < todayStr) {
    return {
      type: 'date_past',
      isEnded: true,
      currentTime: currentTimeStr,
      todayStr,
      message: `Tanggal yang dipilih (${dateStr}) telah lewat dari hari ini (${todayStr}).`
    };
  }

  if (dateStr === todayStr) {
    if (endStr && endStr <= currentTimeStr) {
      return {
        type: 'time_ended',
        isEnded: true,
        currentTime: currentTimeStr,
        todayStr,
        message: `Jam selesai (${endStr}) sudah terlewat dari jam saat ini (${currentTimeStr} WIB).`
      };
    }
    if (startStr && startStr < currentTimeStr) {
      return {
        type: 'time_started',
        isEnded: false,
        currentTime: currentTimeStr,
        todayStr,
        message: `Jam mulai (${startStr}) sudah terlewat dari jam saat ini (${currentTimeStr} WIB).`
      };
    }
  }

  return null;
}

function getClassesForSubject(subject, allSortedClasses) {
  if (!subject || !allSortedClasses || allSortedClasses.length === 0) return allSortedClasses || [];

  // 1. Explicit class_ids if present
  if (Array.isArray(subject.class_ids) && subject.class_ids.length > 0) {
    const filtered = allSortedClasses.filter(c => subject.class_ids.includes(c.id));
    if (filtered.length > 0) return filtered;
  }

  // 2. Detect level from code or name
  const code = (subject.code || '').toUpperCase();
  const name = (subject.name || '').toUpperCase();
  const str = `${code} ${name}`;

  // Level 10 / X
  if (str.includes('-10') || str.includes(' 10') || (str.includes('X') && !str.includes('XI') && !str.includes('XII'))) {
    const c10 = allSortedClasses.filter(c =>
      (c.level && (c.level.includes('10') || c.level.includes('X'))) ||
      c.name.startsWith('X-') || c.name.startsWith('X ') || c.name === 'X'
    );
    if (c10.length > 0) return c10;
  }

  // Level 11 / XI
  if (str.includes('-11') || str.includes(' 11') || (str.includes('XI') && !str.includes('XII'))) {
    const c11 = allSortedClasses.filter(c =>
      (c.level && (c.level.includes('11') || c.level.includes('XI'))) ||
      c.name.startsWith('XI-') || c.name.startsWith('XI ') || c.name === 'XI'
    );
    if (c11.length > 0) return c11;
  }

  // Level 12 / XII
  if (str.includes('-12') || str.includes(' 12') || str.includes('XII')) {
    const c12 = allSortedClasses.filter(c =>
      (c.level && (c.level.includes('12') || c.level.includes('XII'))) ||
      c.name.startsWith('XII-') || c.name.startsWith('XII ') || c.name === 'XII'
    );
    if (c12.length > 0) return c12;
  }

  return allSortedClasses;
}

export default function AttendanceView() {
  const { user, classes, subjects } = useAuth();
  const sortedClasses = React.useMemo(() => sortClassesNatural(classes), [classes]);
  const isTeacher = user?.role === 'guru' || user?.role === 'admin';

  const displaySubjects = React.useMemo(() => {
    if (user?.role === 'siswa' && user?.kelas) {
      const k = user.kelas.toUpperCase();
      if (k.startsWith('X-') || k.startsWith('X ') || k === 'X') {
        const xSubs = subjects.filter(s => s.code === 'INF-10' || s.code?.includes('-10'));
        if (xSubs.length > 0) return xSubs;
      } else if (k.startsWith('XI-') || k.startsWith('XI ') || k === 'XI') {
        const xiSubs = subjects.filter(s => s.code === 'INF-11' || s.code?.includes('-11'));
        if (xiSubs.length > 0) return xiSubs;
      } else if (k.startsWith('XII-') || k.startsWith('XII ') || k === 'XII') {
        const xiiSubs = subjects.filter(s => s.code === 'INF-12' || s.code?.includes('-12'));
        if (xiiSubs.length > 0) return xiiSubs;
      }
    }
    return subjects;
  }, [subjects, user]);

  const initialSubjectId = React.useMemo(() => {
    return displaySubjects[0]?.id?.toString() || '';
  }, [displaySubjects]);

  const [selectedSubject, setSelectedSubject] = useState(initialSubjectId);

  // Available classes dynamically adjusted to the selected subject
  const currentSelectedSubjectObj = React.useMemo(() => {
    return displaySubjects.find(s => s.id?.toString() === selectedSubject?.toString()) || displaySubjects[0];
  }, [displaySubjects, selectedSubject]);

  const availableClasses = React.useMemo(() => {
    return getClassesForSubject(currentSelectedSubjectObj, sortedClasses);
  }, [currentSelectedSubjectObj, sortedClasses]);

  const initialClassId = React.useMemo(() => {
    if (user?.role === 'siswa' && user?.kelas) {
      const studentCls = sortedClasses.find(c => c.name === user.kelas);
      return studentCls ? studentCls.id.toString() : '';
    }
    // Teacher/Admin starts with EMPTY class selection!
    return '';
  }, [sortedClasses, user]);

  // Filter states: empty by default for teacher/admin until class is chosen
  const [selectedClass, setSelectedClass] = useState(initialClassId);

  function handleSubjectChange(newSubjId) {
    setSelectedSubject(newSubjId);
    if (isTeacher) {
      // Requirement: reset class to empty when subject changes so teacher selects class from the new subject's class list
      setSelectedClass('');
      setSessions([]);
      setActiveSession(null);
      setSessionDetail(null);
      setStudentRecords([]);
      setRecapData(null);
    }
  }

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'recap'

  // Selected session for details/marking
  const [activeSession, setActiveSession] = useState(null);
  const activeSessionRef = React.useRef(activeSession);
  activeSessionRef.current = activeSession;

  const [sessionDetail, setSessionDetail] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const isFetchingSessions = React.useRef(false);

  // Student check-in state
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState('');
  const [checkInError, setCheckInError] = useState('');

  // Modern Toast & Confirm Dialog State
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'warning', message }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmText, type, onConfirm }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  }

  // New session modal state
  const [showModal, setShowModal] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    class_id: '',
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    time_start: '07:30',
    time_end: '09:00',
    session_title: ''
  });

  function handleOpenNewSessionModal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const timeStart = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

    const endTotalMinutes = currentH * 60 + currentM + 90;
    const endH = String(Math.floor(endTotalMinutes / 60) % 24).padStart(2, '0');
    const endM = String(endTotalMinutes % 60).padStart(2, '0');
    const timeEnd = `${endH}:${endM}`;

    const defaultSubj = selectedSubject || (displaySubjects[0]?.id ? String(displaySubjects[0].id) : '');
    const modalSubjObj = displaySubjects.find(s => s.id?.toString() === defaultSubj.toString()) || displaySubjects[0];
    const modalClasses = getClassesForSubject(modalSubjObj, sortedClasses);

    const defaultClass = selectedClass && modalClasses.some(c => c.id.toString() === selectedClass.toString())
      ? selectedClass
      : (modalClasses[0]?.id ? String(modalClasses[0].id) : '');

    setNewSessionForm({
      class_id: defaultClass,
      subject_id: defaultSubj,
      date: todayStr,
      time_start: timeStart,
      time_end: timeEnd,
      session_title: ''
    });
    setShowModal(true);
  }

  // Recap data
  const [recapData, setRecapData] = useState(null);

  // Synchronize filters if metadata arrives asynchronously
  useEffect(() => {
    if (user?.role === 'siswa' && !selectedClass && initialClassId) {
      setSelectedClass(initialClassId);
    }
    if (!selectedSubject && initialSubjectId) {
      setSelectedSubject(initialSubjectId);
    }
  }, [initialClassId, initialSubjectId, selectedClass, selectedSubject, user]);

  useEffect(() => {
    // Only load sessions once class and subject are ready
    if (isTeacher && !selectedClass) {
      setSessions([]);
      setActiveSession(null);
      setSessionDetail(null);
      setStudentRecords([]);
      setLoading(false);
      return;
    }
    if (displaySubjects.length > 0 && !selectedSubject) return;
    loadSessions();
  }, [user, selectedClass, selectedSubject]);

  // Realtime synchronization across all devices via Firebase with instant reaction
  useEffect(() => {
    let syncTimer = null;

    const handleSync = (e) => {
      const { storageKey } = e.detail || {};
      if (storageKey === 'lms_mock_attendance_sessions_v3' || storageKey === 'lms_mock_attendance_records_v3') {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
          if (user?.role === 'siswa' || selectedClass) {
            await loadSessions(true);
            if (activeSessionRef.current) {
              await silentRefreshSessionDetails(activeSessionRef.current);
            }
          }
        }, 100);
      }
    };

    window.addEventListener('lms-sync-update', handleSync);

    // Refresh instantly when user resumes phone or switches tab back
    const handleVisibility = () => {
      if (!document.hidden && (user?.role === 'siswa' || selectedClass)) {
        loadSessions(true);
        if (activeSessionRef.current) {
          silentRefreshSessionDetails(activeSessionRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      window.removeEventListener('lms-sync-update', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [user, selectedClass]);

  // Mobile heartbeat polling for student: guarantees real-time sync even if background mobile socket throttles
  useEffect(() => {
    if (user?.role !== 'siswa' || !activeSession) return;
    const interval = setInterval(() => {
      silentRefreshSessionDetails(activeSession);
    }, 3000);
    return () => clearInterval(interval);
  }, [user, activeSession]);

  useEffect(() => {
    if (activeTab === 'recap' && selectedClass && selectedSubject) {
      loadRecap();
    }
  }, [activeTab, selectedClass, selectedSubject]);

  function sortStudentList(rawList) {
    const mapped = (rawList || []).map(s => {
      const rec = s.record || (s.status ? { status: s.status, notes: s.notes } : {});
      const status = rec.status || s.status || 'Belum Presensi';
      return {
        student_id: s.student_id || s.id,
        name: s.student_name || s.name || '',
        nis: s.nis || s.nis_nip || '',
        no_absen: s.no_absen || null,
        avatar: s.avatar,
        status,
        notes: rec.notes || s.notes || ''
      };
    });

    mapped.sort((a, b) => {
      const numA = (a.no_absen && Number(a.no_absen) > 0) ? Number(a.no_absen) : 9999;
      const numB = (b.no_absen && Number(b.no_absen) > 0) ? Number(b.no_absen) : 9999;
      if (numA !== numB) return numA - numB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return mapped;
  }

  async function loadSessions(isSilent = false) {
    if (isFetchingSessions.current) return;
    try {
      isFetchingSessions.current = true;
      if (!isSilent) setLoading(true);

      const data = await api.getAttendanceSessions({
        class_id: selectedClass || undefined,
        subject_id: selectedSubject || undefined
      });
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList);

      if (sessionList.length > 0) {
        const stillValid = sessionList.some(s => s.id === activeSessionRef.current);
        if (!stillValid || !activeSessionRef.current) {
          openSessionDetails(sessionList[0].id);
        } else {
          silentRefreshSessionDetails(activeSessionRef.current);
        }
      } else {
        setActiveSession(null);
        setSessionDetail(null);
        setStudentRecords([]);
      }
    } catch (err) {
      console.error('Load sessions error:', err);
    } finally {
      isFetchingSessions.current = false;
      if (!isSilent) setLoading(false);
    }
  }

  async function openSessionDetails(sessionId) {
    if (!sessionId) return;
    try {
      setCheckInError('');
      setActiveSession(sessionId);
      const data = await api.getAttendanceSessionDetails(sessionId);
      if (!data) return;
      if (data.session) {
        setSessionDetail(data.session);
      }
      const rawList = data.students || data.records || [];
      const sorted = sortStudentList(rawList);
      setStudentRecords(sorted);
    } catch (err) {
      console.error('Error openSessionDetails:', err);
      showToast('error', 'Gagal memuat detail sesi: ' + (err.message || 'Terjadi kesalahan'));
    }
  }

  async function silentRefreshSessionDetails(sessionId) {
    if (!sessionId) return;
    try {
      const data = await api.getAttendanceSessionDetails(sessionId);
      if (!data || activeSessionRef.current !== sessionId) return;

      if (data.session) {
        setSessionDetail(data.session);
      }

      const rawList = data.students || data.records || [];
      const sorted = sortStudentList(rawList);
      setStudentRecords(sorted);
    } catch (err) {
      console.warn('Silent refresh error:', err);
    }
  }

  async function loadRecap() {
    if (!selectedClass || !selectedSubject) return;
    try {
      const data = await api.getAttendanceSummary(selectedClass, selectedSubject);
      setRecapData(data || { sessions: [], summary: [] });
    } catch (err) {
      console.error('Load recap error:', err);
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    const warning = getSessionTimeWarning(newSessionForm.date, newSessionForm.time_start, newSessionForm.time_end);

    if (warning?.isError) {
      showToast('error', warning.message);
      return;
    }

    if (warning?.isEnded) {
      setConfirmDialog({
        title: 'Peringatan Waktu Terlewat',
        message: `Jam sesi presensi (${newSessionForm.time_start} - ${newSessionForm.time_end} WIB) pada tanggal ${newSessionForm.date} sudah terlewat dari jam saat ini (${warning.currentTime} WIB). Apakah Anda yakin ingin tetap membuat sesi presensi lampau ini?`,
        confirmText: 'Ya, Tetap Buat Sesi',
        type: 'warning',
        onConfirm: async () => {
          await executeCreateSession();
        }
      });
      return;
    }

    await executeCreateSession();
  }

  async function executeCreateSession() {
    try {
      const targetClassId = newSessionForm.class_id || selectedClass;
      await api.createAttendanceSession({
        ...newSessionForm,
        class_id: Number(targetClassId),
        subject_id: Number(newSessionForm.subject_id || selectedSubject)
      });
      setShowModal(false);
      if (targetClassId) {
        setSelectedClass(String(targetClassId));
      }
      loadSessions();
      showToast('success', 'Sesi presensi baru berhasil dibuat!');
    } catch (err) {
      showToast('error', 'Gagal membuat sesi: ' + err.message);
    }
  }

  async function handleToggleSession(sessionId) {
    try {
      const res = await api.toggleAttendanceSession(sessionId);
      setSessionDetail(prev => ({ ...prev, is_open: res.is_open }));
      loadSessions();
    } catch (err) {
      showToast('error', 'Gagal mengubah status sesi: ' + err.message);
    }
  }

  async function handleStudentCheckIn(sessionId) {
    if (!checkInCode.trim()) {
      setCheckInError('Silakan masukkan kode presensi 6 digit.');
      return;
    }
    setCheckInError('');
    try {
      const res = await api.studentCheckIn(sessionId, checkInCode.toUpperCase().trim());
      if (res && res.error) {
        setCheckInError(res.error);
        return;
      }
      setCheckInSuccess(res.message || 'Presensi berhasil dicatat! Status: Hadir');
      setCheckInError('');
      setCheckInCode('');
      openSessionDetails(sessionId);
      loadSessions();
    } catch (err) {
      setCheckInError(err.message || 'Kode presensi tidak sesuai atau salah. Silakan periksa kembali kode dari guru.');
    }
  }

  async function handleSaveRecords() {
    try {
      setIsSaving(true);
      await api.updateAttendanceRecords(activeSession, studentRecords);
      openSessionDetails(activeSession);
      showToast('success', 'Presensi kelas berhasil disimpan!');
    } catch (err) {
      showToast('error', 'Gagal menyimpan presensi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSetAllStatus(status) {
    setStudentRecords(prev => prev.map(s => ({ ...s, status })));
  }

  function handleStatusChange(studentId, newStatus) {
    setStudentRecords(prev => prev.map(s => s.student_id === studentId ? { ...s, status: newStatus } : s));
  }

  function handleNotesChange(studentId, newNotes) {
    setStudentRecords(prev => prev.map(s => s.student_id === studentId ? { ...s, notes: newNotes } : s));
  }

  return (
    <div className="content-view">
      {/* Top Filter and Tab Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div className="tabs-nav" style={{ marginBottom: 0 }}>
          <button
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            Sesi Presensi Harian
          </button>
          <button
            className={`tab-btn ${activeTab === 'recap' ? 'active' : ''}`}
            onClick={() => setActiveTab('recap')}
          >
            Rekap Kehadiran Siswa
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 1. Mata Pelajaran (Urutan Pertama) */}
          <select
            className="form-control"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
          >
            {displaySubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
            ))}
          </select>

          {/* 2. Kelas (Urutan Kedua - Sesuai Mapel Terpilih & Kosong Awalnya untuk Guru) */}
          {user?.role === 'siswa' ? (
            <div className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: 700 }}>
              Kelas {user.kelas || (sortedClasses.find(c => c.id.toString() === selectedClass)?.name || '')}
            </div>
          ) : (
            <select
              className="form-control"
              style={{ width: 'auto', fontWeight: 600, borderColor: !selectedClass ? 'var(--primary)' : undefined }}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Pilih Kelas --</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>
          )}

          {/* Indikator Status Sinkronisasi Real-Time */}
          <span
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.75rem' }}
            title="Presensi tersinkron otomatis antar HP siswa dan laptop guru via Realtime Database"
          >
            <span className="pulse-dot green" style={{ width: 6, height: 6 }}></span>
            Real-Time
          </span>

          {isTeacher && (
            <button className="btn btn-primary" onClick={handleOpenNewSessionModal}>
              <Plus size={16} /> Buka Sesi Baru
            </button>
          )}
        </div>
      </div>

      {/* Tampilan Kosong untuk Guru/Admin sebelum memilih kelas */}
      {isTeacher && !selectedClass ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 680, margin: '20px auto' }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <Users size={36} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
            Pilih Kelas Terlebih Dahulu
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Silakan pilih kelas pada filter di atas untuk melihat riwayat sesi presensi mata pelajaran <strong>{currentSelectedSubjectObj?.name || 'terpilih'}</strong>, atau klik salah satu kelas di bawah ini:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {availableClasses.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tidak ada kelas yang terhubung dengan mata pelajaran ini.</span>
            ) : (
              availableClasses.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="btn btn-outline"
                  style={{ fontWeight: 700, padding: '8px 18px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => setSelectedClass(c.id.toString())}
                >
                  Kelas {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'sessions' ? (
        <div className="attendance-split-layout">
          {/* Left: Sessions List */}
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 14, color: 'var(--text-main)' }}>
              Riwayat Pertemuan / Sesi
            </h4>

            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                Belum ada sesi presensi untuk kelas ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => {
                  const isSelected = activeSession === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => openSessionDetails(s.id)}
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{s.date}</span>
                        {s.is_open ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                            <span className="pulse-dot green" style={{ width: 6, height: 6 }}></span> Terbuka
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Ditutup</span>
                        )}
                      </div>
                      <h5 style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
                        {s.session_title}
                      </h5>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Jam: {s.time_start} - {s.time_end}</span>
                        <span>{s.count_hadir || 0} Hadir</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Session Detail & Student Check-in / Marking Table */}
          <div className="card">
            {sessionDetail ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{sessionDetail.session_title}</h3>
                      {sessionDetail.is_open ? (
                        <span className="badge badge-success">Sesi Aktif</span>
                      ) : (
                        <span className="badge badge-neutral">Sesi Ditutup</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Kelas: <strong>{sessionDetail.class_name}</strong> • Mapel: <strong>{sessionDetail.subject_name}</strong> • Tanggal: <strong>{sessionDetail.date} ({sessionDetail.time_start} - {sessionDetail.time_end})</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Session Code Display - ONLY visible to Guru and Admin */}
                    {isTeacher && (
                      <div style={{ background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--primary)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>Kode Presensi</span>
                        <strong style={{ fontSize: '1.1rem', letterSpacing: '2px', color: 'var(--primary)' }}>
                          {sessionDetail.session_code}
                        </strong>
                      </div>
                    )}

                    {isTeacher && (
                      <button
                        className={`btn btn-sm ${sessionDetail.is_open ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggleSession(sessionDetail.id)}
                      >
                        {sessionDetail.is_open ? <Lock size={14} /> : <Unlock size={14} />}
                        {sessionDetail.is_open ? 'Tutup Sesi' : 'Buka Sesi'}
                      </button>
                    )}
                  </div>
                </div>

                {/* If Student logged in: Show Check-in Box or Multi-Status Banner */}
                {!isTeacher && (
                  (() => {
                    const myRecord = studentRecords.find(st => st.student_id === user?.id);
                    const status = myRecord?.status;

                    if (status === 'Hadir') {
                      return (
                        <div style={{ background: '#ecfdf5', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #a7f3d0' }}>
                          <CheckCircle size={22} color="#059669" />
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#065f46', display: 'block' }}>
                              Kehadiran Anda Telah Dicatat: Hadir
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#047857' }}>
                              Terima kasih, kehadiran Anda pada sesi ini telah tersimpan secara resmi.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (status === 'Sakit') {
                      return (
                        <div style={{ background: '#fffbeb', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #fde68a' }}>
                          <Clock size={22} color="#d97706" />
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#92400e', display: 'block' }}>
                              Status Kehadiran Anda: Sakit
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#b45309' }}>
                              Guru telah mencatat keterangan sakit untuk Anda pada pertemuan ini. Lekas pulih!
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (status === 'Izin') {
                      return (
                        <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #bfdbfe' }}>
                          <Info size={22} color="#2563eb" />
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#1e40af', display: 'block' }}>
                              Status Kehadiran Anda: Izin
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#1d4ed8' }}>
                              Guru telah mencatat keterangan izin untuk Anda pada pertemuan ini.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (status === 'Terlambat') {
                      return (
                        <div style={{ background: '#fff7ed', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #fed7aa' }}>
                          <Clock size={22} color="#ea580c" />
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#9a3412', display: 'block' }}>
                              Status Kehadiran Anda: Terlambat
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#c2410c' }}>
                              Kehadiran Anda telah dicatat dengan keterangan terlambat.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (status === 'Alpa') {
                      return (
                        <div style={{ background: '#fef2f2', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #fecaca' }}>
                          <AlertCircle size={22} color="#dc2626" />
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#991b1b', display: 'block' }}>
                              Status Kehadiran Anda: Alpa (Tanpa Keterangan)
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                              Status kehadiran Anda tercatat alpa. Silakan hubungi guru pengampu jika ada kekeliruan.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (!sessionDetail.is_open) {
                      return (
                        <div style={{ background: 'var(--bg-muted)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-color)' }}>
                          <AlertCircle size={20} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Sesi presensi ini telah ditutup oleh guru pengampu.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20, border: '1px solid #bfdbfe' }}>
                        {checkInError && (
                          <div className="login-error-banner" style={{ marginBottom: 14 }}>
                            <AlertCircle size={17} className="flex-shrink-0" />
                            <span>{checkInError}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                          <div>
                            <h5 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                              Presensi Mandiri Siswa
                            </h5>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                              Masukkan kode 6-digit yang diberikan oleh guru di kelas untuk mencatat kehadiran Anda.
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="KODE"
                              maxLength={6}
                              style={{
                                width: 120,
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                textAlign: 'center',
                                letterSpacing: '2px',
                                fontSize: '1rem',
                                borderColor: checkInError ? '#EF4444' : undefined,
                                boxShadow: checkInError ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined
                              }}
                              value={checkInCode}
                              onChange={(e) => {
                                setCheckInCode(e.target.value);
                                if (checkInError) setCheckInError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleStudentCheckIn(sessionDetail.id);
                                }
                              }}
                            />
                            <button
                              className="btn btn-primary"
                              onClick={() => handleStudentCheckIn(sessionDetail.id)}
                            >
                              Hadir Sekarang
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {checkInSuccess && (
                  <div style={{ padding: '10px 16px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: 16, fontWeight: 600, fontSize: '0.85rem' }}>
                    {checkInSuccess}
                  </div>
                )}

                {/* Teacher Quick Tools */}
                {isTeacher && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Aksi Cepat:</span>
                      <button className="btn btn-outline btn-sm" onClick={() => handleSetAllStatus('Hadir')}>
                        <CheckCheck size={14} color="#10b981" /> Semua Hadir
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleSetAllStatus('Alpa')}>
                        Semua Alpa
                      </button>
                    </div>

                    <button
                      className="btn btn-success"
                      onClick={handleSaveRecords}
                      disabled={isSaving}
                    >
                      <Save size={16} />
                      {isSaving ? 'Menyimpan...' : 'Simpan Presensi Kelas'}
                    </button>
                  </div>
                )}

                {/* Student Attendance List Table */}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>No</th>
                        <th>Siswa</th>
                        <th>NIS</th>
                        <th style={{ width: 320 }}>Status Kehadiran</th>
                        <th>Catatan / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRecords.map((st, idx) => (
                        <tr key={st.student_id || idx}>
                          <td style={{ fontWeight: 700, textAlign: 'center' }}>{st.no_absen || (idx + 1)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <StudentAvatar name={st.name} size={28} />
                              <strong style={{ fontSize: '0.88rem' }}>{st.name}</strong>
                            </div>
                          </td>
                          <td>{st.nis}</td>
                          <td>
                            {isTeacher ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                {['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'].map(statusOption => {
                                  const isSelected = st.status === statusOption;
                                  let colorStyle = 'var(--bg-subtle)';
                                  let textColor = 'var(--text-muted)';
                                  if (isSelected) {
                                    if (statusOption === 'Hadir') { colorStyle = 'var(--success-light)'; textColor = 'var(--success)'; }
                                    else if (statusOption === 'Sakit') { colorStyle = 'var(--warning-light)'; textColor = 'var(--warning)'; }
                                    else if (statusOption === 'Izin') { colorStyle = 'var(--primary-light)'; textColor = 'var(--primary)'; }
                                    else if (statusOption === 'Alpa') { colorStyle = 'var(--danger-light)'; textColor = 'var(--danger)'; }
                                    else if (statusOption === 'Terlambat') { colorStyle = '#ffedd5'; textColor = '#c2410c'; }
                                  }
                                  return (
                                    <button
                                      key={statusOption}
                                      type="button"
                                      onClick={() => handleStatusChange(st.student_id, statusOption)}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        borderRadius: 'var(--radius-xs)',
                                        border: isSelected ? '1.5px solid currentColor' : '1px solid var(--border-color)',
                                        background: colorStyle,
                                        color: textColor,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {statusOption}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className={`badge badge-${st.status === 'Hadir' ? 'success' : st.status === 'Sakit' ? 'warning' : st.status === 'Alpa' ? 'danger' : 'neutral'}`}>
                                {st.status}
                              </span>
                            )}
                          </td>
                          <td>
                            {isTeacher ? (
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Keterangan..."
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={st.notes}
                                onChange={(e) => handleNotesChange(st.student_id, e.target.value)}
                              />
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.notes || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                Pilih salah satu sesi pertemuan di sebelah kiri untuk melihat atau menginput presensi.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Recap Tab View */
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Rekapitulasi Kehadiran Siswa</div>
              <div className="card-subtitle">
                Total Sesi Pertemuan: {recapData?.sessions?.length || 0} Pertemuan
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => window.print()}
            >
              <FileSpreadsheet size={15} /> Cetak / Ekspor PDF
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>No</th>
                  <th>Nama Siswa</th>
                  <th>NIS</th>
                  <th style={{ textAlign: 'center' }}>Hadir (H)</th>
                  <th style={{ textAlign: 'center' }}>Sakit (S)</th>
                  <th style={{ textAlign: 'center' }}>Izin (I)</th>
                  <th style={{ textAlign: 'center' }}>Alpa (A)</th>
                  <th style={{ textAlign: 'center' }}>Terlambat (T)</th>
                  <th style={{ textAlign: 'center' }}>% Kehadiran</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {recapData?.summary?.map((r, idx) => (
                  <tr key={r.student.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong style={{ fontSize: '0.88rem' }}>{r.student.name}</strong>
                    </td>
                    <td>{r.student.nis}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{r.hadir}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--warning)' }}>{r.sakit}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{r.izin}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>{r.alpa}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.terlambat}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${r.percentage >= 80 ? 'success' : r.percentage >= 70 ? 'warning' : 'danger'}`}>
                        {r.percentage}%
                      </span>
                    </td>
                    <td>
                      {r.percentage >= 85 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Memenuhi Syarat</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Perlu Pembinaan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Buka Sesi Presensi Baru */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Buka Sesi Presensi Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Mata Pelajaran & Kelas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* 1. Mata Pelajaran di Modal (Urutan Pertama) */}
                    <select
                      className="form-control"
                      value={newSessionForm.subject_id || selectedSubject}
                      onChange={(e) => {
                        const newSubj = e.target.value;
                        const modalSubjObj = displaySubjects.find(s => s.id?.toString() === newSubj?.toString());
                        const validClasses = getClassesForSubject(modalSubjObj, sortedClasses);
                        setNewSessionForm({
                          ...newSessionForm,
                          subject_id: newSubj,
                          class_id: validClasses[0]?.id?.toString() || ''
                        });
                      }}
                      required
                    >
                      {displaySubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                    </select>

                    {/* 2. Kelas di Modal (Tersaring Menyesuaikan Mapel) */}
                    <select
                      className="form-control"
                      value={newSessionForm.class_id || selectedClass}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, class_id: e.target.value })}
                      required
                    >
                      {(() => {
                        const currentModalSubj = displaySubjects.find(s => s.id?.toString() === (newSessionForm.subject_id || selectedSubject)?.toString()) || displaySubjects[0];
                        const modalFilteredClasses = getClassesForSubject(currentModalSubj, sortedClasses);
                        if (modalFilteredClasses.length === 0) {
                          return <option value="">-- Tidak ada kelas --</option>;
                        }
                        return modalFilteredClasses.map(c => (
                          <option key={c.id} value={c.id}>Kelas {c.name}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Pertemuan / Materi Pembahasan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Pertemuan 3: Pertidaksamaan Rasional"
                    value={newSessionForm.session_title}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, session_title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newSessionForm.date}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Mulai</label>
                    <input
                      type="time"
                      className="form-control"
                      value={newSessionForm.time_start}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, time_start: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Selesai</label>
                    <input
                      type="time"
                      className="form-control"
                      value={newSessionForm.time_end}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, time_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Real-time Time Warning Banner */}
                {(() => {
                  const warning = getSessionTimeWarning(newSessionForm.date, newSessionForm.time_start, newSessionForm.time_end);
                  if (!warning) return null;
                  return (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        background: warning.isError ? '#FEF2F2' : (warning.isEnded ? '#FFFBEB' : '#EFF6FF'),
                        border: `1.5px solid ${warning.isError ? '#FECACA' : (warning.isEnded ? '#FDE68A' : '#BFDBFE')}`,
                        color: warning.isError ? '#B91C1C' : (warning.isEnded ? '#92400E' : '#1E40AF'),
                        fontSize: '0.85rem',
                        lineHeight: 1.5
                      }}
                    >
                      {warning.isError ? (
                        <AlertCircle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                      ) : warning.isEnded ? (
                        <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <Clock size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                      )}
                      <div>
                        <div style={{
                          fontWeight: 700,
                          color: warning.isError ? '#DC2626' : (warning.isEnded ? '#B45309' : '#1D4ED8'),
                          marginBottom: 2
                        }}>
                          {warning.isError
                            ? 'Rentang Jam Tidak Valid'
                            : warning.isEnded
                              ? '⚠️ Peringatan: Jam / Tanggal Telah Terlewat'
                              : 'ℹ️ Informasi Jam Mulai'}
                        </div>
                        <div>{warning.message}</div>
                        {warning.isEnded && (
                          <div style={{ fontSize: '0.78rem', marginTop: 4, color: '#78350F' }}>
                            * Sesi lampau tetap dapat dibuat untuk perekaman presensi susulan, namun siswa tidak dapat melakukan presensi mandiri secara realtime.
                          </div>
                        )}
                        {!warning.isError && !warning.isEnded && (
                          <div style={{ fontSize: '0.78rem', marginTop: 4, color: '#1E3A8A' }}>
                            * Sesi presensi akan langsung aktif dibuka saat dibuat.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Buat & Buka Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Center Modal Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '28px 24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              position: 'relative',
              border: '1px solid #E2E8F0'
            }}
          >
            {/* Close X */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setConfirmDialog(null)}
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: confirmDialog.type === 'danger' ? '#FEF2F2' : (confirmDialog.type === 'warning' ? '#FFFBEB' : '#EFF6FF'),
                border: `6px solid ${confirmDialog.type === 'danger' ? '#FEE2E2' : (confirmDialog.type === 'warning' ? '#FEF3C7' : '#DBEAFE')}`,
                color: confirmDialog.type === 'danger' ? '#DC2626' : (confirmDialog.type === 'warning' ? '#D97706' : '#2563EB'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: confirmDialog.type === 'danger' ? '0 8px 16px rgba(239, 68, 68, 0.15)' : '0 8px 16px rgba(217, 119, 6, 0.15)'
              }}
            >
              {confirmDialog.type === 'danger' ? (
                <AlertTriangle size={30} strokeWidth={2.4} />
              ) : confirmDialog.type === 'warning' ? (
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
                  background: confirmDialog.type === 'danger'
                    ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                    : (confirmDialog.type === 'warning' ? 'linear-gradient(135deg, #D97706, #B45309)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)'),
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: confirmDialog.type === 'danger'
                    ? '0 4px 14px rgba(220, 38, 38, 0.35)'
                    : (confirmDialog.type === 'warning' ? '0 4px 14px rgba(217, 119, 6, 0.35)' : '0 4px 14px rgba(37, 99, 235, 0.35)'),
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

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor: toast.type === 'error' ? '#FEF2F2' : (toast.type === 'warning' ? '#FFFBEB' : '#F0FDF4'),
            color: toast.type === 'error' ? '#991B1B' : (toast.type === 'warning' ? '#92400E' : '#166534'),
            border: `1.5px solid ${toast.type === 'error' ? '#FECACA' : (toast.type === 'warning' ? '#FDE68A' : '#BBF7D0')}`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}
        >
          {toast.type === 'error' && <AlertCircle size={20} color="#DC2626" />}
          {toast.type === 'warning' && <AlertTriangle size={20} color="#D97706" />}
          {toast.type === 'success' && <CheckCircle size={20} color="#16A34A" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 8,
              opacity: 0.7
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
