import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpenCheck,
  FileSpreadsheet,
  GraduationCap,
  ClipboardList,
  Grid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ activeTab, setActiveTab, onOpenMenu }) {
  const { user } = useAuth();
  if (!user) return null;

  const isStudent = user.role === 'siswa';

  // Specific tabs for students vs teacher/admin
  const tabs = isStudent
    ? [
        { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard, color: '#4F46E5' },
        { id: 'attendance', label: 'Presensi', icon: CalendarCheck2, color: '#10B981' },
        { id: 'assignments', label: 'Tugas', icon: ClipboardList, color: '#E11D48' },
        { id: 'cbt', label: 'Ujian', icon: GraduationCap, color: '#9333EA' },
        { id: 'grades', label: 'Nilai', icon: FileSpreadsheet, color: '#0284C7' }
      ]
    : [
        { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard, color: '#4F46E5' },
        { id: 'attendance', label: 'Presensi', icon: CalendarCheck2, color: '#10B981' },
        { id: 'journals', label: 'Jurnal', icon: BookOpenCheck, color: '#F59E0B' },
        { id: 'cbt', label: 'Ujian', icon: GraduationCap, color: '#9333EA' },
        { id: '__more__', label: 'Menu Lain', icon: Grid, color: '#2563EB', isMore: true }
      ];

  const handleTabClick = (item) => {
    if (item.isMore) {
      if (onOpenMenu) onOpenMenu();
    } else {
      setActiveTab(item.id);
    }
  };

  // If activeTab is one of the secondary management tabs, highlight "Menu Lain"
  const isSecondaryActive = !isStudent && [
    'grades', 'assignments', 'question-bank', 'cbt-monitor',
    'manage-classes', 'manage-subjects', 'manage-teachers',
    'manage-students', 'manage-users'
  ].includes(activeTab);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi Menu Mobile">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.isMore ? isSecondaryActive : activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-bottom-tab ${isActive ? 'active' : ''}`}
            onClick={() => handleTabClick(tab)}
            style={{
              '--tab-active-color': tab.color
            }}
          >
            <div className="mobile-tab-icon-wrap">
              <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
              {tab.id === 'cbt' && (
                <span className="mobile-tab-dot" />
              )}
            </div>
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

