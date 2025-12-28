import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, authService } from './auth-api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    full_name?: string;
    age?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.login({ username, password });
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
          // Return response to allow checking in component
          return response;
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const user = await authService.register(data);
          set({
            user,
            isAuthenticated: false, // Not authenticated until email verified
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        const token = authService.getToken();
        const user = authService.getUser();
        
        if (token && user) {
          set({
            token,
            user,
            isAuthenticated: true,
          });
          
          // Verify token is still valid
          try {
            const currentUser = await authService.getCurrentUser();
            set({ user: currentUser });
          } catch (error) {
            // Token invalid, clear auth
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token: string | null) => {
        set({ token, isAuthenticated: !!token });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

