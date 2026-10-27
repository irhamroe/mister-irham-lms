import React, { useState } from 'react';
import {
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  BookOpen,
  Award,
  Sparkles,
  HeartHandshake
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
      setError('Mohon masukkan Username dan Kata Sandi Anda.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* =========================================================
          Decorative Background Watermark Icons (Like Reference)
          ========================================================= */}
      <BookOpen className="watermark-icon wm-top-center" size={130} />
      <CalendarCheck className="watermark-icon wm-mid-right" size={140} />
      <Award className="watermark-icon wm-bot-right" size={120} />
      <GraduationCap className="watermark-icon wm-mid-left" size={140} />

      {/* =========================================================
          Four Floating Corner Cards (Like Screenshot Reference)
          ========================================================= */}
      {/* 1. Top Left */}
      <div className="corner-feature-card card-top-left">
        <div className="corner-icon-box">
          <GraduationCap size={22} strokeWidth={2.2} />
        </div>
        <div className="corner-text-box">
          <h4>Disiplin Positif</h4>
          <p>SMAN 1 Batu</p>
        </div>
      </div>

      {/* 2. Top Right */}
      <div className="corner-feature-card card-top-right">
        <div className="corner-icon-box">
          <CalendarCheck size={22} strokeWidth={2.2} />
        </div>
        <div className="corner-text-box">
          <h4>Presensi Harian</h4>
          <p>36 Rombel Kelas</p>
        </div>
      </div>

      {/* 3. Bottom Left */}
      <div className="corner-feature-card card-bottom-left">
        <div className="corner-icon-box">
          <HeartHandshake size={22} strokeWidth={2.2} />
        </div>
        <div className="corner-text-box">
          <h4>Bimbingan & Pembinaan</h4>
          <p>Restitusi Edukatif</p>
        </div>
      </div>

      {/* 4. Bottom Right */}
      <div className="corner-feature-card card-bottom-right">
        <div className="corner-icon-box">
          <FileSpreadsheet size={22} strokeWidth={2.2} />
        </div>
        <div className="corner-text-box">
          <h4>Rekap & Ekspor</h4>
          <p>Excel & PDF Resmi</p>
        </div>
      </div>

      {/* =========================================================
          Central Login Container
          ========================================================= */}
      <div className="login-center-container">
        {/* Logo Card */}
        <div className="school-logo-card">
          <img
            src="/logo.png"
            alt="School Logo"
            className="school-logo-img"
          />
        </div>

        {/* Pill Badge */}
        <div className="login-auth-pill">
          <ShieldCheck size={15} strokeWidth={2.5} />
          <span>Portal Autentikasi Tenaga Pendidik & Siswa</span>
        </div>

        {/* Institution Title & Subtitle */}
        <h1 className="login-institution-title">SMAN 1 Batu</h1>
        <p className="login-institution-subtitle">
          Sistem Informasi Presensi Kehadiran & Pembelajaran Terpadu
        </p>

        {/* Main Authentication Card */}
        <div className="main-auth-card">
          {/* Card Header with Green Status Dot */}
          <div className="auth-card-header">
            <div className="auth-header-left">
              <div className="auth-title-row">
                <KeyRound size={20} className="auth-key-icon" />
                <h3>Masuk ke Akun</h3>
              </div>
              <p className="auth-header-desc">Gunakan Username dan Password Anda</p>
            </div>
            <div className="auth-header-right">
              <span className="live-status-dot" title="Sistem Aktif" />
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
                <span>Kata Sandi (Password)</span>
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
                  <KeyRound size={18} strokeWidth={2.4} />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <div className="login-security-notice">
          <Lock size={14} />
          <span>Sistem terenkripsi. Catatan kedisiplinan dan absensi terlindungi.</span>
        </div>
      </div>
    </div>
  );
}
