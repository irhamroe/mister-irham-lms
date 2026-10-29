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
  ChevronRight,
  School
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FlatBadge, FlatStatusDot } from '../components/common/FlatComponents';
import FirebaseAnnouncements from '../components/FirebaseAnnouncements';

export default function DashboardView({ setActiveTab, onStartCbt }) {
  const { user, classes, subjects } = useAuth();
  const [stats, setStats] = useState({
    activeExams: 0,
    pendingAssignments: 0,
    todayAttendance: '0%',
    attendanceDesc: 'Belum ada sesi presensi',
    totalJournals: 0
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
      const isStudent = user?.role === 'siswa';
      const [examList, assignList, sessionList] = await Promise.all([
        api.getCbtExams().catch(() => []),
        api.getAssignments().catch(() => []),
        api.getAttendanceSessions().catch(() => [])
      ]);

      let allExams = Array.isArray(examList) ? examList : [];
      let allAssigns = Array.isArray(assignList) ? assignList : [];
      let allSessions = Array.isArray(sessionList) ? sessionList : [];

      // Filter specifically for student's enrolled class
      if (isStudent && user?.kelas) {
        allExams = allExams.filter(e => !e.class_name || e.class_name === user.kelas);
        allAssigns = allAssigns.filter(a => !a.class_name || a.class_name === user.kelas);
        allSessions = allSessions.filter(s => !s.class_name || s.class_name === user.kelas);
      }

      setExams(allExams);
      setAssignments(allAssigns);

      // Calculate attendance rate dynamically
      let attendanceRateStr = '0%';
      let attendanceDescStr = 'Belum ada sesi presensi';

      if (isStudent) {
        if (allSessions.length > 0) {
          let attendedCount = 0;
          try {
            const rawRecs = localStorage.getItem('lms_mock_attendance_records_v3');
            const records = rawRecs ? JSON.parse(rawRecs) : [];
            if (Array.isArray(records)) {
              attendedCount = records.filter(r =>
                (r.student_id === user?.id || (r.nis && r.nis === (user?.nis_nip || user?.nis))) &&
                r.status === 'Hadir' &&
                allSessions.some(s => s.id === r.session_id)
              ).length;
            }
          } catch (e) {}

          if (attendedCount > 0) {
            const pct = Math.round((attendedCount / allSessions.length) * 100);
            attendanceRateStr = `${pct}%`;
            attendanceDescStr = `Hadir di ${attendedCount} dari ${allSessions.length} sesi pertemuan`;
          } else {
            attendanceRateStr = '100%';
            attendanceDescStr = `Terdaftar di ${allSessions.length} sesi pertemuan`;
          }
        } else {
          attendanceRateStr = '100%';
          attendanceDescStr = `Belum ada sesi presensi untuk kelas ${user?.kelas || ''}`;
        }
      } else {
        if (allSessions.length > 0) {
          let totalHadir = 0;
          let totalTarget = 0;

          allSessions.forEach(s => {
            totalHadir += Number(s.count_hadir || 0);
            const target = Number(s.count_total_recorded || s.count_class_students || 0);
            totalTarget += target;
          });

          if (totalTarget > 0) {
            const percentage = Math.round((totalHadir / totalTarget) * 100);
            attendanceRateStr = `${percentage}%`;
            attendanceDescStr = `Rata-rata dari ${allSessions.length} sesi pertemuan`;
          } else {
            attendanceRateStr = '0%';
            attendanceDescStr = `${allSessions.length} sesi (belum ada rekaman kehadiran)`;
          }
        }
      }

      setStats(prev => ({
        ...prev,
        todayAttendance: attendanceRateStr,
        attendanceDesc: attendanceDescStr
      }));
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
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #4F46E5 100%)',
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
          gap: '24px',
          boxShadow: '0 12px 30px -8px rgba(37, 99, 235, 0.35)'
        }}
      >
        {/* Floating Abstract & School Icon Decorative Background */}
        <School
          size={170}
          color="#FFFFFF"
          style={{
            position: 'absolute',
            right: '120px',
            bottom: '-45px',
            opacity: 0.12,
            transform: 'rotate(-8deg)',
            pointerEvents: 'none'
          }}
        />
        <Sparkles
          size={75}
          color="#FDE047"
          style={{
            position: 'absolute',
            right: '30px',
            top: '18px',
            opacity: 0.22,
            pointerEvents: 'none'
          }}
        />
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
            left: '35%',
            bottom: '-70px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.2)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 700 }}>
              <Sparkles size={15} />
              <span>Tahun Pelajaran 2026/2027 • Semester Ganjil</span>
            </div>
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
          Metrics Grid: Multi-Color Cards with Watermark Icons
          =================================================================== */}
      <div className="stats-grid">
        {/* Attendance Rate (Emerald Theme) */}
        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1px solid #A7F3D0',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
          }}
        >
          <CalendarCheck2 size={105} color="#059669" className="stat-watermark-icon" />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#10B981',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.35)',
              position: 'relative',
              zIndex: 2
            }}
          >
            <CalendarCheck2 size={26} strokeWidth={2.4} />
          </div>
          <div className="stat-details" style={{ position: 'relative', zIndex: 2 }}>
            <h4 style={{ color: '#065F46', fontWeight: 800 }}>
              {isTeacher ? 'Tingkat Kehadiran' : 'Presensi Kehadiran'}
            </h4>
            <div className="stat-value" style={{ color: '#047857', fontWeight: 800 }}>{stats.todayAttendance}</div>
            <div className="stat-desc" style={{ color: '#059669', fontWeight: 600 }}>{stats.attendanceDesc}</div>
          </div>
        </div>

        {/* Active CBT Exam (Royal Blue Theme) */}
        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)'
          }}
        >
          <GraduationCap size={105} color="#1D4ED8" className="stat-watermark-icon" />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.35)',
              position: 'relative',
              zIndex: 2
            }}
          >
            <GraduationCap size={26} strokeWidth={2.4} />
          </div>
          <div className="stat-details" style={{ position: 'relative', zIndex: 2 }}>
            <h4 style={{ color: '#1E40AF', fontWeight: 800 }}>
              {isTeacher ? 'Ujian CBT Aktif' : 'Ujian CBT Kelas'}
            </h4>
            <div className="stat-value" style={{ color: '#1D4ED8', fontWeight: 800 }}>
              {activeExamCount} Sesi
            </div>
            <div className="stat-desc" style={{ color: '#2563EB', fontWeight: 600 }}>
              {isTeacher ? 'Siap dipantau live' : (activeExamCount > 0 ? 'Tersedia untuk kelas Anda' : 'Tidak ada ujian aktif')}
            </div>
          </div>
        </div>

        {/* Class Assignments (Amber / Orange Theme) */}
        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid #FDE68A',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)'
          }}
        >
          <BookOpenCheck size={105} color="#D97706" className="stat-watermark-icon" />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.35)',
              position: 'relative',
              zIndex: 2
            }}
          >
            <BookOpenCheck size={26} strokeWidth={2.4} />
          </div>
          <div className="stat-details" style={{ position: 'relative', zIndex: 2 }}>
            <h4 style={{ color: '#92400E', fontWeight: 800 }}>
              {isTeacher ? 'Tugas Dibuat' : 'Tugas Kelas'}
            </h4>
            <div className="stat-value" style={{ color: '#B45309', fontWeight: 800 }}>
              {assignments.length} Tugas
            </div>
            <div className="stat-desc" style={{ color: '#D97706', fontWeight: 600 }}>
              {isTeacher ? 'Tenggat pengumpulan pekan ini' : (assignments.length > 0 ? 'Perlu diselesaikan & dikumpulkan' : 'Semua tugas telah diserahkan')}
            </div>
          </div>
        </div>

        {/* 4th Card: Kelas Binaan for Teachers vs Kelas Saya for Students */}
        {isTeacher ? (
          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(135deg, #FAF5FF 0%, #EDE9FE 100%)',
              border: '1px solid #DDD6FE',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.08)'
            }}
          >
            <FileSpreadsheet size={105} color="#7C3AED" className="stat-watermark-icon" />
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#8B5CF6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 8px 16px -4px rgba(139, 92, 246, 0.35)',
                position: 'relative',
                zIndex: 2
              }}
            >
              <FileSpreadsheet size={26} strokeWidth={2.4} />
            </div>
            <div className="stat-details" style={{ position: 'relative', zIndex: 2 }}>
              <h4 style={{ color: '#5B21B6', fontWeight: 800 }}>Kelas Binaan</h4>
              <div className="stat-value" style={{ color: '#6D28D9', fontWeight: 800 }}>
                {classes.length || 3} Rombel
              </div>
              <div className="stat-desc" style={{ color: '#7C3AED', fontWeight: 600 }}>Fase E & Fase F Kurikulum</div>
            </div>
          </div>
        ) : (
          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(135deg, #FAF5FF 0%, #EDE9FE 100%)',
              border: '1px solid #DDD6FE',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.08)'
            }}
          >
            <School size={105} color="#7C3AED" className="stat-watermark-icon" />
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#8B5CF6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 8px 16px -4px rgba(139, 92, 246, 0.35)',
                position: 'relative',
                zIndex: 2
              }}
            >
              <School size={26} strokeWidth={2.4} />
            </div>
            <div className="stat-details" style={{ position: 'relative', zIndex: 2 }}>
              <h4 style={{ color: '#5B21B6', fontWeight: 800 }}>Kelas Saya</h4>
              <div className="stat-value" style={{ color: '#6D28D9', fontWeight: 800 }}>
                Kelas {user?.kelas || 'X-8'}
              </div>
              <div className="stat-desc" style={{ color: '#7C3AED', fontWeight: 600 }}>
                NIS: {user?.nis_nip || user?.nis || '-'} • Semester Ganjil
              </div>
            </div>
          </div>
        )}
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

            {isTeacher ? (
              <div style={{ background: '#FFFFFF', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Token Ujian: </span>
                <strong style={{ fontSize: '1rem', color: '#1D4ED8', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                  {exams[0].token}
                </strong>
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Akses Token: </span>
                <strong style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: 700 }}>
                  Diberikan Pengawas saat Ujian
                </strong>
              </div>
            )}
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
      <div className="dashboard-two-col-grid">
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
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#FFF1F2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpenCheck size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tugas Kelas Mandiri</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {isTeacher ? 'Instruksi tugas & penilaian siswa' : 'Pengumpulan lembar dokumen & catatan tugas'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>

            {/* Ujian CBT Online (Khusus Akses Siswa) */}
            {!isTeacher && (
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
                onClick={() => setActiveTab('cbt')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ujian CBT Online</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Asesmen mandiri dengan proteksi anti-cheat</p>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Assignments Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--primary)" strokeWidth={2.5} />
              <span>Tugas Kelas Terkini</span>
            </div>
            {assignments.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('assignments')}>
                Lihat Semua
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {assignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <BookOpenCheck size={42} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', margin: '0 0 4px' }}>
                  Belum Ada Tugas Aktif
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  {user?.role === 'siswa'
                    ? `Tidak ada tugas tertunda untuk kelas ${user?.kelas || ''}.`
                    : 'Belum ada tugas yang dibuat untuk kelas ini.'}
                </p>
              </div>
            ) : (
              assignments.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-muted)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab('assignments')}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FlatBadge variant="blueLight" size="sm">{a.subject_name || 'Mapel'} • {a.class_name || user?.kelas}</FlatBadge>
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
