import { create } from "zustand";
import { getLoggedInUser, logout } from "@/eden";

export interface AuthState {
  isAuth: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    profilePicture: string | null;
  } | null;
  isLoading: boolean;
  setUser: () => Promise<void>;
  initAuth: () => Promise<void>;
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
      if (!user) throw new Error("Session expired");
      set({ user, isAuth: true, isLoading: false });
    } catch (_) {
      set({ ...initialState, isLoading: false });
    }
  },
  initAuth: async () => {
    try {
      const user = await getLoggedInUser();
      if (!user) throw new Error("Session expired");
      set({ user, isAuth: true, isLoading: false });
    } catch (_error) {
      set({ ...initialState, isLoading: false });
    }
  },
  logout: async () => {
    await logout();
    set({ ...initialState, isLoading: false });
  },
}));
