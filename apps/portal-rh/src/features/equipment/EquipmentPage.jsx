import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HardHat } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import apiService from '../../services/api.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return (value ?? '').toString();
}

export default function EquipmentPage() {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const list = await apiService.epiCatalog.list();
      const safeList = Array.isArray(list) ? list : [];
      setCatalog(safeList);
      setSelectedId((current) => {
        if (safeList.length === 0) return null;
        if (safeList.some((item) => item?.id === current)) return current;
        return safeList[0]?.id ?? null;
      });
    } catch (loadError) {
      console.error('[equipment-page] falha ao carregar catálogo de epi', loadError);
      setCatalog([]);
      setError('Não foi possível carregar o catálogo de EPIs agora.');
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredCatalog = useMemo(() => {
    const q = normalizeText(query).trim().toLowerCase();
    if (!q) return catalog;

    return catalog.filter((item) => {
      const name = normalizeText(item?.name).toLowerCase();
      const code = normalizeText(item?.code).toLowerCase();
      const ca = normalizeText(item?.ca).toLowerCase();
      return name.includes(q) || code.includes(q) || ca.includes(q);
    });
  }, [catalog, query]);

  useEffect(() => {
    if (filteredCatalog.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillVisible = filteredCatalog.some((item) => item?.id === selectedId);
    if (!stillVisible) {
      setSelectedId(filteredCatalog[0]?.id ?? null);
    }
  }, [filteredCatalog, selectedId]);

  const selectedItem = useMemo(
    () => filteredCatalog.find((item) => item?.id === selectedId) ?? null,
    [filteredCatalog, selectedId]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Catálogo de EPIs</div>
            <div className="text-sm text-slate-500">Itens carregados diretamente da API.</div>
          </div>
          <HardHat className="text-slate-700" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Buscar por nome, código ou CA"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button onClick={loadCatalog} disabled={loading}>
            Atualizar
          </Button>
        </div>

        {loading && (
          <div className="mt-4 text-sm text-slate-600">Carregando catálogo de EPIs...</div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div>{error}</div>
            <div className="mt-2">
              <Button variant="secondary" onClick={loadCatalog}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && filteredCatalog.length === 0 && (
          <div className="mt-4 text-sm text-slate-500">Nenhum EPI cadastrado.</div>
        )}

        {!loading && !error && filteredCatalog.length > 0 && (
          <div className="mt-4 space-y-2">
            {filteredCatalog.map((item) => {
              const stockQty = toNumber(item?.stock_qty, 0);
              const minStock = toNumber(item?.min_stock, 0);
              const lowStock = stockQty <= minStock;
              const selected = item?.id === selectedId;

              return (
                <button
                  key={item?.id}
                  type="button"
                  onClick={() => setSelectedId(item?.id ?? null)}
                  className={
                    'w-full rounded-xl border p-3 text-left transition hover:bg-slate-50 ' +
                    (selected
                      ? 'border-slate-900 ring-2 ring-slate-900'
                      : lowStock
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200')
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {normalizeText(item?.name) || 'Sem nome'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item?.code ? `Código: ${normalizeText(item.code)}` : 'Sem código'}
                        {item?.ca ? ` • CA: ${normalizeText(item.ca)}` : ''}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Estoque: {stockQty} • Mínimo: {minStock}
                      </div>
                    </div>
                    {lowStock && <Badge tone="yellow">Estoque baixo</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 lg:col-span-1">
        <div className="text-sm font-semibold text-slate-900">Detalhes do EPI</div>
        {!selectedItem ? (
          <div className="mt-3 text-sm text-slate-500">
            Selecione um item para visualizar os detalhes.
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Nome:</span>{' '}
              <span className="font-medium text-slate-900">
                {normalizeText(selectedItem?.name) || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Código:</span>{' '}
              {normalizeText(selectedItem?.code) || '—'}
            </div>
            <div>
              <span className="text-slate-500">CA:</span> {normalizeText(selectedItem?.ca) || '—'}
            </div>
            <div>
              <span className="text-slate-500">Unidade:</span>{' '}
              {normalizeText(selectedItem?.unit) || '—'}
            </div>
            <div>
              <span className="text-slate-500">Estoque:</span>{' '}
              {toNumber(selectedItem?.stock_qty, 0)}
            </div>
            <div>
              <span className="text-slate-500">Estoque mínimo:</span>{' '}
              {toNumber(selectedItem?.min_stock, 0)}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
