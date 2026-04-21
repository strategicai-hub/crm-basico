import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsApi } from '../api/clients.api';
import { contractFormsApi, ContractSubmission } from '../api/contractForms.api';
import {
  onboardingFormsApi,
  OnboardingFormSummary,
  OnboardingNiche,
  OnboardingTargetPlan,
} from '../api/onboardingForms.api';
import { useAuthStore } from '../store/authStore';

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  formToken: string | null;
  owner: { id: string; name: string };
  _count: { deals: number; tasks: number };
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user: { name: string };
}

const typeLabels: Record<string, string> = {
  NOTE: 'Nota',
  CALL: 'Ligação',
  EMAIL: 'Email',
  MEETING: 'Reunião',
  STAGE_CHANGE: 'Mudança de Etapa',
  CONTRACT_FORM_SUBMITTED: 'Formulário de contrato',
  ONBOARDING_FORM_SUBMITTED: 'Formulário de onboarding',
};

const NICHE_LABELS: Record<OnboardingNiche, string> = {
  ACADEMIA: 'Academia / estúdio fitness',
  ESCOLA_CURSOS: 'Escola / cursos',
  CONSORCIO: 'Consórcio',
  GENERICO: 'Genérico (outros)',
};

const PLAN_LABELS: Record<OnboardingTargetPlan, string> = {
  START: 'plano-start',
  PLENO: 'plano-pleno',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 break-words">{value}</p>
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityForm, setActivityForm] = useState({ type: 'NOTE', content: '' });
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<ContractSubmission[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const [onboardingForm, setOnboardingForm] = useState<OnboardingFormSummary | null>(null);
  const [onboardingNiche, setOnboardingNiche] = useState<OnboardingNiche>('ACADEMIA');
  const [onboardingPlan, setOnboardingPlan] = useState<OnboardingTargetPlan>('PLENO');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingCopied, setOnboardingCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    clientsApi.get(id).then(({ data }) => setClient(data));
    clientsApi.getActivities(id).then(({ data }) => setActivities(data));
  }, [id]);

  useEffect(() => {
    if (!id || !isAdmin) return;
    contractFormsApi.listSubmissions(id).then(({ data }) => setSubmissions(data));
  }, [id, isAdmin]);

  useEffect(() => {
    if (!id) return;
    onboardingFormsApi.get(id).then(({ data }) => {
      setOnboardingForm(data);
      if (data) {
        setOnboardingNiche(data.niche);
        setOnboardingPlan(data.targetPlan);
      }
    });
  }, [id]);

  const formUrl = client?.formToken
    ? `${window.location.origin}/formulario-contrato/${client.formToken}`
    : null;

  const handleGenerateToken = async () => {
    if (!id) return;
    setTokenLoading(true);
    try {
      const { data } = await contractFormsApi.generateToken(id);
      setClient((prev) => (prev ? { ...prev, formToken: data.token } : prev));
    } finally {
      setTokenLoading(false);
    }
  };

  const handleRevokeToken = async () => {
    if (!id) return;
    if (!confirm('Revogar o link? Ele deixará de funcionar imediatamente.')) return;
    setTokenLoading(true);
    try {
      await contractFormsApi.revokeToken(id);
      setClient((prev) => (prev ? { ...prev, formToken: null } : prev));
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!formUrl) return;
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onboardingUrl = onboardingForm?.token
    ? `${window.location.origin}/formulario-negocio/${onboardingForm.token}`
    : null;

  const handleGenerateOnboarding = async () => {
    if (!id) return;
    setOnboardingLoading(true);
    try {
      const { data } = await onboardingFormsApi.createOrUpdate(id, {
        niche: onboardingNiche,
        targetPlan: onboardingPlan,
      });
      setOnboardingForm(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao gerar link de onboarding.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleRevokeOnboarding = async () => {
    if (!id) return;
    if (!confirm('Revogar o link? Ele deixará de funcionar imediatamente.')) return;
    setOnboardingLoading(true);
    try {
      await onboardingFormsApi.revoke(id);
      setOnboardingForm((prev) => (prev ? { ...prev, token: null, url: null } : prev));
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleCopyOnboarding = async () => {
    if (!onboardingUrl) return;
    await navigator.clipboard.writeText(onboardingUrl);
    setOnboardingCopied(true);
    setTimeout(() => setOnboardingCopied(false), 2000);
  };

  const handleDeleteContractSubmission = async (submissionId: string) => {
    if (!id) return;
    if (!confirm('Excluir esta resposta do formulário de contrato?')) return;
    try {
      await contractFormsApi.deleteSubmission(id, submissionId);
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir resposta.');
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!id) return;
    if (!confirm('Excluir esta resposta? Os arquivos enviados serão removidos do Drive também.')) return;
    try {
      await onboardingFormsApi.deleteSubmission(id, submissionId);
      setOnboardingForm((prev) =>
        prev ? { ...prev, submissions: prev.submissions.filter((s) => s.id !== submissionId) } : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir resposta.');
    }
  };

  const handleDownloadYaml = async () => {
    if (!id || !client) return;
    try {
      const { data } = await onboardingFormsApi.downloadYaml(id);
      const blob = new Blob([data as BlobPart], { type: 'application/x-yaml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `client-${safeName || 'cliente'}.yaml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao baixar YAML.');
    }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !activityForm.content.trim()) return;
    setLoading(true);
    try {
      const { data } = await clientsApi.addActivity(id, activityForm);
      setActivities([data, ...activities]);
      setActivityForm({ type: 'NOTE', content: '' });
    } catch {}
    setLoading(false);
  };

  if (!client) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/clientes')} className="text-sm text-blue-600 hover:underline">&larr; Voltar para clientes</button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{client.name}</h1>
            {client.company && <p className="text-gray-500 text-sm sm:text-base">{client.company}</p>}
          </div>
          <div className="flex gap-3 sm:gap-4 text-center">
            <div className="bg-blue-50 rounded-lg px-3 sm:px-4 py-2 flex-1 sm:flex-none">
              <p className="text-xl font-bold text-blue-600">{client._count.deals}</p>
              <p className="text-xs text-gray-500">Negócios</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 sm:px-4 py-2 flex-1 sm:flex-none">
              <p className="text-xl font-bold text-green-600">{client._count.tasks}</p>
              <p className="text-xs text-gray-500">Tarefas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm">{client.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Telefone</p>
            <p className="text-sm">{client.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Responsável</p>
            <p className="text-sm">{client.owner.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Criado em</p>
            <p className="text-sm">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        {client.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Notas</p>
            <p className="text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Add Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Adicionar Atividade</h2>
        <form onSubmit={addActivity} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select
            value={activityForm.type}
            onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="NOTE">Nota</option>
            <option value="CALL">Ligação</option>
            <option value="EMAIL">Email</option>
            <option value="MEETING">Reunião</option>
          </select>
          <input
            value={activityForm.content}
            onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
            placeholder="Descreva a atividade..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Formulário de contrato</h2>
          {client.formToken ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Link público para envio ao cliente:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={formUrl || ''}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleRevokeToken}
                    disabled={tokenLoading}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                  >
                    Revogar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">Ainda não há um link ativo para este cliente.</p>
              <button
                onClick={handleGenerateToken}
                disabled={tokenLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {tokenLoading ? 'Gerando...' : 'Gerar link'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Formulário de onboarding do negócio</h2>
        <p className="text-xs text-gray-500 mb-4">
          Link único para o cliente preencher os dados do negócio que alimentam o <code>client.yaml</code> do plano-start/plano-pleno.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nicho</label>
            <select
              value={onboardingNiche}
              onChange={(e) => setOnboardingNiche(e.target.value as OnboardingNiche)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(NICHE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plano alvo</label>
            <select
              value={onboardingPlan}
              onChange={(e) => setOnboardingPlan(e.target.value as OnboardingTargetPlan)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(PLAN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {onboardingForm && onboardingForm.token ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={onboardingUrl || ''}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCopyOnboarding}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  {onboardingCopied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={handleGenerateOnboarding}
                  disabled={onboardingLoading}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
                  title="Atualiza nicho/plano do link existente"
                >
                  Atualizar
                </button>
                <button
                  onClick={handleRevokeOnboarding}
                  disabled={onboardingLoading}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                >
                  Revogar
                </button>
              </div>
            </div>
            {onboardingForm.driveFolderUrl && (
              <a
                href={onboardingForm.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-[#0f4c4c] underline"
              >
                Abrir pasta do cliente no Google Drive →
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              {onboardingForm
                ? 'Link revogado. Gere um novo para reativar.'
                : 'Nenhum link gerado ainda.'}
            </p>
            <button
              onClick={handleGenerateOnboarding}
              disabled={onboardingLoading}
              className="px-4 py-2 bg-[#0f4c4c] text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50"
            >
              {onboardingLoading ? 'Gerando...' : 'Gerar link'}
            </button>
          </div>
        )}

        {onboardingForm && onboardingForm.submissions.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Respostas recebidas</p>
            <div className="space-y-2">
              {onboardingForm.submissions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">
                    Enviado em {new Date(s.submittedAt).toLocaleString('pt-BR')}
                  </span>
                  <button
                    onClick={() => handleDeleteSubmission(s.id)}
                    className="text-xs text-red-600 hover:underline self-start sm:self-auto"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleDownloadYaml}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#0f4c4c] text-white rounded-lg text-sm hover:opacity-90"
            >
              Baixar client.yaml da última resposta
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Respostas do formulário</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma resposta recebida.</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => {
                const isOpen = expandedSubmission === s.id;
                return (
                  <div key={s.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setExpandedSubmission(isOpen ? null : s.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium">{s.legalName}</p>
                        <p className="text-xs text-gray-500">
                          Enviado em {new Date(s.submittedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-gray-400 text-sm">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <>
                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
                          <Field label="Razão Social" value={s.legalName} />
                          <Field label="CNPJ" value={s.cnpj} />
                          <Field label="Endereço" value={s.address} />
                          <Field label="Cidade e Estado" value={s.cityState} />
                          <Field label="CEP" value={s.cep} />
                          <Field label="Nome do signatário" value={s.signerName} />
                          <Field label="CPF" value={s.signerCpf} />
                          <Field label="Email do signatário" value={s.signerEmail} />
                          <Field label="Contato para fatura" value={s.billingContact} />
                        </div>
                        <div className="px-4 pb-3 flex justify-end">
                          <button
                            onClick={() => handleDeleteContractSubmission(s.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Excluir resposta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activities Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Histórico</h2>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-xs font-medium">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>
                    {' - '}
                    <span className="text-gray-500">{typeLabels[activity.type] || activity.type}</span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{activity.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
