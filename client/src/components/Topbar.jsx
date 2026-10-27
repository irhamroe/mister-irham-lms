import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudentAvatar } from './StudentAvatar';
import { FlatBadge } from './common/FlatComponents';

export default function Topbar({ activeTab }) {
  const { user, logout } = useAuth();

  const titles = {
    dashboard: { tag: 'Ringkasan', title: 'Dashboard Utama', desc: 'Pusat kontrol dan informasi aktivitas akademik' },
    attendance: { tag: 'Presensi', title: 'Presensi Siswa', desc: 'Pencatatan kehadiran kelas, sesi mandiri & rekap' },
    journals: { tag: 'Jurnal', title: 'Jurnal Mengajar Guru', desc: 'Agenda harian mengajar & catatan perkembangan belajar siswa' },
    grades: { tag: 'Nilai', title: 'Daftar Nilai & Asesmen', desc: 'Buku nilai dengan kustomisasi bobot kurikulum otomatis' },
    assignments: { tag: 'Tugas', title: 'Tugas Kelas', desc: 'Manajemen pengumpulan dokumen & umpan balik tugas siswa' },
    cbt: { tag: 'CBT', title: 'Ujian CBT Kelas', desc: 'Pelaksanaan ujian online anti-cheat & pengacakan soal' },
    'question-bank': { tag: 'Bank Soal', title: 'Bank Soal Terpadu', desc: 'Repositori butir soal master untuk digunakan kembali' },
    'cbt-monitor': { tag: 'Live Proctor', title: 'Live Monitor CBT', desc: 'Pemantauan real-time status pengerjaan siswa & kendali proctoring' },
    'manage-classes': { tag: 'Master Data', title: 'Data Kelas', desc: 'Pengelolaan daftar rombel belajar dan fase kurikulum' },
    'manage-subjects': { tag: 'Master Data', title: 'Data Mapel', desc: 'Pengelolaan mata pelajaran kurikulum dan guru pengampu' },
    'manage-teachers': { tag: 'Master Data', title: 'Data Guru', desc: 'Direktori data tenaga pendidik, NIP/NUPTK, kontak, dan penugasan mapel' },
    'manage-students': { tag: 'Master Data', title: 'Data Siswa', desc: 'Registrasi peserta didik dan nomor induk siswa (NIS)' },
    'manage-users': { tag: 'Master Data', title: 'Management User', desc: 'Pengelolaan akun pengguna, hak akses, dan kredensial' }
  };

  const current = titles[activeTab] || titles.dashboard;

  return (
    <header className="topbar">
      <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <FlatBadge variant="blueLight" size="sm">{current.tag}</FlatBadge>
        <div>
          <h2>{current.title}</h2>
          <p>{current.desc}</p>
        </div>
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user && (
          <>
            <div className="user-pill">
              <StudentAvatar name={user.name} size={32} className="user-avatar" />
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role-badge">
                  {user.role === 'guru' && 'Guru Mapel'}
                  {user.role === 'admin' && 'Administrator'}
                  {user.role === 'siswa' && `Siswa (${user.kelas || 'X-8'})`}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={logout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: '0.82rem',
                color: '#EF4444',
                borderColor: '#FCA5A5',
                background: '#FEF2F2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
              title="Keluar dari akun"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
