import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { dealsApi } from '../api/deals.api';
import { clientsApi } from '../api/clients.api';
import { usersApi } from '../api/users.api';
import { stagesApi } from '../api/stages.api';
import { originsApi } from '../api/origins.api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type StageType = 'OPEN' | 'WON' | 'LOST';

interface Stage {
  id: string;
  key: string;
  label: string;
  color: string;
  position: number;
  type: StageType;
}

interface LeadOrigin {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stageId: string;
  position: number;
  client: { id: string; name: string; company: string | null };
  owner: { id: string; name: string };
  stage: { id: string; key: string; label: string; color: string; type: StageType; position: number };
  origin: LeadOrigin | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

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

const typeOptions: { label: string; value: StageType }[] = [
  { label: 'Aberto', value: 'OPEN' },
  { label: 'Ganho', value: 'WON' },
  { label: 'Perdido', value: 'LOST' },
];

export function PipelinePage() {
  const navigate = useNavigate();

  const [stages, setStages] = useState<Stage[]>([]);
  const [columns, setColumns] = useState<Record<string, Deal[]>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stageConfigOpen, setStageConfigOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [origins, setOrigins] = useState<LeadOrigin[]>([]);
  const [form, setForm] = useState({ title: '', value: '', clientId: '', stageId: '', originId: '' });
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editForm, setEditForm] = useState({ title: '', value: '', stageId: '', ownerId: '', originId: '' });
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageColor, setNewStageColor] = useState('bg-gray-100 border-gray-300');
  const [newStageType, setNewStageType] = useState<StageType>('OPEN');
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Deal | null>(null);

  const fetchStages = async () => {
    const { data } = await stagesApi.list();
    setStages(data);
  };

  const fetchDeals = async () => {
    const { data } = await dealsApi.list();
    setColumns(data);
  };

  const fetchOrigins = async () => {
    const { data } = await originsApi.list();
    setOrigins(data);
  };

  useEffect(() => {
    fetchStages();
    fetchDeals();
    fetchOrigins();
    localStorage.removeItem('crm_stage_config');
    localStorage.removeItem('crm_stages');
  }, []);

  const openCreate = async () => {
    const { data } = await clientsApi.list({ limit: 100 });
    setClients(data.data.map((c: any) => ({ id: c.id, name: c.name })));
    setForm({ title: '', value: '', clientId: '', stageId: stages[0]?.id || '', originId: '' });
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stageId) return;
    setLoading(true);
    try {
      await dealsApi.create({
        title: form.title,
        value: form.value ? parseFloat(form.value) : undefined,
        clientId: form.clientId,
        stageId: form.stageId,
        originId: form.originId || null,
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
      stageId: deal.stageId,
      ownerId: deal.owner.id,
      originId: deal.origin?.id || '',
    });
    try {
      const { data } = await usersApi.listMinimal();
      setUsers(data);
    } catch {
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
        stageId: editForm.stageId,
        ownerId: editForm.ownerId || undefined,
        originId: editForm.originId || null,
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
    destCol.splice(destination.index, 0, { ...moved, stageId: destination.droppableId });

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol,
    });

    try {
      await dealsApi.move(draggableId, {
        stageId: destination.droppableId,
        position: destination.index,
      });
    } catch {
      fetchDeals();
    }
  };

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : '';

  const openConfig = async () => {
    setConfigError(null);
    await fetchStages();
    setStageConfigOpen(true);
  };

  const addStage = async () => {
    if (!newStageLabel.trim()) return;
    setConfigError(null);
    try {
      await stagesApi.create({
        label: newStageLabel.trim(),
        color: newStageColor,
        type: newStageType,
      });
      setNewStageLabel('');
      setNewStageColor('bg-gray-100 border-gray-300');
      setNewStageType('OPEN');
      await fetchStages();
      await fetchDeals();
    } catch (err: any) {
      setConfigError(err?.response?.data?.message || 'Erro ao adicionar etapa');
    }
  };

  const removeStage = async (stageId: string) => {
    setConfigError(null);
    try {
      await stagesApi.remove(stageId);
      await fetchStages();
      await fetchDeals();
    } catch (err: any) {
      setConfigError(err?.response?.data?.message || 'Erro ao remover etapa');
    }
  };

  const updateStageField = async (
    stageId: string,
    patch: { label?: string; color?: string; type?: StageType }
  ) => {
    setConfigError(null);
    try {
      await stagesApi.update(stageId, patch);
      await fetchStages();
      await fetchDeals();
    } catch (err: any) {
      setConfigError(err?.response?.data?.message || 'Erro ao atualizar etapa');
    }
  };

  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= stages.length) return;
    const reordered = [...stages];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setStages(reordered);
    setConfigError(null);
    try {
      await stagesApi.reorder(reordered.map((s) => s.id));
      await fetchStages();
      await fetchDeals();
    } catch (err: any) {
      setConfigError(err?.response?.data?.message || 'Erro ao reordenar etapas');
      fetchStages();
    }
  };

  const allDeals = Object.values(columns).flat();

  const toggleDealSelection = (id: string) => {
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedDealIds(new Set());

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    setLoading(true);
    try {
      await dealsApi.remove(singleDeleteTarget.id);
      setSelectedDealIds((prev) => {
        const next = new Set(prev);
        next.delete(singleDeleteTarget.id);
        return next;
      });
      setSingleDeleteTarget(null);
      fetchDeals();
    } catch {}
    setLoading(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedDealIds.size === 0) return;
    setLoading(true);
    try {
      await dealsApi.bulkRemove(Array.from(selectedDealIds));
      clearSelection();
      setBulkDeleteOpen(false);
      fetchDeals();
    } catch {}
    setLoading(false);
  };

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
              onClick={openConfig}
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

      {selectedDealIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-800">
            {selectedDealIds.size} negócio(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Limpar seleção
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              Excluir selecionados
            </button>
          </div>
        </div>
      )}

      {viewMode === 'kanban' && (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 flex-shrink-0">
          {stages.map((stage) => {
            const stageDeals = columns[stage.id] || [];
            const stageTotal = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
            <div key={stage.id} className={`flex-shrink-0 w-64 sm:w-72 rounded-xl border ${stage.color} p-2 sm:p-3`}>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
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

              <Droppable droppableId={stage.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[100px]">
                    {stageDeals.map((deal, index) => (
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
                            <div className="flex items-start justify-between gap-2">
                              <input
                                type="checkbox"
                                checked={selectedDealIds.has(deal.id)}
                                onChange={() => toggleDealSelection(deal.id)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="mt-1 cursor-pointer"
                                title="Selecionar negócio"
                              />
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
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(deal)}
                                  className="p-1 text-gray-400 hover:text-blue-600"
                                  title="Editar negócio"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSingleDeleteTarget(deal);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                  title="Excluir negócio"
                                >
                                  🗑️
                                </button>
                              </div>
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
                <th className="px-2 sm:px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allDeals.length > 0 && allDeals.every((d) => selectedDealIds.has(d.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDealIds(new Set(allDeals.map((d) => d.id)));
                      else clearSelection();
                    }}
                    title="Selecionar todos"
                    className="cursor-pointer"
                  />
                </th>
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
                  <td className="px-2 sm:px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDealIds.has(deal.id)}
                      onChange={() => toggleDealSelection(deal.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 font-medium">{deal.title}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">{deal.client.company || '—'}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm font-semibold text-green-600">{deal.value ? formatCurrency(deal.value) : '—'}</td>
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${deal.stage.color}`}>
                      {deal.stage.label}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-600">{deal.owner.name}</td>
                  <td className="px-2 sm:px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(deal)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setSingleDeleteTarget(deal)}
                      className="text-red-500 hover:text-red-700"
                      title="Excluir"
                    >
                      🗑️
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
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
            <select
              value={form.originId}
              onChange={(e) => setForm({ ...form, originId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem origem</option>
              {origins.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
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
              value={editForm.stageId}
              onChange={(e) => setEditForm({ ...editForm, stageId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
            <div className="flex items-center gap-2">
              <select
                value={editForm.originId}
                onChange={(e) => setEditForm({ ...editForm, originId: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem origem</option>
                {origins.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <a
                href="/configuracoes"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Gerenciar origens"
              >
                ⚙️
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            {editingDeal && (
              <button
                type="button"
                onClick={() => navigate('/clientes', { state: { editClientId: editingDeal.client.id } })}
                className="flex-1 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
              >
                ✏️ Editar cliente
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
        <div className="flex flex-col gap-3">
          {configError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {configError}
            </div>
          )}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveStage(stage.id, 'up')}
                      disabled={idx === 0}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
                      title="Mover para cima"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveStage(stage.id, 'down')}
                      disabled={idx === stages.length - 1}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
                      title="Mover para baixo"
                    >▼</button>
                  </div>
                  <input
                    type="text"
                    defaultValue={stage.label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== stage.label) updateStageField(stage.id, { label: v });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={stage.color}
                    onChange={(e) => updateStageField(stage.id, { color: e.target.value })}
                    className="px-2 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {colorOptions.map((color) => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                  <select
                    value={stage.type}
                    onChange={(e) => updateStageField(stage.id, { type: e.target.value as StageType })}
                    className="px-2 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    title="Tipo da etapa"
                  >
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeStage(stage.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Remover etapa"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm mb-3">Adicionar nova etapa</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome da etapa"
                value={newStageLabel}
                onChange={(e) => setNewStageLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
                <select
                  value={newStageType}
                  onChange={(e) => setNewStageType(e.target.value as StageType)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  title="Tipo da etapa"
                >
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
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

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStageConfigOpen(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!singleDeleteTarget}
        onClose={() => setSingleDeleteTarget(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Excluir Negócio"
        message={`Tem certeza que deseja excluir o negócio "${singleDeleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        loading={loading}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Excluir Negócios"
        message={`Tem certeza que deseja excluir ${selectedDealIds.size} negócio(s)? Esta ação não pode ser desfeita.`}
        loading={loading}
      />
    </div>
  );
}
