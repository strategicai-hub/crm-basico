import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { dealsApi } from '../api/deals.api';
import { clientsApi } from '../api/clients.api';
import { usersApi } from '../api/users.api';
import { Modal } from '../components/ui/Modal';

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  position: number;
  client: { id: string; name: string; company: string | null };
  owner: { id: string; name: string };
}

interface ClientOption {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface StageConfig {
  [key: string]: { label: string; color: string };
}

interface Stage {
  key: string;
  label: string;
  color: string;
}

const defaultStages: Stage[] = [
  { key: 'LEAD', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { key: 'PROPOSTA', label: 'Proposta', color: 'bg-blue-50 border-blue-300' },
  { key: 'NEGOCIACAO', label: 'Negociação', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'FECHADO_GANHO', label: 'Ganho', color: 'bg-green-50 border-green-300' },
  { key: 'FECHADO_PERDIDO', label: 'Perdido', color: 'bg-red-50 border-red-300' },
];

const colorOptions = [
  { label: 'Cinza', value: 'bg-gray-100 border-gray-300' },
  { label: 'Azul', value: 'bg-blue-50 border-blue-300' },
  { label: 'Amarelo', value: 'bg-yellow-50 border-yellow-300' },
  { label: 'Verde', value: 'bg-green-50 border-green-300' },
  { label: 'Vermelho', value: 'bg-red-50 border-red-300' },
  { label: 'Roxo', value: 'bg-purple-50 border-purple-300' },
  { label: 'Laranja', value: 'bg-orange-50 border-orange-300' },
  { label: 'Índigo', value: 'bg-indigo-50 border-indigo-300' },
];

export function PipelinePage() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Record<string, Deal[]>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stageConfigOpen, setStageConfigOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ title: '', value: '', clientId: '', stage: 'LEAD' });
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editForm, setEditForm] = useState({ title: '', value: '', stage: 'LEAD', ownerId: '' });
  const [configEditing, setConfigEditing] = useState<Record<string, { label: string; color: string }>>({});
  const [stageConfig, setStageConfig] = useState<StageConfig>({});
  const [stages, setStages] = useState<Stage[]>(defaultStages);
  const [stagesEditing, setStagesEditing] = useState<Stage[]>([]);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageColor, setNewStageColor] = useState('bg-gray-100 border-gray-300');
  const [loading, setLoading] = useState(false);

  const fetchDeals = async () => {
    const { data } = await dealsApi.list();
    setColumns(data);
  };

  useEffect(() => {
    loadStages();
    fetchDeals();
    loadStageConfig();
  }, []);

  const loadStages = () => {
    const saved = localStorage.getItem('crm_stages');
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        setStages(loaded);
      } catch {}
    }
  };

  const saveStages = (newStages: Stage[]) => {
    localStorage.setItem('crm_stages', JSON.stringify(newStages));
    setStages(newStages);
  };

  const loadStageConfig = () => {
    const saved = localStorage.getItem('crm_stage_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setStageConfig(config);
      } catch {}
    }
  };

  const saveStageConfig = (config: StageConfig) => {
    localStorage.setItem('crm_stage_config', JSON.stringify(config));
    setStageConfig(config);
  };

  const openCreate = async () => {
    const { data } = await clientsApi.list({ limit: 100 });
    setClients(data.data.map((c: any) => ({ id: c.id, name: c.name })));
    setForm({ title: '', value: '', clientId: '', stage: stages[0]?.key || 'LEAD' });
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dealsApi.create({
        title: form.title,
        value: form.value ? parseFloat(form.value) : undefined,
        clientId: form.clientId,
        stage: form.stage,
      });
      setModalOpen(false);
      fetchDeals();
    } catch {}
    setLoading(false);
  };

  const handleEdit = async (deal: Deal) => {
    setEditingDeal(deal);
    setEditForm({
      title: deal.title,
      value: deal.value?.toString() || '',
      stage: deal.stage,
      ownerId: deal.owner.id,
    });
    try {
      const { data } = await usersApi.listMinimal();
      setUsers(data);
    } catch {
      // Se falhar, mostra apenas o responsável atual como opção
      setUsers([deal.owner]);
    }
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    setLoading(true);
    try {
      await dealsApi.update(editingDeal.id, {
        title: editForm.title,
        value: editForm.value ? parseFloat(editForm.value) : null,
        stage: editForm.stage,
        ownerId: editForm.ownerId || undefined,
      });
      setEditModalOpen(false);
      fetchDeals();
    } catch {}
    setLoading(false);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = [...(columns[source.droppableId] || [])];
    const destCol = source.droppableId === destination.droppableId
      ? sourceCol
      : [...(columns[destination.droppableId] || [])];

    const [moved] = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, { ...moved, stage: destination.droppableId });

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol,
    });

    try {
      await dealsApi.move(draggableId, {
        stage: destination.droppableId,
        position: destination.index,
      });
    } catch {
      fetchDeals();
    }
  };

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : '';

  const getStageLabel = (stageKey: string) => {
    if (stageConfig[stageKey]) {
      return stageConfig[stageKey].label;
    }
    return stages.find(s => s.key === stageKey)?.label || stageKey;
  };

  const getStageColor = (stageKey: string) => {
    if (stageConfig[stageKey]) {
      return stageConfig[stageKey].color;
    }
    return stages.find(s => s.key === stageKey)?.color || 'bg-gray-100 border-gray-300';
  };

  const addStage = () => {
    if (!newStageLabel.trim()) return;
    const newStage: Stage = {
      key: `CUSTOM_${Date.now()}`,
      label: newStageLabel.trim(),
      color: newStageColor,
    };
    const updated = [...stagesEditing, newStage];
    setStagesEditing(updated);
    setNewStageLabel('');
    setNewStageColor('bg-gray-100 border-gray-300');
  };

  const removeStage = (stageKey: string) => {
    setStagesEditing(stagesEditing.filter(s => s.key !== stageKey));
  };

  const saveStagesConfig = () => {
    saveStages(stagesEditing);
    setStageConfigOpen(false);
  };

  const allDeals = Object.values(columns).flat();

  return (
    <div className="space-y-3 sm:space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Pipeline de Vendas</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualizar em Kanban"
            >
              📊 Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualizar em Lista"
            >
              📋 Lista
            </button>
          </div>
          {viewMode === 'kanban' && (
            <button
              onClick={() => {
                setStagesEditing(stages);
                setConfigEditing(stageConfig);
                setStageConfigOpen(true);
              }}
              className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-xs sm:text-sm font-medium"
              title="Configurar etapas"
            >
              ⚙️ Configurar
            </button>
          )}
          <button onClick={openCreate} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium">
            + Novo Negócio
          </button>
        </div>
      </div>

      {viewMode === 'kanban' && (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 flex-shrink-0">
          {stages.map((stage) => {
            const stageDeals = columns[stage.key] || [];
            const stageTotal = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
            <div key={stage.key} className={`flex-shrink-0 w-64 sm:w-72 rounded-xl border ${getStageColor(stage.key)} p-2 sm:p-3`}>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{getStageLabel(stage.key)}</h3>
                  <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-600">
                    {stageDeals.length}
                  </span>
                </div>
                {stageTotal > 0 && (
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    {formatCurrency(stageTotal)}
                  </div>
                )}
              </div>

              <Droppable droppableId={stage.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[100px]">
                    {(columns[stage.key] || []).map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 group cursor-move ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{deal.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{deal.client.name}</p>
                                {deal.client.company && (
                                  <p className="text-xs text-gray-400">{deal.client.company}</p>
                                )}
                                {deal.value && (
                                  <p className="text-sm font-semibold text-green-600 mt-1">
                                    {formatCurrency(deal.value)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">{deal.owner.name}</p>
                              </div>
                              <button
                                onClick={() => handleEdit(deal)}
                                className="ml-2 p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Editar negócio"
                              >
                                ✏️
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
          })}
        </div>
      </DragDropContext>
      )}

      {viewMode === 'list' && (
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Título</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Empresa</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Valor</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Etapa</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Responsável</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {allDeals.map((deal) => (
                <tr key={deal.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 font-medium">{deal.title}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">{deal.client.company || '—'}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm font-semibold text-green-600">{deal.value ? formatCurrency(deal.value) : '—'}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getStageColor(deal.stage)
                    }`}>
                      {getStageLabel(deal.stage)}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-600">{deal.owner.name}</td>
                  <td className="px-2 sm:px-4 py-3 text-sm">
                    <button
                      onClick={() => handleEdit(deal)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      title="Editar"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allDeals.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum negócio criado ainda
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Negócio">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {stages.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Negócio">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={editForm.value}
              onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
            <select
              value={editForm.stage}
              onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {stages.map((s) => (
                <option key={s.key} value={s.key}>{getStageLabel(s.key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <select
              value={editForm.ownerId}
              onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {editingDeal && (
              <button
                type="button"
                onClick={() => navigate(`/clientes/${editingDeal.client.id}`)}
                className="flex-1 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
              >
                👁️ Ver cliente
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={stageConfigOpen} onClose={() => setStageConfigOpen(false)} title="Configurar Etapas">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {stagesEditing.map((stage) => (
            <div key={stage.key} className="border border-gray-200 rounded-lg p-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da etapa</label>
                    <input
                      type="text"
                      value={stage.label}
                      onChange={(e) =>
                        setStagesEditing(stagesEditing.map(s => s.key === stage.key ? { ...s, label: e.target.value } : s))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                    <select
                      value={stage.color}
                      onChange={(e) =>
                        setStagesEditing(stagesEditing.map(s => s.key === stage.key ? { ...s, color: e.target.value } : s))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {colorOptions.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                  </div>
                  {stage.key.startsWith('CUSTOM_') && (
                    <button
                      type="button"
                      onClick={() => removeStage(stage.key)}
                      className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      🗑️ Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm mb-3">Adicionar nova etapa</h4>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nome da etapa"
                  value={newStageLabel}
                  onChange={(e) => setNewStageLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <select
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {colorOptions.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addStage}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                + Adicionar etapa
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStageConfigOpen(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveStagesConfig}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
