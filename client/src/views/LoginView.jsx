import React, { useState } from 'react';
import {
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Award,
  GraduationCap,
  Sparkles,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Mohon masukkan Username dan Kata Sandi.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Decorative Background Watermark Icons */}
      <BookOpen className="watermark-icon wm-top-center" size={130} />
      <CalendarCheck className="watermark-icon wm-mid-right" size={140} />
      <Award className="watermark-icon wm-bot-right" size={120} />
      <GraduationCap className="watermark-icon wm-mid-left" size={140} />

      {/* Central Login Container */}
      <div className="login-center-container">
        {/* Logo Card */}
        <div className="school-logo-card">
          <img
            src="/logo.png"
            alt="Logo LMS"
            className="school-logo-img"
          />
        </div>

        {/* Pill Badge */}
        <div className="login-auth-pill">
          <Sparkles size={14} strokeWidth={2.4} />
          <span>Portal Akademik & Ujian Mandiri</span>
        </div>

        {/* App Title & Subtitle */}
        <h1 className="login-institution-title">Mister Irham</h1>
        <p className="login-institution-subtitle">Learning Management System</p>

        {/* Main Authentication Card */}
        <div className="main-auth-card">
          {/* Card Header with Status Dot */}
          <div className="auth-card-header">
            <div className="auth-header-left">
              <div className="auth-title-row">
                <KeyRound size={20} className="auth-key-icon" />
                <h3>Masuk ke Akun</h3>
              </div>
              <p className="auth-header-desc">Gunakan Username dan Kata Sandi Anda</p>
            </div>
            <div className="auth-header-right">
              <span className="live-status-dot" title="Server Aktif & Terhubung" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error-banner">
              <AlertCircle size={17} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="auth-form-body">
            {/* Username Input */}
            <div className="auth-input-group">
              <label className="auth-field-label">
                <User size={15} />
                <span>Username</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type="text"
                  className="auth-text-input"
                  placeholder="Masukkan username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="auth-input-group">
              <label className="auth-field-label">
                <Lock size={15} />
                <span>Kata Sandi</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} strokeWidth={2.4} />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <div className="login-security-notice">
          <Lock size={14} />
          <span>Sistem terenkripsi. Sesi pembelajaran dan data akademik terlindungi.</span>
        </div>
      </div>
    </div>
  );
}
