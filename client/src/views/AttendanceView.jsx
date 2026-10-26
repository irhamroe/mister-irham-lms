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
  Lock,
  Unlock,
  Save,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AttendanceView() {
  const { user, classes, subjects } = useAuth();
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

  // Recap data
  const [recapData, setRecapData] = useState(null);

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id.toString());
    }
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id.toString());
    }
  }, [classes, subjects]);

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
          avatar: s.avatar || `https://api.dicebear.com/7.x/micah/svg?seed=${s.student_name || s.name || s.id}`,
          status,
          notes: rec.notes || s.notes || ''
        };
      }));
    } catch (err) {
      console.error('Error openSessionDetails:', err);
      alert('Gagal memuat detail sesi: ' + (err.message || 'Terjadi kesalahan'));
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
    try {
      await api.createAttendanceSession({
        ...newSessionForm,
        class_id: Number(newSessionForm.class_id || selectedClass),
        subject_id: Number(newSessionForm.subject_id || selectedSubject)
      });
      setShowModal(false);
      loadSessions();
      alert('Sesi presensi baru berhasil dibuat!');
    } catch (err) {
      alert('Gagal membuat sesi: ' + err.message);
    }
  }

  async function handleToggleSession(sessionId) {
    try {
      const res = await api.toggleAttendanceSession(sessionId);
      setSessionDetail(prev => ({ ...prev, is_open: res.is_open }));
      loadSessions();
    } catch (err) {
      alert('Gagal mengubah status sesi: ' + err.message);
    }
  }

  async function handleStudentCheckIn(sessionId) {
    try {
      const res = await api.studentCheckIn(sessionId, checkInCode.toUpperCase());
      setCheckInSuccess(res.message);
      openSessionDetails(sessionId);
      loadSessions();
    } catch (err) {
      alert('Presensi gagal: ' + err.message);
    }
  }

  async function handleSaveRecords() {
    try {
      setIsSaving(true);
      await api.updateAttendanceRecords(activeSession, studentRecords);
      openSessionDetails(activeSession);
      alert('Presensi kelas berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan presensi: ' + err.message);
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
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>Kelas {c.name}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {isTeacher && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                          <td>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img src={st.avatar} alt={st.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
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
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Buka Sesi Presensi Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mata Pelajaran & Kelas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <select
                      className="form-control"
                      value={newSessionForm.class_id || selectedClass}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, class_id: e.target.value })}
                      required
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
                    </select>

                    <select
                      className="form-control"
                      value={newSessionForm.subject_id || selectedSubject}
                      onChange={(e) => setNewSessionForm({ ...newSessionForm, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              </div>
              <div className="modal-footer">
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
    </div>
  );
}
