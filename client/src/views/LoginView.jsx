import React, { useState } from 'react';
import { School, User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
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
      setError('Mohon masukkan Username / NIS dan Kata Sandi.');
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
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-badge">
            <School size={28} strokeWidth={2.3} color="#FFFFFF" />
          </div>
          <h1 className="login-app-title">EduSmart LMS</h1>
          <p className="login-app-subtitle">Portal Pembelajaran & Ujian Mandiri Terpadu</p>
        </div>

        {/* Login Form Header */}
        <div className="login-heading">
          <h2>Masuk ke Sistem</h2>
          <p>Gunakan kredensial akun Anda untuk mengakses fitur akademik</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert-error">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username / NIS</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Masukkan Username atau NIS"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Masuk ke Sistem</span>
              </>
            )}
          </button>
        </form>

        {/* Access Guidance */}
        <div className="login-info-box">
          <div className="login-info-title">
            <ShieldCheck size={16} />
            <span>Petunjuk Akses Akun:</span>
          </div>
          <ul className="login-info-list">
            <li>
              <strong>Siswa:</strong> Gunakan nomor <strong>NIS</strong> Anda sebagai Username dan Kata Sandi awal.
            </li>
            <li>
              <strong>Guru & Staf:</strong> Gunakan username serta kata sandi yang telah didaftarkan administrator.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2026 EduSmart Platform. Sistem Pembelajaran Digital Terpadu.</p>
        </div>
      </div>
    </div>
  );
}

