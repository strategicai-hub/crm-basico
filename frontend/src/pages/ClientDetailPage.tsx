import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsApi } from '../api/clients.api';

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
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
};

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityForm, setActivityForm] = useState({ type: 'NOTE', content: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    clientsApi.get(id).then(({ data }) => setClient(data));
    clientsApi.getActivities(id).then(({ data }) => setActivities(data));
  }, [id]);

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.company && <p className="text-gray-500">{client.company}</p>}
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-blue-50 rounded-lg px-4 py-2">
              <p className="text-xl font-bold text-blue-600">{client._count.deals}</p>
              <p className="text-xs text-gray-500">Negócios</p>
            </div>
            <div className="bg-green-50 rounded-lg px-4 py-2">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Adicionar Atividade</h2>
        <form onSubmit={addActivity} className="flex gap-3">
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

      {/* Activities Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Histórico</h2>
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
