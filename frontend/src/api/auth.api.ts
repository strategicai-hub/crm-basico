import api from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get('/auth/me'),

  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    api.patch('/auth/profile', data),
};
