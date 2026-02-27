import React, { useState } from 'react';
import Input from '../../ui/Input.jsx';
import Button from '../../ui/Button.jsx';
import api from '../../services/api.js';
import { setAccessToken } from '../../lib/apiClient.js';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    if (!u || !p) {
      setError('Preencha usuário e senha.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await api.portalAuth.login({ username: u, password: p });
      setAccessToken(data.access_token);
      onLoginSuccess(data.user);
    } catch {
      setError('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Portal RH</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse com suas credenciais</p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Usuário</label>
              <Input
                placeholder="seu.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Desenvolvido por Hubye</p>
      </div>
    </div>
  );
}
