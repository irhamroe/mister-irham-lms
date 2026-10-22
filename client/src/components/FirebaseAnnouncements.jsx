import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Clock,
  Radio,
  Flame,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Info,
  Send,
  X
} from 'lucide-react';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { database } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { FlatBadge } from './common/FlatComponents';

export default function FirebaseAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('INFO');

  const isTeacherOrAdmin = user?.role === 'guru' || user?.role === 'admin';

  useEffect(() => {
    // Listen to announcements node in Firebase Realtime Database
    const announcementsRef = ref(database, 'announcements');

    const unsubscribe = onValue(
      announcementsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Convert Firebase object to sorted array (newest first)
          const list = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
          })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          setAnnouncements(list);
        } else {
          setAnnouncements([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase Realtime Database error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Seed sample announcements if empty
  const handleSeedSamples = async () => {
    try {
      const announcementsRef = ref(database, 'announcements');
      const sample1 = {
        title: 'Jadwal Ujian CBT Penilaian Tengah Semester',
        message: 'Pelaksanaan ujian CBT mata pelajaran Matematika & Bahasa Inggris akan dimulai besok pukul 08.00 WIB. Pastikan baterai laptop/ponsel terisi penuh dan hadir tepat waktu.',
        category: 'UJIAN CBT',
        author: user?.name || 'Administrator',
        authorRole: user?.role || 'admin',
        timestamp: Date.now() - 1000 * 60 * 25 // 25 mins ago
      };

      const sample2 = {
        title: 'Pengumpulan Portofolio Jurnal Siswa',
        message: 'Batas akhir unggah laporan proyek kelompok diperpanjang sampai hari Jumat pukul 23.59 WIB melalui menu Tugas Kelas.',
        category: 'TUGAS',
        author: 'Dra. Siti Rahmawati',
        authorRole: 'guru',
        timestamp: Date.now() - 1000 * 60 * 120 // 2 hours ago
      };

      await push(announcementsRef, sample1);
      await push(announcementsRef, sample2);
    } catch (err) {
      alert('Gagal memuat contoh: ' + err.message);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      const announcementsRef = ref(database, 'announcements');
      await push(announcementsRef, {
        title: title.trim(),
        message: message.trim(),
        category,
        author: user?.name || 'Pengguna LMS',
        authorRole: user?.role || 'guru',
        timestamp: Date.now()
      });

      setTitle('');
      setMessage('');
      setCategory('INFO');
      setShowModal(false);
    } catch (err) {
      alert('Gagal mempublikasikan pengumuman: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Hapus pengumuman ini dari Firebase Realtime Database?')) return;
    try {
      const itemRef = ref(database, `announcements/${id}`);
      await remove(itemRef);
    } catch (err) {
      alert('Gagal menghapus pengumuman: ' + err.message);
    }
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return 'Baru saja';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    return new Date(ts).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'PENTING':
        return { variant: 'danger', icon: AlertCircle, label: 'PENTING' };
      case 'UJIAN CBT':
        return { variant: 'primary', icon: GraduationCap, label: 'UJIAN CBT' };
      case 'TUGAS':
        return { variant: 'warning', icon: BookOpen, label: 'TUGAS' };
      default:
        return { variant: 'teal', icon: Info, label: 'INFORMASI' };
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        padding: '24px 28px',
        marginBottom: '28px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F3F4F6'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Megaphone size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Siaran & Pengumuman Sekolah
              </h3>
              {/* Firebase live badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ECFDF5',
                  color: '#059669',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid #A7F3D0'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981',
                    animation: 'pulse 1.8s infinite'
                  }}
                />
                <Flame size={12} color="#F59E0B" />
                <span>Firebase RTDB Live</span>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '2px 0 0 0' }}>
              Sinkronisasi pesan instan real-time untuk seluruh civitas kelas & sekolah
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {announcements.length === 0 && (
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              onClick={handleSeedSamples}
            >
              + Muat Contoh
            </button>
          )}

          {isTeacherOrAdmin && (
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} />
              <span>Buat Siaran Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
          <Radio size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.88rem' }}>Menghubungkan ke Firebase Realtime Database...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            background: '#F9FAFB',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed #D1D5DB'
          }}
        >
          <Megaphone size={32} style={{ color: '#9CA3AF', margin: '0 auto 10px', opacity: 0.6 }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
            Belum ada siaran aktif
          </h4>
          <p style={{ fontSize: '0.84rem', color: '#6B7280', maxWidth: '420px', margin: '0 auto 14px' }}>
            Pesan dan pengumuman yang dipublikasikan oleh Guru atau Admin akan muncul secara live di sini untuk semua siswa.
          </p>
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            onClick={handleSeedSamples}
          >
            Muat Data Contoh
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {announcements.map((item) => {
            const badge = getCategoryBadge(item.category);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={item.id}
                style={{
                  background: '#F9FAFB',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <FlatBadge variant={badge.variant} size="sm">
                      <BadgeIcon size={12} style={{ marginRight: '4px', display: 'inline-block' }} />
                      {badge.label}
                    </FlatBadge>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                      {item.title}
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#4B5563', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                    {item.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: '#9CA3AF' }}>
                    <span style={{ fontWeight: 600, color: '#6B7280' }}>
                      Oleh: <strong>{item.author}</strong> ({item.authorRole})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>

                {isTeacherOrAdmin && (
                  <button
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    title="Hapus Pengumuman"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s ease, background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#EF4444';
                      e.currentTarget.style.background = '#FEE2E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9CA3AF';
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Siaran Baru */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Kirim Siaran Real-Time
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                    Disiarkan seketika ke seluruh pengguna melalui Firebase RTDB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement}>
              {/* Kategori */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Kategori Siaran
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'INFO', label: 'Informasi Umum' },
                    { id: 'PENTING', label: 'Penting / Darurat' },
                    { id: 'UJIAN CBT', label: 'Ujian CBT' },
                    { id: 'TUGAS', label: 'Tugas Kelas' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: category === cat.id ? '2px solid #2563EB' : '1px solid #D1D5DB',
                        background: category === cat.id ? '#EFF6FF' : '#FFFFFF',
                        color: category === cat.id ? '#1D4ED8' : '#4B5563',
                        cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengingat Ujian CBT Sesi 1 Besok Pagi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Isi Pesan */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Isi Pesan Siaran
                </label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan isi pengumuman secara rinci..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Mengirim...' : 'Publikasikan Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
