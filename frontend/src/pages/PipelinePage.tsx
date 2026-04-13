import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { dealsApi } from '../api/deals.api';
import { clientsApi } from '../api/clients.api';
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

const stages = [
  { key: 'LEAD', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { key: 'PROPOSTA', label: 'Proposta', color: 'bg-blue-50 border-blue-300' },
  { key: 'NEGOCIACAO', label: 'Negociação', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'FECHADO_GANHO', label: 'Ganho', color: 'bg-green-50 border-green-300' },
  { key: 'FECHADO_PERDIDO', label: 'Perdido', color: 'bg-red-50 border-red-300' },
];

export function PipelinePage() {
  const [columns, setColumns] = useState<Record<string, Deal[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({ title: '', value: '', clientId: '', stage: 'LEAD' });
  const [loading, setLoading] = useState(false);

  const fetchDeals = async () => {
    const { data } = await dealsApi.list();
    setColumns(data);
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const openCreate = async () => {
    const { data } = await clientsApi.list({ limit: 100 });
    setClients(data.data.map((c: any) => ({ id: c.id, name: c.name })));
    setForm({ title: '', value: '', clientId: '', stage: 'LEAD' });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Novo Negócio
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.key} className={`flex-shrink-0 w-72 rounded-xl border ${stage.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-600">
                  {(columns[stage.key] || []).length}
                </span>
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
                            className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                            }`}
                          >
                            <p className="font-medium text-sm">{deal.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{deal.client.name}</p>
                            {deal.value && (
                              <p className="text-sm font-semibold text-green-600 mt-1">
                                {formatCurrency(deal.value)}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{deal.owner.name}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

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
    </div>
  );
}
