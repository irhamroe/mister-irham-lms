import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpenCheck,
  FileSpreadsheet,
  GraduationCap,
  MonitorPlay,
  ClipboardList,
  UserCheck,
  School,
  Building2,
  Users,
  UserCog,
  Layers,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FlatStatusDot, FlatBadge } from './common/FlatComponents';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, demoUsers, switchUser } = useAuth();

  const isTeacherOrAdmin = user && (user.role === 'guru' || user.role === 'admin');

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'guru', 'siswa'],
      color: '#4F46E5',
      bgColor: '#EEF2FF'
    },
    {
      id: 'attendance',
      label: 'Presensi Siswa',
      icon: CalendarCheck2,
      roles: ['admin', 'guru', 'siswa'],
      color: '#10B981',
      bgColor: '#ECFDF5'
    },
    {
      id: 'journals',
      label: 'Jurnal Mengajar',
      icon: BookOpenCheck,
      roles: ['admin', 'guru'],
      color: '#F59E0B',
      bgColor: '#FFFBEB'
    },
    {
      id: 'grades',
      label: 'Daftar Nilai',
      icon: FileSpreadsheet,
      roles: ['admin', 'guru', 'siswa'],
      color: '#0284C7',
      bgColor: '#F0F9FF'
    },
    {
      id: 'assignments',
      label: 'Tugas Kelas',
      icon: ClipboardList,
      roles: ['admin', 'guru', 'siswa'],
      color: '#E11D48',
      bgColor: '#FFF1F2'
    },
    {
      id: 'cbt',
      label: 'Ujian CBT',
      icon: GraduationCap,
      roles: ['admin', 'guru', 'siswa'],
      color: '#9333EA',
      bgColor: '#FAF5FF'
    },
    {
      id: 'question-bank',
      label: 'Bank Soal',
      icon: Layers,
      roles: ['admin', 'guru'],
      color: '#0D9488',
      bgColor: '#F0FDFA'
    },
    {
      id: 'cbt-monitor',
      label: 'Live Monitor CBT',
      icon: MonitorPlay,
      roles: ['admin', 'guru'],
      color: '#EF4444',
      bgColor: '#FEF2F2',
      isLive: true
    }
  ];

  const managementNavItems = [
    {
      id: 'manage-classes',
      label: 'Data Kelas',
      icon: Building2,
      roles: ['admin', 'guru'],
      color: '#2563EB',
      bgColor: '#EFF6FF'
    },
    {
      id: 'manage-subjects',
      label: 'Data Mapel',
      icon: BookOpen,
      roles: ['admin', 'guru'],
      color: '#EA580C',
      bgColor: '#FFF7ED'
    },
    {
      id: 'manage-students',
      label: 'Data Siswa',
      icon: Users,
      roles: ['admin', 'guru'],
      color: '#059669',
      bgColor: '#ECFDF5'
    },
    {
      id: 'manage-users',
      label: 'Management User',
      icon: UserCog,
      roles: ['admin', 'guru'],
      color: '#7C3AED',
      bgColor: '#F5F3FF'
    }
  ];

  const filteredNav = navItems.filter(item => !user || item.roles.includes(user.role));
  const filteredManagement = managementNavItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="logo-badge" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
          <School size={22} strokeWidth={2.2} color="#FFFFFF" />
        </div>
        <div className="logo-text">
          <h1>EduSmart</h1>
          <p>LMS & CBT Platform</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <span className="nav-label">Menu Utama</span>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div
                className="nav-icon-badge"
                style={{
                  background: isActive ? item.color : item.bgColor,
                  color: isActive ? '#FFFFFF' : item.color,
                  boxShadow: isActive ? `0 4px 10px ${item.color}55` : 'none'
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2.1} />
              </div>
              <span>{item.label}</span>
              {item.isLive && (
                <span className="nav-badge live">
                  LIVE
                </span>
              )}
            </div>
          );
        })}

        {/* Kategori Menu Manajemen Data */}
        {isTeacherOrAdmin && (
          <>
            <span className="nav-label" style={{ marginTop: 14 }}>Manajemen Data</span>
            {filteredManagement.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div
                    className="nav-icon-badge"
                    style={{
                      background: isActive ? item.color : item.bgColor,
                      color: isActive ? '#FFFFFF' : item.color,
                      boxShadow: isActive ? `0 4px 10px ${item.color}55` : 'none'
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2.1} />
                  </div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Role Switcher in Sidebar */}
      <div className="sidebar-footer">
        <div className="role-switcher-box">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={14} color="var(--primary)" strokeWidth={2.5} />
            <span>Ganti Peran (Demo)</span>
          </label>
          <select
            className="role-select"
            value={user?.id || ''}
            onChange={(e) => switchUser(Number(e.target.value))}
          >
            <optgroup label="Akun Guru & Admin">
              {demoUsers.filter(u => u.role !== 'siswa').map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </optgroup>
            <optgroup label="Akun Siswa">
              {demoUsers.filter(u => u.role === 'siswa').map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.kelas || '-'})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
    </aside>
  );
}
