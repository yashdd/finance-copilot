import axios from 'axios';
import { API_BASE } from './api-config';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  full_name?: string;
  age?: number;
}

export interface LoginData {
  username: string; // Can be username or email
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  age?: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Create axios instance with default config
const authApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (backend can be slow on first request)
});

// Add token to requests if available
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(data: RegisterData): Promise<User> {
    try {
      console.log('Registering user:', { ...data, password: '***', confirm_password: '***' });
      console.log('API Base URL:', API_BASE);
      const response = await authApi.post<User>('/auth/register', data);
      console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('Registration API error:', error);
      const err = error as { code?: string };
      if (err.code === 'ERR_NETWORK') {
        throw new Error('Network error: Unable to connect to server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>('/auth/login', data);
    // Store token and user in localStorage
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Also set cookie for middleware to check (7 days expiry)
    if (typeof document !== 'undefined') {
      document.cookie = `access_token=${response.data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await authApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Also remove cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
      }
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await authApi.get<User>('/auth/me');
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
    const response = await authApi.post<{ message: string; verified: boolean }>('/auth/verify-email', { token });
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};

export default authApi;

