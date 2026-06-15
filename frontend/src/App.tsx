import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppProvider } from './context/AppContext.js';
import { ChatProvider } from './context/ChatContext.js';
import { AppHeader } from './components/layout/AppHeader.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { UploadModal } from './components/documents/UploadModal.js';
import { useApp } from './context/AppContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { TeacherDashboard } from './pages/TeacherDashboard.js';
import { StudentPortal } from './pages/StudentPortal.js';
import { AdminDashboard } from './pages/AdminDashboard.js';

// Lazy-loaded heavy pages
const ChatPage = React.lazy(() => import('./pages/ChatPage.js').then(m => ({ default: m.ChatPage })));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage.js').then(m => ({ default: m.DocumentsPage })));
const PricingPage = React.lazy(() => import('./pages/PricingPage.js').then(m => ({ default: m.PricingPage })));
const StudyPage = React.lazy(() => import('./pages/StudyPage.js').then(m => ({ default: m.StudyPage })));

/** Inner app shell — only renders when authenticated. Needs AppContext. */
const AuthenticatedApp: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: appState, dispatch, refreshDocuments } = useApp();
  const role = authState.user?.role;

  return (
    <div className="app-shell">
      <AppHeader />
      <Sidebar />
      <main className="app-main">
        <React.Suspense fallback={<div className="flex-center" style={{ height: '100%' }}><span className="spinner" /></div>}>
          <Routes>
            {/* Role-based home redirect */}
            <Route
              path="/"
              element={
                role === 'admin' ? <Navigate to="/admin" replace />
                  : role === 'teacher' ? <Navigate to="/dashboard" replace />
                    : <Navigate to="/portal" replace />
              }
            />

            <Route path="/admin" element={role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} />

            {/* Teacher-only routes */}
            <Route
              path="/dashboard"
              element={
                role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" replace />
              }
            />

            {/* Student-only routes */}
            <Route
              path="/portal"
              element={
                role === 'student' ? <StudentPortal /> : <Navigate to="/" replace />
              }
            />

            {/* Shared routes */}
            <Route path="/chat" element={role === 'admin' ? <Navigate to="/admin" replace /> : <ChatPage />} />
            <Route path="/chat/:sessionId" element={role === 'admin' ? <Navigate to="/admin" replace /> : <ChatPage />} />
            <Route path="/study/:subjectId" element={role === 'admin' ? <Navigate to="/admin" replace /> : <StudyPage />} />
            <Route path="/documents" element={role === 'admin' ? <Navigate to="/admin" replace /> : <DocumentsPage />} />
            <Route path="/pricing" element={role === 'student' ? <PricingPage /> : <Navigate to="/" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </main>

      {/* Global upload modal */}
      {role === 'teacher' && appState.uploadModalOpen && (
        <UploadModal
          onClose={() => {
            dispatch({ type: 'SET_UPLOAD_MODAL', payload: false });
            void refreshDocuments();
          }}
        />
      )}
    </div>
  );
};

/** Root app — wraps auth, then app context gated on auth status. */
const InnerRoot: React.FC = () => {
  const { state: authState } = useAuth();

  if (authState.isLoading) {
    return (
      <div className="flex-center" style={{ height: '100vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppProvider isAuthenticated={true}>
      <ChatProvider>
        <AuthenticatedApp />
      </ChatProvider>
    </AppProvider>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <InnerRoot />
    </AuthProvider>
  </BrowserRouter>
);

export { App };
export default App;
