import React, { useState, useEffect } from 'react';
import {
  MonitorPlay,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Send,
  Radio,
  RefreshCw,
  Unlock,
  StopCircle,
  Megaphone,
  CheckCircle2,
  Terminal,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { FlatBadge, FlatStatusDot } from '../components/common/FlatComponents';

export default function CbtMonitorView({ examId: propExamId }) {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [activeExamId, setActiveExamId] = useState(propExamId || null);
  const [monitorData, setMonitorData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live violation alert notification toast
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Add time modal state
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [extraMinutes, setExtraMinutes] = useState(5);

  useEffect(() => {
    loadExamList();
  }, []);

  useEffect(() => {
    if (activeExamId) {
      loadMonitorState(activeExamId);
      setupRealtimeSocket(activeExamId);
    }
  }, [activeExamId]);

  async function loadExamList() {
    try {
      const data = await api.getCbtExams();
      setExams(data);
      if (!activeExamId && data.length > 0) {
        setActiveExamId(data[0].id);
      }
    } catch (err) {
      console.error('Load exam list error:', err);
    }
  }

  async function loadMonitorState(examId) {
    try {
      setLoading(true);
      const data = await api.getCbtMonitor(examId);
      setMonitorData(data);
    } catch (err) {
      alert('Gagal memuat status live monitor: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSocket(examId) {
    const socket = getSocket();

    socket.emit('join_exam', {
      exam_id: examId,
      user
    });

    // 1. Live Progress update from student
    socket.off('live_progress_update');
    socket.on('live_progress_update', (data) => {
      setMonitorData(prev => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map(st => {
          if (st.student.id === data.student_id) {
            return {
              ...st,
              status: st.status === 'BLOCKED' ? 'BLOCKED' : 'IN_PROGRESS',
              answered_count: data.answered_count,
              progress_percent: data.progress_percent,
              doubtful_count: data.doubtful_count,
              last_active_at: data.timestamp
            };
          }
          return st;
        });
        return { ...prev, students: updatedStudents };
      });
    });

    // 2. Anti-cheat violation alert!
    socket.off('live_violation_alert');
    socket.on('live_violation_alert', (alertData) => {
      // Add to toast alerts
      setLiveAlerts(prev => [alertData, ...prev.slice(0, 4)]);

      // Update monitor data
      setMonitorData(prev => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map(st => {
          if (st.student.id === alertData.student_id) {
            return {
              ...st,
              status: alertData.is_blocked ? 'BLOCKED' : st.status,
              violation_count: alertData.violation_count,
              last_active_at: new Date().toISOString()
            };
          }
          return st;
        });

        const newLog = {
          id: Date.now(),
          student_id: alertData.student_id,
          student_name: alertData.student_name,
          event_type: alertData.event_type,
          details: alertData.details,
          created_at: alertData.timestamp
        };

        return {
          ...prev,
          students: updatedStudents,
          logs: [newLog, ...(prev.logs || [])]
        };
      });
    });
  }

  async function handleProctorAction(actionType, studentId, value = null) {
    try {
      const socket = getSocket();
      socket.emit('proctor_command', {
        exam_id: activeExamId,
        student_id: studentId,
        action: actionType,
        value
      });

      if (actionType === 'RESET_LOGIN') {
        await api.resetCbtStudent(activeExamId, studentId);
        alert('Kunci ujian berhasil dibuka untuk siswa ini.');
      } else if (actionType === 'FORCE_SUBMIT') {
        await api.forceSubmitCbtStudent(activeExamId, studentId);
        alert('Ujian telah dipaksa kumpul untuk siswa ini.');
      } else if (actionType === 'EXTEND_TIME') {
        await api.extendCbtStudentTime(activeExamId, studentId, value);
        alert(`Berhasil menambahkan waktu ${value} menit.`);
        setSelectedStudentForAction(null);
      }

      loadMonitorState(activeExamId);
    } catch (err) {
      alert('Gagal mengeksekusi kendali proctor: ' + err.message);
    }
  }

  function handleSendBroadcast(e) {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const socket = getSocket();
    socket.emit('broadcast_alert', {
      exam_id: activeExamId,
      message: broadcastMessage,
      sender_name: user?.name || 'Pengawas Ujian'
    });

    alert('Pengumuman kilat telah disiarkan ke seluruh siswa aktif!');
    setBroadcastMessage('');
    setShowBroadcastModal(false);
  }

  return (
    <div className="content-view">
      {/* ===================================================================
          Header Control Deck (Flat Color Block)
          =================================================================== */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-sm)',
              background: '#EFF6FF',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Radio size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <FlatBadge variant="primary" size="sm">LIVE PROCTORING</FlatBadge>
              <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FlatStatusDot status="online" size={8} /> Server Aktif
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              Live Proctoring Monitor
            </h2>
          </div>
        </div>

        {/* Action Buttons: Solid Colors with Scale Feedback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '220px', fontWeight: 700 }}
            value={activeExamId || ''}
            onChange={(e) => setActiveExamId(Number(e.target.value))}
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.class_name})
              </option>
            ))}
          </select>

          <button
            className="btn btn-secondary"
            onClick={() => loadMonitorState(activeExamId)}
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} />
          </button>

          <button
            className="btn btn-warning"
            onClick={() => setShowBroadcastModal(true)}
          >
            <Megaphone size={16} /> Siarkan Pengumuman
          </button>

          {monitorData?.exam?.status === 'ACTIVE' ? (
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (window.confirm('HENTIKAN UJIAN INI SEKARANG? Siswa tidak akan dapat melanjutkan pengerjaan.')) {
                  try {
                    await api.updateCbtExamStatus(activeExamId, 'FINISHED');
                    alert('Ujian telah resmi dihentikan!');
                    loadMonitorState(activeExamId);
                  } catch (err) {
                    alert('Gagal menghentikan ujian: ' + err.message);
                  }
                }
              }}
              title="Hentikan pengerjaan ujian sekarang"
            >
              <StopCircle size={16} /> Hentikan Ujian
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={async () => {
                if (window.confirm('Aktifkan kembali ujian ini?')) {
                  try {
                    await api.updateCbtExamStatus(activeExamId, 'ACTIVE');
                    alert('Ujian telah diaktifkan kembali!');
                    loadMonitorState(activeExamId);
                  } catch (err) {
                    alert('Gagal mengaktifkan ujian: ' + err.message);
                  }
                }
              }}
            >
              <Play size={16} fill="currentColor" /> Aktifkan Ujian
            </button>
          )}
        </div>
      </div>

      {/* Floating Violation Alert Toast */}
      {liveAlerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {liveAlerts.slice(0, 2).map((alertItem, i) => (
            <div
              key={i}
              style={{
                background: '#FEF2F2',
                border: '2px solid #FCA5A5',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ShieldAlert size={24} color="#EF4444" strokeWidth={2.5} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlatBadge variant="danger" size="sm">PELANGGARAN</FlatBadge>
                    <strong style={{ fontSize: '0.95rem', color: '#991B1B' }}>
                      {alertItem.student_name}
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#B91C1C', marginTop: '2px' }}>
                    {alertItem.details} (Peringatan ke-{alertItem.violation_count}) • {alertItem.timestamp}
                  </p>
                </div>
              </div>

              {alertItem.is_blocked && (
                <FlatBadge variant="danger" size="md">
                  LAYAR DIKUNCI
                </FlatBadge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPI Counters: Multi-Color Solid Tint Blocks */}
      {monitorData && (
        <div className="stats-grid" style={{ marginBottom: '28px' }}>
          {/* Total Students */}
          <div className="stat-card" style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
            <div className="stat-icon indigo" style={{ width: 44, height: 44 }}>
              <Radio size={20} strokeWidth={2.5} />
            </div>
            <div className="stat-details">
              <h4>Total Peserta</h4>
              <div className="stat-value" style={{ color: '#1D4ED8' }}>{monitorData.stats.total}</div>
              <div className="stat-desc">Terdaftar dalam rombel</div>
            </div>
          </div>

          {/* In Progress */}
          <div className="stat-card" style={{ background: '#ECFDF5', border: '2px solid #A7F3D0' }}>
            <div className="stat-icon emerald" style={{ width: 44, height: 44 }}>
              <Play size={18} fill="currentColor" />
            </div>
            <div className="stat-details">
              <h4>Sedang Mengerjakan</h4>
              <div className="stat-value" style={{ color: '#047857' }}>{monitorData.stats.in_progress}</div>
              <div className="stat-desc">Koneksi ujian aktif</div>
            </div>
          </div>

          {/* Blocked / Violations */}
          <div className="stat-card" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
            <div className="stat-icon rose" style={{ width: 44, height: 44 }}>
              <ShieldAlert size={20} strokeWidth={2.5} />
            </div>
            <div className="stat-details">
              <h4>Layar Terkunci</h4>
              <div className="stat-value" style={{ color: '#B91C1C' }}>{monitorData.stats.blocked}</div>
              <div className="stat-desc">Perlu pembukaan kunci</div>
            </div>
          </div>

          {/* Submitted */}
          <div className="stat-card" style={{ background: '#F0F9FF', border: '2px solid #BAE6FD' }}>
            <div className="stat-icon cyan" style={{ width: 44, height: 44 }}>
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
            <div className="stat-details">
              <h4>Selesai Mengumpulkan</h4>
              <div className="stat-value" style={{ color: '#0369A1' }}>{monitorData.stats.submitted}</div>
              <div className="stat-desc">Lembar ujian diserahkan</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Student Cards Grid (Left) + Audit Logs Sidebar (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px' }}>
        {/* Student Cards Grid */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
            Daftar Peserta Kelas {monitorData?.exam?.class_name || 'X-IPA-1'} ({monitorData?.total_questions || 6} Butir Soal):
          </h3>

          <div className="cbt-monitor-grid">
            {monitorData?.students?.map(item => {
              const { student, status, answered_count, progress_percent, doubtful_count, violation_count, score, device_info } = item;
              const isBlocked = status === 'BLOCKED';
              const isInProgress = status === 'IN_PROGRESS';
              const isSubmitted = status === 'SUBMITTED';

              return (
                <div
                  key={student.id}
                  className={`student-monitor-card status-${status.toLowerCase()}`}
                >
                  {/* Card Header */}
                  <div className="monitor-header">
                    <div className="student-meta">
                      <img src={student.avatar} alt={student.name} className="student-avatar" />
                      <div className="student-name-box">
                        <h5>{student.name}</h5>
                        <span>NIS: {student.nis}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isBlocked ? (
                      <FlatBadge variant="danger" size="sm">
                        <ShieldAlert size={12} /> Terkunci
                      </FlatBadge>
                    ) : isInProgress ? (
                      <FlatBadge variant="secondary" size="sm">
                        <span className="pulse-dot green" style={{ width: 6, height: 6 }}></span> Aktif
                      </FlatBadge>
                    ) : isSubmitted ? (
                      <FlatBadge variant="primary" size="sm">
                        <CheckCircle size={12} /> Selesai
                      </FlatBadge>
                    ) : (
                      <FlatBadge variant="muted" size="sm">Offline</FlatBadge>
                    )}
                  </div>

                  {/* Progress Gauge */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Progres:</span>
                      <strong>
                        {answered_count} / {monitorData.total_questions} ({progress_percent}%)
                      </strong>
                    </div>

                    <div className="progress-bar-wrap">
                      <div
                        className={`progress-bar-fill ${isBlocked ? 'blocked' : ''}`}
                        style={{ width: `${progress_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {violation_count > 0 && (
                        <FlatBadge variant="danger" size="sm">
                          ⚠️ {violation_count}x Pelanggaran
                        </FlatBadge>
                      )}
                      {doubtful_count > 0 && (
                        <FlatBadge variant="warning" size="sm">
                          {doubtful_count} Ragu
                        </FlatBadge>
                      )}
                    </div>

                    {isSubmitted && score !== null && (
                      <strong style={{ fontSize: '1rem', color: '#1D4ED8' }}>
                        Nilai: {score}
                      </strong>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    {isBlocked && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleProctorAction('RESET_LOGIN', student.id)}
                        title="Buka kunci ujian siswa"
                      >
                        <Unlock size={14} /> Buka Kunci
                      </button>
                    )}

                    {isInProgress && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedStudentForAction(student);
                            setExtraMinutes(5);
                          }}
                        >
                          <Clock size={13} /> +Waktu
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#EF4444' }}
                          onClick={() => {
                            if (window.confirm(`Yakin paksa kumpulkan ujian untuk ${student.name}?`)) {
                              handleProctorAction('FORCE_SUBMIT', student.id);
                            }
                          }}
                        >
                          <StopCircle size={13} /> Kumpulkan
                        </button>
                      </>
                    )}

                    {!isInProgress && !isBlocked && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textAlign: 'center', width: '100%', padding: '4px 0' }}>
                        {device_info || 'Perangkat belum terhubung'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Log Sidebar (Right Panel) */}
        <div>
          <div
            className="card"
            style={{
              padding: '20px',
              position: 'sticky',
              top: '92px',
              maxHeight: '84vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={17} color="var(--primary)" strokeWidth={2.5} />
                <span>Log Aktivitas & Audit</span>
              </h4>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {monitorData?.logs?.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                  Belum ada log pelanggaran tercatat.
                </div>
              ) : (
                monitorData?.logs?.map(log => {
                  const isViolation = log.event_type === 'TAB_SWITCH' || log.event_type === 'FULLSCREEN_EXIT';
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px',
                        background: isViolation ? '#FEF2F2' : 'var(--bg-muted)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `4px solid ${isViolation ? '#EF4444' : '#10B981'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>{log.student_name}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: isViolation ? '#B91C1C' : '#047857',
                          fontWeight: 600
                        }}
                      >
                        {log.details}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Broadcast Pengumuman */}
      {showBroadcastModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} color="var(--primary)" />
                <span>Siarkan Pengumuman ke Seluruh Siswa</span>
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-muted)' }}
                onClick={() => setShowBroadcastModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSendBroadcast}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Pesan kilat ini akan langsung muncul sebagai jendela notifikasi di layar ujian seluruh siswa yang sedang mengerjakan.
                </p>
                <div className="form-group">
                  <label className="form-label">Teks Pengumuman</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Contoh: Perhatian! Waktu pengerjaan tersisa 10 menit lagi."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBroadcastModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-warning">
                  <Send size={15} /> Kirim Pengumuman Kilat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Waktu Pengerjaan */}
      {selectedStudentForAction && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Tambah Waktu Pengerjaan</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-muted)' }}
                onClick={() => setSelectedStudentForAction(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-main)' }}>
                Tambahkan toleransi durasi pengerjaan untuk <strong>{selectedStudentForAction.name}</strong> (NIS: {selectedStudentForAction.nis}):
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                {[5, 10, 15, 20].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    className={`btn ${extraMinutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setExtraMinutes(mins)}
                  >
                    +{mins} Menit
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedStudentForAction(null)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleProctorAction('EXTEND_TIME', selectedStudentForAction.id, extraMinutes)}
              >
                Terapkan Penambahan Waktu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
