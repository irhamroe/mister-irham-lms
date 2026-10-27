import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './views/DashboardView';
import AttendanceView from './views/AttendanceView';
import JournalView from './views/JournalView';
import GradesView from './views/GradesView';
import AssignmentsView from './views/AssignmentsView';
import CbtView from './views/CbtView';
import QuestionBankView from './views/QuestionBankView';
import CbtMonitorView from './views/CbtMonitorView';
import CbtExamView from './views/CbtExamView';
import ManagementView from './views/ManagementView';
import LoginView from './views/LoginView';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');

  // CBT Exam mode states (Distraction-free)
  const [activeExam, setActiveExam] = useState(null);
  const [examToken, setExamToken] = useState('');

  // Selected exam for monitor
  const [monitorExamId, setMonitorExamId] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <div className="card" style={{ textAlign: 'center', padding: '36px 44px', maxWidth: 420, width: '90%', border: '2px solid var(--border-color)' }}>
          <div className="pulse-dot green" style={{ width: 12, height: 12, margin: '0 auto 16px', display: 'block' }}></div>
          <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 6 }}>Mister Irham</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Menghubungkan ke layanan real-time...
          </p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show Login Screen
  if (!user) {
    return <LoginView />;
  }

  // If in student exam mode, show full distraction-free exam screen
  if (activeExam) {
    return (
      <CbtExamView
        exam={activeExam}
        token={examToken}
        onFinish={() => {
          setActiveExam(null);
          setExamToken('');
          setActiveTab('cbt');
        }}
      />
    );
  }

  const handleStartExam = (examObj, token) => {
    setActiveExam(examObj);
    setExamToken(token);
  };

  const handleOpenMonitor = (examObj) => {
    setMonitorExamId(examObj.id);
    setActiveTab('cbt-monitor');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar activeTab={activeTab} theme={theme} setTheme={setTheme} />

        <main style={{ flex: 1 }}>
          {activeTab === 'dashboard' && (
            <DashboardView
              setActiveTab={setActiveTab}
              onStartCbt={handleStartExam}
            />
          )}

          {activeTab === 'attendance' && <AttendanceView />}

          {activeTab === 'journals' && <JournalView />}

          {activeTab === 'grades' && <GradesView />}

          {activeTab === 'assignments' && <AssignmentsView />}

          {activeTab === 'cbt' && (
            <CbtView
              onStartExam={handleStartExam}
              onOpenMonitor={handleOpenMonitor}
            />
          )}

          {activeTab === 'question-bank' && (
            <QuestionBankView
              onNavigateToCbt={() => setActiveTab('cbt')}
            />
          )}

          {activeTab === 'cbt-monitor' && (
            <CbtMonitorView examId={monitorExamId} />
          )}

          {activeTab === 'manage-classes' && (
            <ManagementView initialTab="classes" />
          )}

          {activeTab === 'manage-subjects' && (
            <ManagementView initialTab="subjects" />
          )}

          {activeTab === 'manage-teachers' && (
            <ManagementView initialTab="teachers" />
          )}

          {activeTab === 'manage-students' && (
            <ManagementView initialTab="students" />
          )}

          {activeTab === 'manage-users' && (
            <ManagementView initialTab="users" />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
