import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Summary {
  totalClients: number;
  openDeals: number;
  pipelineValue: number;
  pendingTasks: number;
}

interface SalesData {
  month: string;
  value: number;
}

interface FunnelData {
  stage: string;
  count: number;
}

interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user: { name: string };
  client?: { name: string } | null;
  deal?: { title: string } | null;
}

const stageLabels: Record<string, string> = {
  LEAD: 'Lead',
  PROPOSTA: 'Proposta',
  NEGOCIACAO: 'Negociação',
  FECHADO_GANHO: 'Ganho',
  FECHADO_PERDIDO: 'Perdido',
};

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [funnel, setFunnel] = useState<FunnelData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    dashboardApi.summary().then(({ data }) => setSummary(data));
    dashboardApi.salesByMonth().then(({ data }) => setSales(data));
    dashboardApi.conversionFunnel().then(({ data }) => setFunnel(data));
    dashboardApi.recentActivities().then(({ data }) => setActivities(data));
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clientes', value: summary?.totalClients ?? '-', color: 'blue' },
          { label: 'Negócios Abertos', value: summary?.openDeals ?? '-', color: 'green' },
          { label: 'Valor no Pipeline', value: summary ? formatCurrency(summary.pipelineValue) : '-', color: 'purple' },
          { label: 'Tarefas Pendentes', value: summary?.pendingTasks ?? '-', color: 'orange' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Vendas por Mês</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Funil de Conversão</h2>
          <div className="space-y-3">
            {funnel.map((item) => {
              const maxCount = Math.max(...funnel.map((f) => f.count), 1);
              const width = (item.count / maxCount) * 100;
              return (
                <div key={item.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{stageLabels[item.stage] || item.stage}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Atividades Recentes</h2>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma atividade ainda.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs font-medium">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-gray-600">{activity.content}</span>
                  </p>
                  <div className="flex gap-2 text-xs text-gray-400 mt-1">
                    {activity.client && <span>Cliente: {activity.client.name}</span>}
                    {activity.deal && <span>Negócio: {activity.deal.title}</span>}
                    <span>{new Date(activity.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
