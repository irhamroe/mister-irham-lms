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
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function JournalView() {
  const { user, classes, subjects } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    class_id: '',
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    time_slot: 'Jam ke 1-2 (07.30 - 09.00)',
    topic: '',
    learning_outcomes: '',
    activities: '',
    student_notes: '',
    follow_up: ''
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

  function handleOpenCreate() {
    setEditId(null);
    setForm({
      class_id: classes[0]?.id || '',
      subject_id: subjects[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      time_slot: 'Jam ke 1-2 (07.30 - 09.00)',
      topic: '',
      learning_outcomes: '',
      activities: '',
      student_notes: '',
      follow_up: ''
    });
    setShowModal(true);
  }

  function handleOpenEdit(j) {
    setEditId(j.id);
    setForm({
      class_id: j.class_id,
      subject_id: j.subject_id,
      date: j.date,
      time_slot: j.time_slot,
      topic: j.topic,
      learning_outcomes: j.learning_outcomes || '',
      activities: j.activities,
      student_notes: j.student_notes || '',
      follow_up: j.follow_up || ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api.updateJournal(editId, form);
        alert('Jurnal berhasil diperbarui!');
      } else {
        await api.createJournal(form);
        alert('Jurnal mengajar baru berhasil disimpan!');
      }
      setShowModal(false);
      loadJournals();
    } catch (err) {
      alert('Gagal menyimpan jurnal: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan jurnal ini?')) return;
    try {
      await api.deleteJournal(id);
      loadJournals();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
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
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 700 }}>
            <div className="modal-header">
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select
                      className="form-control"
                      value={form.class_id}
                      onChange={(e) => setForm({ ...form, class_id: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                      required
                    >
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Pelajaran (Slot)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Jam ke 1-2 (07.30 - 09.00)"
                      value={form.time_slot}
                      onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                      required
                    />
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
                  <label className="form-label">Tujuan / Capaian Pembelajaran</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Peserta didik terampil menentukan himpunan penyelesaian dengan cepat"
                    value={form.learning_outcomes}
                    onChange={(e) => setForm({ ...form, learning_outcomes: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ringkasan Kegiatan & Aktivitas Belajar</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Tuliskan aktivitas pembuka, inti, dan penutup pembelajaran..."
                    value={form.activities}
                    onChange={(e) => setForm({ ...form, activities: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Catatan Kasus / Kendala Siswa</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Siswa yang perlu perhatian, kendala kelas..."
                      value={form.student_notes}
                      onChange={(e) => setForm({ ...form, student_notes: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tindak Lanjut / Solusi</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Langkah tindak lanjut guru..."
                      value={form.follow_up}
                      onChange={(e) => setForm({ ...form, follow_up: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
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
    </div>
  );
}
