import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { UserRole } from '../types/index.js';

type Tab = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('login');
  const [role, setRole] = useState<UserRole>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, role);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-shell">
        {/* ── Left branding pane ── */}
        <div className="login-left">
          <div className="login-left-overlay" />
          <div className="login-left-content">
            <div>
              <h1 className="login-brand-title">EduSmart</h1>
              <p className="login-brand-sub">
                Hệ thống Quản lý Tài liệu và Học tập Thông minh tích hợp AI cho thế hệ giáo dục mới.
              </p>
            </div>
            <div className="login-feature-grid">
              <div className="login-feature-card glass">
                <span className="material-symbols-outlined login-feature-icon">auto_stories</span>
                <h3>Thư viện số</h3>
                <p>Truy cập hàng nghìn tài liệu học thuật được phân loại thông minh.</p>
              </div>
              <div className="login-feature-card glass">
                <span className="material-symbols-outlined login-feature-icon">psychology</span>
                <h3>RAG AI Bot</h3>
                <p>Trợ lý ảo hỗ trợ giải đáp thắc mắc dựa trên nội dung tài liệu.</p>
              </div>
              <div className="login-feature-card glass">
                <span className="material-symbols-outlined login-feature-icon">lock</span>
                <h3>Bảo mật môn học</h3>
                <p>Mỗi môn học được khóa riêng bằng mật khẩu do giảng viên thiết lập.</p>
              </div>
              <div className="login-feature-card glass">
                <span className="material-symbols-outlined login-feature-icon">school</span>
                <h3>Phân quyền rõ ràng</h3>
                <p>Phân biệt vai trò Giảng viên và Sinh viên với đặc quyền riêng biệt.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right auth pane ── */}
        <div className="login-right">
          <div className="login-form-wrap">
            <div className="login-form-header">
              <div className="login-logo">
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-primary)' }}>
                  school
                </span>
              </div>
              <h2 className="login-form-title">
                {tab === 'login' ? 'Chào mừng trở lại!' : 'Tham gia EduSmart'}
              </h2>
              <p className="login-form-sub">
                {tab === 'login'
                  ? 'Vui lòng đăng nhập để tiếp tục hành trình học tập.'
                  : 'Bắt đầu trải nghiệm học tập thông minh ngay hôm nay.'}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="login-tabs">
              <button
                className={`login-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(null); }}
              >
                Đăng nhập
              </button>
              <button
                className={`login-tab ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(null); }}
              >
                Đăng ký
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {/* Role selector (register only) */}
              {tab === 'register' && (
                <div className="role-selector">
                  <label className="role-label">Tôi là:</label>
                  <div className="role-cards">
                    <label className={`role-card ${role === 'teacher' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="teacher"
                        checked={role === 'teacher'}
                        onChange={() => setRole('teacher')}
                        className="role-radio"
                      />
                      <span className="material-symbols-outlined role-card-icon">school</span>
                      <span>Giảng viên</span>
                    </label>
                    <label className={`role-card ${role === 'student' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="student"
                        checked={role === 'student'}
                        onChange={() => setRole('student')}
                        className="role-radio"
                      />
                      <span className="material-symbols-outlined role-card-icon">person</span>
                      <span>Sinh viên</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Username field */}
              <div className="form-field">
                <label className="field-label">Tên đăng nhập</label>
                <div className="form-input-icon-wrap">
                  <span className="material-symbols-outlined form-input-icon">person</span>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nhập tên đăng nhập..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="form-field">
                <div className="field-label-row">
                  <label className="field-label">Mật khẩu</label>
                </div>
                <div className="form-input-icon-wrap" style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined form-input-icon">lock</span>
                  <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="login-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button type="submit" className="btn-primary login-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Đang xử lý...
                  </>
                ) : tab === 'login' ? (
                  <>
                    Đăng nhập
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                ) : (
                  <>
                    Đăng ký ngay
                    <span className="material-symbols-outlined">person_add</span>
                  </>
                )}
              </button>
            </form>

            <p className="login-footer-note">
              Bằng việc tiếp tục, bạn đồng ý với{' '}
              <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>Điều khoản Dịch vụ</span>{' '}
              và{' '}
              <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>Chính sách Bảo mật</span>{' '}
              của EduSmart.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          padding: 16px;
        }

        .login-shell {
          width: 100%;
          max-width: 1100px;
          display: grid;
          grid-template-columns: 1fr;
          border-radius: var(--radius-3xl);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-outline-variant);
          min-height: 640px;
          background: var(--color-surface-container-lowest);
        }

        @media (min-width: 1024px) {
          .login-shell {
            grid-template-columns: 7fr 5fr;
          }
        }

        /* ── Left Pane ── */
        .login-left {
          position: relative;
          background: var(--color-primary);
          background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCoeJfpCGqrS4EN1shYJXAJf_erDHdGbBSSS5qB4uomelSoVbvNCwsMTchYGkPkmImWP8RwYb7yzG2QTVu4LZBl9ZL6RsbR8vUOLZW3YQDat91gt4hdG3mFLXFmi4BxsqaS4aD1dkOCh7axp1vzRLuENR7UpyL2G8BMzBcmC24Uusunx2Debtk6Xykphedn7PivKEn77RVE6ZzTfTRjlwdU5k876C1xNscNSquIsmus8ohSkQL-VIx9LpFLq3cAttm4HBj721KFnj4');
          background-size: cover;
          background-position: center;
          display: none;
          flex-direction: column;
        }
        @media (min-width: 1024px) {
          .login-left { display: flex; }
        }
        .login-left-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,35,111,0.82) 0%, rgba(0,106,97,0.55) 100%);
        }
        .login-left-content {
          position: relative;
          z-index: 1;
          padding: 48px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
          gap: 40px;
        }
        .login-brand-title {
          font: var(--text-headline-xl);
          color: white;
          margin-bottom: 12px;
        }
        .login-brand-sub {
          font: var(--text-body-md);
          opacity: 0.88;
          max-width: 380px;
          line-height: 1.7;
        }
        .login-feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .login-feature-card {
          padding: 20px;
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255,255,255,0.18);
          color: white;
        }
        .login-feature-icon {
          font-size: 28px;
          margin-bottom: 10px;
          display: block;
          color: rgba(255,255,255,0.88);
        }
        .login-feature-card h3 {
          font: var(--text-label-md);
          margin-bottom: 4px;
        }
        .login-feature-card p {
          font: var(--text-body-sm);
          opacity: 0.78;
          line-height: 1.6;
        }

        /* ── Right Pane ── */
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: var(--color-surface-container-lowest);
        }
        .login-form-wrap {
          width: 100%;
          max-width: 380px;
        }
        .login-form-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .login-logo {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-xl);
          background: var(--color-primary-fixed);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .login-form-title {
          font: var(--text-headline-md);
          color: var(--color-on-surface);
          margin-bottom: 8px;
        }
        .login-form-sub {
          font: var(--text-body-sm);
          color: var(--color-on-surface-variant);
          line-height: 1.6;
        }

        /* Tab Switcher */
        .login-tabs {
          display: flex;
          background: var(--color-surface-container-low);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 4px;
          margin-bottom: 24px;
          gap: 4px;
        }
        .login-tab {
          flex: 1;
          padding: 8px 12px;
          border-radius: var(--radius-lg);
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          transition: all var(--transition-fast);
        }
        .login-tab.active {
          background: var(--color-surface-container-lowest);
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
        }
        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Password toggle */
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-outline);
          padding: 4px;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
          z-index: 1;
        }
        .password-toggle:hover { color: var(--color-on-surface); }

        /* Role selector */
        .role-selector { display: flex; flex-direction: column; gap: 8px; }
        .role-label { font: var(--text-label-md); color: var(--color-on-surface-variant); }
        .role-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .role-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 16px 12px;
          border: 1.5px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          cursor: pointer;
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          transition: all var(--transition-fast);
        }
        .role-card:hover { border-color: var(--color-primary); background: var(--color-surface-container-low); }
        .role-card.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-fixed);
          color: var(--color-primary);
        }
        .role-radio { display: none; }
        .role-card-icon { font-size: 28px; }

        /* Error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--color-error-container);
          color: var(--color-on-error-container);
          border-radius: var(--radius-lg);
          font: var(--text-body-sm);
        }

        /* Submit */
        .login-submit { width: 100%; padding: 14px; }

        /* Footer note */
        .login-footer-note {
          font: var(--text-body-sm);
          color: var(--color-on-surface-variant);
          text-align: center;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};
