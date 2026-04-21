import axios from 'axios';
import api from './axios';

const publicApi = axios.create({ baseURL: '/api' });

export type OnboardingNiche = 'ACADEMIA' | 'ESCOLA_CURSOS' | 'CONSORCIO' | 'GENERICO';
export type OnboardingTargetPlan = 'START' | 'PLENO';

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'list'
  | 'timeslots'
  | 'upload'
  | 'repeater';

export interface SelectOption {
  value: string;
  label: string;
}

export interface DependsOn {
  questionId: string;
  equals?: unknown;
  in?: unknown[];
  notEquals?: unknown;
}

export interface Question {
  id: string;
  section: string;
  sectionTitle?: string;
  label: string;
  labelByNiche?: Partial<Record<OnboardingNiche, string>>;
  help?: string;
  helpByNiche?: Partial<Record<OnboardingNiche, string>>;
  type: QuestionType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: SelectOption[];
  niches?: OnboardingNiche[];
  targetPlans?: OnboardingTargetPlan[];
  dependsOn?: DependsOn;
  fields?: Question[];
  uploadHint?: string;
  accept?: string;
  min?: number;
  max?: number;
}

export interface PublicFormContext {
  clientName: string;
  niche: OnboardingNiche;
  targetPlan: OnboardingTargetPlan;
  questions: Question[];
  hasDrive: boolean;
}

export interface UploadEntry {
  questionId: string;
  name: string;
  driveFileId: string;
  url: string;
}

export interface OnboardingFormSummary {
  id: string;
  clientId: string;
  token: string | null;
  url: string | null;
  niche: OnboardingNiche;
  targetPlan: OnboardingTargetPlan;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  submissions: Array<{ id: string; submittedAt: string }>;
}

export interface OnboardingSubmissionRecord {
  id: string;
  formId: string;
  answers: Record<string, unknown>;
  uploads: UploadEntry[];
  submittedAt: string;
}

export const onboardingFormsApi = {
  getPublic: (token: string) => publicApi.get<PublicFormContext>(`/public/onboarding/${token}`),
  uploadFile: (token: string, questionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('questionId', questionId);
    return publicApi.post<UploadEntry>(`/public/onboarding/${token}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submit: (token: string, data: { answers: Record<string, unknown>; uploads: UploadEntry[] }) =>
    publicApi.post<{ id: string; submittedAt: string }>(`/public/onboarding/${token}/submit`, data),

  get: (clientId: string) => api.get<OnboardingFormSummary | null>(`/clients/${clientId}/onboarding-form`),
  createOrUpdate: (clientId: string, body: { niche: OnboardingNiche; targetPlan: OnboardingTargetPlan }) =>
    api.post<OnboardingFormSummary>(`/clients/${clientId}/onboarding-form`, body),
  revoke: (clientId: string) => api.delete(`/clients/${clientId}/onboarding-form/token`),
  listSubmissions: (clientId: string) =>
    api.get<OnboardingSubmissionRecord[]>(`/clients/${clientId}/onboarding-form/submissions`),
  deleteSubmission: (clientId: string, submissionId: string) =>
    api.delete(`/clients/${clientId}/onboarding-form/submissions/${submissionId}`),
  downloadYaml: (clientId: string) =>
    api.get(`/clients/${clientId}/onboarding-form/yaml`, { responseType: 'blob' }),
};
