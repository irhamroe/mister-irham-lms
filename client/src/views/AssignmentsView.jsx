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
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AssignmentsView() {
  const { user, classes = [], subjects = [] } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    class_id: '',
    subject_id: '',
    title: '',
    instructions: '',
    due_date: '2026-10-28 23:59',
    max_points: 100,
    attachments: []
  });

  // Selected assignment for detailed review / submission
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);

  // Student submission form
  const [submissionForm, setSubmissionForm] = useState({
    content: '',
    fileName: 'Jawaban_Tugas.pdf',
    fileUrl: '#'
  });

  // Teacher grading state
  const [gradingForm, setGradingForm] = useState({
    student_id: null,
    score: '',
    teacher_feedback: ''
  });

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';

  useEffect(() => {
    loadAssignments();
  }, [user, selectedClass, selectedSubject]);

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

  async function handleCreateAssignment(e) {
    e.preventDefault();
    try {
      await api.createAssignment({
        ...createForm,
        class_id: Number(createForm.class_id || classes[0]?.id),
        subject_id: Number(createForm.subject_id || subjects[0]?.id)
      });
      setShowCreateModal(false);
      loadAssignments();
      alert('Tugas baru berhasil dipublikasikan!');
    } catch (err) {
      alert('Gagal membuat tugas: ' + err.message);
    }
  }

  async function handleStudentSubmit(e) {
    e.preventDefault();
    try {
      await api.submitAssignment(activeAssignment, {
        content: submissionForm.content,
        attachments: [
          { name: submissionForm.fileName, url: submissionForm.fileUrl, size: '1.2 MB' }
        ]
      });
      openAssignmentDetails(activeAssignment);
      loadAssignments();
      alert('Tugas Anda berhasil diserahkan ke guru!');
    } catch (err) {
      alert('Gagal menyerahkan tugas: ' + err.message);
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
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
          </select>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Semua Mapel</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Buat Tugas Baru
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
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

                  <form onSubmit={handleStudentSubmit}>
                    <div className="form-group">
                      <label className="form-label">Tulis Catatan / Jawaban Teks</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Ketik ringkasan atau keterangan pengerjaan tugas Anda..."
                        value={submissionForm.content}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nama File Lampiran (Simulasi Upload PDF/Docx)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: Tugas_Matematika_SPLTV.pdf"
                        value={submissionForm.fileName}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, fileName: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button type="submit" className="btn btn-primary btn-lg">
                        <Send size={16} />
                        {assignmentDetail.my_submission ? 'Kirim Ulang Tugas' : 'Serahkan Tugas (Turn In)'}
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src={student.avatar} alt={student.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
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
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                                  <Paperclip size={13} /> {submission.attachments[0].name}
                                </span>
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
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Publikasikan Tugas Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kelas Sasaran</label>
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

                <div className="form-group">
                  <label className="form-label">Petunjuk & Instruksi Pengerjaan</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Tuliskan petunjuk langkah kerja, format pengumpulan file, dan kriteria penilaian..."
                    value={createForm.instructions}
                    onChange={(e) => setCreateForm({ ...createForm, instructions: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Tugaskan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
