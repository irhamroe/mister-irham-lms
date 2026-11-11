import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  PlayCircle,
  FileText,
  Send,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Award,
  FileCheck,
  ArrowRight,
  HelpCircle,
  Eye,
  BarChart3,
  RefreshCw,
  X,
  Check,
  MessageSquare,
  Code2,
  Terminal,
  Play,
  AlertTriangle,
  XCircle,
  CheckSquare,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/AlertContext';
import { api } from '../services/api';
import CodePlayground from '../components/CodePlayground';
import { evaluateLkpdCode, LANGUAGE_CONFIG } from '../services/codeRunnerService';

export default function MaterialsView() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useDialog();

  const isTeacher = user && (user.role === 'guru' || user.role === 'admin');

  // Core Data
  const [materials, setMaterials] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);

  // View Mode for Teacher: 'materials' | 'monitoring'
  const [teacherTab, setTeacherTab] = useState('materials');

  // Study Modal for Student / Teacher Preview
  const [studyModal, setStudyModal] = useState(null); // material object
  const [studyTab, setStudyTab] = useState('content'); // 'content' | 'lkpd'
  const [lkpdAnswer, setLkpdAnswer] = useState('');
  const [lkpdFileUrl, setLkpdFileUrl] = useState('');
  const [isSubmittingLkpd, setIsSubmittingLkpd] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // Student Coding LKPD State
  const [studentCodeLang, setStudentCodeLang] = useState('python');
  const [studentCode, setStudentCode] = useState('');
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [codeEvaluationResult, setCodeEvaluationResult] = useState(null); // { allPassed, results, firstError }

  // Teacher Create / Edit Material Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    order_index: 1,
    class_id: '',
    subject_id: '',
    description: '',
    estimated_time: '45 Menit',
    video_url: '',
    file_url: '',
    content: '',
    has_code_playground: true,
    is_coding_task: false,
    code_language: 'python',
    starter_code: '',
    test_cases: [],
    lkpd_title: '',
    lkpd_instructions: '',
    lkpd_questions: '',
    require_previous: true
  });
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  // Teacher View LKPD Submissions Modal
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [activeMaterialForSubmissions, setActiveMaterialForSubmissions] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Teacher Grade Submission Modal
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Monitoring Progress Data
  const [monitoringData, setMonitoringData] = useState(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);

  // 1. Initial Load: Fetch Classes & Subjects
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cls, subs] = await Promise.all([
          api.getManagementClasses().catch(() => []),
          api.getManagementSubjects().catch(() => [])
        ]);
        setClassesList(cls);
        setSubjectsList(subs);

        if (isTeacher) {
          if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0].id.toString());
          if (subs.length > 0 && !selectedSubjectId) setSelectedSubjectId(subs[0].id.toString());
        } else {
          // Siswa: find matching class
          const myClass = cls.find(c => c.name === user?.kelas);
          if (myClass) setSelectedClassId(myClass.id.toString());
          if (subs.length > 0 && !selectedSubjectId) setSelectedSubjectId(subs[0].id.toString());
        }
      } catch (e) {
        console.warn('Error loading meta for materials:', e);
      }
    }
    loadMeta();
  }, [user, isTeacher]);

  // 2. Fetch Materials on Filter Change
  useEffect(() => {
    loadMaterials();
  }, [selectedClassId, selectedSubjectId, user]);

  async function loadMaterials() {
    setLoading(true);
    try {
      const params = {};
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedSubjectId) params.subject_id = selectedSubjectId;

      const data = await api.getMaterials(params);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed loading materials:', err);
      showToast('error', 'Gagal memuat materi pembelajaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. Load Monitoring Matrix for Teacher
  useEffect(() => {
    if (isTeacher && teacherTab === 'monitoring' && selectedClassId) {
      loadMonitoring();
    }
  }, [isTeacher, teacherTab, selectedClassId, selectedSubjectId]);

  async function loadMonitoring() {
    setLoadingMonitoring(true);
    try {
      const params = { class_id: selectedClassId };
      if (selectedSubjectId) params.subject_id = selectedSubjectId;
      const res = await api.getMaterialsClassProgress(params);
      setMonitoringData(res);
    } catch (err) {
      console.warn('Failed to load monitoring data:', err);
    } finally {
      setLoadingMonitoring(false);
    }
  }

  // Helper: Open Study Modal
  function handleOpenStudy(material) {
    if (!material.is_unlocked && !isTeacher) {
      showToast('warning', material.locked_reason || 'Materi ini masih terkunci.');
      return;
    }
    setStudyModal(material);
    setStudyTab('content');

    const defaultLang = material.code_language || 'python';
    setStudentCodeLang(defaultLang);
    setStudentCode(material.starter_code || LANGUAGE_CONFIG[defaultLang]?.defaultCode || '');
    setCodeEvaluationResult(null);

    if (material.my_submission) {
      setLkpdAnswer(material.my_submission.answer_text || '');
      setLkpdFileUrl(material.my_submission.file_url || '');
    } else {
      setLkpdAnswer('');
      setLkpdFileUrl('');
    }
  }

  // Helper: Student marks material as read
  async function handleMarkRead(materialId) {
    setIsMarkingRead(true);
    try {
      await api.markMaterialRead(materialId);
      showToast('success', 'Materi berhasil ditandai telah dipelajari!');
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, is_read: true } : m));
      if (studyModal && studyModal.id === materialId) {
        setStudyModal(prev => ({ ...prev, is_read: true }));
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsMarkingRead(false);
    }
  }

  // Helper: Student tests LKPD code against test cases
  async function handleTestLkpdCode() {
    if (isTestingCode || !studyModal) return;
    setIsTestingCode(true);
    setCodeEvaluationResult(null);

    try {
      const testCases = studyModal.test_cases || [];
      const evalRes = await evaluateLkpdCode({
        language: studentCodeLang,
        code: studentCode,
        testCases
      });
      setCodeEvaluationResult(evalRes);

      if (evalRes.allPassed) {
        showToast('success', '🎉 Luar biasa! Kode Anda lolos seluruh pengujian tanpa error!');
        // Automatically put code into lkpdAnswer
        const formattedAnswer = `/* KODE SOLUSI LKPD (${studentCodeLang.toUpperCase()}) */\n\n${studentCode}`;
        setLkpdAnswer(formattedAnswer);
      } else {
        showToast('error', evalRes.firstError || 'Kode Anda masih menghasilkan output yang salah atau error.');
      }
    } catch (err) {
      setCodeEvaluationResult({
        allPassed: false,
        results: [],
        firstError: `Error pengujian: ${err.message}`
      });
      showToast('error', 'Error saat menguji kode: ' + err.message);
    } finally {
      setIsTestingCode(false);
    }
  }

  // Helper: Student submits LKPD
  async function handleSubmitLkpd(e) {
    e.preventDefault();
    if (!studyModal) return;

    let finalAnswer = lkpdAnswer;
    if (studyModal.is_coding_task) {
      // If code was tested, make sure answer has the code
      if (!finalAnswer.trim() && studentCode.trim()) {
        finalAnswer = `/* KODE SOLUSI LKPD (${studentCodeLang.toUpperCase()}) */\n\n${studentCode}`;
      }
    }

    if (!finalAnswer.trim() && !lkpdFileUrl.trim()) {
      showToast('warning', 'Silakan isi teks jawaban koding atau lampirkan link dokumen LKPD!');
      return;
    }

    setIsSubmittingLkpd(true);
    try {
      const res = await api.submitLkpd(studyModal.id, {
        answer_text: finalAnswer,
        file_url: lkpdFileUrl
      });
      showToast('success', res.message || 'LKPD berhasil dikumpulkan! Materi berikutnya telah terbuka.');
      await loadMaterials();
      setStudyModal(prev => ({
        ...prev,
        is_read: true,
        is_lkpd_submitted: true,
        is_completed: true,
        my_submission: res.submission
      }));
    } catch (err) {
      showToast('error', 'Gagal mengirim LKPD: ' + err.message);
    } finally {
      setIsSubmittingLkpd(false);
    }
  }

  // Helper: Teacher opens Create/Edit Modal
  function handleOpenCreateModal(m = null) {
    if (m) {
      setEditingMaterial(m);
      setMaterialForm({
        title: m.title || '',
        order_index: m.order_index || 1,
        class_id: m.class_id?.toString() || selectedClassId,
        subject_id: m.subject_id?.toString() || selectedSubjectId,
        description: m.description || '',
        estimated_time: m.estimated_time || '45 Menit',
        video_url: m.video_url || '',
        file_url: m.file_url || '',
        content: m.content || '',
        has_code_playground: m.has_code_playground !== false,
        is_coding_task: Boolean(m.is_coding_task),
        code_language: m.code_language || 'python',
        starter_code: m.starter_code || '',
        test_cases: Array.isArray(m.test_cases) ? m.test_cases : [],
        lkpd_title: m.lkpd_title || '',
        lkpd_instructions: m.lkpd_instructions || '',
        lkpd_questions: m.lkpd_questions || '',
        require_previous: m.require_previous !== false
      });
    } else {
      setEditingMaterial(null);
      const nextIndex = materials.length > 0 ? Math.max(...materials.map(x => Number(x.order_index) || 0)) + 1 : 1;
      setMaterialForm({
        title: `Bab ${nextIndex}: Algoritma & Pemrograman`,
        order_index: nextIndex,
        class_id: selectedClassId || (classesList[0]?.id.toString() || '1'),
        subject_id: selectedSubjectId || (subjectsList[0]?.id.toString() || '7'),
        description: 'Mempelajari logika pemrograman terstruktur dan pengujian program interaktif.',
        estimated_time: '60 Menit',
        video_url: '',
        file_url: '',
        content: `### Algoritma dan Pemrograman
Algoritma adalah langkah logis penyelesaian masalah secara sistematis. Pelajari struktur sintaks, percabangan if-else, dan perulangan.`,
        has_code_playground: true,
        is_coding_task: true,
        code_language: 'python',
        starter_code: `# Tuliskan program Anda di sini:
angka = int(input())

if angka % 2 == 0:
    print("GENAP")
else:
    print("GANJIL")`,
        test_cases: [
          { input: '8', expected_output: 'GENAP', description: 'Uji Coba Angka 8 (Genap)' },
          { input: '15', expected_output: 'GANJIL', description: 'Uji Coba Angka 15 (Ganjil)' }
        ],
        lkpd_title: `LKPD ${nextIndex}: Praktik Koding & Uji Algoritma`,
        lkpd_instructions: 'Kerjakan tantangan koding berikut secara mandiri menggunakan compiler yang disediakan. Program Anda harus lolos seluruh kasus uji.',
        lkpd_questions: 'Buatlah program yang membaca masukan sebuah bilangan bulat, lalu mencetak "GENAP" jika bilangan genap atau "GANJIL" jika bilangan ganjil.',
        require_previous: true
      });
    }
    setShowCreateModal(true);
  }

  // Teacher Saves Material
  async function handleSaveMaterial(e) {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      showToast('warning', 'Judul materi wajib diisi!');
      return;
    }

    setIsSavingMaterial(true);
    try {
      if (editingMaterial) {
        await api.updateMaterial(editingMaterial.id, materialForm);
        showToast('success', 'Materi & LKPD berhasil diperbarui!');
      } else {
        await api.createMaterial(materialForm);
        showToast('success', 'Materi & LKPD baru berhasil dibuat!');
      }
      setShowCreateModal(false);
      loadMaterials();
    } catch (err) {
      showToast('error', 'Gagal menyimpan materi: ' + err.message);
    } finally {
      setIsSavingMaterial(false);
    }
  }

  // Teacher Deletes Material
  async function handleDeleteMaterial(m) {
    const confirmed = await showConfirm({
      title: 'Hapus Materi & LKPD',
      message: `Apakah Anda yakin ingin menghapus "${m.title}"? Data progress dan pengumpulan LKPD siswa pada materi ini juga akan terhapus.`,
      confirmText: 'Ya, Hapus Materi',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.deleteMaterial(m.id);
      showToast('success', 'Materi berhasil dihapus.');
      loadMaterials();
    } catch (err) {
      showToast('error', 'Gagal menghapus materi: ' + err.message);
    }
  }

  // Teacher opens Submissions Modal
  async function handleOpenSubmissions(m) {
    setActiveMaterialForSubmissions(m);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const data = await api.getMaterialSubmissions(m.id);
      setSubmissionsList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', 'Gagal memuat daftar tugas LKPD siswa: ' + err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  // Teacher opens Grading Modal
  function handleOpenGradeModal(sub) {
    setGradingSubmission(sub);
    setGradeScore(sub.score !== null ? sub.score.toString() : '85');
    setGradeFeedback(sub.teacher_feedback || 'Bagus, pengerjaan LKPD Anda sudah sesuai dengan pemahaman konsep.');
  }

  // Teacher saves Grade
  async function handleSaveGrade(e) {
    e.preventDefault();
    if (!gradingSubmission) return;

    setIsSavingGrade(true);
    try {
      await api.gradeLkpdSubmission(gradingSubmission.id, {
        score: Number(gradeScore),
        teacher_feedback: gradeFeedback
      });
      showToast('success', 'Nilai dan masukan LKPD berhasil disimpan!');
      setGradingSubmission(null);
      if (activeMaterialForSubmissions) {
        const updated = await api.getMaterialSubmissions(activeMaterialForSubmissions.id);
        setSubmissionsList(updated);
      }
      loadMaterials();
    } catch (err) {
      showToast('error', 'Gagal menyimpan nilai: ' + err.message);
    } finally {
      setIsSavingGrade(false);
    }
  }

  // Compute Student Progress Stats
  const studentTotalMaterials = materials.length;
  const studentCompletedMaterials = materials.filter(m => m.is_completed).length;
  const studentProgressPercentage = studentTotalMaterials > 0
    ? Math.round((studentCompletedMaterials / studentTotalMaterials) * 100)
    : 0;

  // Helper YouTube Embed converter
  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  }

  return (
    <div className="content-view">
      {/* Top Filter and Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {isTeacher ? (
            <>
              {/* Select Class */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Kelas:</label>
                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: 140 }}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Subject */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Mapel:</label>
                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: 160 }}
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Mode Tabs */}
              <div className="tabs-nav" style={{ marginBottom: 0, padding: 3 }}>
                <button
                  type="button"
                  className={`tab-btn ${teacherTab === 'materials' ? 'active' : ''}`}
                  onClick={() => setTeacherTab('materials')}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  <BookOpen size={14} /> Daftar Materi & LKPD
                </button>
                <button
                  type="button"
                  className={`tab-btn ${teacherTab === 'monitoring' ? 'active' : ''}`}
                  onClick={() => setTeacherTab('monitoring')}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  <BarChart3 size={14} /> Monitoring Progres Siswa
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Siswa Badge */}
              <div className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '0.88rem', fontWeight: 700 }}>
                Kelas {user?.kelas || 'X-8'}
              </div>

              {/* Siswa Subject Filter */}
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 180 }}
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                {subjectsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div>
          {isTeacher && teacherTab === 'materials' && (
            <button className="btn btn-primary" onClick={() => handleOpenCreateModal()}>
              <Plus size={16} /> Tambah Materi & LKPD Baru
            </button>
          )}

          {isTeacher && teacherTab === 'monitoring' && (
            <button className="btn btn-outline" onClick={loadMonitoring} title="Segarkan Data">
              <RefreshCw size={15} /> Muat Ulang Progres
            </button>
          )}
        </div>
      </div>

      {/* STUDENT PROGRESS SUMMARY BANNER */}
      {!isTeacher && (
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: 'white',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
              <Sparkles size={16} /> Alur Belajar Mandiri Bertingkat
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4, marginBottom: 4, color: 'white' }}>
              Progres Pembelajaran Anda: {studentCompletedMaterials} dari {studentTotalMaterials} Bab Selesai
            </h3>
            <p style={{ fontSize: '0.84rem', opacity: 0.92, maxWidth: 540, margin: 0, lineHeight: 1.4 }}>
              Setiap bab memiliki ringkasan materi, compiler interaktif C++ / Python, dan LKPD.
              <strong> Selesaikan materi & tuntaskan LKPD pada bab sebelumnya</strong> untuk membuka bab berikutnya secara otomatis!
            </p>
          </div>

          <div style={{ minWidth: 200, textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
              {studentProgressPercentage}%
            </div>
            <div style={{ width: 180, height: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${studentProgressPercentage}%`, height: '100%', background: '#4ade80', borderRadius: 10, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: 4, display: 'inline-block' }}>
              {studentCompletedMaterials === studentTotalMaterials && studentTotalMaterials > 0 ? '🏆 Seluruh Materi Tuntas!' : 'Lanjutkan materi aktif Anda'}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. VIEW: DAFTAR MATERI & LKPD (SISWA & GURU)
         ======================================================== */}
      {(!isTeacher || teacherTab === 'materials') && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: 10 }} />
              <div>Memuat data materi & LKPD...</div>
            </div>
          ) : materials.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <BookMarked size={42} color="var(--primary)" style={{ opacity: 0.4, marginBottom: 12 }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Belum Ada Materi Pembelajaran
              </h4>
              <p style={{ fontSize: '0.84rem', maxWidth: 440, margin: '0 auto 16px auto' }}>
                {isTeacher
                  ? 'Materi pembelajaran mandiri untuk kelas dan mata pelajaran ini belum dibuat. Klik tombol di bawah untuk menambahkan materi pertama.'
                  : 'Guru Anda belum menerbitkan materi pembelajaran untuk kelas ini.'}
              </p>
              {isTeacher && (
                <button className="btn btn-primary" onClick={() => handleOpenCreateModal()}>
                  <Plus size={16} /> Buat Materi & LKPD Pertama
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {materials.map((mat) => {
                const isUnlocked = isTeacher || mat.is_unlocked;
                const isCompleted = mat.is_completed;

                return (
                  <div
                    key={mat.id}
                    className="card"
                    style={{
                      border: isCompleted
                        ? '1.5px solid #10b981'
                        : isUnlocked
                          ? '1.5px solid var(--primary)'
                          : '1px solid var(--border-color)',
                      background: !isUnlocked ? '#f8fafc' : 'white',
                      opacity: !isUnlocked ? 0.75 : 1,
                      transition: 'all 0.2s ease',
                      padding: 20
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      {/* Left: Icon & Info */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1, minWidth: 280 }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: isCompleted
                            ? '#d1fae5'
                            : isUnlocked
                              ? '#e0f2fe'
                              : '#e2e8f0',
                          color: isCompleted
                            ? '#059669'
                            : isUnlocked
                              ? '#0284c7'
                              : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isCompleted ? (
                            <CheckCircle2 size={26} />
                          ) : isUnlocked ? (
                            <Unlock size={24} />
                          ) : (
                            <Lock size={24} />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className="badge badge-primary" style={{ fontWeight: 800 }}>
                              Urutan #{mat.order_index}
                            </span>
                            <span className="badge badge-neutral">
                              {mat.subject_name || 'INFORMATIKA'}
                            </span>
                            <span className="badge badge-neutral">
                              Kelas {mat.class_name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={13} /> {mat.estimated_time || '45 Menit'}
                            </span>

                            {/* Compiler badge if present */}
                            {(mat.has_code_playground || mat.is_coding_task) && (
                              <span className="badge" style={{ background: '#0f172a', color: '#38bdf8', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Code2 size={12} /> Compiler C++ & Python
                              </span>
                            )}

                            {/* Status Pill for Student */}
                            {!isTeacher && (
                              isCompleted ? (
                                <span className="badge badge-success" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Award size={13} /> Tuntas (LKPD Selesai)
                                </span>
                              ) : isUnlocked ? (
                                <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                                  ● Sedang Berlangsung
                                </span>
                              ) : (
                                <span className="badge badge-neutral" style={{ fontWeight: 700, color: '#dc2626', background: '#fee2e2' }}>
                                  🔒 Terkunci
                                </span>
                              )
                            )}

                            {/* Student's score if graded */}
                            {!isTeacher && mat.my_submission?.score !== null && mat.my_submission?.score !== undefined && (
                              <span className="badge badge-success" style={{ fontWeight: 800 }}>
                                Nilai LKPD: {mat.my_submission.score} / 100
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                            {mat.title}
                          </h3>

                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                            {mat.description || 'Pelajari konsep materi ini secara mendalam dan tuntaskan lembar kerja yang diberikan.'}
                          </p>

                          {!isUnlocked && !isTeacher && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}>
                              <Lock size={14} />
                              {mat.locked_reason || 'Selesaikan materi dan LKPD pada bab sebelumnya untuk membuka materi ini.'}
                            </div>
                          )}

                          {isTeacher && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              <span>📖 Dibaca: <strong>{mat.read_count || 0}</strong> siswa</span>
                              <span>📝 LKPD Masuk: <strong>{mat.submission_count || 0}</strong> siswa</span>
                              <span>✓ Dinilai: <strong>{mat.graded_count || 0}</strong></span>
                              <span>🏆 Tuntas: <strong>{mat.completed_count || 0}</strong> siswa</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {!isTeacher && (
                          <button
                            type="button"
                            className={`btn ${isCompleted ? 'btn-outline' : isUnlocked ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleOpenStudy(mat)}
                            disabled={!isUnlocked}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                          >
                            {isCompleted ? (
                              <><Check size={16} /> Review Materi & LKPD</>
                            ) : isUnlocked ? (
                              <><ArrowRight size={16} /> Buka & Pelajari Materi</>
                            ) : (
                              <><Lock size={15} /> Terkunci</>
                            )}
                          </button>
                        )}

                        {isTeacher && (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                              onClick={() => handleOpenSubmissions(mat)}
                              title="Lihat tugas LKPD yang dikumpulkan siswa"
                            >
                              <FileCheck size={14} /> LKPD Siswa ({mat.submission_count || 0})
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenStudy(mat)}
                              title="Pratinjau Materi Pembelajaran"
                            >
                              <Eye size={14} /> Pratinjau
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenCreateModal(mat)}
                              title="Edit Materi"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteMaterial(mat)}
                              title="Hapus Materi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          2. VIEW: MONITORING PROGRES KELAS (GURU & ADMIN)
         ======================================================== */}
      {isTeacher && teacherTab === 'monitoring' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Monitoring Progres Belajar Mandiri Kelas {monitoringData?.class?.name || selectedClassId}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Pantau progres penuntasan setiap bab dan status penilaian LKPD siswa secara real-time.
              </p>
            </div>
            <span className="badge badge-primary">
              {monitoringData?.rows?.length || 0} Siswa
            </span>
          </div>

          {loadingMonitoring ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
              <div>Memuat matriks progres siswa...</div>
            </div>
          ) : !monitoringData || monitoringData.rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Belum ada data siswa pada kelas ini.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>No</th>
                    <th>Nama Siswa</th>
                    <th style={{ width: 130 }}>NIS</th>
                    <th style={{ textAlign: 'center', width: 160 }}>Progres Kelulusan</th>
                    {monitoringData.materials.map(m => (
                      <th key={m.id} style={{ textAlign: 'center', minWidth: 120 }}>
                        Bab {m.order_index}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitoringData.rows.map((row, idx) => (
                    <tr key={row.student.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {row.student.name}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {row.student.nis_nip || row.student.username}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                            <span>{row.completed_chapters} / {row.total_chapters} Bab</span>
                            <span>{row.progress_percentage}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${row.progress_percentage}%`, height: '100%', background: row.progress_percentage === 100 ? '#10b981' : '#0284c7', borderRadius: 4 }} />
                          </div>
                        </div>
                      </td>
                      {row.chapters.map(ch => (
                        <td key={ch.material_id} style={{ textAlign: 'center' }}>
                          {ch.is_completed ? (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 700 }} title="Selesai membaca & LKPD terkirim">
                              ✓ {ch.score !== null ? `${ch.score}` : 'Tuntas'}
                            </span>
                          ) : ch.is_submitted ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.74rem' }} title="LKPD dikumpulkan, menunggu nilai">
                              LKPD Masuk
                            </span>
                          ) : ch.is_read ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.74rem' }} title="Sudah membaca materi">
                              Membaca
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              -
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. MODAL: RUANG BELAJAR MANDIRI SISWA (STUDY ROOM)
         ======================================================== */}
      {studyModal && (
        <div className="modal-overlay" onClick={() => setStudyModal(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: 940, width: '96%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', padding: '16px 20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge badge-primary" style={{ fontWeight: 800 }}>Bab {studyModal.order_index}</span>
                  <span className="badge badge-neutral">{studyModal.subject_name || 'INFORMATIKA'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><Clock size={12} /> {studyModal.estimated_time}</span>
                  {(studyModal.has_code_playground || studyModal.is_coding_task) && (
                    <span className="badge" style={{ background: '#0f172a', color: '#38bdf8', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Code2 size={12} /> Compiler C++ & Python
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {studyModal.title}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setStudyModal(null)}
                style={{ padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs between Materi & LKPD */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f8fafc', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setStudyTab('content')}
                style={{
                  padding: '12px 18px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: studyTab === 'content' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: studyTab === 'content' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <BookOpen size={16} /> 1. Konten Materi Pembelajaran
                {studyModal.is_read && <CheckCircle2 size={14} color="#10b981" />}
              </button>
              <button
                type="button"
                onClick={() => setStudyTab('lkpd')}
                style={{
                  padding: '12px 18px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: studyTab === 'lkpd' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: studyTab === 'lkpd' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <FileText size={16} /> 2. Lembar Kerja Peserta Didik (LKPD)
                {studyModal.is_completed && <CheckCircle2 size={14} color="#10b981" />}
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* TAB 1: KONTEN MATERI */}
              {studyTab === 'content' && (
                <div>
                  {/* YouTube Video Player Embed if present */}
                  {studyModal.video_url && getYouTubeEmbedUrl(studyModal.video_url) && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--text-main)' }}>
                        <PlayCircle size={16} color="#ef4444" /> Video Pembelajaran Pendukung:
                      </div>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <iframe
                          src={getYouTubeEmbedUrl(studyModal.video_url)}
                          title="Video Pembelajaran"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {/* Reading Material Text Content */}
                  <div style={{
                    background: '#fcfdfd',
                    padding: 20,
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    fontSize: '0.94rem',
                    lineHeight: 1.7,
                    color: '#1e293b',
                    whiteSpace: 'pre-line'
                  }}>
                    {studyModal.content || 'Konten materi belum diisi oleh guru.'}
                  </div>

                  {/* External File Link if present */}
                  {studyModal.file_url && (
                    <div style={{ marginTop: 16 }}>
                      <a
                        href={studyModal.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}
                      >
                        <ExternalLink size={14} /> Buka Modul Pendukung / Slide Google Drive
                      </a>
                    </div>
                  )}

                  {/* INTERACTIVE IN-LESSON COMPILER PLAYGROUND */}
                  {(studyModal.has_code_playground || studyModal.is_coding_task) && (
                    <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1.5px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Code2 size={20} color="var(--primary)" /> Compiler Interaktif (C++ & Python)
                          </h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2, marginBottom: 0 }}>
                            Silakan coba, modifikasi, dan jalankan kode di bawah ini secara langsung untuk memahami konsep algoritma.
                          </p>
                        </div>
                      </div>

                      <CodePlayground
                        initialLanguage={studyModal.code_language || 'python'}
                        initialCode={studyModal.starter_code || ''}
                        title={`Taman Bermain Koding: ${studyModal.title}`}
                        height="300px"
                      />
                    </div>
                  )}

                  {/* Bottom Action for Content */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
                    {!studyModal.is_read ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleMarkRead(studyModal.id)}
                        disabled={isMarkingRead}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Check size={16} /> {isMarkingRead ? 'Menyimpan...' : 'Saya Sudah Selesai Mempelajari Materi Ini'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 700, fontSize: '0.88rem' }}>
                        <CheckCircle2 size={18} /> Materi ini telah Anda pelajari
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (!studyModal.is_read) handleMarkRead(studyModal.id);
                        setStudyTab('lkpd');
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      Lanjut ke Pengerjaan LKPD <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LKPD (LEMBAR KERJA PESERTA DIDIK) */}
              {studyTab === 'lkpd' && (
                <div>
                  <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 20 }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} /> {studyModal.lkpd_title || 'Lembar Kerja Peserta Didik'}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: '#15803d', margin: 0, lineHeight: 1.5 }}>
                      {studyModal.lkpd_instructions || 'Kerjakan tugas LKPD di bawah ini secara mandiri. Setelah dikirim, materi bab berikutnya akan terbuka otomatis.'}
                    </p>
                  </div>

                  {/* LKPD Questions Box */}
                  <div style={{ background: 'white', padding: 18, borderRadius: 8, border: '1.5px solid #e2e8f0', marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckSquare size={16} color="var(--primary)" /> Soal / Tantangan LKPD:
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {studyModal.lkpd_questions || 'Tidak ada butir pertanyaan spesifik. Silakan tuliskan ringkasan pemahaman Anda.'}
                    </div>
                  </div>

                  {/* LKPD CODING CHALLENGE COMPILER SECTION */}
                  {studyModal.is_coding_task && !studyModal.my_submission && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Terminal size={18} color="#0284c7" />
                          Editor Koding LKPD & Auto-Tester ({studentCodeLang.toUpperCase()})
                        </div>

                        {/* Language Selector for LKPD */}
                        <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentCodeLang('python');
                              if (!studentCode || studentCode.includes('#include')) {
                                setStudentCode(studyModal.starter_code || LANGUAGE_CONFIG.python.defaultCode);
                              }
                            }}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 4,
                              border: 'none',
                              background: studentCodeLang === 'python' ? 'var(--primary)' : 'transparent',
                              color: studentCodeLang === 'python' ? 'white' : '#64748b',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Python 3
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentCodeLang('cpp');
                              if (!studentCode || !studentCode.includes('#include')) {
                                setStudentCode(studyModal.starter_code || LANGUAGE_CONFIG.cpp.defaultCode);
                              }
                            }}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 4,
                              border: 'none',
                              background: studentCodeLang === 'cpp' ? 'var(--primary)' : 'transparent',
                              color: studentCodeLang === 'cpp' ? 'white' : '#64748b',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            C++ (GCC)
                          </button>
                        </div>
                      </div>

                      {/* Code Editor */}
                      <div style={{
                        background: '#0f172a',
                        borderRadius: 8,
                        border: '1.5px solid #334155',
                        overflow: 'hidden',
                        marginBottom: 12
                      }}>
                        <div style={{ background: '#1e293b', padding: '8px 14px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            solution.{studentCodeLang === 'cpp' ? 'cpp' : 'py'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Ketikkan solusi koding Anda di bawah ini
                          </span>
                        </div>
                        <textarea
                          rows={10}
                          style={{
                            width: '100%',
                            background: '#090d16',
                            color: '#f8fafc',
                            border: 'none',
                            outline: 'none',
                            padding: '12px 16px',
                            fontFamily: 'Consolas, "Fira Code", monospace',
                            fontSize: '0.88rem',
                            lineHeight: 1.6,
                            tabSize: 4
                          }}
                          value={studentCode}
                          onChange={(e) => setStudentCode(e.target.value)}
                          placeholder={`// Tuliskan kode program ${studentCodeLang.toUpperCase()} Anda...`}
                        />
                      </div>

                      {/* Run / Test Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Klik tombol di sebelah kanan untuk menguji apakah program Anda benar dan bebas error.
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleTestLkpdCode}
                          disabled={isTestingCode}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 800,
                            padding: '8px 18px',
                            background: '#0284c7',
                            borderColor: '#0284c7'
                          }}
                        >
                          <Play size={15} fill="white" />
                          {isTestingCode ? 'Menguji & Memeriksa Kode...' : '▶ Uji & Jalankan Kode LKPD'}
                        </button>
                      </div>

                      {/* EVALUATION RESULTS & ERROR ALERTS */}
                      {codeEvaluationResult && (
                        <div style={{ marginBottom: 18 }}>
                          {/* 1. ALERT IF CODE HAS COMPILATION OR LOGIC ERRORS */}
                          {!codeEvaluationResult.allPassed ? (
                            <div style={{
                              background: '#fef2f2',
                              border: '1.5px solid #ef4444',
                              borderRadius: 8,
                              padding: 16,
                              color: '#991b1b',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.98rem', fontWeight: 800, marginBottom: 6 }}>
                                <XCircle size={20} color="#dc2626" />
                                <span>⚠️ Peringatan: Kode Anda Masih Mengalami Kesalahan!</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', lineHeight: 1.5, color: '#7f1d1d' }}>
                                Program belum berhasil melewati pengujian. Periksa kembali sintaks, variabel, atau logika percabangan/perulangan Anda:
                              </p>

                              {/* Error Explanation Box */}
                              <div style={{
                                background: '#450a0a',
                                color: '#fecaca',
                                padding: 12,
                                borderRadius: 6,
                                fontFamily: 'Consolas, monospace',
                                fontSize: '0.82rem',
                                whiteSpace: 'pre-line',
                                lineHeight: 1.5,
                                marginBottom: 12
                              }}>
                                {codeEvaluationResult.firstError}
                              </div>

                              {/* Test Cases Comparison Details */}
                              {codeEvaluationResult.results && codeEvaluationResult.results.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>
                                    Detail Hasil Kasus Uji:
                                  </div>
                                  {codeEvaluationResult.results.map((res, i) => (
                                    <div key={i} style={{
                                      background: res.passed ? '#f0fdf4' : '#fee2e2',
                                      border: `1px solid ${res.passed ? '#86efac' : '#fca5a5'}`,
                                      borderRadius: 6,
                                      padding: '8px 12px',
                                      fontSize: '0.82rem'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <strong>{res.description}</strong>
                                        <span className={`badge ${res.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                                          {res.passed ? '✓ Lolos' : '✗ Salah'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
                                        <div>Masukan (Input): <code style={{ color: '#0f172a' }}>{res.input}</code></div>
                                        <div>Output Diharapkan: <code style={{ color: '#166534', fontWeight: 700 }}>{res.expectedOutput}</code></div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                          Output Kode Anda: <code style={{ color: res.passed ? '#166534' : '#b91c1c', fontWeight: 700 }}>{res.actualOutput}</code>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* 2. ALERT IF ALL TESTS PASSED SUCCESSFULLY */
                            <div style={{
                              background: '#f0fdf4',
                              border: '1.5px solid #10b981',
                              borderRadius: 8,
                              padding: 16,
                              color: '#065f46',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>
                                <CheckCircle2 size={22} color="#059669" />
                                <span>🎉 Luar Biasa! Kode Anda Lolos Seluruh Pengujian & Bebas Error!</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                                Program telah berhasil dieksekusi dengan benar dan menghasilkan output yang tepat untuk seluruh kasus uji. 
                                Kode Anda telah disalin secara otomatis ke formulir pengumpulan. Silakan klik tombol <strong>"Kirim Jawaban LKPD"</strong> di bawah untuk menuntaskan materi ini!
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submission Form / Status */}
                  {studyModal.my_submission ? (
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0f172a' }}>
                          <CheckCircle2 size={18} color="#10b981" /> Status: LKPD Berhasil Dikumpulkan
                        </div>
                        {studyModal.my_submission.score !== null ? (
                          <span className="badge badge-success" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                            Nilai: {studyModal.my_submission.score} / 100
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.78rem' }}>
                            Menunggu Penilaian Guru
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                        Dikumpulkan pada: {new Date(studyModal.my_submission.submitted_at).toLocaleString('id-ID')}
                      </div>

                      <div style={{ background: 'white', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.88rem', whiteSpace: 'pre-line', marginBottom: 10 }}>
                        <strong>Jawaban / Solusi Kode Anda:</strong>
                        <div style={{ marginTop: 4, fontFamily: studyModal.is_coding_task ? 'monospace' : 'inherit' }}>
                          {studyModal.my_submission.answer_text}
                        </div>
                      </div>

                      {studyModal.my_submission.file_url && (
                        <div style={{ fontSize: '0.84rem', marginTop: 8 }}>
                          <strong>Tautan Lampiran:</strong>{' '}
                          <a href={studyModal.my_submission.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                            {studyModal.my_submission.file_url}
                          </a>
                        </div>
                      )}

                      {studyModal.my_submission.teacher_feedback && (
                        <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: 6, fontSize: '0.84rem' }}>
                          <div style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MessageSquare size={14} /> Masukan dari Guru ({studyModal.my_submission.graded_by || 'Guru Pengampu'}):
                          </div>
                          <div style={{ color: '#78350f', marginTop: 4 }}>
                            {studyModal.my_submission.teacher_feedback}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitLkpd}>
                      <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          {studyModal.is_coding_task ? 'Solusi Kode & Uraian Jawaban LKPD Anda' : 'Lembar Jawaban / Analisis LKPD Anda'} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={6}
                          placeholder={studyModal.is_coding_task ? 'Ketikkan atau uji kode program Anda di atas untuk mengisi jawaban ini...' : 'Ketik jawaban lengkap dan uraian pemecahan masalah Anda di sini...'}
                          value={lkpdAnswer}
                          onChange={(e) => setLkpdAnswer(e.target.value)}
                          required
                          style={{ fontFamily: studyModal.is_coding_task ? 'Consolas, monospace' : 'inherit' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">
                          Tautan Dokumen Pendukung / Google Drive (Opsional)
                        </label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://drive.google.com/..."
                          value={lkpdFileUrl}
                          onChange={(e) => setLkpdFileUrl(e.target.value)}
                        />
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Pastikan link Google Drive Anda diatur ke "Anyone with link can view" jika melampirkan file dokumen.
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isSubmittingLkpd}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '10px 20px' }}
                        >
                          <Send size={16} /> {isSubmittingLkpd ? 'Mengirimkan...' : 'Kirim Jawaban LKPD & Buka Materi Berikutnya'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. MODAL: GURU MEMBUAT / MENGEDIT MATERI & LKPD
         ======================================================== */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !isSavingMaterial && setShowCreateModal(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: 840, width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingMaterial ? 'Edit Materi & LKPD' : 'Tambah Materi Pembelajaran & LKPD Baru'}
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Kelas Sasaran</label>
                    <select
                      className="form-control"
                      value={materialForm.class_id}
                      onChange={(e) => setMaterialForm({ ...materialForm, class_id: e.target.value })}
                      required
                    >
                      {classesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mata Pelajaran</label>
                    <select
                      className="form-control"
                      value={materialForm.subject_id}
                      onChange={(e) => setMaterialForm({ ...materialForm, subject_id: e.target.value })}
                      required
                    >
                      {subjectsList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Urutan Bab</label>
                    <input
                      type="number"
                      className="form-control"
                      value={materialForm.order_index}
                      onChange={(e) => setMaterialForm({ ...materialForm, order_index: e.target.value })}
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Materi Pembelajaran <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Bab 2: Algoritma dan Pemrograman Dasar"
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Deskripsi / Pengantar Singkat</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ringkasan kompetensi pokok bahasan materi..."
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estimasi Waktu Belajar</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: 60 Menit"
                      value={materialForm.estimated_time}
                      onChange={(e) => setMaterialForm({ ...materialForm, estimated_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Konten Materi Lengkap (Teks / Rangkuman / Narasi Belajar) <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Tuliskan materi pembelajaran terstruktur di sini..."
                    value={materialForm.content}
                    onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tautan Video YouTube (Opsional)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={materialForm.video_url}
                      onChange={(e) => setMaterialForm({ ...materialForm, video_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tautan Modul PDF / Slide Google Drive (Opsional)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://drive.google.com/..."
                      value={materialForm.file_url}
                      onChange={(e) => setMaterialForm({ ...materialForm, file_url: e.target.value })}
                    />
                  </div>
                </div>

                {/* CODING & COMPILER OPTIONS */}
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1.5px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Code2 size={18} color="var(--primary)" /> Pengaturan Compiler C++ & Python
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={materialForm.has_code_playground}
                        onChange={(e) => setMaterialForm({ ...materialForm, has_code_playground: e.target.checked })}
                      />
                      <span>Tampilkan Kotak Compiler Interaktif pada Konten Materi Pembelajaran</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={materialForm.is_coding_task}
                        onChange={(e) => setMaterialForm({ ...materialForm, is_coding_task: e.target.checked })}
                      />
                      <span>Gunakan Compiler Koding & Auto-Tester pada LKPD ini</span>
                    </label>
                  </div>

                  {materialForm.is_coding_task && (
                    <div style={{ background: 'white', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Bahasa Utama Tantangan Koding:</label>
                        <select
                          className="form-control"
                          value={materialForm.code_language}
                          onChange={(e) => setMaterialForm({ ...materialForm, code_language: e.target.value })}
                        >
                          <option value="python">Python 3</option>
                          <option value="cpp">C++ (GCC)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Starter Code (Template Awal Siswa):</label>
                        <textarea
                          rows={4}
                          className="form-control"
                          style={{ fontFamily: 'Consolas, monospace', fontSize: '0.82rem' }}
                          value={materialForm.starter_code}
                          onChange={(e) => setMaterialForm({ ...materialForm, starter_code: e.target.value })}
                          placeholder="# Tuliskan kerangka kode yang harus dilengkapi siswa..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />

                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={18} color="var(--primary)" /> Lembar Kerja Peserta Didik (LKPD) Terintegrasi
                </div>

                <div className="form-group">
                  <label className="form-label">Judul LKPD</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: LKPD 2: Praktik Percabangan & Perulangan"
                    value={materialForm.lkpd_title}
                    onChange={(e) => setMaterialForm({ ...materialForm, lkpd_title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Petunjuk Teknis Pengerjaan LKPD</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Instruksi pengerjaan bagi siswa..."
                    value={materialForm.lkpd_instructions}
                    onChange={(e) => setMaterialForm({ ...materialForm, lkpd_instructions: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pertanyaan / Lembar Soal LKPD</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Tuliskan daftar pertanyaan atau tantangan koding yang harus diselesaikan siswa..."
                    value={materialForm.lkpd_questions}
                    onChange={(e) => setMaterialForm({ ...materialForm, lkpd_questions: e.target.value })}
                  />
                </div>

                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={materialForm.require_previous}
                      onChange={(e) => setMaterialForm({ ...materialForm, require_previous: e.target.checked })}
                    />
                    <span>Kunci materi ini hingga siswa menyelesaikan materi & LKPD pada bab sebelumnya (Sequential Learning)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingMaterial}>
                  {isSavingMaterial ? 'Menyimpan...' : (editingMaterial ? 'Simpan Perubahan Materi' : 'Terbitkan Materi & LKPD')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          5. MODAL: GURU MELIHAT SUBMISI LKPD SISWA
         ======================================================== */}
      {showSubmissionsModal && activeMaterialForSubmissions && (
        <div className="modal-overlay" onClick={() => setShowSubmissionsModal(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: 840, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Pengumpulan LKPD: {activeMaterialForSubmissions.title}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Total {submissionsList.length} siswa telah mengumpulkan LKPD ini.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowSubmissionsModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              {loadingSubmissions ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                  <div>Memuat data pengumpulan...</div>
                </div>
              ) : submissionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Belum ada siswa yang mengumpulkan tugas LKPD untuk materi ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submissionsList.map(sub => (
                    <div
                      key={sub.id}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {sub.user_name}
                          </strong>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            NIS: {sub.student_nis}
                          </span>
                          {sub.status === 'GRADED' ? (
                            <span className="badge badge-success" style={{ fontWeight: 800 }}>
                              Nilai: {sub.score} / 100
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                              Perlu Dinilai
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                          Dikumpulkan: {new Date(sub.submitted_at).toLocaleString('id-ID')}
                        </div>

                        <div style={{ background: 'white', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem', whiteSpace: 'pre-line', marginBottom: 6, fontFamily: sub.answer_text?.includes('/* KODE') || sub.answer_text?.includes('cout') || sub.answer_text?.includes('print') ? 'monospace' : 'inherit' }}>
                          {sub.answer_text}
                        </div>

                        {sub.file_url && (
                          <div style={{ fontSize: '0.8rem' }}>
                            <a href={sub.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <ExternalLink size={12} /> Buka Tautan Dokumen Lampiran Siswa
                            </a>
                          </div>
                        )}

                        {sub.teacher_feedback && (
                          <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#854d0e', fontStyle: 'italic' }}>
                            Masukan Guru: "{sub.teacher_feedback}"
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'center' }}
                        onClick={() => handleOpenGradeModal(sub)}
                      >
                        <Award size={14} /> {sub.status === 'GRADED' ? 'Ubah Nilai' : 'Beri Nilai LKPD'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: GURU MEMBERI NILAI LKPD
         ======================================================== */}
      {gradingSubmission && (
        <div className="modal-overlay" onClick={() => setGradingSubmission(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: 520, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Penilaian LKPD: {gradingSubmission.user_name}
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setGradingSubmission(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Nilai Skor (0 - 100) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={100}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Umpan Balik / Catatan Evaluasi Guru</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Tuliskan apresiasi atau saran perbaikan pemahaman materi..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setGradingSubmission(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingGrade}>
                  {isSavingGrade ? 'Menyimpan...' : 'Simpan Nilai LKPD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
