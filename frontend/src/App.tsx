import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.js';
import { ChatProvider } from './context/ChatContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { ChatPage } from './pages/ChatPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { TestSetPage } from './pages/TestSetPage.js';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Redirect / to /chat */}
              <Route index element={<Navigate to="/chat" replace />} />
              
              {/* Chat routes */}
              <Route path="chat" element={<ChatPage />} />
              <Route path="chat/:sessionId" element={<ChatPage />} />
              
              {/* Documents page */}
              <Route path="documents" element={<DocumentsPage />} />
              
              {/* Test evaluation set page */}
              <Route path="test-set" element={<TestSetPage />} />
              
              {/* Fallback routing */}
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AppProvider>
  );
};
