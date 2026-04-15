import api from './axios';

export const originsApi = {
  list: () => api.get('/origins'),
  create: (data: { name: string }) => api.post('/origins', data),
  remove: (id: string) => api.delete(`/origins/${id}`),
};
