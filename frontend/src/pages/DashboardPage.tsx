import { useEffect, useRef, useState } from 'react';
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
  stageId: string;
  label: string;
  type: 'OPEN' | 'WON' | 'LOST';
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

interface LeadsBySource {
  startDate: string;
  endDate: string;
  origins: { id: string; name: string }[];
  stages: { id: string; label: string; type: 'OPEN' | 'WON' | 'LOST' }[];
  matrix: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  newClients: Record<string, number | null>;
  conversion: Record<string, number> | null;
  contractStageId: string | null;
}

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [funnel, setFunnel] = useState<FunnelData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState(toIsoDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState(toIsoDate(lastDayOfMonth));
  const [leads, setLeads] = useState<LeadsBySource | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(startDate);
  const [pendingEnd, setPendingEnd] = useState(endDate);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  const formatRangeLabel = (s: string, e: string) => {
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };
    return `${fmt(s)} — ${fmt(e)}`;
  };

  const applyPreset = (preset: 'this-month' | 'last-month' | 'last-7' | 'last-30') => {
    const t = new Date();
    let s: Date, e: Date;
    if (preset === 'this-month') {
      s = new Date(t.getFullYear(), t.getMonth(), 1);
      e = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    } else if (preset === 'last-month') {
      s = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      e = new Date(t.getFullYear(), t.getMonth(), 0);
    } else if (preset === 'last-7') {
      e = t;
      s = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6);
    } else {
      e = t;
      s = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29);
    }
    setPendingStart(toIsoDate(s));
    setPendingEnd(toIsoDate(e));
  };

  const applyRange = () => {
    if (!pendingStart || !pendingEnd) return;
    const s = pendingStart <= pendingEnd ? pendingStart : pendingEnd;
    const e = pendingStart <= pendingEnd ? pendingEnd : pendingStart;
    setStartDate(s);
    setEndDate(e);
    setPickerOpen(false);
  };

  const openPicker = () => {
    setPendingStart(startDate);
    setPendingEnd(endDate);
    setPickerOpen(true);
  };

  useEffect(() => {
    dashboardApi.summary().then(({ data }) => setSummary(data));
    dashboardApi.salesByMonth().then(({ data }) => setSales(data));
    dashboardApi.conversionFunnel().then(({ data }) => setFunnel(data));
    dashboardApi.recentActivities().then(({ data }) => setActivities(data));
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    dashboardApi.leadsBySource(startDate, endDate).then(({ data }) => setLeads(data));
  }, [startDate, endDate]);

  const formatPercent = (v: number | null | undefined) =>
    v === null || v === undefined
      ? '—'
      : new Intl.NumberFormat('pt-BR', {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(v);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Clientes', value: summary?.totalClients ?? '-', color: 'blue' },
          { label: 'Negócios Abertos', value: summary?.openDeals ?? '-', color: 'green' },
          { label: 'Valor no Pipeline', value: summary ? formatCurrency(summary.pipelineValue) : '-', color: 'purple' },
          { label: 'Tarefas Pendentes', value: summary?.pendingTasks ?? '-', color: 'orange' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 break-words">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Vendas por Mês</h2>
          <div className="h-56 sm:h-64">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Funil de Conversão</h2>
          <div className="space-y-3">
            {funnel.map((item) => {
              const maxCount = Math.max(...funnel.map((f) => f.count), 1);
              const width = (item.count / maxCount) * 100;
              return (
                <div key={item.stageId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
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

      {/* Leads por Fonte */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 inline-block max-w-full align-top w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
          <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">Leads por Fonte</h2>
          <div className="relative w-full sm:w-auto" ref={pickerRef}>
            <button
              type="button"
              onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 flex items-center justify-between sm:justify-start gap-2"
            >
              <span>{formatRangeLabel(startDate, endDate)}</span>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {pickerOpen && (
              <div className="absolute z-10 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { k: 'this-month', label: 'Este mês' },
                    { k: 'last-month', label: 'Mês passado' },
                    { k: 'last-7', label: 'Últimos 7 dias' },
                    { k: 'last-30', label: 'Últimos 30 dias' },
                  ].map((p) => (
                    <button
                      key={p.k}
                      type="button"
                      onClick={() => applyPreset(p.k as 'this-month' | 'last-month' | 'last-7' | 'last-30')}
                      className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 text-gray-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Início</label>
                    <input
                      type="date"
                      value={pendingStart}
                      onChange={(e) => setPendingStart(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Fim</label>
                    <input
                      type="date"
                      value={pendingEnd}
                      onChange={(e) => setPendingEnd(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={applyRange}
                    className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!leads ? (
          <p className="text-gray-500 text-sm">Carregando…</p>
        ) : leads.origins.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma origem cadastrada. Cadastre origens em /origens.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <table className="text-[11px] sm:text-sm w-full sm:w-auto sm:max-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed sm:table-auto">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-300">
                    <th className="text-left py-2 px-1.5 sm:px-3 font-semibold text-gray-700 align-bottom">Etapa</th>
                    {leads.origins.map((o) => (
                      <th key={o.id} className="text-center py-2 px-1 sm:px-3 font-semibold text-gray-700 break-words leading-tight align-bottom">{o.name}</th>
                    ))}
                    <th className="text-center py-2 px-1 sm:px-3 font-semibold text-gray-700 align-bottom">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.stages.map((stage, idx) => (
                    <tr key={stage.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                      <td className="py-1.5 px-1.5 sm:px-3 text-gray-700 break-words leading-tight">{stage.label}</td>
                      {leads.origins.map((o) => (
                        <td key={o.id} className="py-1.5 px-1 sm:px-3 text-center text-gray-700">{leads.matrix[stage.id]?.[o.id] ?? 0}</td>
                      ))}
                      <td className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">{leads.matrix[stage.id]?.__total ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <table className="text-[11px] sm:text-sm w-full sm:w-auto sm:max-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed sm:table-auto">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-300">
                    <th className="text-left py-2 px-1.5 sm:px-3 font-semibold text-gray-700 align-bottom">Métrica</th>
                    {leads.origins.map((o) => (
                      <th key={o.id} className="text-center py-2 px-1 sm:px-3 font-semibold text-gray-700 break-words leading-tight align-bottom">{o.name}</th>
                    ))}
                    <th className="text-center py-2 px-1 sm:px-3 font-semibold text-gray-700 align-bottom">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="py-1.5 px-1.5 sm:px-3 font-semibold text-gray-800 break-words leading-tight">Total de Leads</td>
                    {leads.origins.map((o) => (
                      <td key={o.id} className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">{leads.totals[o.id] ?? 0}</td>
                    ))}
                    <td className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">{leads.totals.__total ?? 0}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="py-1.5 px-1.5 sm:px-3 font-semibold text-gray-800 break-words leading-tight">Novos Clientes</td>
                    {leads.origins.map((o) => (
                      <td key={o.id} className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">
                        {leads.newClients[o.id] ?? '—'}
                      </td>
                    ))}
                    <td className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">
                      {leads.newClients.__total ?? '—'}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-1.5 px-1.5 sm:px-3 font-semibold text-gray-800 break-words leading-tight">Taxa de Conversão</td>
                    {leads.origins.map((o) => (
                      <td key={o.id} className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">
                        {formatPercent(leads.conversion ? leads.conversion[o.id] : null)}
                      </td>
                    ))}
                    <td className="py-1.5 px-1 sm:px-3 text-center font-semibold text-gray-800">
                      {formatPercent(leads.conversion ? leads.conversion.__total : null)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!leads.contractStageId && (
              <p className="text-xs text-gray-400">
                Cadastre uma etapa com "Contrato" no nome para calcular Novos Clientes e Taxa de Conversão.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Atividades Recentes</h2>
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
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
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
