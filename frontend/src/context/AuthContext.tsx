import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { IUser } from '../types/index.js';
import { login as apiLogin, register as apiRegister } from '../services/authApi.js';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'AUTH_SUCCESS'; payload: { user: IUser; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

interface AuthContextProps {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  register: (input: { username: string; password: string; fullName: string; email: string; userCode: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as IUser;
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Listen for global 401 unauthorized events from api.ts interceptor
  useEffect(() => {
    const handle = () => {
      dispatch({ type: 'LOGOUT' });
    };
    window.addEventListener('auth:unauthorized', handle);
    return () => window.removeEventListener('auth:unauthorized', handle);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    dispatch({ type: 'AUTH_SUCCESS', payload: { user: result.user, token: result.token } });
  }, []);

  const register = useCallback(async (input: { username: string; password: string; fullName: string; email: string; userCode: string }) => {
    const result = await apiRegister(input);
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    dispatch({ type: 'AUTH_SUCCESS', payload: { user: result.user, token: result.token } });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
