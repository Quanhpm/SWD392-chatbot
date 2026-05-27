import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useApp } from '../context/AppContext.js';
import { enrollInSubject } from '../services/subjectApi.js';
import type { ISubject } from '../types/index.js';

export const StudentPortal: React.FC = () => {
  const { state: authState, addEnrolledSubject } = useAuth();
  const { state: appState } = useApp();
  const navigate = useNavigate();

  const [enrollModal, setEnrollModal] = useState<ISubject | null>(null);
  const [enrollPassword, setEnrollPassword] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [successSubject, setSuccessSubject] = useState<string | null>(null);

  const enrolledIds = new Set(authState.user?.enrolledSubjects ?? []);
  const subjects = appState.subjects as ISubject[];

  const openEnroll = (subject: ISubject) => {
    setEnrollModal(subject);
    setEnrollPassword('');
    setEnrollError(null);
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollModal) return;
    setEnrollError(null);
    setIsEnrolling(true);
    try {
      await enrollInSubject(enrollModal._id, enrollPassword);
      addEnrolledSubject(enrollModal._id);
      setSuccessSubject(enrollModal.name);
      setEnrollModal(null);
      setTimeout(() => setSuccessSubject(null), 3500);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEnterCourse = (subject: ISubject) => {
    navigate(`/study/${subject._id}`);
  };

  return (
    <div className="portal-page">
      {/* Toast */}
      {successSubject && (
        <div className="toast toast-success">
          <span className="material-symbols-outlined">check_circle</span>
          Đã tham gia môn học "{successSubject}" thành công!
        </div>
      )}

      {/* Hero */}
      <section className="portal-hero">
        <div className="portal-hero-overlay" />
        <div className="portal-hero-content">
          <h1 className="portal-hero-title">
            Chào mừng trở lại, {authState.user?.username}!
          </h1>
          <p className="portal-hero-sub">
            Khám phá các môn học và bắt đầu hành trình chinh phục kiến thức cùng AI.
          </p>
          <div className="portal-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">{enrolledIds.size}</span>
              <span className="hero-stat-label">Đã tham gia</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">{subjects.length - enrolledIds.size}</span>
              <span className="hero-stat-label">Chưa tham gia</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">{subjects.length}</span>
              <span className="hero-stat-label">Tổng môn học</span>
            </div>
          </div>
        </div>
      </section>

      {/* Subject Grid */}
      <div className="portal-section">
        <div className="portal-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>school</span>
            <h2 className="portal-section-title">Tất cả môn học</h2>
          </div>
          <div className="portal-filter-chips">
            <span className="portal-chip active">Tất cả ({subjects.length})</span>
            <span className="portal-chip">Đã tham gia ({enrolledIds.size})</span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="portal-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--color-outline)' }}>school</span>
            <p style={{ font: 'var(--text-headline-md)', color: 'var(--color-on-surface-variant)' }}>
              Chưa có môn học nào
            </p>
            <p style={{ font: 'var(--text-body-sm)', color: 'var(--color-outline)' }}>
              Vui lòng liên hệ giảng viên để được thêm vào các môn học.
            </p>
          </div>
        ) : (
          <div className="subject-grid">
            {subjects.map((subj) => {
              const isEnrolled = enrolledIds.has(subj._id);
              return (
                <div key={subj._id} className={`subject-card ${isEnrolled ? 'enrolled' : 'locked'}`}>
                  {/* Card header visual */}
                  <div className="subject-card-visual">
                    <div className="subject-card-bg" />
                    {isEnrolled ? (
                      <span className="subject-card-badge badge badge-success">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Đã tham gia
                      </span>
                    ) : (
                      <div className="subject-card-lock">
                        <span className="material-symbols-outlined" style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}>lock</span>
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="subject-card-body">
                    <h3 className="subject-card-name">{subj.name}</h3>
                    {subj.description && (
                      <p className="subject-card-desc">{subj.description}</p>
                    )}
                    <div className="subject-card-footer">
                      {isEnrolled ? (
                        <button className="btn-primary subject-card-btn" onClick={() => handleEnterCourse(subj)}>
                          <span className="material-symbols-outlined">chat</span>
                          Vào học
                        </button>
                      ) : (
                        <button className="btn-outline subject-card-btn" onClick={() => openEnroll(subj)}>
                          <span className="material-symbols-outlined">lock_open</span>
                          Tham gia ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enroll Modal */}
      {enrollModal && (
        <div className="modal-overlay" onClick={() => setEnrollModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-header">
              <div className="modal-icon-wrap" style={{ background: 'var(--color-primary-fixed)', color: 'var(--color-primary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>lock_open</span>
              </div>
              <h3 className="modal-title">Tham gia môn học</h3>
              <p className="modal-sub">
                <strong>{enrollModal.name}</strong>
                <br />
                Vui lòng nhập mật khẩu do giảng viên cung cấp để tham gia lớp học.
              </p>
            </div>
            <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-field">
                <label className="field-label">Mật khẩu truy cập</label>
                <div className="form-input-icon-wrap">
                  <span className="material-symbols-outlined form-input-icon">key</span>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Nhập mật khẩu môn học..."
                    value={enrollPassword}
                    onChange={(e) => setEnrollPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              {enrollError && (
                <div className="login-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {enrollError}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEnrollModal(null)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-primary" disabled={isEnrolling}>
                  {isEnrolling
                    ? <><span className="spinner spinner-sm" /> Đang xác nhận...</>
                    : <><span className="material-symbols-outlined">check</span> Xác nhận tham gia</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI chat FAB */}
      <button className="fab-chat" onClick={() => navigate('/chat')} title="Mở RAG Chatbot">
        <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
      </button>

      <style>{`
        .portal-page {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        /* Hero */
        .portal-hero {
          position: relative;
          background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-primary) 100%);
          padding: 48px var(--page-margin);
          color: white;
          overflow: hidden;
        }
        .portal-hero-overlay {
          position: absolute;
          right: 0; top: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(to left, rgba(0,106,97,0.3), transparent);
          pointer-events: none;
        }
        .portal-hero-content { position: relative; z-index: 1; }
        .portal-hero-title { font: var(--text-headline-xl); color: white; margin-bottom: 12px; }
        .portal-hero-sub { font: var(--text-body-md); opacity: 0.85; max-width: 480px; margin-bottom: 24px; }
        .portal-hero-stats { display: flex; align-items: center; gap: 24px; }
        .hero-stat { display: flex; flex-direction: column; align-items: center; }
        .hero-stat-num { font: var(--text-headline-lg); color: white; }
        .hero-stat-label { font: var(--text-label-sm); opacity: 0.75; }
        .hero-stat-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.3); }

        /* Section */
        .portal-section { padding: 0 var(--page-margin) var(--spacing-2xl); }
        .portal-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .portal-section-title { font: var(--text-headline-md); color: var(--color-on-surface); }
        .portal-filter-chips { display: flex; gap: 8px; }
        .portal-chip {
          padding: 6px 16px;
          border-radius: var(--radius-full);
          font: var(--text-label-md);
          background: var(--color-surface-container-high);
          color: var(--color-on-surface-variant);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .portal-chip.active {
          background: var(--color-primary);
          color: white;
        }

        /* Empty */
        .portal-empty {
          padding: 80px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        /* Subject Grid */
        .subject-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        /* Subject Card */
        .subject-card {
          background: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          overflow: hidden;
          transition: box-shadow var(--transition-base), transform var(--transition-base);
          display: flex;
          flex-direction: column;
        }
        .subject-card:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); }
        .subject-card.enrolled { border-color: var(--color-secondary-container); }

        /* Card visual area */
        .subject-card-visual {
          height: 140px;
          position: relative;
          overflow: hidden;
        }
        .subject-card-bg {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--color-primary-fixed) 0%, var(--color-secondary-container) 100%);
          transition: transform var(--transition-slow);
        }
        .subject-card:hover .subject-card-bg { transform: scale(1.05); }
        .subject-card.locked .subject-card-bg {
          filter: grayscale(60%);
        }
        .subject-card-badge {
          position: absolute;
          top: 12px;
          right: 12px;
        }
        .subject-card-lock {
          position: absolute;
          inset: 0;
          background: rgba(11, 28, 48, 0.4);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        /* Card body */
        .subject-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .subject-card-name {
          font: var(--text-headline-md);
          color: var(--color-on-surface);
          line-height: 1.3;
        }
        .subject-card-desc {
          font: var(--text-body-sm);
          color: var(--color-on-surface-variant);
          line-height: 1.5;
          flex: 1;
        }
        .subject-card-footer { margin-top: 12px; }
        .subject-card-btn { width: 100%; justify-content: center; }

        /* Modal */
        .modal-icon-header { text-align: center; margin-bottom: 24px; }
        .modal-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-2xl);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .modal-title { font: var(--text-headline-md); margin-bottom: 8px; }
        .modal-sub { font: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.6; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }

        /* FAB */
        .fab-chat {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xl);
          transition: transform var(--transition-spring), background var(--transition-fast);
          z-index: 200;
        }
        .fab-chat:hover { transform: scale(1.12); background: var(--color-primary-container); }
        .fab-chat:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
};
