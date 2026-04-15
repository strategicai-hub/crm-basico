import api from './axios';

export const dealsApi = {
  list: () => api.get('/deals'),

  get: (id: string) => api.get(`/deals/${id}`),

  create: (data: { title: string; value?: number; clientId: string; stageId: string; originId?: string | null }) =>
    api.post('/deals', data),

  update: (id: string, data: any) => api.patch(`/deals/${id}`, data),

  move: (id: string, data: { stageId: string; position: number }) =>
    api.patch(`/deals/${id}/stage`, data),

  remove: (id: string) => api.delete(`/deals/${id}`),

  bulkRemove: (ids: string[]) => api.post('/deals/bulk-delete', { ids }),
};
