import React, { useCallback, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import Modal from '../../ui/Modal.jsx';
import Input from '../../ui/Input.jsx';
import { Plus, FileText, Upload, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import apiService from '../../services/api.js';

function statusBadge(status) {
  if (status === 'RASCUNHO') return <Badge tone="gray">Rascunho</Badge>;
  if (status === 'EMITIDO') return <Badge tone="blue">Emitido</Badge>;
  if (status === 'ASSINADO') return <Badge tone="green">Assinado</Badge>;
  if (status === 'AGUARDANDO_APP') return <Badge tone="yellow">Aguardando aceite</Badge>;
  return <Badge tone="gray">{status}</Badge>;
}

export default function EquipmentTab({ employee }) {
  const [terms, setTerms] = useState([
    {
      id: 't_001',
      createdAt: '2026-01-20',
      status: 'ASSINADO',
      items: [
        { name: 'Capacete', code: 'PAT-1881', qty: 1 },
        { name: 'Crachá', code: 'CRA-4410', qty: 1 },
      ],
    },
    {
      id: 't_002',
      createdAt: '2026-01-24',
      status: 'EMITIDO',
      items: [{ name: 'Bota', size: '40', qty: 1 }],
    },
  ]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ location: 'Base', responsible: 'RH', notes: '' });
  const [draftItems, setDraftItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const canCreate = draftItems.length > 0;

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const items = await apiService.epiCatalog.list();
      setCatalog(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('[equipment-tab] erro ao carregar catálogo de EPI', error);
      setCatalog([]);
      setCatalogError('Não foi possível carregar o catálogo de EPI.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const openModal = useCallback(async () => {
    setOpen(true);
    if (catalog.length === 0 && !catalogLoading) {
      await loadCatalog();
    }
  }, [catalog.length, catalogLoading, loadCatalog]);

  const addItem = (catalogId) => {
    const item = catalog.find((entry) => entry.id === catalogId);
    if (!item) return;

    setDraftItems((prev) => [
      ...prev,
      {
        id: `${catalogId}_${Date.now()}`,
        catalogId,
        name: (item.name || '').toString(),
        type: 'EPI',
        qty: 1,
        code: item.code ? item.code.toString() : '',
        size: '',
      },
    ]);
  };

  const removeItem = (id) => setDraftItems((prev) => prev.filter((item) => item.id !== id));

  const createTerm = () => {
    const newTerm = {
      id: `t_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'EMITIDO',
      items: draftItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        code: item.code || undefined,
        size: item.size || undefined,
      })),
    };

    setTerms((prev) => [newTerm, ...prev]);
    setDraftItems([]);
    setDraft({ location: 'Base', responsible: 'RH', notes: '' });
    setOpen(false);
  };

  const summary = useMemo(() => {
    const totalItems = terms.reduce((acc, term) => acc + (term.items?.length || 0), 0);
    const pending = terms.filter(
      (term) => term.status === 'EMITIDO' || term.status === 'RASCUNHO'
    ).length;
    return { totalItems, pending };
  }, [terms]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Equipamentos & EPI</div>
            <div className="text-sm text-gray-600 mt-1">
              Gere a ficha de entrega, imprima ou colete assinatura. Aceite no app será implementado
              depois.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{terms.length} termos</Badge>
              <Badge tone="yellow">{summary.pending} pendentes</Badge>
              <Badge tone="gray">{summary.totalItems} itens no histórico</Badge>
            </div>
          </div>
          <Button onClick={openModal}>
            <Plus size={16} />
            Nova entrega
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">Termos / Fichas</div>
            <div className="text-xs text-gray-500">{employee.registration}</div>
          </div>

          <div className="mt-4 space-y-3">
            {terms.map((term) => (
              <div key={term.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">{term.id}</div>
                  {statusBadge(term.status)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Criado em {term.createdAt}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {term.items.map((item, idx) => (
                    <Badge key={idx} tone="gray">
                      {item.qty}x {item.name}
                      {item.size ? ` (${item.size})` : ''}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" className="text-sm">
                    <FileText size={16} />
                    Gerar PDF
                  </Button>
                  <Button variant="secondary" className="text-sm">
                    <Upload size={16} />
                    Anexar assinado
                  </Button>
                  <Button variant="ghost" className="text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-gray-800">Itens em posse (visão)</div>
          <div className="mt-2 text-sm text-gray-600">
            (MVP) Esta lista será derivada dos termos aceitos/assinados e das devoluções
            registradas.
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                Capacete <span className="text-xs text-gray-500">PAT-1881</span>
              </div>
              <Badge tone="green">Em posse</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                Bota <span className="text-xs text-gray-500">Tam. 40</span>
              </div>
              <Badge tone="green">Em posse</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                Crachá <span className="text-xs text-gray-500">CRA-4410</span>
              </div>
              <Badge tone="yellow">Devolver</Badge>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Futuro: botão “Enviar para aceite no app” mudará status para <b>Aguardando aceite</b>.
          </div>
        </Card>
      </div>

      <Modal open={open} title="Nova entrega de EPI/Equipamentos" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Local</div>
              <Input
                value={draft.location}
                onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Responsável RH</div>
              <Input
                value={draft.responsible}
                onChange={(e) => setDraft((prev) => ({ ...prev, responsible: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Adicionar item</div>
            {catalogLoading && <div className="text-sm text-gray-600">Carregando catálogo...</div>}
            {!catalogLoading && catalogError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div>{catalogError}</div>
                <div className="mt-2">
                  <Button variant="secondary" onClick={loadCatalog}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
            {!catalogLoading && !catalogError && catalog.length === 0 && (
              <div className="text-sm text-gray-600">Nenhum item disponível no catálogo.</div>
            )}
            {!catalogLoading && !catalogError && catalog.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {catalog.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item.id)}
                    className="text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100"
                  >
                    + {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Itens da entrega</div>
            {draftItems.length === 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                Nenhum item adicionado.
              </div>
            )}
            <div className="space-y-2">
              {draftItems.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">
                      {item.name} <span className="text-xs text-gray-500">({item.type})</span>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg hover:bg-white"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Qtd</div>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const quantity = Math.max(1, Number(e.target.value || 1));
                          setDraftItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, qty: quantity } : entry
                            )
                          );
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Código / Patrimônio / CA</div>
                      <Input
                        value={item.code}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, code: e.target.value } : entry
                            )
                          )
                        }
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Tamanho</div>
                      <Input
                        value={item.size}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, size: e.target.value } : entry
                            )
                          )
                        }
                        placeholder="Ex: 40"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Observações</div>
            <Input
              value={draft.notes}
              onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Ex: entregue com carregador"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!canCreate} onClick={createTerm}>
              <CheckCircle2 size={16} />
              Emitir termo
            </Button>
          </div>

          {!canCreate && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <Clock size={16} className="mt-0.5" /> Adicione pelo menos 1 item para emitir o termo.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
