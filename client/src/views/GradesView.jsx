import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Sliders,
  Plus,
  Download,
  Save,
  CheckCircle,
  AlertCircle,
  Calculator,
  Percent,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentAvatar } from '../components/StudentAvatar';

export default function GradesView() {
  const { user, classes, subjects } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Weight configuration modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weights, setWeights] = useState({
    attendance_weight: 15,
    assignment_weight: 35,
    formatif_weight: 25,
    sumatif_weight: 25,
    kkm: 75
  });

  // Add grade column / activity modal
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [newGradeCol, setNewGradeCol] = useState({
    category: 'TUGAS', // 'TUGAS' | 'FORMATIF' | 'SUMATIF_LM' | 'SUMATIF_PAS'
    title: '',
    max_score: 100,
    scores: {} // student_id -> score
  });

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
    if (selectedClass && selectedSubject) {
      loadLedger();
    }
  }, [selectedClass, selectedSubject, user]);

  async function loadLedger() {
    try {
      setLoading(true);
      const data = await api.getGradeLedger(selectedClass, selectedSubject);
      setLedgerData(data);
      if (data.weights) {
        setWeights(data.weights);
      }
    } catch (err) {
      console.error('Load ledger error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWeights(e) {
    e.preventDefault();
    try {
      await api.updateGradeWeights({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        ...weights
      });
      setShowWeightModal(false);
      loadLedger();
      alert('Bobot penilaian berhasil diperbarui!');
    } catch (err) {
      alert('Gagal menyimpan bobot: ' + err.message);
    }
  }

  function handleOpenAddGrade() {
    if (!ledgerData) return;
    const initialScores = {};
    ledgerData.rows.forEach(r => {
      initialScores[r.student.id] = '';
    });
    setNewGradeCol({
      category: 'TUGAS',
      title: '',
      max_score: 100,
      scores: initialScores
    });
    setShowAddGradeModal(true);
  }

  async function handleSaveNewGrade(e) {
    e.preventDefault();
    try {
      const entries = Object.entries(newGradeCol.scores)
        .filter(([_, score]) => score !== '')
        .map(([student_id, score]) => ({
          student_id: Number(student_id),
          score: Number(score)
        }));

      await api.saveBatchGrades({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        category: newGradeCol.category,
        title: newGradeCol.title,
        max_score: Number(newGradeCol.max_score),
        entries
      });

      setShowAddGradeModal(false);
      loadLedger();
      alert('Komponen nilai baru berhasil ditambahkan!');
    } catch (err) {
      alert('Gagal menyimpan nilai: ' + err.message);
    }
  }

  function exportCSV() {
    if (!ledgerData || !ledgerData.rows.length) return;
    
    const headers = ['No', 'Nama Siswa', 'NIS', 'Presensi', 'Rerata Tugas', 'Rerata Formatif', 'Rerata Sumatif', 'Nilai Akhir (NA)', 'Predikat', 'Status'];
    const rows = ledgerData.rows.map((r, i) => [
      i + 1,
      `"${r.student.name}"`,
      r.student.nis,
      r.attendanceScore,
      r.avgTugas,
      r.avgFormatif,
      r.avgSumatif,
      r.finalScore,
      r.predicate,
      r.isPassed ? 'TUNTAS' : 'BELUM TUNTAS'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Nilai_Kelas_${selectedClass}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="content-view">
      {/* Top Filter and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
          </select>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16} /> Ekspor CSV / Excel
          </button>

          {isTeacher && (
            <>
              <button className="btn btn-outline" onClick={() => setShowWeightModal(true)}>
                <Sliders size={16} /> Atur Bobot Nilai
              </button>
              <button className="btn btn-primary" onClick={handleOpenAddGrade}>
                <Plus size={16} /> Tambah Input Nilai
              </button>
            </>
          )}
        </div>
      </div>

      {/* Weights Summary Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 22px', background: 'var(--bg-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Formula Bobot Aktif:</span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <span>Presensi: <strong>{weights.attendance_weight}%</strong></span>
            <span>Tugas: <strong>{weights.assignment_weight}%</strong></span>
            <span>Formatif: <strong>{weights.formatif_weight}%</strong></span>
            <span>Sumatif/CBT: <strong>{weights.sumatif_weight}%</strong></span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>KKM: <strong>{weights.kkm}</strong></span>
          </div>
        </div>
      </div>

      {/* Grade Ledger Spreadsheet Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 45 }}>No</th>
                <th>Nama Peserta Didik</th>
                <th>NIS</th>
                <th style={{ textAlign: 'center' }}>Presensi ({weights.attendance_weight}%)</th>
                <th style={{ textAlign: 'center' }}>Tugas ({weights.assignment_weight}%)</th>
                <th style={{ textAlign: 'center' }}>Formatif ({weights.formatif_weight}%)</th>
                <th style={{ textAlign: 'center' }}>Sumatif ({weights.sumatif_weight}%)</th>
                <th style={{ textAlign: 'center', background: '#e0e7ff', color: '#312e81' }}>Nilai Akhir (NA)</th>
                <th style={{ textAlign: 'center' }}>Predikat</th>
                <th style={{ textAlign: 'center' }}>Ketercapaian</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData?.rows?.map((row, idx) => (
                <tr key={row.student.id}>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{row.student.no_absen || (idx + 1)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StudentAvatar name={row.student.name} size={26} />
                      <strong style={{ fontSize: '0.88rem' }}>{row.student.name}</strong>
                    </div>
                  </td>
                  <td>{row.student.nis}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{row.attendanceScore}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{row.avgTugas}</strong>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{row.avgFormatif}</strong>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{row.avgSumatif}</strong>
                  </td>
                  <td style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {row.finalScore}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${row.predicate === 'A' ? 'badge-success' : row.predicate === 'B' ? 'badge-primary' : row.predicate === 'C' ? 'badge-warning' : 'badge-danger'}`} style={{ width: 28, justifyContent: 'center' }}>
                      {row.predicate}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.isPassed ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Tuntas
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> Remedial
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Atur Bobot Penilaian */}
      {showWeightModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Kustomisasi Bobot Penilaian</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowWeightModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveWeights}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                  Tentukan persentase bobot masing-masing komponen penilaian untuk mata pelajaran ini. Nilai Akhir (NA) siswa akan dihitung secara otomatis berdasarkan bobot berikut.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Bobot Presensi Kehadiran (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      value={weights.attendance_weight}
                      onChange={(e) => setWeights({ ...weights, attendance_weight: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bobot Tugas Harian (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      value={weights.assignment_weight}
                      onChange={(e) => setWeights({ ...weights, assignment_weight: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bobot Asesmen Formatif (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      value={weights.formatif_weight}
                      onChange={(e) => setWeights({ ...weights, formatif_weight: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bobot Asesmen Sumatif / CBT (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      value={weights.sumatif_weight}
                      onChange={(e) => setWeights({ ...weights, sumatif_weight: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">KKM / Kriteria Ketuntasan Minimal</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    className="form-control"
                    value={weights.kkm}
                    onChange={(e) => setWeights({ ...weights, kkm: Number(e.target.value) })}
                    required
                  />
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Total Bobot: <strong>{Number(weights.attendance_weight) + Number(weights.assignment_weight) + Number(weights.formatif_weight) + Number(weights.sumatif_weight)}%</strong> (Direkomendasikan berjumlah 100%)
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowWeightModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Bobot Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kolom Nilai Baru */}
      {showAddGradeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Input Penilaian Baru</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowAddGradeModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveNewGrade}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kategori Asesmen</label>
                    <select
                      className="form-control"
                      value={newGradeCol.category}
                      onChange={(e) => setNewGradeCol({ ...newGradeCol, category: e.target.value })}
                    >
                      <option value="TUGAS">Tugas Mandiri / Proyek</option>
                      <option value="FORMATIF">Asesmen Formatif (Kuis / Latihan)</option>
                      <option value="SUMATIF_LM">Sumatif Lingkup Materi</option>
                      <option value="SUMATIF_PAS">Sumatif Akhir Semester</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Skor Maksimal</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newGradeCol.max_score}
                      onChange={(e) => setNewGradeCol({ ...newGradeCol, max_score: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama / Judul Asesmen</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Kuis 2: Persamaan Kuadrat"
                    value={newGradeCol.title}
                    onChange={(e) => setNewGradeCol({ ...newGradeCol, title: e.target.value })}
                    required
                  />
                </div>

                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '14px 0 8px' }}>
                  Input Nilai Per Siswa:
                </h5>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                  {ledgerData?.rows?.map(row => (
                    <div key={row.student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.student.name}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        placeholder="0-100"
                        style={{ width: 90, textAlign: 'center', padding: '4px 8px' }}
                        value={newGradeCol.scores[row.student.id] || ''}
                        onChange={(e) => setNewGradeCol({
                          ...newGradeCol,
                          scores: { ...newGradeCol.scores, [row.student.id]: e.target.value }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddGradeModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Semua Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
