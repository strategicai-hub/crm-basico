import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: localStorage.getItem('refreshToken'),
  user: null,
  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken, user });
  },
  setUser: (user) => set({ user }),
  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
