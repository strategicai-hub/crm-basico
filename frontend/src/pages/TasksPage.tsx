import { useEffect, useState, useCallback } from 'react';
import { tasksApi } from '../api/tasks.api';
import { clientsApi } from '../api/clients.api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  client: { id: string; name: string } | null;
  owner: { id: string; name: string };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', clientId: '', status: 'PENDENTE' });
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data } = await tasksApi.list({ status: filter || undefined, limit: 100 });
    setTasks(data.data);
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreate = async () => {
    const { data } = await clientsApi.list({ limit: 100 });
    setClients(data.data.map((c: any) => ({ id: c.id, name: c.name })));
    setEditTask(null);
    setForm({ title: '', description: '', dueDate: '', clientId: '', status: 'PENDENTE' });
    setModalOpen(true);
  };

  const openEdit = async (task: Task) => {
    const { data } = await clientsApi.list({ limit: 100 });
    setClients(data.data.map((c: any) => ({ id: c.id, name: c.name })));
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] + 'T' + task.dueDate.split('T')[1]?.substring(0, 5) : '',
      clientId: task.client?.id || '',
      status: task.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      clientId: form.clientId || undefined,
      status: form.status,
    };
    try {
      if (editTask) {
        await tasksApi.update(editTask.id, payload);
      } else {
        await tasksApi.create(payload);
      }
      setModalOpen(false);
      fetchTasks();
    } catch {}
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await tasksApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchTasks();
    } catch {}
    setLoading(false);
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'PENDENTE' ? 'EM_ANDAMENTO' : task.status === 'EM_ANDAMENTO' ? 'CONCLUIDA' : task.status;
    if (nextStatus === task.status) return;
    await tasksApi.update(task.id, { status: nextStatus });
    fetchTasks();
  };

  const isOverdue = (task: Task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && !['CONCLUIDA', 'CANCELADA'].includes(task.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nova Tarefa
        </button>
      </div>

      <div className="flex gap-2">
        {[{ value: '', label: 'Todas' }, ...Object.entries(statusLabels).map(([value, { label }]) => ({ value, label }))].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${isOverdue(task) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          >
            <button
              onClick={() => toggleStatus(task)}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                task.status === 'CONCLUIDA' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {task.status === 'CONCLUIDA' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${task.status === 'CONCLUIDA' ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabels[task.status]?.color || ''}`}>
                  {statusLabels[task.status]?.label || task.status}
                </span>
                {task.client && <span className="text-xs text-gray-500">Cliente: {task.client.name}</span>}
                {task.dueDate && (
                  <span className={`text-xs ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    Vence: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => openEdit(task)} className="text-sm text-gray-500 hover:text-blue-600">Editar</button>
              <button onClick={() => setDeleteTarget(task)} className="text-sm text-gray-500 hover:text-red-600">Excluir</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">Nenhuma tarefa encontrada.</div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTask ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(statusLabels).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${deleteTarget?.title}"?`}
        loading={loading}
      />
    </div>
  );
}
