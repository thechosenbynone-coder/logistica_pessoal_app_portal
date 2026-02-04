import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Badge from '../../ui/Badge.jsx';
import {
  REQUIRED_DOC_TYPES,
  docWindowStatus,
  evidenceStatus,
  normalizeDigitsOnly,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { mergePortalPayload, readPortalPayload, writePortalPayload } from '../../lib/portalStorage';

const STATUS_OPTIONS = ['Planejado', 'Confirmado', 'Em andamento', 'Finalizado', 'Cancelado'];
const LOCAL_OPTIONS = ['Base', 'Embarcado', 'Hospedado'];
const PASSAGEM_OPTIONS = ['Não comprada', 'Comprada', 'Emitida'];

function buildProgramacao(prog) {
  return {
    PROG_ID: prog?.PROG_ID || `prog_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    UNIDADE: prog?.UNIDADE || '',
    BASE: prog?.BASE || 'Coelho Neto',
    EMBARQUE_DT: prog?.EMBARQUE_DT || '',
    DESEMBARQUE_DT: prog?.DESEMBARQUE_DT || '',
    STATUS: prog?.STATUS || 'Planejado',
    NOTES: prog?.NOTES || '',
    COLABORADORES: Array.isArray(prog?.COLABORADORES) ? prog.COLABORADORES : []
  };
}

function mapEmployees(payload) {
  const rows =
    payload?.dataset?.colaboradores ||
    payload?.colaboradores_minimos ||
    payload?.dataset?.colaboradores_minimos ||
    [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: normalizeText(row.COLABORADOR_ID || row.id),
    name: normalizeText(row.NOME_COMPLETO || row.nome || row.name),
    cpf: normalizeText(row.CPF || row.cpf),
    role: normalizeText(row.CARGO_FUNCAO || row.cargo || row.role),
    unit: normalizeText(row.UNIDADE || row.unidade || row.unit),
    base: normalizeText(row.BASE_OPERACIONAL || row.base || row.hub)
  }));
}

function computeAptidao({ docsByEmployee, employeeId, embarkDate, disembarkDate }) {
  const docs = docsByEmployee.get(employeeId) || [];
  const missing = [];
  const expired = [];
  const expiring = [];
  let evidencePending = false;

  REQUIRED_DOC_TYPES.forEach((type) => {
    const doc = docs.find((item) => normalizeDocType(item.TIPO_DOCUMENTO) === type);
    if (!doc) {
      missing.push(type);
      return;
    }
    const status = docWindowStatus(doc, embarkDate, disembarkDate);
    if (status === 'VENCIDO') expired.push(type);
    if (status === 'VENCE_DURANTE') expiring.push(type);
    const evidence = evidenceStatus(doc);
    if (evidence !== 'VERIFICADO') evidencePending = true;
  });

  if (missing.length || expired.length) {
    return { level: 'NAO_APTO', missing, expired, expiring, evidencePending };
  }
  if (expiring.length) {
    return { level: 'ATENCAO', missing, expired, expiring, evidencePending };
  }
  return { level: 'APTO', missing, expired, expiring, evidencePending };
}

export default function MobilityPage() {
  const [programacoes, setProgramacoes] = useState([]);
  const [selectedProgId, setSelectedProgId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [documentacoes, setDocumentacoes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const payload = readPortalPayload();
    setProgramacoes(
      Array.isArray(payload?.dataset?.programacoes) ? payload.dataset.programacoes.map(buildProgramacao) : []
    );
    setEmployees(mapEmployees(payload));
    setDocumentacoes(Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : []);
    const handleUpdate = () => {
      const updated = readPortalPayload();
      setProgramacoes(
        Array.isArray(updated?.dataset?.programacoes) ? updated.dataset.programacoes.map(buildProgramacao) : []
      );
      setEmployees(mapEmployees(updated));
      setDocumentacoes(Array.isArray(updated?.dataset?.documentacoes) ? updated.dataset.documentacoes : []);
    };
    window.addEventListener('portal_rh_xlsx_updated', handleUpdate);
    return () => {
      window.removeEventListener('portal_rh_xlsx_updated', handleUpdate);
    };
  }, []);

  const employeesById = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (!emp.id) return;
      map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  const docsByEmployee = useMemo(() => {
    const map = new Map();
    documentacoes.forEach((doc) => {
      const id = normalizeText(doc.COLABORADOR_ID);
      if (!id) return;
      const current = map.get(id) || [];
      current.push(doc);
      map.set(id, current);
    });
    return map;
  }, [documentacoes]);

  const selectedProgramacao = useMemo(
    () => programacoes.find((prog) => prog.PROG_ID === selectedProgId),
    [programacoes, selectedProgId]
  );

  const suggestions = useMemo(() => {
    if (!selectedProgramacao) return [];
    const term = searchQuery.trim().toLowerCase();
    if (term.length < 2) return [];
    const currentIds = new Set(selectedProgramacao.COLABORADORES.map((c) => normalizeText(c.COLABORADOR_ID)));
    const items = [];
    for (const [id, emp] of employeesById.entries()) {
      if (currentIds.has(id)) continue;
      const name = normalizeText(emp.name).toLowerCase();
      const cpf = normalizeDigitsOnly(emp.cpf);
      const matches = id.toLowerCase().includes(term) || name.includes(term) || cpf.includes(normalizeDigitsOnly(term));
      if (!matches) continue;
      const apt = computeAptidao({
        docsByEmployee,
        employeeId: id,
        embarkDate: selectedProgramacao.EMBARQUE_DT,
        disembarkDate: selectedProgramacao.DESEMBARQUE_DT
      });
      if (apt.level !== 'APTO') continue;
      items.push({ ...emp, apt });
      if (items.length >= 10) break;
    }
    return items.sort((a, b) => {
      if (a.apt.evidencePending === b.apt.evidencePending) return 0;
      return a.apt.evidencePending ? 1 : -1;
    });
  }, [selectedProgramacao, searchQuery, employeesById, docsByEmployee]);

  function persistProgramacoes(nextProgramacoes) {
    const prevPayload = readPortalPayload();
    const nextDataset = { ...prevPayload.dataset, programacoes: nextProgramacoes };
    const nextPayload = mergePortalPayload(prevPayload, {
      dataset: nextDataset,
      importedAt: prevPayload.importedAt || new Date().toISOString()
    });
    writePortalPayload(nextPayload);
    setProgramacoes(nextProgramacoes);
  }

  function updateProgramacao(progId, updater) {
    const next = programacoes.map((prog) => {
      if (prog.PROG_ID !== progId) return prog;
      return buildProgramacao(updater(prog));
    });
    persistProgramacoes(next);
  }

  function handleCreateProgramacao() {
    const next = [...programacoes, buildProgramacao({})];
    setSelectedProgId(next[next.length - 1].PROG_ID);
    persistProgramacoes(next);
  }

  function handleAddColaborador(empId) {
    if (!selectedProgramacao) return;
    const exists = selectedProgramacao.COLABORADORES.some(
      (item) => normalizeText(item.COLABORADOR_ID) === normalizeText(empId)
    );
    if (exists) return;
    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
      ...prog,
      COLABORADORES: [
        ...prog.COLABORADORES,
        {
          COLABORADOR_ID: empId,
          LOCAL_ATUAL: 'Base',
          PASSAGEM_STATUS: 'Não comprada',
          CARTAO_EMBARQUE_REF: '',
          OBS: ''
        }
      ]
    }));
  }

  function handleRemoveColaborador(empId) {
    if (!selectedProgramacao) return;
    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
      ...prog,
      COLABORADORES: prog.COLABORADORES.filter(
        (item) => normalizeText(item.COLABORADOR_ID) !== normalizeText(empId)
      )
    }));
    if (selectedMemberId === empId) setSelectedMemberId('');
  }

  const programacoesSummary = useMemo(() => {
    return programacoes.map((prog) => {
      const counts = { apto: 0, atencao: 0, naoApto: 0 };
      prog.COLABORADORES.forEach((item) => {
        const apt = computeAptidao({
          docsByEmployee,
          employeeId: normalizeText(item.COLABORADOR_ID),
          embarkDate: prog.EMBARQUE_DT,
          disembarkDate: prog.DESEMBARQUE_DT
        });
        if (apt.level === 'APTO') counts.apto += 1;
        if (apt.level === 'ATENCAO') counts.atencao += 1;
        if (apt.level === 'NAO_APTO') counts.naoApto += 1;
      });
      return { ...prog, counts };
    });
  }, [programacoes, docsByEmployee]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">Escala e Embarque</div>
            <div className="text-sm text-slate-500">Gerencie programações e validações de janela.</div>
          </div>
          <Button type="button" onClick={handleCreateProgramacao}>
            Nova Programação
          </Button>
        </div>

        <div className="space-y-2">
          {programacoesSummary.map((prog) => {
            const isActive = prog.PROG_ID === selectedProgId;
            return (
              <button
                key={prog.PROG_ID}
                type="button"
                onClick={() => {
                  setSelectedProgId(prog.PROG_ID);
                  setSelectedMemberId('');
                }}
                className={
                  'w-full text-left rounded-xl border p-4 transition-colors ' +
                  (isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{prog.UNIDADE || 'Unidade não definida'}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {prog.EMBARQUE_DT || '—'} → {prog.DESEMBARQUE_DT || '—'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge tone="gray">Total: {prog.COLABORADORES.length}</Badge>
                      <Badge tone="red">Não aptos: {prog.counts.naoApto}</Badge>
                      <Badge tone="amber">Atenção: {prog.counts.atencao}</Badge>
                      <Badge tone="green">Aptos: {prog.counts.apto}</Badge>
                    </div>
                  </div>
                  <Badge tone="gray">{prog.STATUS}</Badge>
                </div>
              </button>
            );
          })}
          {!programacoesSummary.length && (
            <Card className="p-6 text-center text-sm text-slate-500">Nenhuma programação cadastrada.</Card>
          )}
        </div>
      </div>

      <div className="col-span-7 space-y-4">
        {!selectedProgramacao ? (
          <Card className="p-6 text-sm text-slate-500">Selecione uma programação para editar.</Card>
        ) : (
          <>
            <Card className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {selectedProgramacao.UNIDADE || 'Unidade não definida'}
                  </div>
                  <div className="text-xs text-slate-500">Base: {selectedProgramacao.BASE}</div>
                </div>
                <select
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={selectedProgramacao.STATUS}
                  onChange={(e) =>
                    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                      ...prog,
                      STATUS: e.target.value
                    }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={selectedProgramacao.UNIDADE}
                  onChange={(e) =>
                    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                      ...prog,
                      UNIDADE: e.target.value
                    }))
                  }
                  placeholder="Unidade"
                />
                <Input
                  type="datetime-local"
                  value={selectedProgramacao.EMBARQUE_DT}
                  onChange={(e) =>
                    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                      ...prog,
                      EMBARQUE_DT: e.target.value
                    }))
                  }
                  placeholder="Embarque"
                />
                <Input
                  type="datetime-local"
                  value={selectedProgramacao.DESEMBARQUE_DT}
                  onChange={(e) =>
                    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                      ...prog,
                      DESEMBARQUE_DT: e.target.value
                    }))
                  }
                  placeholder="Desembarque"
                />
                <Input
                  value={selectedProgramacao.NOTES}
                  onChange={(e) =>
                    updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                      ...prog,
                      NOTES: e.target.value
                    }))
                  }
                  placeholder="Observações"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="text-sm font-semibold text-slate-900">Escalados</div>
              {!employees.length && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Importe colaboradores para exibir nomes completos.
                </div>
              )}
              <div className="space-y-3">
                {selectedProgramacao.COLABORADORES.map((colab) => {
                  const id = normalizeText(colab.COLABORADOR_ID);
                  const employee = employeesById.get(id);
                  const apt = computeAptidao({
                    docsByEmployee,
                    employeeId: id,
                    embarkDate: selectedProgramacao.EMBARQUE_DT,
                    disembarkDate: selectedProgramacao.DESEMBARQUE_DT
                  });
                  const aptLabel = apt.level === 'APTO' ? '✅ APTO' : apt.level === 'ATENCAO' ? '⚠️ ATENÇÃO' : '✖ NÃO APTO';
                  const aptTone = apt.level === 'APTO' ? 'green' : apt.level === 'ATENCAO' ? 'amber' : 'red';
                  return (
                    <div key={id} className="rounded-xl border border-slate-200 p-4">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedMemberId(selectedMemberId === id ? '' : id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{employee?.name || `ID ${id}`}</div>
                            <div className="text-xs text-slate-500">
                              {employee?.cpf ? `CPF ${employee.cpf}` : 'CPF não informado'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={aptTone}>{aptLabel}</Badge>
                            {apt.evidencePending && <Badge tone="gray">Pendência evidência</Badge>}
                          </div>
                        </div>
                      </button>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <select
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          value={colab.LOCAL_ATUAL}
                          onChange={(e) =>
                            updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                              ...prog,
                              COLABORADORES: prog.COLABORADORES.map((item) =>
                                normalizeText(item.COLABORADOR_ID) === id
                                  ? { ...item, LOCAL_ATUAL: e.target.value }
                                  : item
                              )
                            }))
                          }
                        >
                          {LOCAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          value={colab.PASSAGEM_STATUS}
                          onChange={(e) =>
                            updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                              ...prog,
                              COLABORADORES: prog.COLABORADORES.map((item) =>
                                normalizeText(item.COLABORADOR_ID) === id
                                  ? { ...item, PASSAGEM_STATUS: e.target.value }
                                  : item
                              )
                            }))
                          }
                        >
                          {PASSAGEM_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={colab.CARTAO_EMBARQUE_REF || ''}
                          onChange={(e) =>
                            updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                              ...prog,
                              COLABORADORES: prog.COLABORADORES.map((item) =>
                                normalizeText(item.COLABORADOR_ID) === id
                                  ? { ...item, CARTAO_EMBARQUE_REF: e.target.value }
                                  : item
                              )
                            }))
                          }
                          placeholder="Link cartão embarque"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Input
                          value={colab.OBS || ''}
                          onChange={(e) =>
                            updateProgramacao(selectedProgramacao.PROG_ID, (prog) => ({
                              ...prog,
                              COLABORADORES: prog.COLABORADORES.map((item) =>
                                normalizeText(item.COLABORADOR_ID) === id
                                  ? { ...item, OBS: e.target.value }
                                  : item
                              )
                            }))
                          }
                          placeholder="Observações"
                        />
                        <Button type="button" variant="secondary" onClick={() => handleRemoveColaborador(id)}>
                          Remover
                        </Button>
                      </div>

                      {selectedMemberId === id && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                          {!!apt.missing.length && (
                            <div>Faltando: {apt.missing.join(', ')}</div>
                          )}
                          {!!apt.expired.length && (
                            <div>Vencido antes do embarque: {apt.expired.join(', ')}</div>
                          )}
                          {!!apt.expiring.length && (
                            <div>Vence durante: {apt.expiring.join(', ')}</div>
                          )}
                          {!apt.missing.length && !apt.expired.length && !apt.expiring.length && (
                            <div>Sem pendências para a janela.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!selectedProgramacao.COLABORADORES.length && (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                    Nenhum colaborador escalado nesta programação.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Sugestões</div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou ID"
              />
              <div className="space-y-2">
                {suggestions.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{emp.name || `ID ${emp.id}`}</div>
                      <div className="text-xs text-slate-500">{emp.cpf ? `CPF ${emp.cpf}` : 'CPF não informado'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {emp.apt.evidencePending && <Badge tone="gray">Pendência evidência</Badge>}
                      <Button type="button" onClick={() => handleAddColaborador(emp.id)}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ))}
                {!suggestions.length && (
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                    Digite ao menos 2 caracteres para ver sugestões aptas.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
