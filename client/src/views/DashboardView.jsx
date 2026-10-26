import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck2,
  BookOpenCheck,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  MonitorPlay,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FlatBadge, FlatStatusDot } from '../components/common/FlatComponents';
import FirebaseAnnouncements from '../components/FirebaseAnnouncements';

export default function DashboardView({ setActiveTab, onStartCbt }) {
  const { user, classes, subjects } = useAuth();
  const [stats, setStats] = useState({
    activeExams: 1,
    pendingAssignments: 2,
    todayAttendance: '88%',
    totalJournals: 2
  });
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [examList, assignList] = await Promise.all([
        api.getCbtExams(),
        api.getAssignments()
      ]);
      setExams(examList);
      setAssignments(assignList);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const isTeacher = user?.role === 'guru' || user?.role === 'admin';
  const activeExamCount = exams.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="content-view">
      {/* ===================================================================
          Hero Section: Bold Solid Color Block Poster Style
          =================================================================== */}
      <div
        style={{
          background: '#3B82F6',
          borderRadius: 'var(--radius-md)',
          padding: '36px 40px',
          color: '#FFFFFF',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }}
      >
        {/* Flat Abstract Geometric Decoration (Poster Look) */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-40px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '120px',
            bottom: '-60px',
            width: '160px',
            height: '160px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.06)',
            transform: 'rotate(25deg)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.2)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px' }}>
            <Sparkles size={15} />
            <span>Tahun Pelajaran 2026/2027 • Semester Ganjil</span>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px', lineHeight: 1.2 }}>
            Halo, {user?.name}! 👋
          </h1>

          <p style={{ opacity: 0.95, fontSize: '1rem', lineHeight: 1.6, color: '#EFF6FF' }}>
            {isTeacher
              ? 'Kelola presensi kelas, buat agenda jurnal mengajar, hitung buku nilai kurikulum, dan pantau ujian CBT siswa secara langsung.'
              : 'Pantau kehadiran harian, serahkan tugas tepat waktu, dan ikuti pelaksanaan asesmen ujian CBT mandiri.'}
          </p>
        </div>

        {/* Action Button: Flat Solid White with Scale Feedback */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {isTeacher ? (
            <button
              className="btn"
              style={{
                background: '#FFFFFF',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '14px 24px',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => setActiveTab('cbt-monitor')}
            >
              <MonitorPlay size={18} />
              Buka Live Monitor CBT
            </button>
          ) : (
            <button
              className="btn"
              style={{
                background: '#FFFFFF',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '14px 24px',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => setActiveTab('cbt')}
            >
              <GraduationCap size={18} />
              Ikuti Ujian CBT
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================
          Metrics Grid: Multi-Color Flat Blocks
          =================================================================== */}
      <div className="stats-grid">
        {/* Attendance Rate */}
        <div className="stat-card" style={{ background: '#FFFFFF' }}>
          <div className="stat-icon emerald">
            <CalendarCheck2 size={24} strokeWidth={2.2} />
          </div>
          <div className="stat-details">
            <h4>Tingkat Kehadiran</h4>
            <div className="stat-value" style={{ color: '#10B981' }}>{stats.todayAttendance}</div>
            <div className="stat-desc">Rata-rata presensi harian</div>
          </div>
        </div>

        {/* Active CBT Exam */}
        <div className="stat-card" style={{ background: '#FFFFFF' }}>
          <div className="stat-icon indigo">
            <GraduationCap size={24} strokeWidth={2.2} />
          </div>
          <div className="stat-details">
            <h4>Ujian CBT Aktif</h4>
            <div className="stat-value" style={{ color: '#3B82F6' }}>
              {activeExamCount} Sesi
            </div>
            <div className="stat-desc">Siap dipantau live</div>
          </div>
        </div>

        {/* Class Assignments */}
        <div className="stat-card" style={{ background: '#FFFFFF' }}>
          <div className="stat-icon amber">
            <BookOpenCheck size={24} strokeWidth={2.2} />
          </div>
          <div className="stat-details">
            <h4>Tugas Menunggu</h4>
            <div className="stat-value" style={{ color: '#F59E0B' }}>
              {assignments.length} Tugas
            </div>
            <div className="stat-desc">Tenggat pengumpulan pekan ini</div>
          </div>
        </div>

        {/* Active Classes */}
        <div className="stat-card" style={{ background: '#FFFFFF' }}>
          <div className="stat-icon cyan">
            <FileSpreadsheet size={24} strokeWidth={2.2} />
          </div>
          <div className="stat-details">
            <h4>Kelas Binaan</h4>
            <div className="stat-value" style={{ color: '#0284C7' }}>
              {classes.length || 3} Rombel
            </div>
            <div className="stat-desc">Fase E & Fase F Kurikulum</div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          Active CBT Exam Spotlight: Color Block Tint (Blue 50)
          =================================================================== */}
      {exams.length > 0 && (
        <div
          style={{
            background: '#EFF6FF',
            borderRadius: 'var(--radius-md)',
            padding: '24px 28px',
            marginBottom: '28px',
            border: '2px solid #BFDBFE',
            transition: 'transform 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlatBadge variant="primary" size="md">CBT AKTIF</FlatBadge>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A8A' }}>
                {exams[0].title}
              </h3>
            </div>

            <div style={{ background: '#FFFFFF', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Token Ujian: </span>
              <strong style={{ fontSize: '1rem', color: '#1D4ED8', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                {exams[0].token}
              </strong>
            </div>
          </div>

          <p style={{ color: '#374151', fontSize: '0.92rem', marginBottom: '20px' }}>
            {exams[0].description} • Durasi: <strong>{exams[0].duration_minutes} Menit</strong> • Kelas: <strong>{exams[0].class_name}</strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>STATUS PENGERJAAN</span>
                <div style={{ fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  <span>AKTIF & SIAP</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>TOLERANSI LAYAR</span>
                <div style={{ fontWeight: 800, color: '#1F2937' }}>
                  Maks. {exams[0].max_violations}x Peringatan
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {isTeacher ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('cbt-monitor')}
                >
                  <MonitorPlay size={16} />
                  Pantau Progres Siswa Live
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => onStartCbt(exams[0])}
                >
                  <GraduationCap size={16} />
                  Buka Lembar Ujian Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          Firebase Realtime Announcements Board
          =================================================================== */}
      <FirebaseAnnouncements />

      {/* ===================================================================
          Two Column Layout: Modules & Recent Assignments
          =================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
        {/* Module Navigators */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={20} color="var(--primary)" strokeWidth={2.5} />
              <span>Modul Terpadu</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Presensi Siswa */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#E5E7EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-muted)'; }}
              onClick={() => setActiveTab('attendance')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarCheck2 size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Presensi Siswa</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pencatatan kehadiran kelas & rekapitulasi</p>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>

            {/* Jurnal Mengajar Guru */}
            {isTeacher && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#E5E7EB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-muted)'; }}
                onClick={() => setActiveTab('journals')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpenCheck size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Jurnal Mengajar Guru</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Agenda materi & catatan perkembangan siswa</p>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            )}

            {/* Daftar Nilai */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#E5E7EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-muted)'; }}
              onClick={() => setActiveTab('grades')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Daftar Nilai & Asesmen</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bobot kurikulum fleksibel & kalkulasi otomatis</p>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>

            {/* Tugas Kelas */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#E5E7EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-muted)'; }}
              onClick={() => setActiveTab('assignments')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#F5F3FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tugas Kelas Mandiri</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Instruksi tugas & pengumpulan dokumen siswa</p>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        {/* Recent Assignments Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--primary)" strokeWidth={2.5} />
              <span>Tugas Kelas Terkini</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('assignments')}>
              Lihat Semua
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {assignments.slice(0, 3).map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '16px',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <FlatBadge variant="blueLight" size="sm">{a.subject_name} • {a.class_name}</FlatBadge>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} strokeWidth={2.2} /> {a.due_date}
                  </span>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-main)' }}>{a.title}</h4>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5
                  }}
                >
                  {a.instructions}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
