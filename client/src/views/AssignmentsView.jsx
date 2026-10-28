import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  MessageSquare,
  Award,
  Send,
  Eye,
  Paperclip,
  ExternalLink,
  Cloud,
  Folder,
  FolderOpen,
  Copy,
  Check,
  Settings,
  X,
  File,
  Download,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentAvatar } from '../components/StudentAvatar';
import { ref, onValue } from 'firebase/database';
import { database } from '../services/firebase';

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    // 1. Aksi Tes Koneksi
    if (payload.action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Koneksi ke Google Drive Apps Script berhasil!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Tentukan folder induk (opsional) atau gunakan root My Drive
    var parentFolder = payload.parentFolderId && payload.parentFolderId.trim() !== '' 
      ? DriveApp.getFolderById(payload.parentFolderId.trim()) 
      : DriveApp.getRootFolder();
      
    // Dapatkan / Buat Folder Tugas (misal: "Tugas 1: Dinamika Gerak")
    var taskFolderName = payload.folderTask || 'Tugas Kelas';
    var taskFolders = parentFolder.getFoldersByName(taskFolderName);
    var taskFolder = taskFolders.hasNext() ? taskFolders.next() : parentFolder.createFolder(taskFolderName);
    try {
      taskFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(eShare) {}
    
    // Siapkan daftar kelas (bisa array folderClasses atau single folderClass)
    var classList = [];
    if (Array.isArray(payload.folderClasses) && payload.folderClasses.length > 0) {
      classList = payload.folderClasses;
    } else if (payload.folderClass) {
      classList = [payload.folderClass];
    } else {
      classList = ['Semua Kelas'];
    }

    var createdClassFolders = {};
    var primaryClassFolder = null;

    for (var i = 0; i < classList.length; i++) {
      var cName = classList[i];
      var cFolders = taskFolder.getFoldersByName(cName);
      var cFolder = cFolders.hasNext() ? cFolders.next() : taskFolder.createFolder(cName);
      try {
        cFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(eShare) {}
      createdClassFolders[cName] = {
        id: cFolder.getId(),
        url: cFolder.getUrl()
      };
      if (!primaryClassFolder) {
        primaryClassFolder = cFolder;
      }
    }
    
    // 2. Aksi Otomatis: Buat Folder saat Admin/Guru membuat tugas baru
    if (payload.action === 'create_folders') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        taskFolderId: taskFolder.getId(),
        taskFolderUrl: taskFolder.getUrl(),
        classFolderId: primaryClassFolder ? primaryClassFolder.getId() : '',
        classFolderUrl: primaryClassFolder ? primaryClassFolder.getUrl() : '',
        classFolders: createdClassFolders
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. Aksi Simpan Berkas Siswa: nomor absen_ nama siswa.[ext]
    var uploadClassFolder = primaryClassFolder || taskFolder;
    if (payload.folderClass) {
      var targetFolders = taskFolder.getFoldersByName(payload.folderClass);
      uploadClassFolder = targetFolders.hasNext() ? targetFolders.next() : taskFolder.createFolder(payload.folderClass);
    }

    var base64Data = payload.fileBase64;
    if (base64Data.indexOf(';base64,') > -1) {
      base64Data = base64Data.split(';base64,')[1];
    }
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, payload.mimeType || 'application/octet-stream', payload.fileName);
    var newFile = uploadClassFolder.createFile(blob);
    
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(errShare) {}
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: newFile.getId(),
      fileUrl: newFile.getUrl(),
      fileName: newFile.getName(),
      taskFolderUrl: taskFolder.getUrl(),
      classFolderUrl: uploadClassFolder.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function AssignmentsView() {
  const { user, classes = [], subjects = [] } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isSyncingFolders, setIsSyncingFolders] = useState(false);
  const [localFilesModal, setLocalFilesModal] = useState(null);
  const [createForm, setCreateForm] = useState({
    class_id: '',
    class_ids: [],
    subject_id: '',
    title: '',
    instructions: '',
    due_date: '2026-10-30 23:59',
    max_points: 100,
    attachments: []
  });

  // Selected assignment for detailed review / submission
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);

  // Google Drive Settings Modal
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveSettings, setDriveSettings] = useState({
    webhookUrl: '',
    parentFolderId: '',
    isConfigured: false,
    lastTested: null
  });
  const [testResult, setTestResult] = useState(null);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Student submission form
  const [submissionForm, setSubmissionForm] = useState({
    content: '',
    student_absen: '',
    selectedFile: null,
    fileBase64: '',
    fileName: '',
    fileSize: '',
    fileType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teacher grading state
  const [gradingForm, setGradingForm] = useState({
    student_id: null,
    score: '',
    teacher_feedback: ''
  });

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
    if (user?.role === 'siswa') {
      if (user?.kelas && classes.length > 0 && !selectedClass) {
        const myCls = classes.find(c => c.name === user.kelas);
        if (myCls) setSelectedClass(myCls.id.toString());
      }
      if (displaySubjects.length > 0 && !selectedSubject) {
        setSelectedSubject(displaySubjects[0].id.toString());
      }
    }
  }, [user, classes, displaySubjects, selectedClass, selectedSubject]);

  useEffect(() => {
    loadAssignments();
  }, [user, selectedClass, selectedSubject]);

  // Realtime cross-device sync for assignments and submissions
  useEffect(() => {
    if (!database) return;
    try {
      const assignRef = ref(database, 'lms_v3/assignments');
      const subRef = ref(database, 'lms_v3/assignment_submissions');

      const unsubAssign = onValue(assignRef, () => {
        loadAssignments();
      });
      const unsubSub = onValue(subRef, () => {
        loadAssignments();
      });

      return () => {
        unsubAssign();
        unsubSub();
      };
    } catch (e) {
      console.warn('Assignments Firebase realtime listener error:', e);
    }
  }, [user, selectedClass, selectedSubject]);

  useEffect(() => {
    if (isTeacher) {
      loadDriveSettings();
    }
  }, [isTeacher]);

  async function loadDriveSettings() {
    try {
      const res = await api.getDriveSettings();
      if (res) setDriveSettings(res);
    } catch (e) {
      console.warn('Error loading drive settings:', e);
    }
  }

  async function handleSaveDriveSettings(e) {
    e.preventDefault();
    setIsSavingDrive(true);
    try {
      const res = await api.saveDriveSettings(driveSettings);
      alert(res.message || 'Pengaturan Google Drive berhasil disimpan!');
      if (res.settings) setDriveSettings(res.settings);
      setShowDriveModal(false);
    } catch (err) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setIsSavingDrive(false);
    }
  }

  async function handleTestDriveConnection() {
    if (!driveSettings.webhookUrl) {
      alert('Masukkan URL Google Apps Script Web App terlebih dahulu!');
      return;
    }
    setIsTestingDrive(true);
    setTestResult(null);
    try {
      const res = await api.testDriveConnection({ webhookUrl: driveSettings.webhookUrl });
      if (res.success) {
        setTestResult({ success: true, message: res.message || 'Koneksi ke Google Drive sukses!' });
        setDriveSettings(prev => ({ ...prev, isConfigured: true, lastTested: new Date().toISOString() }));
      } else {
        setTestResult({ success: false, message: res.error || 'Respon tidak valid.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingDrive(false);
    }
  }

  function handleCopyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 20 MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSubmissionForm(prev => ({
        ...prev,
        selectedFile: file,
        fileBase64: reader.result,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: file.type || 'application/octet-stream'
      }));
    };
    reader.readAsDataURL(file);
  }

  async function loadAssignments() {
    try {
      setLoading(true);
      const data = await api.getAssignments({
        class_id: selectedClass || undefined,
        subject_id: selectedSubject || undefined
      });
      const list = Array.isArray(data) ? data : [];
      setAssignments(list);
      if (list.length > 0) {
        const stillValid = list.some(a => a.id === activeAssignment);
        if (!stillValid || !activeAssignment) {
          openAssignmentDetails(list[0].id);
        }
      } else {
        setActiveAssignment(null);
        setAssignmentDetail(null);
      }
    } catch (err) {
      console.error('Load assignments error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openAssignmentDetails(id) {
    try {
      const data = await api.getAssignmentDetails(id);
      if (!data) return;
      setActiveAssignment(id);
      setAssignmentDetail(data);
      if (data.my_submission) {
        setSubmissionForm({
          content: data.my_submission.content || '',
          fileName: data.my_submission.attachments?.[0]?.name || 'Lampiran.pdf',
          fileUrl: '#'
        });
      }
    } catch (err) {
      console.error('Error openAssignmentDetails:', err);
      alert('Gagal memuat detail tugas: ' + (err.message || 'Terjadi kesalahan'));
    }
  }

  function handleOpenCreateModal() {
    const initialClassId = selectedClass ? Number(selectedClass) : (classes[0]?.id || '');
    setCreateForm(prev => ({
      ...prev,
      class_id: initialClassId,
      class_ids: initialClassId ? [Number(initialClassId)] : (classes.length > 0 ? [classes[0].id] : []),
      subject_id: selectedSubject ? Number(selectedSubject) : (subjects[0]?.id || '')
    }));
    setShowCreateModal(true);
  }

  function toggleClassSelection(classId) {
    setCreateForm(prev => {
      const id = Number(classId);
      const exists = prev.class_ids.includes(id);
      let updated;
      if (exists) {
        if (prev.class_ids.length <= 1) return prev; // keep at least 1
        updated = prev.class_ids.filter(x => x !== id);
      } else {
        updated = [...prev.class_ids, id];
      }
      return {
        ...prev,
        class_ids: updated,
        class_id: updated[0] || ''
      };
    });
  }

  function handleSelectAllClasses() {
    setCreateForm(prev => ({
      ...prev,
      class_ids: classes.map(c => c.id),
      class_id: classes[0]?.id || ''
    }));
  }

  async function handleCreateAssignment(e) {
    e.preventDefault();
    const targetClassIds = createForm.class_ids.length > 0 
      ? createForm.class_ids 
      : (createForm.class_id ? [Number(createForm.class_id)] : [classes[0]?.id]);

    if (targetClassIds.length === 0) {
      alert('Pilih minimal satu kelas sasaran yang diberi tugas!');
      return;
    }

    setIsCreatingAssignment(true);
    try {
      const selectedClasses = classes.filter(c => targetClassIds.includes(c.id));
      await api.createAssignment({
        ...createForm,
        class_ids: targetClassIds,
        class_id: targetClassIds[0],
        subject_id: Number(createForm.subject_id || subjects[0]?.id)
      });
      setShowCreateModal(false);
      await loadAssignments();
      const folderList = selectedClasses.map(c => `  ├── 📂 Kelas ${c.name} (Folder kelas otomatis dibuat)`).join('\n');
      alert(`✅ Tugas baru berhasil dipublikasikan!\n\nStruktur folder Google Drive & Server otomatis dibuat:\n📁 Folder Tugas: ${createForm.title}\n${folderList}`);
      setCreateForm({
        class_id: '',
        class_ids: [],
        subject_id: '',
        title: '',
        instructions: '',
        due_date: '2026-10-30 23:59',
        max_points: 100,
        attachments: []
      });
    } catch (err) {
      alert('Gagal membuat tugas: ' + err.message);
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  async function handleSyncFolders(assignmentId) {
    if (!assignmentId) return;
    setIsSyncingFolders(true);
    try {
      const res = await api.createAssignmentFolders(assignmentId);
      alert(res.message || 'Folder tugas dan kelas Google Drive berhasil dipastikan/dibuat!');
      await openAssignmentDetails(assignmentId);
      await loadAssignments();
    } catch (err) {
      alert('Gagal membuat/sinkronkan folder: ' + err.message);
    } finally {
      setIsSyncingFolders(false);
    }
  }

  async function handleViewLocalFiles(assignmentId) {
    try {
      const res = await api.getLocalAssignmentFiles(assignmentId);
      setLocalFilesModal(res);
    } catch (err) {
      alert('Gagal membaca berkas lokal: ' + err.message);
    }
  }

  const studentAbsenVal = submissionForm.student_absen || user?.no_absen || 1;
  const paddedAbsen = String(Number(studentAbsenVal) || 1).padStart(2, '0');
  const targetTaskFolder = assignmentDetail?.assignment?.title || 'Tugas Kelas';
  const targetClassFolder = assignmentDetail?.assignment?.class_name ? `Kelas ${assignmentDetail.assignment.class_name}` : 'Semua Kelas';
  const fileExt = submissionForm.selectedFile?.name && submissionForm.selectedFile.name.includes('.') 
    ? submissionForm.selectedFile.name.substring(submissionForm.selectedFile.name.lastIndexOf('.'))
    : (submissionForm.fileName && submissionForm.fileName.includes('.') ? submissionForm.fileName.substring(submissionForm.fileName.lastIndexOf('.')) : '.pdf');
  const targetFormattedFileName = `${paddedAbsen}_ ${user?.name || 'Nama Siswa'}${fileExt}`;

  async function handleStudentSubmit(e) {
    e.preventDefault();
    if (!submissionForm.selectedFile && !submissionForm.fileBase64 && !assignmentDetail?.my_submission) {
      alert('Pilih berkas tugas (PDF/Word/Gambar/Zip) yang ingin diserahkan!');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitAssignment(activeAssignment, {
        content: submissionForm.content,
        student_absen: paddedAbsen,
        file: submissionForm.selectedFile ? {
          name: submissionForm.fileName,
          type: submissionForm.fileType,
          size: submissionForm.selectedFile.size,
          base64: submissionForm.fileBase64
        } : undefined
      });
      openAssignmentDetails(activeAssignment);
      loadAssignments();
      alert(`Tugas Anda berhasil diserahkan!\n\nBerkas otomatis tersimpan di Google Drive:\n📁 Folder: ${targetTaskFolder} > ${targetClassFolder}\n📄 Berkas: ${targetFormattedFileName}`);
    } catch (err) {
      alert('Gagal menyerahkan tugas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGradeStudent(e) {
    e.preventDefault();
    try {
      await api.gradeAssignment(activeAssignment, {
        student_id: gradingForm.student_id,
        score: Number(gradingForm.score),
        teacher_feedback: gradingForm.teacher_feedback
      });
      setGradingForm({ student_id: null, score: '', teacher_feedback: '' });
      openAssignmentDetails(activeAssignment);
      alert('Nilai dan masukan tugas berhasil disimpan!');
    } catch (err) {
      alert('Gagal menilai tugas: ' + err.message);
    }
  }

  return (
    <div className="content-view">
      {/* Header and Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.role === 'siswa' ? (
            <div className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: 700 }}>
              Kelas {user.kelas || (classes.find(c => c.id.toString() === selectedClass)?.name || '')}
            </div>
          ) : (
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
            </select>
          )}

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {user?.role !== 'siswa' && <option value="">Semua Mapel</option>}
            {displaySubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
          </select>
        </div>

        {isTeacher && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowDriveModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              title="Atur integrasi penyimpanan otomatis tugas ke Google Drive"
            >
              <Cloud size={16} color={driveSettings?.isConfigured ? '#10b981' : 'var(--text-muted)'} />
              Integrasi Google Drive
              {driveSettings?.isConfigured && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              )}
            </button>
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} /> Buat Tugas Baru
            </button>
          </div>
        )}
      </div>

      <div className="assignments-split-layout">
        {/* Left Column: Assignment Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assignments.map(a => {
            const isSelected = activeAssignment === a.id;
            return (
              <div
                key={a.id}
                className="card"
                onClick={() => openAssignmentDetails(a.id)}
                style={{
                  padding: 18,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {a.subject_name} • {a.class_name}
                  </span>

                  {/* Student turn-in status badge */}
                  {!isTeacher && (
                    <span className={`badge ${a.student_status === 'GRADED' ? 'badge-success' : a.student_status === 'SUBMITTED' ? 'badge-primary' : 'badge-warning'}`}>
                      {a.student_status === 'GRADED' ? 'Sudah Dinilai' : a.student_status === 'SUBMITTED' ? 'Diserahkan' : 'Ditugaskan'}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                  {a.title}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> {a.due_date}
                  </span>
                  {isTeacher && (
                    <span><strong>{a.turned_in_count || 0}</strong> Diserahkan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Assignment Details & Classroom Submissions */}
        <div className="card">
          {assignmentDetail && assignmentDetail.assignment ? (
            <div>
              {/* Header */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {assignmentDetail.assignment.subject_name} • Kelas {assignmentDetail.assignment.class_name}
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>
                      {assignmentDetail.assignment.title}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Clock size={12} /> Tenggat: {assignmentDetail.assignment.due_date}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Maksimal: {assignmentDetail.assignment.max_points} Poin
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 16 }}>
                  {assignmentDetail.assignment.instructions}
                </p>

                {/* Attachments */}
                {assignmentDetail.assignment.attachments?.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Lampiran Guru:
                    </h5>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {assignmentDetail.assignment.attachments.map((att, i) => (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        >
                          <Paperclip size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600 }}>{att.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({att.size || 'PDF'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Google Drive / Local Folder Indicator & Controls */}
                <div style={{
                  marginTop: 14,
                  padding: '14px 18px',
                  background: 'rgba(37, 99, 235, 0.05)',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FolderOpen size={20} color="#2563eb" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Folder Otomatis Terhubung</span>
                        <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {driveSettings?.isConfigured ? 'Google Drive' : 'Penyimpanan Server'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        📁 Folder Tugas: <strong style={{ color: 'var(--text-main)' }}>{assignmentDetail.assignment.title}</strong>
                        &nbsp;›&nbsp;
                        📂 Folder Kelas: <strong style={{ color: 'var(--text-main)' }}>Kelas {assignmentDetail.assignment.class_name}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Buka Folder Tugas (Induk) */}
                    {assignmentDetail.assignment.task_folder_url && assignmentDetail.assignment.task_folder_url !== '#' && (
                      <a
                        href={assignmentDetail.assignment.task_folder_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{
                          background: '#ffffff',
                          color: '#1e40af',
                          borderColor: '#bfdbfe',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        title="Buka folder induk tugas ini di Google Drive / Server"
                      >
                        <Folder size={14} color="#2563eb" /> Buka Folder Tugas
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {/* Buka Folder Kelas */}
                    {assignmentDetail.assignment.drive_folder_url && assignmentDetail.assignment.drive_folder_url !== '#' ? (
                      <a
                        href={assignmentDetail.assignment.drive_folder_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        title="Buka folder khusus kelas ini di Google Drive"
                      >
                        <FolderOpen size={14} /> Buka Folder Kelas
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleViewLocalFiles(assignmentDetail.assignment.id)}
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        title="Buka daftar berkas tugas di folder server lokal"
                      >
                        <FolderOpen size={14} /> Berkas Lokal Server
                      </button>
                    )}

                    {isTeacher && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleSyncFolders(assignmentDetail.assignment.id)}
                        disabled={isSyncingFolders}
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Pastikan / buat ulang folder tugas dan kelas di Google Drive"
                      >
                        <RefreshCw size={13} className={isSyncingFolders ? 'spin' : ''} />
                        {isSyncingFolders ? 'Menyinkronkan...' : 'Sinkronkan'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Student View: Turn-in Box */}
              {!isTeacher && (
                <div style={{ background: 'var(--bg-subtle)', padding: 22, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h4 style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} color="var(--primary)" /> Tugas Anda
                    </h4>
                    {assignmentDetail.my_submission ? (
                      <span className="badge badge-success">
                        Sudah Diserahkan ({assignmentDetail.my_submission.status})
                      </span>
                    ) : (
                      <span className="badge badge-warning">Belum Diserahkan</span>
                    )}
                  </div>

                  {assignmentDetail.my_submission?.status === 'GRADED' && (
                    <div style={{ background: '#ecfdf5', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1.5px solid #a7f3d0', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.9rem' }}>Nilai Anda:</span>
                        <strong style={{ fontSize: '1.4rem', color: '#047857' }}>
                          {assignmentDetail.my_submission.score} / {assignmentDetail.assignment.max_points}
                        </strong>
                      </div>
                      {assignmentDetail.my_submission.teacher_feedback && (
                        <p style={{ fontSize: '0.88rem', color: '#064e3b', fontStyle: 'italic' }}>
                          "Masukan Guru: {assignmentDetail.my_submission.teacher_feedback}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submission Details if already turned in */}
                  {assignmentDetail.my_submission && assignmentDetail.my_submission.attachments?.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Berkas Tersimpan di Google Drive:</div>
                      {assignmentDetail.my_submission.attachments.map((att, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Cloud size={16} color="#2563eb" />
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{att.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({att.size || 'Berkas'})</span>
                          </div>
                          {att.drive_url && (
                            <a
                              href={att.drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2563eb', borderColor: '#93c5fd', fontSize: '0.78rem' }}
                            >
                              <ExternalLink size={13} /> Buka di Google Drive
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleStudentSubmit}>
                    <div className="form-group">
                      <label className="form-label">Tulis Catatan / Jawaban Teks (Opsional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Ketik ringkasan atau keterangan pengerjaan tugas Anda..."
                        value={submissionForm.content}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 14 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>Nomor Absen</label>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          max="99"
                          value={submissionForm.student_absen || paddedAbsen}
                          onChange={(e) => setSubmissionForm({ ...submissionForm, student_absen: e.target.value })}
                          placeholder="Contoh: 5"
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>Pilih File Tugas (PDF, Word, Gambar, Zip)</label>
                        <input
                          type="file"
                          className="form-control"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                          onChange={handleFileSelect}
                        />
                      </div>
                    </div>

                    {/* Live Preview Box of Google Drive Storage */}
                    <div style={{
                      background: 'rgba(37, 99, 235, 0.05)',
                      border: '1.5px dashed #60a5fa',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: 16
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cloud size={16} /> Struktur Penyimpanan Otomatis di Google Drive:
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div>📁 <strong>Folder Tugas:</strong> {targetTaskFolder}</div>
                        <div style={{ paddingLeft: 16 }}>📂 <strong>Folder Kelas:</strong> {targetClassFolder}</div>
                        <div style={{ paddingLeft: 32 }}>
                          📄 <strong>Nama File Tersimpan:</strong> <span style={{ color: 'var(--primary)', fontWeight: 800, background: '#e0e7ff', padding: '2px 8px', borderRadius: 4 }}>{targetFormattedFileName}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>Mengunggah ke Google Drive...</>
                        ) : (
                          <>
                            <Send size={16} />
                            {assignmentDetail.my_submission ? 'Kirim Ulang & Perbarui File' : 'Serahkan Tugas (Turn In)'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Teacher View: Student Submissions Grid & Grading */}
              {isTeacher && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>
                      Daftar Pengumpulan Siswa ({assignmentDetail.submissions?.length || 0} Siswa)
                    </h4>
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                      <span className="badge badge-success">Diserahkan: {assignmentDetail.stats?.turned_in || 0}</span>
                      <span className="badge badge-primary">Dinilai: {assignmentDetail.stats?.graded || 0}</span>
                      <span className="badge badge-warning">Belum: {assignmentDetail.stats?.missing || 0}</span>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Siswa</th>
                          <th>Status</th>
                          <th>Waktu Kumpul</th>
                          <th>Lampiran</th>
                          <th>Nilai</th>
                          <th>Aksi Penilaian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(assignmentDetail.submissions || []).map(({ student, submission, status }) => (
                          <tr key={student.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  background: '#e0e7ff',
                                  color: 'var(--primary)',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  padding: '3px 7px',
                                  borderRadius: 4,
                                  minWidth: 32,
                                  textAlign: 'center'
                                }}>
                                  #{student.absen || '01'}
                                </span>
                                <StudentAvatar name={student.name} size={28} />
                                <div>
                                  <strong style={{ fontSize: '0.88rem', display: 'block' }}>{student.name}</strong>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{student.nis}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${status === 'GRADED' ? 'badge-success' : status === 'SUBMITTED' ? 'badge-primary' : 'badge-neutral'}`}>
                                {status === 'GRADED' ? 'Dinilai' : status === 'SUBMITTED' ? 'Diserahkan' : 'Belum'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                            </td>
                            <td>
                              {submission?.attachments?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {submission.attachments.map((att, attIdx) => (
                                    <div key={attIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <a
                                        href={att.drive_url || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          color: 'var(--primary)',
                                          fontSize: '0.82rem',
                                          fontWeight: 700,
                                          textDecoration: 'none'
                                        }}
                                        title="Buka berkas di Google Drive"
                                      >
                                        <Cloud size={14} color="#2563eb" />
                                        <span>{att.name}</span>
                                        <ExternalLink size={12} />
                                      </a>
                                      {att.size && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          ({att.size})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td>
                              {submission?.score !== null && submission?.score !== undefined ? (
                                <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                                  {submission.score}
                                </strong>
                              ) : '-'}
                            </td>
                            <td>
                              {submission ? (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => setGradingForm({
                                    student_id: student.id,
                                    score: submission.score || '',
                                    teacher_feedback: submission.teacher_feedback || ''
                                  })}
                                >
                                  Beri Nilai
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Menunggu</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Teacher Grading Pop-in Drawer / Form */}
                  {gradingForm.student_id && (
                    <div style={{ marginTop: 20, padding: 18, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--primary)' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 12, color: 'var(--primary)' }}>
                        Form Penilaian & Umpan Balik Guru
                      </h4>
                      <form onSubmit={handleGradeStudent}>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 14, alignItems: 'flex-end' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Skor (Maks {assignmentDetail.assignment.max_points})</label>
                            <input
                              type="number"
                              min="0"
                              max={assignmentDetail.assignment.max_points}
                              className="form-control"
                              placeholder="0-100"
                              value={gradingForm.score}
                              onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })}
                              required
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Komentar / Masukan Pribadi Guru</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Tuliskan masukan untuk siswa..."
                              value={gradingForm.teacher_feedback}
                              onChange={(e) => setGradingForm({ ...gradingForm, teacher_feedback: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-outline" onClick={() => setGradingForm({ student_id: null, score: '', teacher_feedback: '' })}>
                              Batal
                            </button>
                            <button type="submit" className="btn btn-primary">
                              Simpan Nilai
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              Pilih salah satu tugas untuk melihat rincian instruksi atau pengumpulan siswa.
            </div>
          )}
        </div>
      </div>

      {/* Modal Buat Tugas Baru */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Publikasikan Tugas Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {/* Pilihan Kelas Sasaran (Bisa 1 atau banyak kelas) */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Pilih Kelas Sasaran yang Diberi Tugas <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={handleSelectAllClasses}
                      >
                        Pilih Semua Kelas
                      </button>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 10,
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {classes.map(c => {
                      const isSelected = createForm.class_ids.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleClassSelection(c.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1.5px solid',
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                            background: isSelected ? 'var(--primary)' : '#ffffff',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            fontSize: '0.82rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            border: `1.5px solid ${isSelected ? '#ffffff' : '#94a3b8'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? '#ffffff' : 'transparent',
                            color: 'var(--primary)',
                            fontSize: '0.65rem',
                            fontWeight: 900
                          }}>
                            {isSelected ? '✓' : ''}
                          </span>
                          Kelas {c.name}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Pilih satu atau beberapa kelas. Setiap kelas yang dipilih otomatis memiliki folder kelas tersendiri di dalam folder tugas.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Mata Pelajaran</label>
                    <select
                      className="form-control"
                      value={createForm.subject_id}
                      onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tenggat Waktu (Deadline)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="YYYY-MM-DD HH:mm"
                      value={createForm.due_date}
                      onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Tugas</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Tugas 3: Analisis Grafik Fungsi Kuadrat"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                  />
                </div>

                {/* Live Real-time Auto Folder Creation Preview */}
                <div style={{
                  background: 'rgba(37, 99, 235, 0.05)',
                  border: '1.5px solid #93c5fd',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#1e40af', fontSize: '0.84rem' }}>
                      <FolderOpen size={18} color="#2563eb" />
                      <span>Otomatisasi Struktur Folder Google Drive & Server:</span>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                      {classes.filter(c => createForm.class_ids.includes(c.id)).length} Kelas Dipilih
                    </span>
                  </div>

                  <div style={{
                    background: '#ffffff',
                    borderRadius: 6,
                    padding: '10px 14px',
                    border: '1px solid #bfdbfe',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      📁 {createForm.title ? createForm.title.trim() : '[Nama / Judul Tugas]'}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>(Folder Induk Tugas Otomatis)</span>
                    </div>

                    {classes.filter(c => createForm.class_ids.includes(c.id)).map((cls, idx, arr) => (
                      <div key={cls.id} style={{ paddingLeft: 22, marginTop: 4, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{idx === arr.length - 1 ? '└──' : '├──'}</span>
                        <span>📂 Kelas {cls.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                          ✓ Folder kelas otomatis dibuat
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 8, fontSize: '0.74rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} color="#2563eb" />
                    <span>Saat tugas diterbitkan, sistem otomatis membuat folder tugas dan subfolder untuk setiap kelas yang dipilih di atas.</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Petunjuk & Instruksi Pengerjaan</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Tuliskan petunjuk langkah kerja, format pengumpulan file, dan kriteria penilaian..."
                    value={createForm.instructions}
                    onChange={(e) => setCreateForm({ ...createForm, instructions: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Poin Maksimal</label>
                  <input
                    type="number"
                    className="form-control"
                    value={createForm.max_points}
                    onChange={(e) => setCreateForm({ ...createForm, max_points: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingAssignment}>
                  {isCreatingAssignment ? 'Membuat Tugas & Folder Otomatis...' : 'Tugaskan Sekarang & Buat Folder Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Google Drive Settings Modal */}
      {showDriveModal && (
        <div className="modal-overlay" onClick={() => setShowDriveModal(false)}>
          <div
            className="modal-container"
            style={{
              maxWidth: 780,
              width: '95%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cloud size={22} color="#2563eb" /> Pengaturan Integrasi Google Drive
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Simpan file tugas siswa otomatis ke Google Drive dengan struktur folder rapi
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowDriveModal(false)}
                style={{ padding: '4px 8px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
              {/* Structure Explanation Banner */}
              <div style={{
                background: 'rgba(37, 99, 235, 0.06)',
                border: '1.5px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 18px',
                marginBottom: 18
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e40af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FolderOpen size={18} /> Format Struktur Folder & File di Google Drive Anda:
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                  <div>📁 <strong>[Nama Tugas]</strong> (Contoh: <em>Tugas 1: Dinamika Gerak</em>)</div>
                  <div style={{ paddingLeft: 20 }}>📂 <strong>[Nama Kelas]</strong> (Contoh: <em>Kelas X-A</em>)</div>
                  <div style={{ paddingLeft: 40 }}>
                    📄 <strong>nomor absen_ nama siswa.[ext]</strong> (Contoh: <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4, color: '#1e40af', fontWeight: 700 }}>05_ Budi Santoso.pdf</code>)
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: driveSettings.isConfigured ? '#ecfdf5' : '#fef2f2',
                border: driveSettings.isConfigured ? '1px solid #10b981' : '1px solid #f87171',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: driveSettings.isConfigured ? '#10b981' : '#ef4444'
                  }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: driveSettings.isConfigured ? '#065f46' : '#991b1b' }}>
                    Status: {driveSettings.isConfigured ? 'Tersambung ke Google Drive' : 'Belum Dikonfigurasi (Tersimpan Lokal)'}
                  </span>
                </div>
                {driveSettings.lastTested && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Terakhir diuji: {new Date(driveSettings.lastTested).toLocaleString('id-ID')}
                  </span>
                )}
              </div>

              {/* Configuration Form */}
              <form onSubmit={handleSaveDriveSettings}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    URL Aplikasi Web Google Apps Script (Webhook) *
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      value={driveSettings.webhookUrl}
                      onChange={(e) => setDriveSettings({ ...driveSettings, webhookUrl: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleTestDriveConnection}
                      disabled={isTestingDrive || !driveSettings.webhookUrl}
                      style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {isTestingDrive ? 'Menguji...' : 'Tes Koneksi'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    URL Web App yang diperoleh setelah menerapkan Google Apps Script di Google Drive Anda.
                  </span>
                </div>

                {testResult && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 14,
                    fontSize: '0.82rem',
                    background: testResult.success ? '#ecfdf5' : '#fef2f2',
                    color: testResult.success ? '#065f46' : '#991b1b',
                    border: testResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca'
                  }}>
                    {testResult.success ? '✅ ' : '❌ '} {testResult.message}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    ID Folder Induk Google Drive (Opsional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: 1A2b3C4d5E6F... (Biarkan kosong untuk root My Drive)"
                    value={driveSettings.parentFolderId}
                    onChange={(e) => setDriveSettings({ ...driveSettings, parentFolderId: e.target.value })}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Bisa dikosongkan. Jika diisi, seluruh folder tugas dan kelas akan dibuat di dalam folder induk tersebut.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowDriveModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSavingDrive}>
                    {isSavingDrive ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </form>

              {/* Step-by-Step Setup Guide */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} color="var(--primary)" /> Panduan Setup Google Apps Script (2 Menit Tanpa Ribet):
                </h4>
                <ol style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.6, paddingLeft: 20, margin: 0 }}>
                  <li>Buka <strong><a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>script.google.com</a></strong> dan login dengan akun Google Anda.</li>
                  <li>Klik tombol <strong>"+ Proyek baru"</strong> (New Project).</li>
                  <li>Hapus semua kode bawaan, lalu salin dan tempel kode berikut:</li>
                </ol>

                <div style={{ position: 'relative', marginTop: 8, marginBottom: 10 }}>
                  <pre style={{
                    background: '#1e293b',
                    color: '#e2e8f0',
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    maxHeight: 180,
                    overflowY: 'auto',
                    fontFamily: 'monospace'
                  }}>
                    {APPS_SCRIPT_CODE}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: copiedScript ? '#10b981' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {copiedScript ? <Check size={12} /> : <Copy size={12} />}
                    {copiedScript ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                </div>

                <ol start="4" style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.6, paddingLeft: 20, margin: 0 }}>
                  <li>Klik tombol <strong>Deploy (Terapkan)</strong> &gt; <strong>New deployment (Penerapan baru)</strong>.</li>
                  <li>Pilih jenis <strong>Web App (Aplikasi Web)</strong>.</li>
                  <li>Pada bagian <em>Who has access (Siapa yang memiliki akses)</em>, pilih <strong>Anyone (Siapa saja)</strong>.</li>
                  <li>Klik <strong>Deploy</strong>, izinkan akses akun Google Anda, lalu salin <strong>Web App URL</strong> dan tempelkan ke kolom URL di atas!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Local Files Preview Modal */}
      {localFilesModal && (
        <div className="modal-overlay" onClick={() => setLocalFilesModal(null)}>
          <div className="modal-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={18} color="var(--primary)" />
                Penyimpanan Berkas Server Lokal
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setLocalFilesModal(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                padding: '10px 14px',
                background: 'rgba(37, 99, 235, 0.06)',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 14,
                fontSize: '0.82rem'
              }}>
                <div>📁 Folder Tugas: <strong>{localFilesModal.task}</strong></div>
                <div style={{ marginTop: 2 }}>📂 Folder Kelas: <strong>Kelas {localFilesModal.class}</strong></div>
              </div>

              {localFilesModal.files?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {localFilesModal.files.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{f.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {f.size} • Diunggah {new Date(f.updatedAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <a href={f.url} download className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={13} /> Unduh
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Folder tugas dan kelas sudah siap dibuat di direktori server.<br />
                  Belum ada berkas tugas yang diunggah siswa.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setLocalFilesModal(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
