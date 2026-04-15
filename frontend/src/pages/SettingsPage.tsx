import { useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';
import { originsApi } from '../api/origins.api';
import { useAuthStore } from '../store/authStore';

interface LeadOrigin {
  id: string;
  name: string;
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [origins, setOrigins] = useState<LeadOrigin[]>([]);
  const [newOriginName, setNewOriginName] = useState('');
  const [originLoading, setOriginLoading] = useState(false);
  const [originError, setOriginError] = useState('');

  useEffect(() => {
    fetchOrigins();
  }, []);

  const fetchOrigins = async () => {
    try {
      const { data } = await originsApi.list();
      setOrigins(data);
    } catch {}
  };

  const handleAddOrigin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginName.trim()) return;
    setOriginError('');
    setOriginLoading(true);
    try {
      await originsApi.create({ name: newOriginName.trim() });
      setNewOriginName('');
      await fetchOrigins();
    } catch (err: any) {
      setOriginError(err.response?.data?.message || 'Erro ao adicionar origem.');
    }
    setOriginLoading(false);
  };

  const handleDeleteOrigin = async (id: string) => {
    setOriginError('');
    try {
      await originsApi.remove(id);
      await fetchOrigins();
    } catch (err: any) {
      setOriginError(err.response?.data?.message || 'Erro ao remover origem.');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);
    try {
      const payload: { name?: string; email?: string } = {};
      if (profileForm.name !== user?.name) payload.name = profileForm.name;
      if (profileForm.email !== user?.email) payload.email = profileForm.email;

      if (Object.keys(payload).length === 0) {
        setProfileError('Nenhuma alteração detectada.');
        setProfileLoading(false);
        return;
      }

      const { data } = await authApi.updateProfile(payload);
      setUser({ ...user!, name: data.name, email: data.email });
      setProfileSuccess('Perfil atualizado com sucesso.');
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    }
    setProfileLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Senha alterada com sucesso.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Erro ao alterar senha.');
    }
    setPasswordLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Origens de Lead */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Origens de Lead</h2>

        {originError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{originError}</p>
        )}

        <ul className="space-y-2 mb-4">
          {origins.length === 0 && (
            <li className="text-sm text-gray-500">Nenhuma origem cadastrada.</li>
          )}
          {origins.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-800">{o.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteOrigin(o.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddOrigin} className="flex gap-2">
          <input
            value={newOriginName}
            onChange={(e) => setNewOriginName(e.target.value)}
            placeholder="Nova origem (ex: Instagram)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={originLoading || !newOriginName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {originLoading ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {/* Dados do Perfil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Dados do Perfil</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {profileError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{profileSuccess}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {profileLoading ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </form>
      </div>

      {/* Alterar Senha */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Alterar Senha</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{passwordSuccess}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
