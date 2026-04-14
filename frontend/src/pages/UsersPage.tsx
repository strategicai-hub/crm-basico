import { useEffect, useState, useCallback } from 'react';
import { usersApi } from '../api/users.api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const copyId = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const fetchUsers = async () => {
    const { data } = await usersApi.list({ limit: 100 });
    setUsers(data.data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersApi.create(form);
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'USER' });
      fetchUsers();
    } catch {}
    setLoading(false);
  };

  const toggleActive = async (user: User) => {
    await usersApi.update(user.id, { active: !user.active });
    fetchUsers();
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    await usersApi.update(user.id, { role: newRole });
    fetchUsers();
  };

  const selectableUsers = users.filter((u) => u.id !== currentUser?.id && u.active);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(selectableUsers.map((u) => u.id)));
    else clearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setBulkError(null);
    try {
      await usersApi.bulkRemove(Array.from(selectedIds));
      clearSelection();
      setBulkDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      setBulkError(err?.response?.data?.message || 'Erro ao desativar usuários');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Novo Usuário
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-800">
            {selectedIds.size} usuário(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Limpar seleção
            </button>
            <button
              onClick={() => { setBulkError(null); setBulkDeleteOpen(true); }}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              Excluir selecionados
            </button>
          </div>
        </div>
      )}

      {bulkError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          {bulkError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id))}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  title="Selecionar todos"
                  className="cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const disabled = user.id === currentUser?.id || !user.active;
              return (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleSelection(user.id)}
                    disabled={disabled}
                    title={
                      user.id === currentUser?.id
                        ? 'Você não pode selecionar seu próprio usuário'
                        : !user.active
                        ? 'Usuário já está inativo'
                        : 'Selecionar'
                    }
                    className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyId(user.id)}
                    title={copiedId === user.id ? 'Copiado!' : user.id}
                    className="font-mono text-xs text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedId === user.id ? 'copiado!' : `${user.id.slice(0, 8)}…`}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-sm text-right space-x-2">
                  <button onClick={() => toggleRole(user)} className="text-gray-500 hover:text-purple-600">
                    {user.role === 'ADMIN' ? 'Tornar Usuário' : 'Tornar Admin'}
                  </button>
                  <button onClick={() => toggleActive(user)} className={`${user.active ? 'text-gray-500 hover:text-red-600' : 'text-gray-500 hover:text-green-600'}`}>
                    {user.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Usuário">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USER">Usuário</option>
              <option value="ADMIN">Admin</option>
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

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Excluir Usuários"
        message={`Os ${selectedIds.size} usuário(s) selecionado(s) serão desativados. Os dados associados (clientes, negócios, atividades) são preservados. Você pode reativá-los depois.`}
        loading={loading}
      />
    </div>
  );
}
