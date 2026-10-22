import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Megaphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export default function CbtExamView({ exam, token, onFinish }) {
  const { user } = useAuth();
  const [examData, setExamData] = useState(exam);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: { answer, doubtful } }
  
  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef(null);

  // Anti-cheat state
  const [violationCount, setViolationCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');

  // Modals
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [broadcastAlert, setBroadcastAlert] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startExamSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startExamSession() {
    try {
      setLoading(true);
      const res = await api.startCbtExam(exam.id, {
        token,
        device_info: `${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'} on Windows`
      });

      setExamData(res.exam);
      setSession(res.session);
      setQuestions(res.questions);
      setAnswers(res.session.answers || {});
      setRemainingSeconds(res.session.remaining_seconds || res.exam.duration_minutes * 60);
      setViolationCount(res.session.violation_count || 0);

      // Start countdown timer
      startTimer();

      // Setup Socket for live progress & proctor actions
      setupSocketConnection(res.exam.id, res.questions.length);

      // Setup anti-cheat window listeners
      setupAntiCheatListeners(res.exam.id);
    } catch (err) {
      if (err.message.includes('TERKUNCI')) {
        setIsBlocked(true);
      }
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function setupSocketConnection(examId, totalQuestions) {
    const socket = getSocket();
    socket.emit('join_exam', { exam_id: examId, user });

    // Listen to proctor actions from teacher
    socket.off('live_proctor_action');
    socket.on('live_proctor_action', (data) => {
      if (data.student_id === user.id) {
        if (data.action === 'RESET_LOGIN') {
          setIsBlocked(false);
          setViolationCount(0);
          setShowViolationModal(false);
          alert('Ujian Anda telah dibuka kunci (Unlocked) oleh pengawas! Anda dapat melanjutkan pengerjaan.');
        } else if (data.action === 'EXTEND_TIME') {
          const addedSec = (data.minutes || 5) * 60;
          setRemainingSeconds(prev => prev + addedSec);
          alert(`Pengawas telah menambahkan waktu pengerjaan sebesar +${data.minutes || 5} menit!`);
        } else if (data.action === 'FORCE_SUBMIT') {
          alert('Ujian Anda telah dikumpulkan oleh pengawas.');
          handleFinalSubmit();
        }
      }
    });

    // Listen to live announcement broadcast
    socket.off('live_announcement');
    socket.on('live_announcement', (data) => {
      setBroadcastAlert(data);
    });

    // Listen to exam stopped/finished by teacher
    socket.off('exam_status_changed');
    socket.on('exam_status_changed', (data) => {
      if (data.status === 'FINISHED') {
        alert('PERHATIAN: Guru pengawas telah resmi menghentikan ujian ini. Lembar ujian Anda akan dikumpulkan sekarang.');
        handleFinalSubmit();
      }
    });
  }

  function setupAntiCheatListeners(examId) {
    // 1. Detect tab switch or window minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH', 'Terdeteksi berpindah tab atau meminimalkan jendela ujian');
      }
    };

    // 2. Detect window blur
    const handleBlur = () => {
      triggerViolation('TAB_SWITCH', 'Terdeteksi membuka aplikasi lain (Kehilangan fokus layar)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }

  async function triggerViolation(eventType, details) {
    if (isBlocked || examResult) return;

    try {
      const res = await api.reportCbtViolation(examData.id, {
        event_type: eventType,
        details
      });

      setViolationCount(res.violation_count);
      setViolationMessage(details);
      setShowViolationModal(true);

      // Emit live violation via socket to teacher
      const socket = getSocket();
      socket.emit('student_violation', {
        exam_id: examData.id,
        student_id: user.id,
        student_name: user.name,
        event_type: eventType,
        details,
        violation_count: res.violation_count,
        is_blocked: res.is_blocked
      });

      if (res.is_blocked) {
        setIsBlocked(true);
      }
    } catch (err) {
      console.error('Violation error:', err);
    }
  }

  async function handleSelectAnswer(optionId) {
    if (isBlocked) return;
    const currentQ = questions[currentIndex];
    const isDoubtful = answers[currentQ.id]?.doubtful || false;

    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        answer: optionId,
        doubtful: isDoubtful
      }
    };
    setAnswers(newAnswers);

    // Save to server
    try {
      await api.saveCbtAnswer(examData.id, {
        question_id: currentQ.id,
        answer: optionId,
        doubtful: isDoubtful,
        remaining_seconds: remainingSeconds
      });

      // Emit live progress to teacher
      const answeredCount = Object.keys(newAnswers).length;
      const doubtfulCount = Object.values(newAnswers).filter(a => a.doubtful).length;
      const socket = getSocket();
      socket.emit('student_progress', {
        exam_id: examData.id,
        student_id: user.id,
        answered_count: answeredCount,
        total_questions: questions.length,
        doubtful_count: doubtfulCount
      });
    } catch (err) {
      console.error('Save answer error:', err);
    }
  }

  async function handleToggleDoubtful() {
    if (isBlocked) return;
    const currentQ = questions[currentIndex];
    const currentAns = answers[currentQ.id]?.answer || null;
    const currentDoubtful = answers[currentQ.id]?.doubtful || false;

    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        answer: currentAns,
        doubtful: !currentDoubtful
      }
    };
    setAnswers(newAnswers);

    await api.saveCbtAnswer(examData.id, {
      question_id: currentQ.id,
      answer: currentAns,
      doubtful: !currentDoubtful,
      remaining_seconds: remainingSeconds
    });

    // Update socket
    const socket = getSocket();
    socket.emit('student_progress', {
      exam_id: examData.id,
      student_id: user.id,
      answered_count: Object.keys(newAnswers).filter(k => newAnswers[k].answer).length,
      total_questions: questions.length,
      doubtful_count: Object.values(newAnswers).filter(a => a.doubtful).length
    });
  }

  async function handleFinalSubmit() {
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await api.submitCbtExam(examData.id);
      setExamResult(res);

      // Trigger Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Emit submitted via socket
      const socket = getSocket();
      socket.emit('student_submitted', {
        exam_id: examData.id,
        student_id: user.id,
        student_name: user.name,
        score: res.score
      });
    } catch (err) {
      alert('Gagal mengumpulkan ujian: ' + err.message);
    }
  }

  function handleAutoSubmit() {
    alert('Waktu pengerjaan telah habis! Ujian Anda dikumpulkan secara otomatis.');
    handleFinalSubmit();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot green" style={{ width: 24, height: 24, margin: '0 auto 14px' }}></div>
          <h3 style={{ fontWeight: 800 }}>Mempersiapkan Lembar Ujian CBT...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Menghubungkan ke sistem pengawas ujian...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const currentAnswerObj = answers[currentQ.id] || {};
  const answeredCount = Object.keys(answers).filter(k => answers[k].answer).length;
  const doubtfulCount = Object.values(answers).filter(a => a.doubtful).length;

  return (
    <div className="exam-fullscreen-container">
      {/* Exam Topbar */}
      <header className="exam-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (window.confirm('Tinggalkan ruang ujian? Pengerjaan Anda akan tetap tersimpan.')) {
                onFinish();
              }
            }}
          >
            <ArrowLeft size={16} /> Keluar
          </button>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {examData.title}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {user.name} ({user.kelas || 'X-IPA-1'}) • {examData.subject_name}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Countdown Timer */}
          <div
            className="exam-timer-box"
            style={{
              background: 'var(--surface-dark)',
              color: remainingSeconds < 300 ? 'var(--accent)' : '#22c55e',
              borderColor: remainingSeconds < 300 ? 'var(--accent)' : 'rgba(34, 197, 94, 0.4)',
              boxShadow: remainingSeconds < 300
                ? 'inset 0 0 10px rgba(0,0,0,0.8), 0 0 10px rgba(255, 71, 87, 0.4)'
                : 'inset 0 0 10px rgba(0,0,0,0.8), 0 0 10px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Clock size={18} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button className="btn btn-outline btn-sm" onClick={toggleFullscreen} title="Layar Penuh">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            className="btn btn-success"
            onClick={() => setShowSubmitConfirm(true)}
            style={{ fontWeight: 700 }}
          >
            <Send size={15} /> Selesai Ujian
          </button>
        </div>
      </header>

      {/* Broadcast Banner from Teacher */}
      {broadcastAlert && (
        <div style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400e', fontSize: '0.88rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Megaphone size={18} color="#d97706" />
            <span>PENGUMUMAN PENGAWAS: {broadcastAlert.message}</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#92400e' }}
            onClick={() => setBroadcastAlert(null)}
          >
            Tutup [×]
          </button>
        </div>
      )}

      {/* Blocked Screen Overlay (Anti-cheat Triggered) */}
      {isBlocked && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 36, maxWidth: 520, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>
              UJIAN ANDA TERKUNCI!
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5, marginBottom: 20 }}>
              Sistem mendeteksi Anda telah melanggar batas toleransi perpindahan layar (Keluar tab / jendela ujian sebanyak <strong>{violationCount} kali</strong>).
            </p>
            <div style={{ background: '#fef2f2', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#b91c1c', marginBottom: 24 }}>
              Silakan segera menghadap kepada pengawas/guru Anda di kelas untuk meminta pembukaan kunci (Reset Login) secara langsung.
            </div>
          </div>
        </div>
      )}

      {/* Main Content Split: Question Pane + Number Navigation Pane */}
      <div className="exam-content-split">
        {/* Left: Question Card */}
        <div className="exam-question-pane">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                Soal Nomor {currentIndex + 1} dari {questions.length}
              </span>
              <span className="badge badge-neutral">Bobot: {currentQ.points || 10} Poin</span>
            </div>

            <button
              type="button"
              className={`btn btn-sm ${currentAnswerObj.doubtful ? 'btn-warning' : 'btn-outline'}`}
              onClick={handleToggleDoubtful}
            >
              <HelpCircle size={15} />
              {currentAnswerObj.doubtful ? 'Ditandai Ragu-ragu' : 'Ragu-ragu'}
            </button>
          </div>

          {/* Question Text */}
          <div style={{ fontSize: '1.08rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-line' }}>
            {currentQ.question_text}
          </div>

          {/* Options / Essay Input */}
          <div style={{ flex: 1 }}>
            {currentQ.question_type === 'MULTIPLE_CHOICE' ? (
              <div>
                {currentQ.options?.map(opt => {
                  const isSelected = currentAnswerObj.answer === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectAnswer(opt.id)}
                    >
                      <div className="option-circle">{opt.id}</div>
                      <div className="option-text">{opt.text}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Jawaban Esai Anda:</label>
                <textarea
                  className="form-control"
                  rows={6}
                  placeholder="Ketik jawaban esai lengkap Anda di sini..."
                  value={currentAnswerObj.answer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 24 }}>
            <button
              className="btn btn-outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
            >
              <ArrowLeft size={16} /> Soal Sebelumnya
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentIndex(prev => prev + 1)}
              >
                Soal Berikutnya <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-success"
                onClick={() => setShowSubmitConfirm(true)}
              >
                <CheckCircle size={16} /> Selesai & Kumpulkan
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Navigation Matrix */}
        <div className="exam-sidebar-pane">
          <div className="card" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 12 }}>
              Navigasi Nomor Soal
            </h4>

            {/* Questions Grid */}
            <div className="question-nav-grid" style={{ marginBottom: 16 }}>
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = ans && ans.answer;
                const isDoubtful = ans && ans.doubtful;

                let stateClass = '';
                if (isDoubtful) stateClass = 'doubtful';
                else if (isAnswered) stateClass = 'answered';

                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`q-nav-btn ${stateClass} ${isCurrent ? 'current' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: 'var(--success)', borderRadius: 3 }}></span>
                <span>Sudah Dijawab: <strong>{answeredCount}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: 'var(--warning)', borderRadius: 3 }}></span>
                <span>Ragu-ragu: <strong>{doubtfulCount}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 3 }}></span>
                <span>Belum Dijawab: <strong>{questions.length - answeredCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Security Status Box */}
          <div className="card" style={{ padding: 16, background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ShieldAlert size={16} color="var(--primary)" />
              <strong style={{ fontSize: '0.85rem' }}>Proteksi Layar Aktif</strong>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Pelanggaran Layar: <strong>{violationCount} / {examData.max_violations}x</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Modal Warning Anti-Cheat */}
      {showViolationModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ background: '#fee2e2', borderColor: '#fca5a5' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} /> Peringatan Pelanggaran Layar
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#991b1b' }}
                onClick={() => setShowViolationModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#1f2937', marginBottom: 12 }}>
                {violationMessage}
              </p>
              <div style={{ background: '#fef2f2', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#b91c1c' }}>
                Pelanggaran ke: <strong>{violationCount} dari maksimal {examData.max_violations}x</strong>. Jika toleransi habis, layar ujian Anda akan terkunci secara permanen.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => setShowViolationModal(false)}>
                Saya Mengerti & Kembali ke Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Selesai Ujian */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Konfirmasi Pengumpulan Ujian</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowSubmitConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 14 }}>
                Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian ini sekarang?
              </p>

              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <div>Total Soal: <strong>{questions.length}</strong></div>
                <div>Sudah Terjawab: <strong style={{ color: 'var(--success)' }}>{answeredCount}</strong></div>
                <div>Ditandai Ragu-ragu: <strong style={{ color: 'var(--warning)' }}>{doubtfulCount}</strong></div>
                <div>Belum Terjawab: <strong style={{ color: 'var(--danger)' }}>{questions.length - answeredCount}</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSubmitConfirm(false)}>
                Periksa Kembali
              </button>
              <button className="btn btn-success" onClick={handleFinalSubmit}>
                Ya, Kumpulkan Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hasil Ujian (Score & Celebration) */}
      {examResult && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '36px 28px' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={34} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>
                Ujian Berhasil Dikumpulkan! 🎉
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Terima kasih telah menyelesaikan {examData.title}.
              </p>

              <div style={{ background: 'var(--primary-light)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: 24 }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>
                  Perolehan Nilai Akhir CBT
                </span>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                  {examResult.score}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Skor Maksimal: 100 • Tersimpan otomatis ke Buku Nilai
                </span>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={onFinish}
              >
                Kembali ke Dashboard LMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
