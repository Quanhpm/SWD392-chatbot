import React from 'react';
import { useApp } from '../../context/AppContext.js';
import { Icon } from '../shared/Icon.js';

export const AppHeader: React.FC = () => {
  const { state, dispatch } = useApp();

  const handleToggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <header className="app-header flex-center">
      <div className="header-left flex-center">
        <button
          className="menu-btn flex-center"
          onClick={handleToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
        >
          <Icon name={state.sidebarOpen ? 'menu_open' : 'menu'} />
        </button>
        <h1 className="header-title">SE1939 - Software Modeling and Design</h1>
      </div>
      <div className="header-right flex-center">
        <button className="header-btn flex-center" aria-label="Help & Documentation">
          <Icon name="help" />
        </button>
        <button className="header-btn flex-center" aria-label="Settings">
          <Icon name="settings" />
        </button>
        <div className="user-avatar flex-center" title="John Doe">
          JD
        </div>
      </div>

      <style>{`
        .app-header {
          height: var(--header-height);
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-outline-variant);
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: var(--shadow-sm);
        }
        .header-left {
          gap: var(--spacing-md);
        }
        .menu-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          transition: background-color var(--transition-fast);
          display: none; /* Hidden on desktop by default */
        }
        .menu-btn:hover {
          background-color: var(--color-surface-container-low);
        }
        .header-title {
          font: var(--text-headline-md);
          font-weight: 500;
          color: var(--color-on-surface);
        }
        .header-right {
          gap: var(--spacing-sm);
        }
        .header-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          transition: background-color var(--transition-fast), color var(--transition-fast);
          color: var(--color-on-surface-variant);
        }
        .header-btn:hover {
          background-color: var(--color-surface-container-low);
          color: var(--color-primary);
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background-color: var(--color-primary-fixed);
          color: var(--color-on-primary-fixed);
          font: var(--text-label-md);
          font-weight: 600;
          border: 1px solid var(--color-outline-variant);
          cursor: pointer;
        }

        /* Show menu button on tablet and mobile */
        @media (max-width: 1023.98px) {
          .menu-btn {
            display: flex;
          }
        }
        @media (max-width: 767.98px) {
          .header-title {
            font-size: 16px;
            line-height: 20px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 190px;
          }
        }
      `}</style>
    </header>
  );
};
