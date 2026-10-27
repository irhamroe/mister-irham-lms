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

export default function AttendanceView() {
  const { user, classes, subjects } = useAuth();
  const sortedClasses = React.useMemo(() => sortClassesNatural(classes), [classes]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'recap'
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Selected session for details/marking
  const [activeSession, setActiveSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Student check-in state
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState('');

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

    setNewSessionForm({
      class_id: selectedClass || (sortedClasses[0]?.id ? String(sortedClasses[0].id) : ''),
      subject_id: selectedSubject || (subjects[0]?.id ? String(subjects[0].id) : ''),
      date: todayStr,
      time_start: timeStart,
      time_end: timeEnd,
      session_title: ''
    });
    setShowModal(true);
  }

  // Recap data
  const [recapData, setRecapData] = useState(null);

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

  useEffect(() => {
    if (sortedClasses.length > 0 && !selectedClass) {
      if (user?.role === 'siswa' && user?.kelas) {
        const studentCls = sortedClasses.find(c => c.name === user.kelas);
        setSelectedClass(studentCls ? studentCls.id.toString() : sortedClasses[0].id.toString());
      } else {
        setSelectedClass(sortedClasses[0].id.toString());
      }
    }
    if (displaySubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(displaySubjects[0].id.toString());
    }
  }, [sortedClasses, displaySubjects, user]);

  useEffect(() => {
    loadSessions();
  }, [user, selectedClass, selectedSubject]);

  useEffect(() => {
    if (activeTab === 'recap' && selectedClass && selectedSubject) {
      loadRecap();
    }
  }, [activeTab, selectedClass, selectedSubject]);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await api.getAttendanceSessions({
        class_id: selectedClass || undefined,
        subject_id: selectedSubject || undefined
      });
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList);
      if (sessionList.length > 0) {
        const stillValid = sessionList.some(s => s.id === activeSession);
        if (!stillValid || !activeSession) {
          openSessionDetails(sessionList[0].id);
        }
      } else {
        setActiveSession(null);
        setSessionDetail(null);
        setStudentRecords([]);
      }
    } catch (err) {
      console.error('Load sessions error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openSessionDetails(sessionId) {
    try {
      const data = await api.getAttendanceSessionDetails(sessionId);
      if (!data) return;
      setActiveSession(sessionId);
      if (data.session) {
        setSessionDetail(data.session);
      }
      const rawList = data.students || data.records || [];
      setStudentRecords(rawList.map(s => {
        const rec = s.record || (s.status ? { status: s.status, notes: s.notes } : {});
        const status = (rec.status && rec.status !== 'Belum Presensi') ? rec.status : 'Hadir';
        return {
          student_id: s.student_id || s.id,
          name: s.student_name || s.name || '',
          nis: s.nis || s.nis_nip || '',
          no_absen: s.no_absen || null,
          avatar: s.avatar,
          status,
          notes: rec.notes || s.notes || ''
        };
      }));
    } catch (err) {
      console.error('Error openSessionDetails:', err);
      showToast('error', 'Gagal memuat detail sesi: ' + (err.message || 'Terjadi kesalahan'));
    }
  }

  async function loadRecap() {
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
      await api.createAttendanceSession({
        ...newSessionForm,
        class_id: Number(newSessionForm.class_id || selectedClass),
        subject_id: Number(newSessionForm.subject_id || selectedSubject)
      });
      setShowModal(false);
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
    try {
      const res = await api.studentCheckIn(sessionId, checkInCode.toUpperCase());
      setCheckInSuccess(res.message);
      openSessionDetails(sessionId);
      loadSessions();
    } catch (err) {
      showToast('error', 'Presensi gagal: ' + err.message);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.role === 'siswa' ? (
            <div className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: 700 }}>
              Kelas {user.kelas || (sortedClasses.find(c => c.id.toString() === selectedClass)?.name || '')}
            </div>
          ) : (
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {sortedClasses.map(c => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>
          )}

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {displaySubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
            ))}
          </select>

          {isTeacher && (
            <button className="btn btn-primary" onClick={handleOpenNewSessionModal}>
              <Plus size={16} /> Buka Sesi Baru
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sessions' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
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
                    {/* Session Code Display */}
                    <div style={{ background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--primary)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>Kode Presensi</span>
                      <strong style={{ fontSize: '1.1rem', letterSpacing: '2px', color: 'var(--primary)' }}>
                        {sessionDetail.session_code}
                      </strong>
                    </div>

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

                {/* If Student logged in: Show Check-in Box */}
                {!isTeacher && sessionDetail.is_open && (
                  <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <h5 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                        Presensi Mandiri Siswa
                      </h5>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Masukkan kode 6-digit yang diberikan oleh guru di kelas untuk mencatat kehadiran Anda.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Kode Presensi"
                        maxLength={6}
                        style={{ width: 140, textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}
                        value={checkInCode}
                        onChange={(e) => setCheckInCode(e.target.value)}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStudentCheckIn(sessionDetail.id)}
                      >
                        Hadir Sekarang
                      </button>
                    </div>
                  </div>
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
                        <tr key={st.student_id}>
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
                    <select
                      className="form-control"
                      value={newSessionForm.class_id || selectedClass}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, class_id: e.target.value })}
                      required
                    >
                      {sortedClasses.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
                    </select>

                    <select
                      className="form-control"
                      value={newSessionForm.subject_id || selectedSubject}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
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
