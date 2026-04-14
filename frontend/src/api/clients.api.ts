import api from './axios';

export const clientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/clients', { params }),

  get: (id: string) => api.get(`/clients/${id}`),

  create: (data: { name: string; email?: string; phone?: string; company?: string; notes?: string }) =>
    api.post('/clients', data),

  update: (id: string, data: any) => api.patch(`/clients/${id}`, data),

  remove: (id: string) => api.delete(`/clients/${id}`),

  bulkRemove: (ids: string[]) => api.post('/clients/bulk-delete', { ids }),

  getActivities: (id: string) => api.get(`/clients/${id}/activities`),

  addActivity: (id: string, data: { type: string; content: string }) =>
    api.post(`/clients/${id}/activities`, data),
};
