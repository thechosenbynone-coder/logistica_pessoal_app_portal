import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import Modal from '../../ui/Modal.jsx';
import Input from '../../ui/Input.jsx';
import { CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import apiService from '../../services/api.js';

function statusBadge(status) {
  if (status === 'EMITIDO') return <Badge tone="blue">Emitido</Badge>;
  if (status === 'AGUARDANDO_ASSINATURA') return <Badge tone="yellow">Aguardando aceite</Badge>;
  if (status === 'ASSINADO') return <Badge tone="green">Assinado</Badge>;
  if (status === 'DEVOLVIDO') return <Badge tone="gray">Devolvido</Badge>;
  if (status === 'PARCIAL') return <Badge tone="orange">Parcial</Badge>;
  return <Badge tone="gray">{status || '—'}</Badge>;
}

export default function EquipmentTab({ employee }) {
  const [ficha, setFicha] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ location: 'Base', responsible: 'RH', notes: '' });
  const [draftItems, setDraftItems] = useState([]);

  const load = useCallback(async () => {
    if (!employee?.id) return;
    const [f, c] = await Promise.all([
      apiService.epiDeliveries.fichaByEmployee(employee.id),
      apiService.epiCatalog.list(),
    ]);
    setFicha(f);
    setCatalog(c);
  }, [employee?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = (catalogId) => {
    const item = catalog.find((entry) => entry.id === catalogId);
    if (!item) return;

    setDraftItems((prev) => [
      ...prev,
      {
        id: `${catalogId}_${Date.now()}`,
        catalogId,
        name: (item.name || '').toString(),
        qty: 1,
        code: item.code ? item.code.toString() : '',
        size: '',
      },
    ]);
  };

  const removeItem = (id) => setDraftItems((prev) => prev.filter((item) => item.id !== id));

  const canCreate = useMemo(() => draftItems.length > 0, [draftItems]);

  const emitTerm = async () => {
    try {
      await Promise.all(
        draftItems.map((item) =>
          apiService.epiDeliveries.create({
            employee_id: employee.id,
            epi_item_id: item.catalogId,
            quantity: Number(item.qty),
            location: draft.location,
            responsible: draft.responsible,
            notes: draft.notes,
          })
        )
      );
      setOpen(false);
      setDraftItems([]);
      setDraft({ location: 'Base', responsible: 'RH', notes: '' });
      await load();
    } catch (err) {
      console.error('[equipment-tab] erro ao emitir termo', err);
      // modal permanece aberto para o usuário corrigir
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Equipamentos & EPI</div>
            <div className="text-sm text-gray-600 mt-1">
              Gere a ficha de entrega, envie para aceite no app e marque como assinado.
            </div>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Nova entrega
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Termos / Fichas</div>
          <div className="text-xs text-gray-500">{employee?.name}</div>
        </div>

        <div className="mt-4 space-y-3">
          {(ficha?.deliveries || []).map((term) => (
            <div key={term.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">Entrega #{term.id}</div>
                {statusBadge(term.status)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Data:{' '}
                {term.delivery_date ? new Date(term.delivery_date).toLocaleDateString('pt-BR') : '—'}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="gray">
                  {term.quantity}x {term.epi_item?.name || term.epi_item_id}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={() =>
                    apiService.epiDeliveries
                      .updateStatus(term.id, { status: 'AGUARDANDO_ASSINATURA' })
                      .then(load)
                  }
                >
                  Enviar para aceite
                </Button>
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={() =>
                    apiService.epiDeliveries.updateStatus(term.id, { status: 'ASSINADO' }).then(load)
                  }
                >
                  Marcar assinado
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
                    <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                    <button onClick={() => removeItem(item.id)} className="p-2 rounded-lg hover:bg-white">
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
                      <div className="text-xs text-gray-600 mb-1">Código / Patrimônio</div>
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
            <Button disabled={!canCreate} onClick={emitTerm}>
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
