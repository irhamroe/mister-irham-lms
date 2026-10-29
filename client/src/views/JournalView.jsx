import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  Plus,
  Calendar,
  Clock,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  Printer,
  Users,
  RotateCw,
  CheckCircle2,
  Info,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/AlertContext';
import { api } from '../services/api';

export default function JournalView() {
  const { user, classes, subjects } = useAuth();
  const { showToast, showConfirm } = useDialog();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedHours, setSelectedHours] = useState([1, 2]);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);
  const [attendanceSyncStatus, setAttendanceSyncStatus] = useState(null);
  const [form, setForm] = useState({
    class_id: '',
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    time_slot: 'Jam ke 1-2',
    topic: '',
    learning_outcomes: '',
    activities: '',
    student_notes: '',
    follow_up: '',
    count_present: 0,
    count_absent: 0,
    absent_students: ''
  });

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';

  useEffect(() => {
    loadJournals();
  }, [selectedClass, selectedSubject, searchTerm]);

  async function loadJournals() {
    try {
      setLoading(true);
      const data = await api.getJournals({
        class_id: selectedClass || undefined,
        subject_id: selectedSubject || undefined,
        search: searchTerm || undefined
      });
      setJournals(data);
    } catch (err) {
      console.error('Load journals error:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatHoursToSlot(hours) {
    if (!hours || hours.length === 0) return '';
    const sorted = [...hours].sort((a, b) => a - b);
    const isConsecutive = sorted.length > 1 && sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
    if (isConsecutive) {
      return `Jam ke ${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return `Jam ke ${sorted.join(', ')}`;
  }

  function parseSlotToHours(str) {
    if (!str || typeof str !== 'string') return [1, 2];
    const rangeMatch = str.match(/(\d+)\s*(?:-|s\.?d\.?|sampai)\s*(\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start >= 1 && end <= 10 && start <= end) {
        const res = [];
        for (let i = start; i <= end; i++) res.push(i);
        return res;
      }
    }
    const matches = str.match(/\b([1-9]|10)\b/g);
    if (matches && matches.length > 0) {
      return [...new Set(matches.map(Number))].sort((a, b) => a - b);
    }
    return [1, 2];
  }

  function toggleHour(h) {
    setSelectedHours(prev => {
      const next = prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h];
      const sorted = next.sort((a, b) => a - b);
      const slotStr = formatHoursToSlot(sorted);
      setForm(f => ({ ...f, time_slot: slotStr }));
      return sorted;
    });
  }

  async function checkAndAutoFillAttendance(classId, subjectId, date, force = false) {
    if (!classId || !date) return;
    try {
      setIsCheckingAttendance(true);
      setAttendanceSyncStatus({ type: 'loading', message: 'Mengecek data presensi kelas...' });

      const sessions = await api.getAttendanceSessions({
        class_id: classId,
        date: date
      });

      const sessionList = Array.isArray(sessions) ? sessions : [];
      if (sessionList.length === 0) {
        setAttendanceSyncStatus({
          type: 'warning',
          message: 'Belum ada sesi presensi untuk kelas dan tanggal ini. Anda dapat menulis daftar siswa secara manual.'
        });
        if (force) {
          showToast('info', 'Tidak ditemukan sesi presensi pada kelas dan tanggal ini.');
        }
        return;
      }

      // Prioritize session that matches subject_id
      let targetSession = sessionList.find(s => Number(s.subject_id) === Number(subjectId));
      if (!targetSession) {
        targetSession = sessionList[0];
      }

      const details = await api.getAttendanceSessionDetails(targetSession.id);
      const studentList = details?.students || [];
      const stats = details?.stats || {};

      let presentCount = 0;
      const absentList = [];
      studentList.forEach(st => {
        const rec = st.record || {};
        const status = rec.status || st.status || 'Belum Presensi';
        const notes = (rec.notes || st.notes || '').trim();

        if (status === 'Hadir' || status === 'Terlambat') {
          presentCount++;
        } else if (['Sakit', 'Izin', 'Alpa', 'Tidak Hadir'].includes(status)) {
          absentList.push(`${st.name} (${status}${notes ? `: ${notes}` : ''})`);
        } else if (status === 'Belum Presensi' && ((stats.hadir || 0) > 0 || (stats.sakit || 0) > 0 || (stats.izin || 0) > 0 || (stats.alpa || 0) > 0)) {
          absentList.push(`${st.name} (Belum Presensi / Alpa)`);
        }
      });

      const absentCount = absentList.length;
      let absentResult = '';
      if (absentList.length > 0) {
        absentResult = absentList.join(', ');
        setAttendanceSyncStatus({
          type: 'success',
          message: `Tersinkron dari presensi (${targetSession.session_title || 'Sesi Presensi'} ${targetSession.time_start || ''}-${targetSession.time_end || ''}): ${presentCount} Siswa Hadir, ${absentCount} Siswa Tidak Masuk.`
        });
        if (force) {
          showToast('success', `Presensi tersinkron: ${presentCount} Hadir, ${absentCount} Tidak Masuk.`);
        }
      } else {
        if ((stats.hadir || 0) > 0 || studentList.length > 0) {
          absentResult = 'Nihil (Semua siswa hadir)';
          setAttendanceSyncStatus({
            type: 'success',
            message: `Tersinkron dari presensi (${targetSession.session_title || 'Sesi Presensi'} ${targetSession.time_start || ''}-${targetSession.time_end || ''}): Semua ${presentCount} siswa hadir (Nihil).`
          });
          if (force) {
            showToast('success', `Semua siswa hadir (${presentCount} siswa).`);
          }
        } else {
          setAttendanceSyncStatus({
            type: 'info',
            message: `Sesi "${targetSession.session_title}" ditemukan, namun presensi belum dicatat.`
          });
        }
      }

      setForm(prev => ({
        ...prev,
        count_present: presentCount,
        count_absent: absentCount,
        absent_students: absentResult
      }));
    } catch (err) {
      console.error('Check attendance error:', err);
      setAttendanceSyncStatus({
        type: 'error',
        message: 'Gagal mengecek presensi: ' + err.message
      });
    } finally {
      setIsCheckingAttendance(false);
    }
  }

  function handleOpenCreate() {
    setEditId(null);
    const initialHours = [1, 2];
    setSelectedHours(initialHours);
    const initialClassId = classes[0]?.id || '';
    const initialSubjectId = subjects[0]?.id || '';
    const initialDate = new Date().toISOString().split('T')[0];

    setForm({
      class_id: initialClassId,
      subject_id: initialSubjectId,
      date: initialDate,
      time_slot: formatHoursToSlot(initialHours),
      topic: '',
      learning_outcomes: '',
      activities: '',
      student_notes: '',
      follow_up: '',
      count_present: 0,
      count_absent: 0,
      absent_students: ''
    });
    setAttendanceSyncStatus(null);
    setShowModal(true);

    if (initialClassId && initialDate) {
      checkAndAutoFillAttendance(initialClassId, initialSubjectId, initialDate, false);
    }
  }

  function handleOpenEdit(j) {
    setEditId(j.id);
    const hours = parseSlotToHours(j.time_slot);
    setSelectedHours(hours);
    setForm({
      class_id: j.class_id,
      subject_id: j.subject_id,
      date: j.date,
      time_slot: j.time_slot || formatHoursToSlot(hours),
      topic: j.topic,
      learning_outcomes: j.learning_outcomes || '',
      activities: j.activities,
      student_notes: j.student_notes || '',
      follow_up: j.follow_up || '',
      count_present: j.count_present ?? 0,
      count_absent: j.count_absent ?? 0,
      absent_students: j.absent_students || ''
    });
    setAttendanceSyncStatus(
      j.absent_students
        ? { type: 'info', message: 'Menampilkan data siswa tidak masuk yang tersimpan pada jurnal ini. Klik "Sinkronkan dari Presensi" jika ingin memperbarui dari data presensi kelas.' }
        : null
    );
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.time_slot) {
      showToast('error', 'Silakan pilih minimal satu jam pelajaran.');
      return;
    }
    try {
      if (editId) {
        await api.updateJournal(editId, form);
        showToast('success', 'Jurnal berhasil diperbarui!');
      } else {
        await api.createJournal(form);
        showToast('success', 'Jurnal mengajar baru berhasil disimpan!');
      }
      setShowModal(false);
      loadJournals();
    } catch (err) {
      showToast('error', 'Gagal menyimpan jurnal: ' + err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = await showConfirm({
      title: 'Hapus Jurnal Mengajar',
      message: 'Apakah Anda yakin ingin menghapus catatan agenda mengajar ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.deleteJournal(id);
      loadJournals();
      showToast('success', 'Catatan jurnal berhasil dihapus');
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  }

  return (
    <div className="content-view">
      {/* Top Filter and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              className="form-control"
              placeholder="Cari topik / materi..."
              style={{ paddingLeft: 36, width: 220 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <Printer size={16} /> Cetak Jurnal
          </button>
          {isTeacher && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Catat Agenda Mengajar
            </button>
          )}
        </div>
      </div>

      {/* Journals Timeline / Grid */}
      {journals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <BookOpenCheck size={48} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3>Belum ada agenda jurnal mengajar</h3>
          <p style={{ fontSize: '0.88rem', marginTop: 4 }}>
            Klik tombol "Catat Agenda Mengajar" di atas untuk menambahkan catatan pembelajaran harian Anda.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {journals.map((j) => (
            <div key={j.id} className="card" style={{ padding: '22px 26px', transition: 'border-color 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge badge-primary">{j.subject_name}</span>
                    <span className="badge badge-neutral">Kelas {j.class_name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} /> {j.date}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {j.time_slot}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                    {j.topic}
                  </h3>
                </div>

                {isTeacher && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleOpenEdit(j)} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(j.id)} title="Hapus" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {j.learning_outcomes && (
                <div style={{ marginBottom: 12, background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: 2 }}>
                    Capaian / Tujuan Pembelajaran:
                  </strong>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{j.learning_outcomes}</p>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                  Kegiatan Pembelajaran:
                </strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{j.activities}</p>
              </div>

              {(j.count_present !== undefined || j.count_absent !== undefined || j.absent_students) && (
                <div style={{
                  marginBottom: 14,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: ((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#ecfdf5' : '#fff1f2',
                  border: `1px solid ${((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#a7f3d0' : '#fecdd3'}`
                }}>
                  {/* Kehadiran Siswa Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={15} color={((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#059669' : '#e11d48'} />
                      <strong style={{
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: ((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#047857' : '#be123c'
                      }}>
                        Kehadiran Siswa:
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <UserCheck size={13} /> Masuk: {j.count_present ?? '-'} Siswa
                      </span>
                      <span style={{
                        background: (j.count_absent > 0) ? '#ffe4e6' : '#f1f5f9',
                        color: (j.count_absent > 0) ? '#be123c' : '#475569',
                        padding: '3px 9px',
                        borderRadius: 5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <UserX size={13} /> Tidak Masuk: {j.count_absent ?? 0} Siswa
                      </span>
                    </div>
                  </div>

                  {/* Daftar Siswa Tidak Masuk */}
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      color: ((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#047857' : '#be123c',
                      fontWeight: 700,
                      display: 'block',
                      marginBottom: 2
                    }}>
                      Daftar Siswa Tidak Masuk:
                    </span>
                    <p style={{
                      fontSize: '0.86rem',
                      color: ((j.count_absent === 0 || !j.count_absent) && (j.absent_students && j.absent_students.toLowerCase().includes('nihil'))) ? '#065f46' : '#9f1239',
                      margin: 0,
                      fontWeight: 600
                    }}>
                      {j.absent_students || 'Nihil (Semua siswa hadir)'}
                    </p>
                  </div>
                </div>
              )}

              {(j.student_notes || j.follow_up) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  {j.student_notes && (
                    <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #fef3c7' }}>
                      <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#b45309', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <AlertCircle size={13} /> Catatan Khusus / Kasus Siswa:
                      </strong>
                      <p style={{ fontSize: '0.85rem', color: '#78350f' }}>{j.student_notes}</p>
                    </div>
                  )}

                  {j.follow_up && (
                    <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #d1fae5' }}>
                      <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#047857', display: 'block', marginBottom: 2 }}>
                        Tindak Lanjut / Rekomendasi:
                      </strong>
                      <p style={{ fontSize: '0.85rem', color: '#065f46' }}>{j.follow_up}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Catat / Edit Jurnal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {editId ? 'Edit Catatan Jurnal Mengajar' : 'Catat Agenda Mengajar Harian'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select
                      className="form-control"
                      value={form.class_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(f => ({ ...f, class_id: val }));
                        checkAndAutoFillAttendance(val, form.subject_id, form.date);
                      }}
                      required
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mata Pelajaran</label>
                    <select
                      className="form-control"
                      value={form.subject_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(f => ({ ...f, subject_id: val }));
                        checkAndAutoFillAttendance(form.class_id, val, form.date);
                      }}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal Pelaksanaan</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(f => ({ ...f, date: val }));
                        checkAndAutoFillAttendance(form.class_id, form.subject_id, val);
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Pelajaran Terpilih (Slot)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.time_slot}
                      readOnly
                      placeholder="Pilih checklist jam di bawah..."
                      style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-subtle)' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: -2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Ceklis Jam Pelajaran (Jam ke 1 s/d 10)</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pilih satu atau lebih jam ke-</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => {
                      const isChecked = selectedHours.includes(h);
                      return (
                        <label
                          key={h}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '9px 8px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isChecked ? 'var(--primary-light)' : 'var(--bg-surface)',
                            color: isChecked ? 'var(--primary)' : 'var(--text-main)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: isChecked ? 700 : 500,
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleHour(h)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <span>Jam ke {h}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Topik / Materi Pokok Pembelajaran</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Penyelesaian SPLTV Metode Gabungan Eliminasi-Substitusi"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ringkasan Kegiatan & Aktivitas Belajar</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Tuliskan aktivitas pembuka, inti, dan penutup pembelajaran..."
                    value={form.activities}
                    onChange={(e) => setForm({ ...form, activities: e.target.value })}
                    required
                  />
                </div>

                {/* Kolom Jumlah Siswa Masuk & Tidak Masuk (Sebelum Daftar Nama) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserCheck size={16} color="var(--success)" /> Jumlah Siswa Masuk (Hadir)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.count_present}
                      onChange={(e) => setForm({ ...form, count_present: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Otomatis terisi dari presensi kelas</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserX size={16} color="var(--danger)" /> Jumlah Siswa Tidak Masuk
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.count_absent}
                      onChange={(e) => setForm({ ...form, count_absent: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Otomatis terisi dari presensi kelas</span>
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={16} color="var(--primary)" /> Siswa yang Tidak Masuk (Presensi)
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => checkAndAutoFillAttendance(form.class_id, form.subject_id, form.date, true)}
                      disabled={isCheckingAttendance}
                      style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                      title="Sinkronkan ulang daftar siswa tidak masuk dari presensi kelas"
                    >
                      <RotateCw size={13} className={isCheckingAttendance ? 'spin' : ''} />
                      {isCheckingAttendance ? 'Mengecek Presensi...' : 'Sinkronkan dari Presensi'}
                    </button>
                  </div>

                  {attendanceSyncStatus && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      marginBottom: 8,
                      background: attendanceSyncStatus.type === 'success' ? '#ecfdf5' : (attendanceSyncStatus.type === 'warning' ? '#fffbeb' : '#f0f9ff'),
                      border: `1px solid ${attendanceSyncStatus.type === 'success' ? '#a7f3d0' : (attendanceSyncStatus.type === 'warning' ? '#fde68a' : '#bae6fd')}`,
                      color: attendanceSyncStatus.type === 'success' ? '#065f46' : (attendanceSyncStatus.type === 'warning' ? '#92400e' : '#0369a1')
                    }}>
                      {attendanceSyncStatus.type === 'success' && <CheckCircle2 size={14} className="flex-shrink-0" />}
                      {attendanceSyncStatus.type === 'warning' && <AlertCircle size={14} className="flex-shrink-0" />}
                      {attendanceSyncStatus.type === 'info' && <Info size={14} className="flex-shrink-0" />}
                      {attendanceSyncStatus.type === 'loading' && <RotateCw size={14} className="flex-shrink-0 spin" />}
                      <span>{attendanceSyncStatus.message}</span>
                    </div>
                  )}

                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Otomatis terisi dari presensi kelas (atau tulis manual jika belum ada presensi)..."
                    value={form.absent_students}
                    onChange={(e) => setForm({ ...form, absent_students: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Daftar siswa yang tidak masuk otomatis ditarik dari sesi presensi kelas pada jam pembelajaran terkait. Anda tetap dapat mengedit atau menambahkan catatan secara manual jika diperlukan.
                  </span>
                </div>
              </div>
              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DOKUMEN RESMI HASIL CETAK JURNAL MENGAJAR (PRINT ONLY)
          ======================================================== */}
      <div className="journal-print-document">
        <div style={{ textAlign: 'center', borderBottom: '2.5px solid #000', paddingBottom: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: '14pt', fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            JURNAL AGENDA PEMBELAJARAN GURU
          </h2>
          <h3 style={{ fontSize: '11.5pt', fontWeight: 700, margin: '0 0 3px' }}>
            MISTER IRHAM LMS • TAHUN AJARAN 2026/2027
          </h3>
          <p style={{ fontSize: '9pt', margin: 0, color: '#333' }}>
            Rekapitulasi Catatan Pembelajaran, Aktivitas Mengajar, dan Kehadiran Siswa
          </p>
        </div>

        <table style={{ width: '100%', marginBottom: 14, fontSize: '9.5pt', border: 'none', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: '2px 0' }}>
                <div><strong>Guru Pengampu:</strong> {user?.name || '-'}</div>
                <div><strong>NIP / Identitas:</strong> {user?.nis_nip || '-'}</div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right', border: 'none', padding: '2px 0' }}>
                <div><strong>Kelas:</strong> {selectedClass ? (classes.find(c => String(c.id) === String(selectedClass))?.name || `Kelas ${selectedClass}`) : 'Semua Kelas Terdaftar'}</div>
                <div><strong>Mata Pelajaran:</strong> {selectedSubject ? (subjects.find(s => String(s.id) === String(selectedSubject))?.name || selectedSubject) : 'Semua Mata Pelajaran'}</div>
                <div><strong>Total Pertemuan:</strong> {journals.length} Pertemuan</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="print-journal-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>No</th>
              <th style={{ width: 80 }}>Tanggal</th>
              <th style={{ width: 75 }}>Jam Ke</th>
              <th style={{ width: 65 }}>Kelas</th>
              <th style={{ width: 95 }}>Mata Pelajaran</th>
              <th style={{ width: 135 }}>Materi / Topik Pembelajaran</th>
              <th>Ringkasan Kegiatan & Aktivitas Belajar</th>
              <th style={{ width: 50 }}>Jml Masuk</th>
              <th style={{ width: 55 }}>Jml Tdk Masuk</th>
              <th style={{ width: 140 }}>Siswa Tidak Masuk</th>
            </tr>
          </thead>
          <tbody>
            {journals.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '20px 10px', fontStyle: 'italic' }}>
                  Tidak ada data agenda jurnal mengajar untuk filter yang dipilih.
                </td>
              </tr>
            ) : (
              journals.map((j, idx) => (
                <tr key={j.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{j.date}</td>
                  <td style={{ textAlign: 'center' }}>{j.time_slot}</td>
                  <td style={{ textAlign: 'center' }}>{j.class_name}</td>
                  <td>{j.subject_name}</td>
                  <td><strong>{j.topic}</strong></td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{j.activities}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{j.count_present ?? '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{j.count_absent ?? 0}</td>
                  <td>{j.absent_students || 'Nihil'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tanda Tangan Pengesahan Dokumen */}
        <div className="print-signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 35, fontSize: '10pt' }}>
          <div style={{ textAlign: 'center', width: 220 }}>
            <div>Mengetahui,</div>
            <div style={{ marginBottom: 55 }}>Kepala Sekolah</div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>___________________________</div>
            <div>NIP. ........................................</div>
          </div>
          <div style={{ textAlign: 'center', width: 220 }}>
            <div>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style={{ marginBottom: 55 }}>Guru Mata Pelajaran</div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{user?.name || '___________________________'}</div>
            <div>NIP. {user?.nis_nip || '........................................'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
