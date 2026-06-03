import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Icon } from '../shared/Icon.js';
import { SessionList } from '../sessions/SessionList.js';
import { getMySubscription } from '../../services/subscriptionApi.js';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = authState.user?.role;
  const enrolledCount = authState.user?.enrolledSubjects.length ?? 0;
  const [planName, setPlanName] = useState('free');

  useEffect(() => {
    if (role !== 'student') return;

    void getMySubscription()
      .then(({ plan }) => setPlanName(plan.name))
      .catch((error) => console.error('Failed to load subscription badge:', error));
  }, [authState.user?.id, role, location.pathname]);

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname === '/' || location.pathname.startsWith('/chat');
    return location.pathname === path;
  };

  const navTo = (path: string) => {
    navigate(path);
    dispatch({ type: 'TOGGLE_SIDEBAR', payload: false });
  };

  return (
    <aside className={`app-sidebar ${state.sidebarOpen ? 'open' : ''}`}>
      {/* Brand mark */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20 }}>auto_awesome</span>
        </div>
        <div>
          <p className="sidebar-brand-name">EduSmart</p>
          <p className="sidebar-brand-role">
            {role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
          </p>
        </div>
      </div>

      {/* Upload button (teacher only) */}
      {role === 'teacher' && (
        <button
          className="add-source-btn flex-center"
          onClick={() => { dispatch({ type: 'SET_UPLOAD_MODAL', payload: true }); dispatch({ type: 'TOGGLE_SIDEBAR', payload: false }); }}
        >
          <Icon name="upload_file" className="add-icon" />
          <span>Tải tài liệu lên</span>
        </button>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="nav-section-label">Điều hướng</p>

        {role === 'teacher' ? (
          <>
            <button className={`nav-link flex-center ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navTo('/dashboard')}>
              <Icon name="dashboard" />
              <span>Bảng điều khiển</span>
            </button>
            <button className={`nav-link flex-center ${isActive('/documents') ? 'active' : ''}`} onClick={() => navTo('/documents')}>
              <Icon name="folder_open" />
              <span>Quản lý Tài liệu</span>
            </button>
            <button className={`nav-link flex-center ${isActive('/chat') ? 'active' : ''}`} onClick={() => navTo('/chat')}>
              <Icon name="chat" />
              <span>RAG Chatbot</span>
            </button>
          </>
        ) : (
          <>
            <button className={`nav-link flex-center ${isActive('/portal') ? 'active' : ''}`} onClick={() => navTo('/portal')}>
              <Icon name="school" />
              <span>Môn học của tôi</span>
              {enrolledCount > 0 && <span className="nav-badge">{enrolledCount}</span>}
            </button>
            <button className={`nav-link flex-center ${isActive('/chat') ? 'active' : ''}`} onClick={() => navTo('/chat')}>
              <Icon name="chat" />
              <span>Hỏi đáp RAG</span>
            </button>
            <button className={`nav-link flex-center ${isActive('/documents') ? 'active' : ''}`} onClick={() => navTo('/documents')}>
              <Icon name="folder_open" />
              <span>Tài liệu học tập</span>
            </button>
            <button className={`nav-link flex-center ${isActive('/pricing') ? 'active' : ''}`} onClick={() => navTo('/pricing')}>
              <Icon name="workspace_premium" />
              <span>Gói đăng ký</span>
            </button>
          </>
        )}
      </nav>

      <div className="divider" />

      {/* Chat session history */}
      <div className="sidebar-section-container">
        <div className="section-header-row">
          <h3 className="section-header">Lịch sử hội thoại</h3>
          <button
            className="new-chat-btn flex-center"
            onClick={() => {
              dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
              dispatch({ type: 'TOGGLE_SIDEBAR', payload: false });
              navigate('/chat');
            }}
            title="Cuộc hội thoại mới"
          >
            <Icon name="add_comment" style={{ fontSize: '16px' }} />
          </button>
        </div>
        <SessionList />
      </div>

      <div className="divider" />

      {/* User profile + logout at bottom */}
      {authState.user && (
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {authState.user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="sidebar-user-name">{authState.user.username}</p>
              <div className="sidebar-user-meta">
                <p className="sidebar-user-role">{role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}</p>
                <span className={`sidebar-plan-badge sidebar-plan-${role === 'teacher' ? 'teacher' : planName}`}>
                  {role === 'teacher' ? 'Unlimited' : planName}
                </span>
              </div>
            </div>
          </div>
          <button className="sidebar-logout-btn flex-center" onClick={logout} title="Đăng xuất">
            <Icon name="logout" />
          </button>
        </div>
      )}

      <style>{`
        .app-sidebar {
          width: var(--sidebar-width);
          background: var(--color-surface-container-low);
          border-right: 1px solid var(--color-outline-variant);
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
          height: calc(100vh - var(--header-height));
          overflow-y: auto;
          gap: 16px;
          position: sticky;
          top: var(--header-height);
        }

        /* Brand */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 8px 8px;
        }
        .sidebar-brand-icon {
          width: 36px; height: 36px;
          border-radius: var(--radius-lg);
          background: var(--color-primary-fixed);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sidebar-brand-name { font: var(--text-label-md); color: var(--color-primary); font-weight: 700; }
        .sidebar-brand-role { font: var(--text-label-sm); color: var(--color-on-surface-variant); margin-top: 1px; }

        /* Add Source Button */
        .add-source-btn {
          width: 100%;
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-xl);
          padding: 12px;
          font: var(--text-label-md);
          gap: 8px;
          transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }
        .add-source-btn:hover {
          background: var(--color-primary-container);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }

        /* Nav */
        .sidebar-nav { display: flex; flex-direction: column; gap: 3px; }
        .nav-section-label {
          font: var(--text-label-sm);
          color: var(--color-outline);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0 8px;
          margin-bottom: 4px;
        }
        .nav-link {
          width: 100%;
          justify-content: flex-start;
          padding: 10px 12px;
          gap: 12px;
          color: var(--color-on-surface-variant);
          border-radius: var(--radius-lg);
          transition: background var(--transition-fast), color var(--transition-fast);
          font: var(--text-body-md);
          font-size: 14px;
          font-weight: 500;
          position: relative;
        }
        .nav-link:hover { background: var(--color-surface-container-high); color: var(--color-on-surface); }
        .nav-link.active { background: var(--color-primary-fixed); color: var(--color-primary); font-weight: 600; }
        .nav-badge {
          position: absolute;
          right: 12px;
          background: var(--color-primary);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: var(--radius-full);
        }

        .divider { height: 1px; background: var(--color-outline-variant); opacity: 0.5; margin: 2px 0; }

        .sidebar-section-container { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow: hidden; }
        .section-header { font: var(--text-label-sm); color: var(--color-outline); text-transform: uppercase; letter-spacing: 0.05em; padding-left: 8px; }
        .section-header-row { display: flex; align-items: center; justify-content: space-between; }
        .new-chat-btn {
          width: 28px; height: 28px;
          border-radius: var(--radius-lg);
          color: var(--color-primary);
          transition: background var(--transition-fast), transform var(--transition-fast);
        }
        .new-chat-btn:hover { background: var(--color-primary-fixed); transform: scale(1.1); }

        /* User profile */
        .sidebar-user {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 8px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-lowest);
          margin-top: auto;
        }
        .sidebar-user-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sidebar-user-avatar {
          width: 36px; height: 36px;
          border-radius: var(--radius-full);
          background: var(--color-primary);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font: var(--text-label-sm); font-weight: 700;
          flex-shrink: 0;
        }
        .sidebar-user-name { font: var(--text-label-md); color: var(--color-on-surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
        .sidebar-user-role { font: var(--text-label-sm); color: var(--color-on-surface-variant); margin-top: 1px; }
        .sidebar-user-meta { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .sidebar-plan-badge {
          padding: 1px 6px;
          border-radius: var(--radius-full);
          font-size: 9px;
          font-weight: 700;
          line-height: 1.5;
          text-transform: capitalize;
          background: var(--color-primary-fixed);
          color: var(--color-primary);
        }
        .sidebar-plan-plus { background: #fef3c7; color: #92400e; }
        .sidebar-plan-pro { background: #ede9fe; color: #6d28d9; }
        .sidebar-plan-teacher { background: var(--color-secondary-container); color: var(--color-on-secondary-container); }
        .sidebar-logout-btn {
          width: 32px; height: 32px;
          border-radius: var(--radius-lg);
          color: var(--color-on-surface-variant);
          transition: background var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }
        .sidebar-logout-btn:hover { background: var(--color-error-container); color: var(--color-on-error-container); }

        @media (max-width: 1023px) {
          .app-sidebar {
            position: fixed;
            top: var(--header-height);
            left: 0; bottom: 0;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform var(--transition-slow);
            box-shadow: var(--shadow-xl);
            height: calc(100vh - var(--header-height));
          }
          .app-sidebar.open { transform: translateX(0); }
        }
      `}</style>
    </aside>
  );
};
