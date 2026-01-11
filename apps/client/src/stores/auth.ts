import { getLoggedInUser, logout } from '@/eden';
import { create } from 'zustand';

export interface AuthState {
  isAuth: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    profilePicture: string | null;
    isPro: boolean;
    openAiApiKey: string | null;
    aiTrialCount: number;
    aiTrialsRemaining: number;
    hasOpenAiKey: boolean;
    maskedOpenAiKey: string | null;
  } | null;
  isLoading: boolean;
  setUser: () => Promise<void>;
  initAuth: () => Promise<void>;
  updateUser: (data: Partial<NonNullable<AuthState['user']>>) => void;
  logout: () => void;
}

const initialState = {
  isAuth: false,
  user: null,
  isLoading: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setUser: async () => {
    try {
      const user = await getLoggedInUser();
      if (!user) throw new Error('Session expired');
      set({ user, isAuth: true, isLoading: false });
    } catch (_) {
      set({ ...initialState, isLoading: false });
    }
  },
  initAuth: async () => {
    try {
      const user = await getLoggedInUser();
      if (!user) throw new Error('Session expired');
      set({ user, isAuth: true, isLoading: false });
    } catch (_error) {
      set({ ...initialState, isLoading: false });
    }
  },
  updateUser: (data) =>
    set((state) => {
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...data } };
    }),
  logout: async () => {
    await logout();
    set({ ...initialState, isLoading: false });
  },
}));
