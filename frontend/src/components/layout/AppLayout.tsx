import React from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext.js';
import { AppHeader } from './AppHeader.js';
import { Sidebar } from './Sidebar.js';
import { UploadModal } from '../documents/UploadModal.js';

export const AppLayout: React.FC = () => {
  const { state, dispatch } = useApp();

  const handleCloseSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR', payload: false });
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <AppHeader />

      <div className="app-body">
        {/* Mobile Backdrop when Sidebar is Open */}
        {state.sidebarOpen && (
          <div className="sidebar-backdrop" onClick={handleCloseSidebar} />
        )}

        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Global Document Upload Modal */}
      <UploadModal />

      <style>{`
        .sidebar-backdrop {
          position: fixed;
          top: var(--header-height);
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          z-index: 99;
        }

        @media (min-width: 1024px) {
          .sidebar-backdrop {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
