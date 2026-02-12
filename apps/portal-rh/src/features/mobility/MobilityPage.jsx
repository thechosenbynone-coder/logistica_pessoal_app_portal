import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Input from '../../ui/Input.jsx';
import Button from '../../ui/Button.jsx';
import api from '../../services/api';

function normalizeVessel(item) {
  const name = String(item?.name ?? item?.nome ?? '').trim() || 'Sem nome';
  const type = String(item?.type ?? item?.tipo ?? '').trim();
  const code = String(item?.code ?? item?.codigo ?? '').trim();
  const rawId = item?.id ?? item?.vessel_id ?? item?.vesselId ?? (code || `${name}|${type}|${code}`);

  return {
    id: String(rawId),
    name,
    type,
    code,
    client: String(item?.client ?? item?.cliente ?? '').trim()
  };
}

function getApiErrorMessage(error) {
  const status = error?.response?.status;
  const url = error?.config?.url || '/vessels';
  console.error('Falha ao carregar embarcações', { status, url, error });
  return 'Não foi possível carregar as embarcações.';
}

export default function MobilityPage() {
  const [vessels, setVessels] = useState([]);
  const [selectedVesselId, setSelectedVesselId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadVessels = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.mobility.listVessels();
      const nextList = response.map(normalizeVessel);

      setVessels(nextList);
      setSelectedVesselId((currentId) => {
        const current = String(currentId || '');
        if (current && nextList.some((item) => item.id === current)) return current;
        return nextList[0]?.id || '';
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setVessels([]);
      setSelectedVesselId('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVessels();
  }, [loadVessels]);

  const filteredVessels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vessels;

    return vessels.filter((vessel) => {
      return vessel.name.toLowerCase().includes(query)
        || vessel.code.toLowerCase().includes(query)
        || vessel.type.toLowerCase().includes(query);
    });
  }, [search, vessels]);

  const selectedVessel = useMemo(
    () => filteredVessels.find((item) => item.id === String(selectedVesselId))
      || vessels.find((item) => item.id === String(selectedVesselId))
      || null,
    [filteredVessels, vessels, selectedVesselId]
  );

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">Escala e Embarque</h1>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Embarcações</h2>
          <div className="flex w-full gap-2 sm:max-w-md">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, código ou tipo"
            />
            <Button type="button" variant="secondary" onClick={loadVessels}>
              Atualizar
            </Button>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando embarcações…</p>}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <Button type="button" variant="secondary" className="mt-3" onClick={loadVessels}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && filteredVessels.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma embarcação cadastrada</p>
        )}

        {!loading && !error && filteredVessels.length > 0 && (
          <div className="grid gap-3">
            {filteredVessels.map((vessel) => {
              const isActive = vessel.id === String(selectedVesselId);
              return (
                <button
                  key={vessel.id}
                  type="button"
                  onClick={() => setSelectedVesselId(vessel.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{vessel.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Código: {vessel.code || '—'} • Tipo: {vessel.type || '—'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Detalhes</h3>
        <p className="mt-2 text-base text-slate-800">Embarcação selecionada: <strong>{selectedVessel?.name || 'Nenhuma'}</strong></p>
        {selectedVessel && (
          <div className="mt-2 text-sm text-slate-600">
            <div>Código: {selectedVessel.code || '—'}</div>
            <div>Tipo: {selectedVessel.type || '—'}</div>
            <div>Cliente: {selectedVessel.client || '—'}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
