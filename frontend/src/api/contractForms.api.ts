import axios from 'axios';
import api from './axios';

const publicApi = axios.create({ baseURL: '/api' });

export interface ContractFormData {
  legalName: string;
  cnpj: string;
  address: string;
  cityState: string;
  cep: string;
  signerName: string;
  signerCpf: string;
  signerEmail: string;
  billingContact: string;
}

export interface ContractSubmission extends ContractFormData {
  id: string;
  submittedAt: string;
}

export const contractFormsApi = {
  getPublic: (token: string) => publicApi.get(`/public/contract-form/${token}`),
  submit: (token: string, data: ContractFormData) =>
    publicApi.post(`/public/contract-form/${token}/submit`, data),

  generateToken: (clientId: string) => api.post(`/clients/${clientId}/form-token`),
  revokeToken: (clientId: string) => api.delete(`/clients/${clientId}/form-token`),
  listSubmissions: (clientId: string) =>
    api.get<ContractSubmission[]>(`/clients/${clientId}/contract-submissions`),
  deleteSubmission: (clientId: string, submissionId: string) =>
    api.delete(`/clients/${clientId}/contract-submissions/${submissionId}`),
};
