import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { IDocument, IChatSession, ISubject } from '../types/index.js';
import { getDocuments } from '../services/documentApi.js';
import { getSessions } from '../services/chatApi.js';
import { getSubjects } from '../services/subjectApi.js';

interface AppState {
  subjects: ISubject[];
  documents: IDocument[];
  sessions: IChatSession[];
  activeSessionId: string | null;
  sidebarOpen: boolean;
  uploadModalOpen: boolean;
}

type AppAction =
  | { type: 'SET_SUBJECTS'; payload: ISubject[] }
  | { type: 'ADD_SUBJECT'; payload: ISubject }
  | { type: 'REMOVE_SUBJECT'; payload: string }
  | { type: 'SET_DOCUMENTS'; payload: IDocument[] }
  | { type: 'ADD_DOCUMENT'; payload: IDocument }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_DOCUMENT'; payload: IDocument }
  | { type: 'SET_SESSIONS'; payload: IChatSession[] }
  | { type: 'ADD_SESSION'; payload: IChatSession }
  | { type: 'REMOVE_SESSION'; payload: string }
  | { type: 'SET_ACTIVE_SESSION'; payload: string | null }
  | { type: 'TOGGLE_SIDEBAR'; payload?: boolean }
  | { type: 'SET_UPLOAD_MODAL'; payload: boolean }
  | { type: 'RESET' };

const initialState: AppState = {
  subjects: [],
  documents: [],
  sessions: [],
  activeSessionId: null,
  sidebarOpen: false,
  uploadModalOpen: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_SUBJECTS':
      return { ...state, subjects: action.payload };
    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.payload] };
    case 'REMOVE_SUBJECT':
      return { ...state, subjects: state.subjects.filter((s) => s._id !== action.payload) };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] };
    case 'REMOVE_DOCUMENT':
      return { ...state, documents: state.documents.filter((doc) => doc._id !== action.payload) };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map((doc) => (doc._id === action.payload._id ? action.payload : doc)),
      };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [action.payload, ...state.sessions.filter((s) => s._id !== action.payload._id)],
      };
    case 'REMOVE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter((s) => s._id !== action.payload),
        activeSessionId: state.activeSessionId === action.payload ? null : state.activeSessionId,
      };
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: action.payload !== undefined ? action.payload : !state.sidebarOpen };
    case 'SET_UPLOAD_MODAL':
      return { ...state, uploadModalOpen: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

interface AppContextProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshSubjects: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

/** AppProvider accepts optional `isAuthenticated` — only loads data from API when true. */
export const AppProvider: React.FC<{ children: React.ReactNode; isAuthenticated?: boolean }> = ({
  children,
  isAuthenticated = false,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refreshSubjects = async () => {
    try {
      const subs = await getSubjects();
      dispatch({ type: 'SET_SUBJECTS', payload: subs });
    } catch {
      // Silently ignore — 401 errors are handled by global interceptor
    }
  };

  const refreshDocuments = async () => {
    try {
      const docs = await getDocuments();
      dispatch({ type: 'SET_DOCUMENTS', payload: docs });
    } catch {
      // Silently ignore
    }
  };

  const refreshSessions = async () => {
    try {
      const sess = await getSessions();
      dispatch({ type: 'SET_SESSIONS', payload: sess });
    } catch {
      // Silently ignore
    }
  };

  // Fetch data only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      void refreshSubjects();
      void refreshDocuments();
      void refreshSessions();
    } else {
      // Clear data on logout
      dispatch({ type: 'RESET' });
    }
  }, [isAuthenticated]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshSubjects, refreshDocuments, refreshSessions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
