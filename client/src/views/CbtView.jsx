import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Play,
  MonitorPlay,
  Clock,
  Key,
  ShieldAlert,
  Layers,
  FileQuestion,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  StopCircle,
  PlayCircle,
  Trash2,
  CheckSquare,
  Bookmark,
  Download,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function CbtView({ onStartExam, onOpenMonitor }) {
  const { user, classes, subjects } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    class_id: '',
    subject_id: '',
    title: '',
    description: '',
    token: 'CBT2026',
    duration_minutes: 45,
    randomize_questions: 1,
    randomize_options: 1,
    max_violations: 3
  });

  // Student Token Modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [targetExam, setTargetExam] = useState(null);
  const [enteredToken, setEnteredToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Question bank view & add modal
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [activeExamQuestions, setActiveExamQuestions] = useState(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    question_text: '',
    question_type: 'MULTIPLE_CHOICE',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correct_answer: 'A',
    points: 10,
    explanation: ''
  });

  // Master Question Bank integration states
  const [showImportBankModal, setShowImportBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';

  useEffect(() => {
    loadExams();
  }, [user]);

  async function loadExams() {
    try {
      setLoading(true);
      const data = await api.getCbtExams();
      setExams(data);
    } catch (err) {
      console.error('Load CBT exams error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExam(e) {
    e.preventDefault();
    try {
      await api.createCbtExam({
        ...createForm,
        class_id: Number(createForm.class_id || classes[0]?.id),
        subject_id: Number(createForm.subject_id || subjects[0]?.id)
      });
      setShowCreateModal(false);
      loadExams();
      alert('Ujian CBT baru berhasil dibuat!');
    } catch (err) {
      alert('Gagal membuat ujian: ' + err.message);
    }
  }

  async function handleOpenQuestionBank(exam) {
    try {
      const data = await api.getCbtExamDetails(exam.id);
      setActiveExamQuestions(data);
      setShowAddQuestionForm(false);
      setShowQuestionsModal(true);
    } catch (err) {
      alert('Gagal memuat bank soal: ' + err.message);
    }
  }

  async function handleToggleExamStatus(examId, nextStatus) {
    const isStopping = nextStatus === 'FINISHED';
    const confirmMsg = isStopping
      ? 'Hentikan / Tutup ujian ini sekarang? Siswa tidak akan dapat masuk atau mengerjakan ujian lagi.'
      : 'Aktifkan ujian ini sekarang? Siswa di kelas terkait akan dapat mulai mengerjakan.';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateCbtExamStatus(examId, nextStatus);
      alert(isStopping ? 'Ujian berhasil dihentikan!' : 'Ujian berhasil diaktifkan!');
      loadExams();
    } catch (err) {
      alert('Gagal mengubah status ujian: ' + err.message);
    }
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    if (!activeExamQuestions) return;

    try {
      let options = [];
      if (newQuestionForm.question_type === 'MULTIPLE_CHOICE') {
        options = [
          { id: 'A', text: newQuestionForm.optionA },
          { id: 'B', text: newQuestionForm.optionB },
          { id: 'C', text: newQuestionForm.optionC },
          { id: 'D', text: newQuestionForm.optionD }
        ];
        if (newQuestionForm.optionE?.trim()) {
          options.push({ id: 'E', text: newQuestionForm.optionE });
        }
      }

      await api.addCbtQuestion(activeExamQuestions.exam.id, {
        question_text: newQuestionForm.question_text,
        question_type: newQuestionForm.question_type,
        options,
        correct_answer: newQuestionForm.correct_answer,
        points: Number(newQuestionForm.points) || 10,
        explanation: newQuestionForm.explanation
      });

      // Reload exam questions in modal
      const refreshed = await api.getCbtExamDetails(activeExamQuestions.exam.id);
      setActiveExamQuestions(refreshed);
      loadExams();

      // Reset form
      setNewQuestionForm({
        question_text: '',
        question_type: 'MULTIPLE_CHOICE',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correct_answer: 'A',
        points: 10,
        explanation: ''
      });
      setShowAddQuestionForm(false);
      alert('Butir soal baru berhasil ditambahkan ke ujian!');
    } catch (err) {
      alert('Gagal menambahkan butir soal: ' + err.message);
    }
  }

  async function handleDeleteQuestion(questionId) {
    if (!window.confirm('Hapus butir soal ini dari ujian?')) return;
    try {
      await api.deleteCbtQuestion(questionId);
      const refreshed = await api.getCbtExamDetails(activeExamQuestions.exam.id);
      setActiveExamQuestions(refreshed);
      loadExams();
      alert('Butir soal berhasil dihapus');
    } catch (err) {
      alert('Gagal menghapus soal: ' + err.message);
    }
  }

  async function handleOpenImportFromBank() {
    if (!activeExamQuestions?.exam) return;
    setLoadingBank(true);
    setShowImportBankModal(true);
    setSelectedBankIds([]);
    try {
      const data = await api.getQuestionBank();
      setBankQuestions(data || []);
    } catch (err) {
      alert('Gagal memuat Bank Soal Master: ' + err.message);
    } finally {
      setLoadingBank(false);
    }
  }

  async function handleConfirmImportFromBank() {
    if (selectedBankIds.length === 0) {
      alert('Pilih minimal 1 butir soal dari Bank Soal Master!');
      return;
    }
    try {
      const res = await api.exportQuestionBankToExam({
        exam_id: activeExamQuestions.exam.id,
        question_ids: selectedBankIds
      });
      alert(res.message || 'Soal berhasil diimpor ke ujian ini!');
      setShowImportBankModal(false);
      const refreshed = await api.getCbtExamDetails(activeExamQuestions.exam.id);
      setActiveExamQuestions(refreshed);
      loadExams();
    } catch (err) {
      alert('Gagal mengimpor butir soal: ' + err.message);
    }
  }

  async function handleSaveQuestionToBank(questionId) {
    try {
      const res = await api.saveExamQuestionToBank(questionId);
      alert(res.message || 'Butir soal berhasil disimpan ke Bank Soal Master!');
    } catch (err) {
      alert('Gagal menyimpan ke Bank Soal: ' + err.message);
    }
  }

  function handleStudentClickStart(exam) {
    setTargetExam(exam);
    setEnteredToken('');
    setTokenError('');
    setShowTokenModal(true);
  }

  function handleVerifyAndStart(e) {
    e.preventDefault();
    if (enteredToken.trim().toUpperCase() !== targetExam.token.toUpperCase()) {
      setTokenError('Token yang Anda masukkan tidak cocok! Periksa kembali atau tanyakan ke pengawas.');
      return;
    }
    setShowTokenModal(false);
    onStartExam(targetExam, enteredToken.trim().toUpperCase());
  }

  return (
    <div className="content-view">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Daftar Ujian Computer-Based Test (CBT)</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Pelaksanaan ujian daring dengan pengacakan butir soal dan proteksi anti-kecurangan real-time.
          </p>
        </div>

        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Buat Ujian CBT Baru
          </button>
        )}
      </div>

      {/* CBT Exams Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {exams.map(exam => {
          const isSubmitted = exam.my_session?.status === 'SUBMITTED';
          const isBlocked = exam.my_session?.status === 'BLOCKED';
          const isInProgress = exam.my_session?.status === 'IN_PROGRESS';

          return (
            <div key={exam.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {exam.subject_name} • Kelas {exam.class_name}
                  </span>
                  <span className={`badge ${exam.status === 'ACTIVE' ? 'badge-success' : exam.status === 'FINISHED' ? 'badge-danger' : 'badge-neutral'}`}>
                    {exam.status === 'ACTIVE' ? '🟢 Ujian Aktif' : exam.status === 'FINISHED' ? '🔴 Ujian Ditutup / Selesai' : '⚪ Draft'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8, lineHeight: 1.3 }}>
                  {exam.title}
                </h3>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 14, minHeight: 40 }}>
                  {exam.description || 'Tidak ada deskripsi tambahan.'}
                </p>

                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', marginBottom: 16 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Durasi Pengerjaan</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {exam.duration_minutes} Menit
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Token Ujian</span>
                    <strong style={{ letterSpacing: '1px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Key size={13} /> {exam.token}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Jumlah Butir Soal</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileQuestion size={13} /> {exam.question_count || 0} Soal
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Toleransi Layar</span>
                    <strong style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={13} /> Maks {exam.max_violations}x
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {isTeacher ? (
                  <>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenQuestionBank(exam)}
                        title="Kelola & Tambah Butir Soal"
                      >
                        <Layers size={14} /> Bank Soal
                      </button>

                      {exam.status === 'ACTIVE' ? (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                          onClick={() => handleToggleExamStatus(exam.id, 'FINISHED')}
                          title="Hentikan pengerjaan ujian sekarang"
                        >
                          <StopCircle size={14} /> Hentikan Ujian
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--success)', borderColor: '#a7f3d0' }}
                          onClick={() => handleToggleExamStatus(exam.id, 'ACTIVE')}
                          title="Buka / Aktifkan kembali ujian"
                        >
                          <PlayCircle size={14} /> Aktifkan Ujian
                        </button>
                      )}
                    </div>

                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => onOpenMonitor(exam)}
                      style={{ fontWeight: 700 }}
                    >
                      <MonitorPlay size={15} /> Live Monitor
                    </button>
                  </>
                ) : (
                  <>
                    {isSubmitted ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span className="badge badge-success" style={{ padding: '6px 12px' }}>
                          <CheckCircle size={14} /> Selesai Dikerjakan
                        </span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                          Skor: {exam.my_session.score} / 100
                        </div>
                      </div>
                    ) : isBlocked ? (
                      <div style={{ width: '100%', background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
                        Terkunci! Terdeteksi Pelanggaran Layar
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => handleStudentClickStart(exam)}
                      >
                        <Play size={16} fill="currentColor" />
                        {isInProgress ? 'Lanjutkan Pengerjaan Ujian' : 'Mulai Kerjakan Ujian'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Masukkan Token Ujian (Student) */}
      {showTokenModal && targetExam && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Konfirmasi Masuk Ujian CBT</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowTokenModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleVerifyAndStart}>
              <div className="modal-body">
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ width: 52, height: 52, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Key size={26} />
                  </div>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{targetExam.title}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Durasi: {targetExam.duration_minutes} Menit • Toleransi Ganti Tab: {targetExam.max_violations}x
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                    Masukkan Token Ujian dari Pengawas:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: CBT2026"
                    style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase' }}
                    value={enteredToken}
                    onChange={(e) => {
                      setEnteredToken(e.target.value);
                      setTokenError('');
                    }}
                    autoFocus
                    required
                  />
                </div>

                {tokenError && (
                  <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> {tokenError}
                  </div>
                )}

                <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e', marginTop: 14 }}>
                  ⚠️ <strong>Peringatan Anti-Kecurangan:</strong> Selama ujian, dilarang membuka tab browser lain, aplikasi chat, atau keluar dari jendela ujian. Setiap perpindahan layar terpantau secara langsung oleh pengawas ujian.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTokenModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Mulai Ujian Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bank Soal (Teacher) */}
      {showQuestionsModal && activeExamQuestions && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Bank Butir Soal Ujian</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {activeExamQuestions.exam.title} ({activeExamQuestions.questions.length} Butir Soal)
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isTeacher && (
                  <>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleOpenImportFromBank}
                      title="Ambil butir soal dari Bank Soal Master untuk diujikan pada ujian kelas ini"
                      style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 600 }}
                    >
                      <Layers size={14} /> Ambil dari Bank Master
                    </button>
                    <button
                      className={`btn ${showAddQuestionForm ? 'btn-outline' : 'btn-primary'} btn-sm`}
                      onClick={() => setShowAddQuestionForm(prev => !prev)}
                    >
                      <Plus size={14} /> {showAddQuestionForm ? 'Tutup Form Input' : 'Tambah Butir Soal Baru'}
                    </button>
                  </>
                )}
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                  onClick={() => setShowQuestionsModal(false)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Form Input Soal Baru */}
              {showAddQuestionForm && (
                <div style={{ background: 'var(--primary-light)', padding: 18, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--primary)', marginBottom: 20 }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Input Butir Soal Ujian Baru
                  </h4>
                  <form onSubmit={handleAddQuestion}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Tipe Soal</label>
                        <select
                          className="form-control"
                          value={newQuestionForm.question_type}
                          onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_type: e.target.value })}
                        >
                          <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                          <option value="ESSAY">Esai / Uraian</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bobot Poin</label>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          value={newQuestionForm.points}
                          onChange={(e) => setNewQuestionForm({ ...newQuestionForm, points: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teks Pertanyaan / Soal</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Tuliskan pertanyaan / butir soal di sini..."
                        value={newQuestionForm.question_text}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_text: e.target.value })}
                        required
                      />
                    </div>

                    {newQuestionForm.question_type === 'MULTIPLE_CHOICE' && (
                      <div style={{ marginBottom: 14 }}>
                        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                          Opsi Jawaban & Tandai Kunci Benar:
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {['A', 'B', 'C', 'D', 'E'].map(optKey => (
                            <div key={optKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: newQuestionForm.correct_answer === optKey ? 'var(--success)' : '#e2e8f0',
                                color: newQuestionForm.correct_answer === optKey ? 'white' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}>
                                {optKey}
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder={`Teks opsi jawaban ${optKey}... ${optKey === 'E' ? '(Opsional)' : ''}`}
                                value={newQuestionForm[`option${optKey}`]}
                                onChange={(e) => setNewQuestionForm({ ...newQuestionForm, [`option${optKey}`]: e.target.value })}
                                required={optKey !== 'E'}
                              />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                <input
                                  type="radio"
                                  name="cbt_correct_ans"
                                  checked={newQuestionForm.correct_answer === optKey}
                                  onChange={() => setNewQuestionForm({ ...newQuestionForm, correct_answer: optKey })}
                                />
                                Kunci
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Pembahasan / Catatan Penilaian (Opsional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Penjelasan langkah penyelesaian..."
                        value={newQuestionForm.explanation}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddQuestionForm(false)}>
                        Batal
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Simpan Soal ke Bank Ujian
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Daftar Soal */}
              {activeExamQuestions.questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Belum ada soal pada ujian ini. Silakan klik tombol <strong>"+ Tambah Butir Soal Baru"</strong> di atas untuk memasukkan soal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activeExamQuestions.questions.map((q, idx) => (
                    <div key={q.id} style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="badge badge-primary">Soal No. {idx + 1} ({q.question_type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-neutral">Bobot: {q.points} Poin</span>
                          {isTeacher && (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--primary)', borderColor: '#c7d2fe', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => handleSaveQuestionToBank(q.id)}
                                title="Simpan butir soal ini ke Bank Soal Master agar bisa digunakan di kelas lain"
                              >
                                <Bookmark size={12} /> Ke Bank Master
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--danger)', padding: '2px 8px' }}
                                onClick={() => handleDeleteQuestion(q.id)}
                                title="Hapus Soal"
                              >
                                <Trash2 size={13} /> Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 12, whiteSpace: 'pre-line' }}>
                        {q.question_text}
                      </p>

                      {q.options?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                          {q.options.map(opt => (
                            <div
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-xs)',
                                background: opt.id === q.correct_answer ? 'var(--success-light)' : 'white',
                                border: opt.id === q.correct_answer ? '1.5px solid var(--success)' : '1px solid var(--border-color)',
                                fontSize: '0.85rem'
                              }}
                            >
                              <strong style={{ width: 22, height: 22, borderRadius: '50%', background: opt.id === q.correct_answer ? 'var(--success)' : '#e2e8f0', color: opt.id === q.correct_answer ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                {opt.id}
                              </strong>
                              <span>{opt.text}</span>
                              {opt.id === q.correct_answer && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>Kunci Jawaban</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.explanation && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'white', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px dashed var(--border-color)' }}>
                          <strong>Pembahasan:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowQuestionsModal(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Ujian Baru (Teacher) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Buat Ujian CBT Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateExam}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select
                      className="form-control"
                      value={createForm.class_id}
                      onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value })}
                      required
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mata Pelajaran</label>
                    <select
                      className="form-control"
                      value={createForm.subject_id}
                      onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama / Judul Ujian</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Asesmen Sumatif Akhir Semester: Matematika"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi & Peraturan Ujian</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Petunjuk dan peringatan tata tertib ujian..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Token Ujian</label>
                    <input
                      type="text"
                      className="form-control"
                      value={createForm.token}
                      onChange={(e) => setCreateForm({ ...createForm, token: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durasi (Menit)</label>
                    <input
                      type="number"
                      min="5"
                      className="form-control"
                      value={createForm.duration_minutes}
                      onChange={(e) => setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Toleransi Layar</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={createForm.max_violations}
                      onChange={(e) => setCreateForm({ ...createForm, max_violations: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Buat Ujian CBT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ambil Soal dari Bank Soal Master */}
      {showImportBankModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color="var(--primary)" /> Ambil Soal dari Bank Soal Master
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Tambahkan butir-butir soal yang pernah Anda buat ke ujian: <strong>{activeExamQuestions?.exam?.title}</strong>
                </p>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowImportBankModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingBank ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Memuat Bank Soal Master...
                </div>
              ) : bankQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Belum ada soal di Bank Soal Master. Silakan tambahkan soal melalui menu Bank Soal.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        id="selectAllBankCheck"
                        checked={selectedBankIds.length === bankQuestions.length}
                        onChange={() => {
                          if (selectedBankIds.length === bankQuestions.length) {
                            setSelectedBankIds([]);
                          } else {
                            setSelectedBankIds(bankQuestions.map(q => q.id));
                          }
                        }}
                      />
                      <label htmlFor="selectAllBankCheck" style={{ fontWeight: 700, cursor: 'pointer' }}>
                        Pilih Semua ({bankQuestions.length} butir tersedia di Bank Soal)
                      </label>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {selectedBankIds.length} Soal Terpilih
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bankQuestions.map(bq => {
                      const isChecked = selectedBankIds.includes(bq.id);
                      return (
                        <div
                          key={bq.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedBankIds(prev => prev.filter(x => x !== bq.id));
                            } else {
                              setSelectedBankIds(prev => [...prev, bq.id]);
                            }
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: isChecked ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isChecked ? 'var(--primary-subtle, #f0f4ff)' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by row click
                            style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{bq.subject_name}</span>
                              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{bq.grade_level || 'Semua'}</span>
                              {bq.topic && (
                                <span className="badge" style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#334155' }}>
                                  {bq.topic}
                                </span>
                              )}
                              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                                {bq.question_type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'} ({bq.points} Poin)
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                              {bq.question_text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImportBankModal(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmImportFromBank}
                disabled={selectedBankIds.length === 0}
              >
                <Download size={15} /> Masukkan {selectedBankIds.length} Soal ke Ujian Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
