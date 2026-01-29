import React, { useMemo, useState } from 'react'
import Card from '../../ui/Card.jsx'
import Badge from '../../ui/Badge.jsx'
import Button from '../../ui/Button.jsx'
import Modal from '../../ui/Modal.jsx'
import Input from '../../ui/Input.jsx'
import { Plus, FileText, Upload, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { mockEquipmentCatalog } from '../../data/mock.js'

function statusBadge(status) {
  if (status === 'RASCUNHO') return <Badge tone="gray">Rascunho</Badge>
  if (status === 'EMITIDO') return <Badge tone="blue">Emitido</Badge>
  if (status === 'ASSINADO') return <Badge tone="green">Assinado</Badge>
  if (status === 'AGUARDANDO_APP') return <Badge tone="yellow">Aguardando aceite</Badge>
  return <Badge tone="gray">{status}</Badge>
}

export default function EquipmentTab({ employee }) {
  const [terms, setTerms] = useState([
    {
      id: 't_001',
      createdAt: '2026-01-20',
      status: 'ASSINADO',
      items: [
        { name: 'Capacete', code: 'PAT-1881', qty: 1 },
        { name: 'Crachá', code: 'CRA-4410', qty: 1 }
      ]
    },
    {
      id: 't_002',
      createdAt: '2026-01-24',
      status: 'EMITIDO',
      items: [{ name: 'Bota', size: '40', qty: 1 }]
    }
  ])

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ location: 'Base', responsible: 'RH', notes: '' })
  const [draftItems, setDraftItems] = useState([])

  const canCreate = draftItems.length > 0

  const addItem = (catalogId) => {
    const it = mockEquipmentCatalog.find((x) => x.id === catalogId)
    if (!it) return
    setDraftItems((prev) => [...prev, { id: `${catalogId}_${Date.now()}`, catalogId, name: it.name, type: it.type, qty: 1, code: '', size: '' }])
  }

  const removeItem = (id) => setDraftItems((prev) => prev.filter((x) => x.id !== id))

  const createTerm = () => {
    const newTerm = {
      id: `t_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'EMITIDO',
      items: draftItems.map((i) => ({ name: i.name, qty: i.qty, code: i.code || undefined, size: i.size || undefined }))
    }
    setTerms((prev) => [newTerm, ...prev])
    setDraftItems([])
    setDraft({ location: 'Base', responsible: 'RH', notes: '' })
    setOpen(false)
  }

  const summary = useMemo(() => {
    const totalItems = terms.reduce((acc, t) => acc + (t.items?.length || 0), 0)
    const pending = terms.filter((t) => t.status === 'EMITIDO' || t.status === 'RASCUNHO').length
    return { totalItems, pending }
  }, [terms])

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Equipamentos & EPI</div>
            <div className="text-sm text-gray-600 mt-1">
              Gere a ficha de entrega, imprima ou colete assinatura. Aceite no app será implementado depois.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{terms.length} termos</Badge>
              <Badge tone="yellow">{summary.pending} pendentes</Badge>
              <Badge tone="gray">{summary.totalItems} itens no histórico</Badge>
            </div>
          </div>
          <Button onClick={() => setOpen(true)}><Plus size={16} />Nova entrega</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">Termos / Fichas</div>
            <div className="text-xs text-gray-500">{employee.registration}</div>
          </div>

          <div className="mt-4 space-y-3">
            {terms.map((t) => (
              <div key={t.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">{t.id}</div>
                  {statusBadge(t.status)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Criado em {t.createdAt}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {t.items.map((i, idx) => (
                    <Badge key={idx} tone="gray">{i.qty}x {i.name}{i.size ? ` (${i.size})` : ''}</Badge>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" className="text-sm"><FileText size={16} />Gerar PDF</Button>
                  <Button variant="secondary" className="text-sm"><Upload size={16} />Anexar assinado</Button>
                  <Button variant="ghost" className="text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} />Cancelar</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-gray-800">Itens em posse (visão)</div>
          <div className="mt-2 text-sm text-gray-600">
            (MVP) Esta lista será derivada dos termos aceitos/assinados e das devoluções registradas.
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>Capacete <span className="text-xs text-gray-500">PAT-1881</span></div>
              <Badge tone="green">Em posse</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>Bota <span className="text-xs text-gray-500">Tam. 40</span></div>
              <Badge tone="green">Em posse</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>Crachá <span className="text-xs text-gray-500">CRA-4410</span></div>
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
              <Input value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Responsável RH</div>
              <Input value={draft.responsible} onChange={(e) => setDraft((d) => ({ ...d, responsible: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Adicionar item</div>
            <div className="flex flex-wrap gap-2">
              {mockEquipmentCatalog.map((it) => (
                <button
                  key={it.id}
                  onClick={() => addItem(it.id)}
                  className="text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100"
                >
                  + {it.name}
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
              {draftItems.map((it) => (
                <div key={it.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">{it.name} <span className="text-xs text-gray-500">({it.type})</span></div>
                    <button onClick={() => removeItem(it.id)} className="p-2 rounded-lg hover:bg-white"><Trash2 size={16} className="text-red-600" /></button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Qtd</div>
                      <Input type="number" min="1" value={it.qty} onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value || 1))
                        setDraftItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: v } : x))
                      }} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Código / Patrimônio / CA</div>
                      <Input value={it.code} onChange={(e) => setDraftItems((prev) => prev.map((x) => x.id === it.id ? { ...x, code: e.target.value } : x))} placeholder="Opcional" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Tamanho</div>
                      <Input value={it.size} onChange={(e) => setDraftItems((prev) => prev.map((x) => x.id === it.id ? { ...x, size: e.target.value } : x))} placeholder="Ex: 40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Observações</div>
            <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Ex: entregue com carregador" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!canCreate} onClick={createTerm}><CheckCircle2 size={16} />Emitir termo</Button>
          </div>

          {!canCreate && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <Clock size={16} className="mt-0.5" /> Adicione pelo menos 1 item para emitir o termo.
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
