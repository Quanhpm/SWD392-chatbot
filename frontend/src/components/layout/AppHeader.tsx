import React from 'react';
import { useApp } from '../../context/AppContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Icon } from '../shared/Icon.js';

export const AppHeader: React.FC = () => {
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();

  const user = authState.user;
  const initials = user ? user.username.slice(0, 2).toUpperCase() : 'GS';

  return (
    <header className="app-header flex-center">
      <div className="header-left flex-center">
        <button
          className="menu-btn flex-center"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-label="Toggle sidebar"
        >
          <Icon name={state.sidebarOpen ? 'menu_open' : 'menu'} />
        </button>
        <div className="header-logo-container flex-center">
          <div className="header-logo flex-center">
            <Icon name="auto_awesome" style={{ fontSize: '18px', color: 'var(--color-primary)' }} />
          </div>
          <h1 className="header-title">EduSmart</h1>
        </div>
      </div>

      <div className="header-right flex-center">
        {user && (
          <>
            <span className="header-role-chip">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {user.role === 'admin' ? 'admin_panel_settings' : user.role === 'teacher' ? 'school' : 'person'}
              </span>
              {user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
            </span>
            <div className="header-user flex-center">
              <div className="user-avatar flex-center" title={user.username}>
                {initials}
              </div>
              <span className="user-name">{user.username}</span>
            </div>
            <button className="header-btn flex-center" onClick={logout} title="Đăng xuất">
              <Icon name="logout" />
            </button>
          </>
        )}
      </div>

      <style>{`
        .app-header {
          height: var(--header-height);
          background: var(--color-surface-container-lowest);
          border-bottom: 1px solid var(--color-outline-variant);
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: var(--shadow-sm);
          grid-area: header;
        }
        .header-left { gap: 12px; }
        .header-logo-container { gap: 10px; }
        .header-logo {
          width: 32px;
          height: 32px;
          background: var(--color-primary-fixed);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .header-title {
          font: var(--text-headline-md);
          font-size: 16px;
          font-weight: 700;
          color: var(--color-primary);
          white-space: nowrap;
        }
        .menu-btn {
          width: 40px; height: 40px;
          border-radius: var(--radius-full);
          transition: background var(--transition-fast);
          display: none;
          color: var(--color-on-surface-variant);
        }
        .menu-btn:hover { background: var(--color-surface-container-low); }
        .header-right { gap: 12px; }
        .header-role-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: var(--color-primary-fixed);
          color: var(--color-primary);
          font: var(--text-label-sm);
        }
        .header-user { gap: 8px; }
        .user-name {
          font: var(--text-label-md);
          color: var(--color-on-surface);
          display: none;
        }
        .user-avatar {
          width: 32px; height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-primary);
          color: white;
          font: var(--text-label-sm);
          font-weight: 700;
          border: 2px solid var(--color-primary-fixed);
          cursor: pointer;
          flex-shrink: 0;
        }
        .header-btn {
          width: 36px; height: 36px;
          border-radius: var(--radius-full);
          color: var(--color-on-surface-variant);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .header-btn:hover { background: var(--color-error-container); color: var(--color-on-error-container); }

        @media (max-width: 1023px) {
          .menu-btn { display: flex; }
          .header-role-chip { display: none; }
        }
        @media (min-width: 768px) {
          .user-name { display: block; }
        }
      `}</style>
    </header>
  );
};
