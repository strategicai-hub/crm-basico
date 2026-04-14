import api from './axios';

export const usersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get('/users', { params }),

  listMinimal: () => api.get('/users/minimal'),

  create: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post('/users', data),

  update: (id: string, data: any) => api.patch(`/users/${id}`, data),

  remove: (id: string) => api.delete(`/users/${id}`),

  bulkRemove: (ids: string[]) => api.post('/users/bulk-delete', { ids }),
};
