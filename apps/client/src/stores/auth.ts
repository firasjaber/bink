import { create } from 'zustand';
import { getLoggedInUser, logout } from '@/eden';

export interface AuthState {
  isAuth: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
  } | null;
  sessionId: string | null;
  isLoading: boolean;
  setUser: (sessionId: string) => Promise<void>;
  initAuth: () => Promise<void>;
  logout: () => void;
}

const initialState = {
  isAuth: false,
  user: null,
  sessionId: null,
  isLoading: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setUser: async (sessionId: string) => {
    try {
      const user = await getLoggedInUser(sessionId);
      localStorage.setItem('sessionId', sessionId);
      set({ user, sessionId, isAuth: true, isLoading: false });
    } catch (error) {
      set(initialState);
    }
  },
  initAuth: async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      try {
        const user = await getLoggedInUser(sessionId);
        set({ user, sessionId, isAuth: true, isLoading: false });
      } catch (error) {
        localStorage.removeItem('sessionId');
        set({ ...initialState, isLoading: false });
      }
    } else {
      set({ ...initialState, isLoading: false });
    }
  },
  logout: () => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      logout(sessionId);
      localStorage.removeItem('sessionId');
    }
    set({ ...initialState, isLoading: false });
  },
}));
