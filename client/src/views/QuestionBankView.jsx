import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Send,
  Download,
  Trash2,
  Edit3,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Sparkles,
  Flame,
  Award,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  School,
  Share2,
  Copy,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function QuestionBankView({ onNavigateToCbt }) {
  const { user } = useAuth();
  const isTeacher = user && (user.role === 'guru' || user.role === 'admin');

  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expanded state for Judul Soal (Package titles)
  const [expandedTitles, setExpandedTitles] = useState({});

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Semua');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Semua');
  const [selectedType, setSelectedType] = useState('Semua');

  // Multi-select for bulk action
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Export form
  const [targetExamId, setTargetExamId] = useState('');
  const [exportingSingleId, setExportingSingleId] = useState(null);
  const [exportingPackageTitle, setExportingPackageTitle] = useState('');

  // Sync form
  const [syncExamId, setSyncExamId] = useState('');

  // Create / Edit Question Form
  const [questionForm, setQuestionForm] = useState({
    subject_id: '',
    grade_level: 'Kelas X',
    topic: '',
    question_text: '',
    question_type: 'MULTIPLE_CHOICE',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correct_answer: 'A',
    points: 10,
    explanation: '',
    difficulty: 'SEDANG',
    source_exam_title: 'Bank Soal Mandiri Guru'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedGrade, selectedDifficulty, selectedType, search]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [statsData, examsData] = await Promise.all([
        api.getQuestionBankStats().catch(() => null),
        api.getCbtExams().catch(() => [])
      ]);

      setStats(statsData);
      setExams(examsData || []);

      // Extract unique subjects from exams & defaults
      const subMap = {};
      (examsData || []).forEach(e => {
        if (e.subject_id && e.subject_name) {
          subMap[e.subject_id] = e.subject_name;
        }
      });
      const subList = Object.keys(subMap).map(id => ({ id: Number(id), name: subMap[id] }));
      if (subList.length === 0) {
        subList.push(
          { id: 1, name: 'Matematika Wajib' },
          { id: 2, name: 'Fisika Peminatan' },
          { id: 3, name: 'Bahasa Indonesia' },
          { id: 4, name: 'Biologi' },
          { id: 5, name: 'Kimia' },
          { id: 6, name: 'Bahasa Inggris' }
        );
      }
      setSubjects(subList);
      if (subList.length > 0 && !questionForm.subject_id) {
        setQuestionForm(prev => ({ ...prev, subject_id: subList[0].id }));
      }
      if (examsData && examsData.length > 0) {
        setTargetExamId(examsData[0].id);
        setSyncExamId(examsData[0].id);
      }
    } catch (err) {
      console.error('Error loading question bank initial data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions() {
    try {
      const params = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedGrade !== 'Semua') params.grade_level = selectedGrade;
      if (selectedDifficulty !== 'Semua') params.difficulty = selectedDifficulty;
      if (selectedType !== 'Semua') params.question_type = selectedType;
      if (search.trim()) params.search = search.trim();

      const data = await api.getQuestionBank(params);
      setQuestions(data || []);

      // If only 1 package or search is active, automatically expand it for convenience
      if (data && data.length > 0 && search.trim()) {
        const autoExp = {};
        data.forEach(q => {
          const t = q.source_exam_title || 'Bank Soal Mandiri';
          autoExp[t] = true;
        });
        setExpandedTitles(prev => ({ ...prev, ...autoExp }));
      }

      api.getQuestionBankStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  }

  // Group questions by Judul Soal (source_exam_title)
  const packagesMap = {};
  questions.forEach(q => {
    const pkgTitle = q.source_exam_title?.trim() || 'Koleksi Soal Mandiri';
    if (!packagesMap[pkgTitle]) {
      packagesMap[pkgTitle] = {
        title: pkgTitle,
        subject_name: q.subject_name,
        subject_id: q.subject_id,
        grade_level: q.grade_level || 'Kelas X',
        topic: q.topic,
        questions: [],
        mcCount: 0,
        essayCount: 0,
        totalPoints: 0,
        hotsCount: 0
      };
    }
    packagesMap[pkgTitle].questions.push(q);
    if (q.question_type === 'MULTIPLE_CHOICE') packagesMap[pkgTitle].mcCount++;
    if (q.question_type === 'ESSAY') packagesMap[pkgTitle].essayCount++;
    packagesMap[pkgTitle].totalPoints += (q.points || 0);
    if (q.difficulty === 'HOTS') packagesMap[pkgTitle].hotsCount++;
  });

  const packagesList = Object.values(packagesMap);

  // Unique list of all titles for datalist suggestions
  const existingTitles = Array.from(new Set(questions.map(q => q.source_exam_title?.trim()).filter(Boolean)));

  // Expand / collapse title accordion
  function toggleTitleExpanded(title) {
    setExpandedTitles(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }

  function expandAllTitles() {
    const all = {};
    packagesList.forEach(p => { all[p.title] = true; });
    setExpandedTitles(all);
  }

  function collapseAllTitles() {
    setExpandedTitles({});
  }

  function handleSelectAll() {
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map(q => q.id));
    }
  }

  function handleSelectPackageQuestions(pkg) {
    const pkgQIds = pkg.questions.map(q => q.id);
    const allSelected = pkgQIds.every(id => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !pkgQIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...pkgQIds])));
    }
  }

  function handleToggleSelect(id) {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(x => x !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  }

  // Open modal for brand new question or package
  function openCreateModal(prefillTitle = '', prefillSubjectId = '', prefillGrade = '', prefillTopic = '') {
    setEditingQuestion(null);
    setQuestionForm({
      subject_id: prefillSubjectId || subjects[0]?.id || 1,
      grade_level: prefillGrade || 'Kelas X',
      topic: prefillTopic || '',
      question_text: '',
      question_type: 'MULTIPLE_CHOICE',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      optionE: '',
      correct_answer: 'A',
      points: 10,
      explanation: '',
      difficulty: 'SEDANG',
      source_exam_title: prefillTitle || (packagesList[0]?.title || 'Bank Soal Mandiri Guru')
    });
    setShowCreateModal(true);
  }

  function openEditModal(q) {
    setEditingQuestion(q);
    const opts = q.options || [];
    setQuestionForm({
      subject_id: q.subject_id,
      grade_level: q.grade_level || 'Kelas X',
      topic: q.topic || '',
      question_text: q.question_text,
      question_type: q.question_type,
      optionA: opts.find(o => o.id === 'A')?.text || '',
      optionB: opts.find(o => o.id === 'B')?.text || '',
      optionC: opts.find(o => o.id === 'C')?.text || '',
      optionD: opts.find(o => o.id === 'D')?.text || '',
      optionE: opts.find(o => o.id === 'E')?.text || '',
      correct_answer: q.correct_answer || 'A',
      points: q.points || 10,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'SEDANG',
      source_exam_title: q.source_exam_title || 'Bank Soal Mandiri'
    });
    setShowCreateModal(true);
  }

  async function handleSaveQuestion(e) {
    e.preventDefault();
    if (!questionForm.question_text.trim()) {
      alert('Teks pertanyaan wajib diisi!');
      return;
    }

    try {
      const options = [];
      if (questionForm.question_type === 'MULTIPLE_CHOICE') {
        if (!questionForm.optionA?.trim() || !questionForm.optionB?.trim()) {
          alert('Minimal opsi A dan B harus diisi untuk soal Pilihan Ganda!');
          return;
        }
        options.push({ id: 'A', text: questionForm.optionA });
        options.push({ id: 'B', text: questionForm.optionB });
        if (questionForm.optionC?.trim()) options.push({ id: 'C', text: questionForm.optionC });
        if (questionForm.optionD?.trim()) options.push({ id: 'D', text: questionForm.optionD });
        if (questionForm.optionE?.trim()) options.push({ id: 'E', text: questionForm.optionE });
      }

      const titleToUse = questionForm.source_exam_title?.trim() || 'Bank Soal Mandiri';

      const payload = {
        subject_id: Number(questionForm.subject_id),
        grade_level: questionForm.grade_level,
        topic: questionForm.topic,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        options,
        correct_answer: questionForm.correct_answer,
        points: Number(questionForm.points) || 10,
        explanation: questionForm.explanation,
        difficulty: questionForm.difficulty,
        source_exam_title: titleToUse
      };

      if (editingQuestion) {
        await api.updateQuestionBankItem(editingQuestion.id, payload);
        alert('Butir soal berhasil diperbarui!');
      } else {
        await api.createQuestionBankItem(payload);
        alert(`Soal baru berhasil ditambahkan ke judul "${titleToUse}"!`);
        // Auto-expand this title so teacher sees the new question immediately
        setExpandedTitles(prev => ({ ...prev, [titleToUse]: true }));
      }

      setShowCreateModal(false);
      loadQuestions();
    } catch (err) {
      alert('Gagal menyimpan butir soal: ' + err.message);
    }
  }

  async function handleDeleteQuestion(id) {
    if (!window.confirm('Yakin ingin menghapus butir soal ini dari Bank Soal?')) return;
    try {
      await api.deleteQuestionBankItem(id);
      setSelectedQuestionIds(prev => prev.filter(x => x !== id));
      loadQuestions();
      alert('Soal berhasil dihapus');
    } catch (err) {
      alert('Gagal menghapus soal: ' + err.message);
    }
  }

  // Delete all questions in an entire package title
  async function handleDeleteEntirePackage(pkgTitle) {
    if (!window.confirm(`HAPUS SELURUH JUDUL SOAL "${pkgTitle}"?\nSemua butir soal di dalam judul ini akan dihapus dari Bank Soal.`)) {
      return;
    }
    const qIds = packagesMap[pkgTitle]?.questions.map(q => q.id) || [];
    try {
      for (const id of qIds) {
        await api.deleteQuestionBankItem(id);
      }
      setSelectedQuestionIds(prev => prev.filter(x => !qIds.includes(x)));
      alert(`Judul soal "${pkgTitle}" berhasil dihapus.`);
      loadQuestions();
    } catch (err) {
      alert('Gagal menghapus paket judul: ' + err.message);
    }
  }

  // Export entire package title to an exam
  function handleOpenPackageExport(pkg) {
    const ids = pkg.questions.map(q => q.id);
    setSelectedQuestionIds(ids);
    setExportingSingleId(null);
    setExportingPackageTitle(pkg.title);
    setShowExportModal(true);
  }

  // Export single question
  function handleOpenSingleExport(questionId) {
    setExportingSingleId(questionId);
    setExportingPackageTitle('');
    setShowExportModal(true);
  }

  // Export selected bulk questions
  function handleOpenBulkExport() {
    if (selectedQuestionIds.length === 0) {
      alert('Pilih minimal 1 butir soal untuk disalin ke ujian kelas!');
      return;
    }
    setExportingSingleId(null);
    setExportingPackageTitle('');
    setShowExportModal(true);
  }

  async function handleConfirmExportToExam() {
    if (!targetExamId) {
      alert('Pilih ujian kelas tujuan terlebih dahulu!');
      return;
    }

    const idsToExport = exportingSingleId ? [exportingSingleId] : selectedQuestionIds;
    if (idsToExport.length === 0) return;

    try {
      const res = await api.exportQuestionBankToExam({
        exam_id: Number(targetExamId),
        question_ids: idsToExport
      });

      alert(res.message || 'Soal berhasil disalin ke ujian kelas tujuan!');
      setShowExportModal(false);
      setSelectedQuestionIds([]);
      setExportingSingleId(null);
      setExportingPackageTitle('');
      loadQuestions();
    } catch (err) {
      alert('Gagal menyalin soal ke ujian: ' + err.message);
    }
  }

  async function handleConfirmSyncFromExam() {
    if (!syncExamId) {
      alert('Pilih ujian CBT sumber yang akan disinkronkan!');
      return;
    }

    try {
      const res = await api.importQuestionsFromExamToBank(syncExamId);
      alert(res.message || 'Soal berhasil ditarik ke Bank Soal Master!');
      setShowSyncModal(false);
      loadQuestions();
    } catch (err) {
      alert('Gagal menyinkronkan soal: ' + err.message);
    }
  }

  return (
    <div className="content-view">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={22} color="var(--primary)" /> Bank Soal Terpadu (Per Judul & Paket Soal)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Koleksi master soal yang dikelompokkan per <strong>Judul Soal</strong>. Klik judul soal untuk membuka butir-butir soal dan mengujikannya ke kelas lain.
          </p>
        </div>

        {isTeacher && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowSyncModal(true)}
              title="Tarik semua soal dari ujian yang pernah dibuat ke bank master"
            >
              <Download size={16} /> Impor dari Ujian CBT
            </button>
            <button
              className="btn btn-primary"
              onClick={() => openCreateModal()}
            >
              <Plus size={16} /> + Buat Judul / Soal Baru
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--primary)' }}>
            <div className="stat-icon indigo" style={{ width: 40, height: 40 }}>
              <FolderOpen size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Judul Paket Soal</h4>
              <div className="stat-value">{packagesList.length} Judul</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px' }}>
            <div className="stat-icon indigo" style={{ width: 40, height: 40 }}>
              <Layers size={20} />
            </div>
            <div className="stat-details">
              <h4>Total Butir Soal</h4>
              <div className="stat-value">{stats.total || questions.length} Butir</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
            <div className="stat-icon emerald" style={{ width: 40, height: 40 }}>
              <CheckCircle size={20} />
            </div>
            <div className="stat-details">
              <h4>Pilihan Ganda</h4>
              <div className="stat-value" style={{ color: '#10b981' }}>{stats.multiple_choice || 0}</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6' }}>
            <div className="stat-icon purple" style={{ width: 40, height: 40 }}>
              <BookOpen size={20} />
            </div>
            <div className="stat-details">
              <h4>Esai / Uraian</h4>
              <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.essay || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: 18, padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: 32, fontSize: '0.85rem' }}
              placeholder="Cari judul soal, topik, atau teks soal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem' }}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Semua Mata Pelajaran</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Grade Level Filter */}
          <div>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem' }}
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="Semua">Semua Tingkat Kelas</option>
              <option value="Kelas X">Kelas X</option>
              <option value="Kelas XI">Kelas XI</option>
              <option value="Kelas XII">Kelas XII</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem' }}
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="Semua">Semua Tingkat Kesulitan</option>
              <option value="MUDAH">Mudah</option>
              <option value="SEDANG">Sedang</option>
              <option value="SULIT">Sulit</option>
              <option value="HOTS">HOTS (Higher Order)</option>
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem' }}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="Semua">Semua Tipe Soal</option>
              <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
              <option value="ESSAY">Esai / Uraian</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar when items are selected */}
      {selectedQuestionIds.length > 0 && (
        <div style={{
          background: 'var(--primary-subtle, #e0e7ff)',
          border: '1.5px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
              {selectedQuestionIds.length} Butir Soal Terpilih
            </span>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Siap disalin dan diujikan ke rombel / kelas lain
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedQuestionIds([])}>
              Batal Pilih
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleOpenBulkExport}>
              <Send size={14} /> Salin Soal Terpilih ke Ujian Kelas...
            </button>
          </div>
        </div>
      )}

      {/* Packages Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Daftar Judul Bank Soal ({packagesList.length} Judul Paket, {questions.length} Butir Soal)
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            (Klik pada judul untuk membuka butir-butir soal)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={expandAllTitles}
            style={{ fontSize: '0.78rem' }}
          >
            Buka Semua Judul
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={collapseAllTitles}
            style={{ fontSize: '0.78rem' }}
          >
            Tutup Semua Judul
          </button>
        </div>
      </div>

      {/* List of Judul Soal (Package Cards) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
          Memuat data Bank Soal Master...
        </div>
      ) : packagesList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
          <FolderOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Belum Ada Judul Bank Soal yang Cocok</h4>
          <p style={{ fontSize: '0.84rem', maxWidth: 450, margin: '0 auto 16px' }}>
            Tidak ada judul soal yang sesuai filter pencarian. Klik "+ Buat Judul / Soal Baru" atau tarik butir soal dari ujian CBT yang sudah pernah dibuat.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => openCreateModal()}>
            <Plus size={14} /> + Buat Judul / Soal Baru
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {packagesList.map((pkg, pkgIdx) => {
            const isExpanded = !!expandedTitles[pkg.title];
            const pkgQIds = pkg.questions.map(q => q.id);
            const allPkgSelected = pkgQIds.length > 0 && pkgQIds.every(id => selectedQuestionIds.includes(id));
            const somePkgSelected = pkgQIds.some(id => selectedQuestionIds.includes(id));

            return (
              <div
                key={pkg.title}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isExpanded ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                  boxShadow: isExpanded ? '0 4px 16px rgba(99, 102, 241, 0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Judul Card Header (Interactive Click to Expand/Collapse) */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: isExpanded ? 'var(--primary-subtle, #f0f4ff)' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    gap: 14,
                    flexWrap: 'wrap'
                  }}
                  onClick={() => toggleTitleExpanded(pkg.title)}
                >
                  {/* Left: Icon, Title, and Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-sm)',
                      background: isExpanded ? 'var(--primary)' : '#f1f5f9',
                      color: isExpanded ? 'white' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      {isExpanded ? <FolderOpen size={22} /> : <Folder size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          {pkg.subject_name}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {pkg.grade_level}
                        </span>
                        {pkg.topic && (
                          <span className="badge" style={{ fontSize: '0.72rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                            Topik: {pkg.topic}
                          </span>
                        )}
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          {pkg.questions.length} Butir Soal
                        </span>
                      </div>

                      <h4 style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: isExpanded ? 'var(--primary)' : 'var(--text-main)',
                        margin: 0,
                        lineHeight: 1.3
                      }}>
                        {pkg.title}
                      </h4>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>Pilihan Ganda: <strong>{pkg.mcCount}</strong></span>
                        <span>•</span>
                        <span>Esai: <strong>{pkg.essayCount}</strong></span>
                        <span>•</span>
                        <span>Total Poin: <strong>{pkg.totalPoints}</strong></span>
                        {pkg.hotsCount > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Flame size={12} /> {pkg.hotsCount} Soal HOTS
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Actions & Expand Chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenPackageExport(pkg)}
                      title="Salin semua butir soal dalam judul ini ke ujian kelas lain"
                      style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 600, fontSize: '0.78rem' }}
                    >
                      <Copy size={13} /> Ujikan Judul Ini ke Kelas
                    </button>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openCreateModal(pkg.title, pkg.subject_id, pkg.grade_level, pkg.topic)}
                      title="Tambah butir soal baru ke judul ini"
                      style={{ fontSize: '0.78rem' }}
                    >
                      <Plus size={13} /> + Tambah Butir Soal
                    </button>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDeleteEntirePackage(pkg.title)}
                      title="Hapus judul soal ini beserta seluruh isinya"
                      style={{ color: 'var(--danger)', borderColor: '#fca5a5', padding: '5px 8px' }}
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Chevron toggle button */}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleTitleExpanded(pkg.title)}
                      style={{
                        padding: '5px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: isExpanded ? 'var(--primary)' : undefined,
                        color: isExpanded ? 'white' : undefined,
                        borderColor: isExpanded ? 'var(--primary)' : undefined
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={15} /> Tutup
                        </>
                      ) : (
                        <>
                          <ChevronDown size={15} /> Buka ({pkg.questions.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Butir-Butir Soal (Expanded Panel) */}
                {isExpanded && (
                  <div style={{ padding: '18px 20px', background: '#fafbfc' }}>
                    {/* Header inside expanded panel */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                      paddingBottom: 10,
                      borderBottom: '1.5px dashed var(--border-color)',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          id={`pkgCheck_${pkgIdx}`}
                          checked={allPkgSelected}
                          ref={el => { if (el) el.indeterminate = somePkgSelected && !allPkgSelected; }}
                          onChange={() => handleSelectPackageQuestions(pkg)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor={`pkgCheck_${pkgIdx}`} style={{ fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                          Pilih Semua Butir Soal di Judul "{pkg.title}" ({pkg.questions.length} Butir Soal)
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openCreateModal(pkg.title, pkg.subject_id, pkg.grade_level, pkg.topic)}
                          style={{ fontSize: '0.78rem' }}
                        >
                          <Plus size={13} /> Tambah Soal ke Judul Ini
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenPackageExport(pkg)}
                          style={{ fontSize: '0.78rem', color: 'var(--primary)' }}
                        >
                          <Send size={13} /> Ujikan Seluruh Judul Ini
                        </button>
                      </div>
                    </div>

                    {/* Question Cards inside this Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {pkg.questions.map((q, qIdx) => {
                        const isSelected = selectedQuestionIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            style={{
                              background: isSelected ? 'var(--primary-subtle, #f0f4ff)' : 'white',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Card Top: Number, Type, Points, Difficulty & Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(q.id)}
                                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                                />
                                <span className="badge badge-primary" style={{ fontWeight: 800 }}>
                                  Butir #{qIdx + 1}
                                </span>
                                <span className="badge badge-neutral">
                                  {q.question_type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}
                                </span>
                                <span className="badge badge-neutral">
                                  {q.points} Poin
                                </span>
                                <span className={`badge ${q.difficulty === 'HOTS' ? 'badge-danger' : q.difficulty === 'SULIT' ? 'badge-warning' : q.difficulty === 'MUDAH' ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {q.difficulty === 'HOTS' && <Flame size={12} />} {q.difficulty}
                                </span>
                              </div>

                              {isTeacher && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleOpenSingleExport(q.id)}
                                    title="Salin butir soal ini ke salah satu ujian kelas"
                                    style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 600, fontSize: '0.74rem', padding: '3px 8px' }}
                                  >
                                    <Copy size={12} /> Ujikan ke Kelas
                                  </button>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => openEditModal(q)}
                                    title="Edit butir soal"
                                    style={{ padding: '3px 8px' }}
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    title="Hapus butir soal"
                                    style={{ color: 'var(--danger)', borderColor: '#fca5a5', padding: '3px 8px' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Question Text */}
                            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 12, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                              {q.question_text}
                            </p>

                            {/* Multiple Choice Options */}
                            {q.question_type === 'MULTIPLE_CHOICE' && q.options?.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                {q.options.map(opt => {
                                  const isCorrect = opt.id === q.correct_answer;
                                  return (
                                    <div
                                      key={opt.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-xs)',
                                        background: isCorrect ? 'var(--success-light, #d1fae5)' : '#f8fafc',
                                        border: isCorrect ? '1.5px solid var(--success, #10b981)' : '1px solid var(--border-color)',
                                        fontSize: '0.84rem'
                                      }}
                                    >
                                      <strong style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: isCorrect ? 'var(--success, #10b981)' : '#e2e8f0',
                                        color: isCorrect ? 'white' : '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.74rem'
                                      }}>
                                        {opt.id}
                                      </strong>
                                      <span style={{ color: isCorrect ? '#065f46' : 'var(--text-main)', fontWeight: isCorrect ? 600 : 400 }}>
                                        {opt.text}
                                      </span>
                                      {isCorrect && (
                                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success, #10b981)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Check size={12} /> Kunci Jawaban
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Essay Reference / Rubric */}
                            {q.question_type === 'ESSAY' && q.correct_answer && (
                              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid #e2e8f0', marginBottom: 10, fontSize: '0.82rem' }}>
                                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: 2 }}>Kunci / Inti Jawaban Esai:</strong>
                                <p style={{ margin: 0, whiteSpace: 'pre-line', color: 'var(--text-main)' }}>{q.correct_answer}</p>
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px dashed var(--border-color)' }}>
                                <strong>Pembahasan / Rubrik Penilaian:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer inside expanded panel */}
                    <div style={{ marginTop: 14, textAlign: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openCreateModal(pkg.title, pkg.subject_id, pkg.grade_level, pkg.topic)}
                        style={{ fontWeight: 600 }}
                      >
                        <Plus size={14} /> Tambah Butir Soal ke Judul "{pkg.title}"
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Salin / Ekspor Butir Soal ke Ujian Kelas */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} color="var(--primary)" /> Salin Soal ke Ujian Kelas Lain
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Pilih paket ujian CBT kelas yang ingin ditambahkan butir soal ini. Soal akan otomatis ditambahkan ke nomor urut berikutnya pada ujian tujuan.
              </p>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Butir Soal yang Disalin:</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                  {exportingSingleId
                    ? '1 Butir Soal Terpilih'
                    : exportingPackageTitle
                    ? `${selectedQuestionIds.length} Butir Soal (Dari Judul: ${exportingPackageTitle})`
                    : `${selectedQuestionIds.length} Butir Soal Terpilih`}
                </strong>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Paket Ujian CBT Tujuan</label>
                {exams.length === 0 ? (
                  <p style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>
                    Belum ada paket ujian CBT yang dibuat. Silakan buat ujian baru terlebih dahulu di menu "Ujian CBT".
                  </p>
                ) : (
                  <select
                    className="form-control"
                    value={targetExamId}
                    onChange={(e) => setTargetExamId(e.target.value)}
                  >
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} (Kelas {e.class_name} • {e.subject_name}) - Token: {e.token}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowExportModal(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmExportToExam}
                disabled={exams.length === 0}
              >
                <Check size={16} /> Konfirmasi Salin ke Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tarik / Sinkronisasi Soal dari Ujian CBT */}
      {showSyncModal && (
        <div className="modal-dialog-wrap">
          <div className="modal-overlay">
            <div className="modal-dialog" style={{ maxWidth: 540 }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} color="var(--primary)" /> Impor Soal dari Ujian CBT yang Pernah Dibuat
                </h3>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                  onClick={() => setShowSyncModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                  Pilih paket ujian CBT yang sudah pernah Anda buat. Sistem akan menarik semua butir soal di dalamnya ke Bank Soal Master di bawah judul ujian tersebut (duplikasi teks otomatis diabaikan).
                </p>

                <div className="form-group">
                  <label className="form-label">Pilih Ujian CBT Sumber</label>
                  {exams.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Belum ada ujian CBT.</p>
                  ) : (
                    <select
                      className="form-control"
                      value={syncExamId}
                      onChange={(e) => setSyncExamId(e.target.value)}
                    >
                      {exams.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.title} (Kelas {e.class_name} • {e.question_count || 0} Soal)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowSyncModal(false)}>
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmSyncFromExam}
                  disabled={exams.length === 0}
                >
                  <Download size={16} /> Tarik ke Bank Soal Master
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat / Edit Butir Soal Master */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="var(--primary)" />
                {editingQuestion ? 'Edit Butir Soal Master' : 'Buat Butir Soal / Judul Bank Soal Baru'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="modal-body">
                {/* Judul Bank Soal / Paket Soal Field with Datalist */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    Judul Bank Soal / Nama Paket Soal
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    list="packageTitlesDatalist"
                    placeholder="Contoh: Asesmen Sumatif Akhir Semester: Matematika Wajib"
                    value={questionForm.source_exam_title}
                    onChange={(e) => setQuestionForm({ ...questionForm, source_exam_title: e.target.value })}
                    required
                  />
                  <datalist id="packageTitlesDatalist">
                    {existingTitles.map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Pilih judul yang sudah ada atau ketikkan judul paket baru untuk membuat kelompok judul baru.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Mata Pelajaran</label>
                    <select
                      className="form-control"
                      value={questionForm.subject_id}
                      onChange={(e) => setQuestionForm({ ...questionForm, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tingkat Kelas</label>
                    <select
                      className="form-control"
                      value={questionForm.grade_level}
                      onChange={(e) => setQuestionForm({ ...questionForm, grade_level: e.target.value })}
                    >
                      <option value="Kelas X">Kelas X</option>
                      <option value="Kelas XI">Kelas XI</option>
                      <option value="Kelas XII">Kelas XII</option>
                      <option value="Semua Tingkat">Semua Tingkat</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tingkat Kesulitan</label>
                    <select
                      className="form-control"
                      value={questionForm.difficulty}
                      onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    >
                      <option value="MUDAH">Mudah</option>
                      <option value="SEDANG">Sedang</option>
                      <option value="SULIT">Sulit</option>
                      <option value="HOTS">HOTS (Higher Order)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Topik / Bab Pokok</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: SPLTV, Dinamika Gerak..."
                      value={questionForm.topic}
                      onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipe Soal</label>
                    <select
                      className="form-control"
                      value={questionForm.question_type}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                    >
                      <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                      <option value="ESSAY">Esai / Uraian</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bobot Poin</label>
                    <input
                      type="number"
                      className="form-control"
                      value={questionForm.points}
                      onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pertanyaan / Narasi Butir Soal</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Tuliskan pertanyaan soal lengkap..."
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    required
                  />
                </div>

                {/* Multiple Choice Options */}
                {questionForm.question_type === 'MULTIPLE_CHOICE' && (
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Pilihan Jawaban (Tandai Kunci Jawaban):</label>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Klik radio "Kunci" pada opsi yang benar</span>
                    </div>

                    {['A', 'B', 'C', 'D', 'E'].map(optKey => (
                      <div key={optKey} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ width: 24, fontWeight: 800, textAlign: 'center' }}>{optKey}.</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={`Pilihan Jawaban ${optKey} ${optKey === 'E' ? '(Opsional)' : ''}...`}
                          value={questionForm[`option${optKey}`]}
                          onChange={(e) => setQuestionForm({ ...questionForm, [`option${optKey}`]: e.target.value })}
                          required={optKey === 'A' || optKey === 'B'}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          <input
                            type="radio"
                            name="correct_answer_radio"
                            checked={questionForm.correct_answer === optKey}
                            onChange={() => setQuestionForm({ ...questionForm, correct_answer: optKey })}
                          />
                          <span style={{ fontWeight: questionForm.correct_answer === optKey ? 700 : 400, color: questionForm.correct_answer === optKey ? 'var(--success)' : undefined }}>
                            Kunci
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Essay Answer Key / Rubric */}
                {questionForm.question_type === 'ESSAY' && (
                  <div className="form-group">
                    <label className="form-label">Kunci / Inti Jawaban Esai</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Jawaban acuan guru atau poin-poin yang harus dijawab siswa..."
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Pembahasan / Catatan Penilaian (Opsional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Langkah penyelesaian atau kriteria rubrik skor..."
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Simpan Perubahan Soal' : 'Simpan Butir Soal ke Judul Ini'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
