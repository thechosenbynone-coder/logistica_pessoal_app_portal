import React, { useState } from 'react';

export function LoginScreen({ onLoginSuccess, api }) {
  const [cpf, setCpf] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPin = pin.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      setError('CPF/PIN inválidos');
      return;
    }

    if (!/^\d{4,12}$/.test(cleanPin)) {
      setError('CPF/PIN inválidos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login({ cpf: cleanCpf, pin: cleanPin });
      if (!response?.employee?.id) {
        setError('CPF/PIN inválidos');
        return;
      }
      onLoginSuccess(String(response.employee.id));
    } catch (_err) {
      setError('CPF/PIN inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">MVP Demo</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Portal do Colaborador</h1>
          <p className="mt-2 text-sm text-slate-600">Acesse com CPF e PIN</p>
          <p className="mt-1 text-xs text-slate-500">Na demo, o PIN é os 4 primeiros dígitos do CPF</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">CPF</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => setCpf(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-slate-200 transition focus:border-slate-400 focus:ring"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={12}
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-slate-200 transition focus:border-slate-400 focus:ring"
            />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
