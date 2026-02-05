import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Badge from '../../ui/Badge.jsx';
import Modal from '../../ui/Modal.jsx';
import {
  REQUIRED_DOC_TYPES,
  docWindowStatus,
  evidenceStatus,
  normalizeDigitsOnly,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { mergePayload, readPayload, writePayload } from '../../services/portalStorage';
import { getDemoScenario, isDemoMode, seedDemoDataIfNeeded } from '../../services/demoMode';

const STATUS_OPTIONS = ['Planejado', 'Confirmado', 'Em andamento', 'Finalizado', 'Cancelado'];
const LOCAL_OPTIONS = ['Base', 'Embarcado', 'Hospedado'];
const PASSAGEM_OPTIONS = ['Não comprada', 'Comprada', 'Emitida'];
const REQUIRED_DOCS = REQUIRED_DOC_TYPES;

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

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
  const [filterAptidao, setFilterAptidao] = useState(null);
  const [filterDocType, setFilterDocType] = useState(null);
  const [filterEvidence, setFilterEvidence] = useState(null);
  const [cardModal, setCardModal] = useState(null);
  const demoMode = isDemoMode();

  useEffect(() => {
    const payload = readPayload();
    setProgramacoes(
      Array.isArray(payload?.dataset?.programacoes) ? payload.dataset.programacoes.map(buildProgramacao) : []
    );
    setEmployees(mapEmployees(payload));
    setDocumentacoes(Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : []);
    const handleUpdate = () => {
      const updated = readPayload();
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

  const hasWindow = Boolean(selectedProgramacao?.EMBARQUE_DT && selectedProgramacao?.DESEMBARQUE_DT);

  const escaladosWithComputedStatus = useMemo(() => {
    if (!selectedProgramacao) return [];
    return selectedProgramacao.COLABORADORES.map((colab) => {
      const id = normalizeText(colab.COLABORADOR_ID);
      const employee = employeesById.get(id);
      const apt = computeAptidao({
        docsByEmployee,
        employeeId: id,
        embarkDate: selectedProgramacao.EMBARQUE_DT,
        disembarkDate: selectedProgramacao.DESEMBARQUE_DT
      });
      const reasons = [...apt.missing, ...apt.expired, ...apt.expiring];
      let evidenceFlag = 'SEM_EVIDENCIA';
      if (docsByEmployee.get(id)?.length) {
        const evidences = REQUIRED_DOCS.map((type) => {
          const doc = (docsByEmployee.get(id) || []).find((item) => normalizeDocType(item.TIPO_DOCUMENTO) === type);
          return doc ? evidenceStatus(doc) : 'SEM_EVIDENCIA';
        });
        if (evidences.every((status) => status === 'VERIFICADO')) evidenceFlag = 'VERIFICADO';
        else if (evidences.some((status) => status === 'PENDENTE_VERIFICACAO')) evidenceFlag = 'PENDENTE_VERIFICACAO';
      }
      return { colab, id, employee, apt, reasons, evidenceFlag };
    });
  }, [selectedProgramacao, employeesById, docsByEmployee]);

  const summaryCounts = useMemo(() => {
    const counts = { total: 0, apto: 0, atencao: 0, naoApto: 0 };
    escaladosWithComputedStatus.forEach((item) => {
      counts.total += 1;
      if (item.apt.level === 'APTO') counts.apto += 1;
      if (item.apt.level === 'ATENCAO') counts.atencao += 1;
      if (item.apt.level === 'NAO_APTO') counts.naoApto += 1;
    });
    return counts;
  }, [escaladosWithComputedStatus]);

  const docCoverage = useMemo(() => {
    if (!selectedProgramacao) return [];
    return REQUIRED_DOCS.map((type) => {
      const affected = [];
      let ok = 0;
      let expiring = 0;
      let expired = 0;
      escaladosWithComputedStatus.forEach((item) => {
        const doc = (docsByEmployee.get(item.id) || []).find(
          (d) => normalizeDocType(d.TIPO_DOCUMENTO) === type
        );
        if (!doc) {
          expired += 1;
          affected.push(item.id);
          return;
        }
        const status = docWindowStatus(doc, selectedProgramacao.EMBARQUE_DT, selectedProgramacao.DESEMBARQUE_DT);
        if (status === 'OK') ok += 1;
        if (status === 'VENCE_DURANTE') {
          expiring += 1;
          affected.push(item.id);
        }
        if (status === 'VENCIDO') {
          expired += 1;
          affected.push(item.id);
        }
      });
      return {
        type,
        ok,
        expiring,
        expired,
        total: escaladosWithComputedStatus.length,
        affected
      };
    });
  }, [selectedProgramacao, escaladosWithComputedStatus, docsByEmployee]);

  const evidenceCounts = useMemo(() => {
    const counts = { SEM_EVIDENCIA: 0, PENDENTE_VERIFICACAO: 0, VERIFICADO: 0 };
    escaladosWithComputedStatus.forEach((item) => {
      counts[item.evidenceFlag] += 1;
    });
    return counts;
  }, [escaladosWithComputedStatus]);

  const filteredEscalados = useMemo(() => {
    return escaladosWithComputedStatus.filter((item) => {
      if (filterAptidao && item.apt.level !== filterAptidao) return false;
      if (filterEvidence && item.evidenceFlag !== filterEvidence) return false;
      if (filterDocType) {
        const doc = (docsByEmployee.get(item.id) || []).find(
          (d) => normalizeDocType(d.TIPO_DOCUMENTO) === filterDocType
        );
        if (!doc) return true;
        const status = docWindowStatus(doc, selectedProgramacao?.EMBARQUE_DT, selectedProgramacao?.DESEMBARQUE_DT);
        return status !== 'OK';
      }
      return true;
    });
  }, [escaladosWithComputedStatus, filterAptidao, filterDocType, filterEvidence, docsByEmployee, selectedProgramacao]);

  const suggestions = useMemo(() => {
    if (!selectedProgramacao) return [];
    const term = searchQuery.trim().toLowerCase();
    const currentIds = new Set(selectedProgramacao.COLABORADORES.map((c) => normalizeText(c.COLABORADOR_ID)));
    const items = [];
    for (const [id, emp] of employeesById.entries()) {
      if (currentIds.has(id)) continue;
      const name = normalizeText(emp.name).toLowerCase();
      const cpf = normalizeDigitsOnly(emp.cpf);
      const matches =
        term.length < 2 ||
        id.toLowerCase().includes(term) ||
        name.includes(term) ||
        cpf.includes(normalizeDigitsOnly(term));
      if (!matches) continue;
      const apt = computeAptidao({
        docsByEmployee,
        employeeId: id,
        embarkDate: selectedProgramacao.EMBARQUE_DT,
        disembarkDate: selectedProgramacao.DESEMBARQUE_DT
      });
      if (apt.level !== 'APTO') continue;
      items.push({ ...emp, apt });
    }
    return items
      .sort((a, b) => {
        if (a.apt.evidencePending === b.apt.evidencePending) return 0;
        return a.apt.evidencePending ? 1 : -1;
      })
      .slice(0, term.length >= 2 ? 10 : 8);
  }, [selectedProgramacao, searchQuery, employeesById, docsByEmployee]);

  function persistProgramacoes(nextProgramacoes) {
    const prevPayload = readPayload();
    const nextDataset = { ...prevPayload.dataset, programacoes: nextProgramacoes };
    const nextPayload = mergePayload(prevPayload, {
      dataset: nextDataset,
      importedAt: prevPayload.importedAt || new Date().toISOString()
    });
    writePayload(nextPayload);
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

  function reloadDemo() {
    seedDemoDataIfNeeded(getDemoScenario(), true);
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
          <Card className="p-6 space-y-3 text-sm text-slate-500">
            <div>Selecione uma programação para editar.</div>
            {employees.length > 0 && demoMode && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={reloadDemo}>
                  Carregar dados de demonstração
                </Button>
              </div>
            )}
          </Card>
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

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { key: 'total', label: 'Total escalados', value: summaryCounts.total, tone: 'gray' },
                  { key: 'APTO', label: 'Aptos', value: summaryCounts.apto, tone: 'green' },
                  { key: 'ATENCAO', label: 'Atenção', value: summaryCounts.atencao, tone: 'amber' },
                  { key: 'NAO_APTO', label: 'Não aptos', value: summaryCounts.naoApto, tone: 'red' }
                ].map((card) => {
                  const total = summaryCounts.total || 1;
                  const percent = Math.round(((card.value || 0) / total) * 100);
                  const active = filterAptidao === card.key;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      className={
                        'rounded-xl border p-3 text-left transition ' +
                        (active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')
                      }
                      onClick={() => {
                        if (card.key === 'total') return setFilterAptidao(null);
                        setFilterAptidao(active ? null : card.key);
                      }}
                    >
                      <div className="text-xs text-slate-500">{card.label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{card.value}</div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${
                            card.tone === 'green'
                              ? 'bg-emerald-400'
                              : card.tone === 'amber'
                                ? 'bg-amber-400'
                                : card.tone === 'red'
                                  ? 'bg-rose-400'
                                  : 'bg-slate-300'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {(filterAptidao || filterDocType || filterEvidence) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFilterAptidao(null);
                      setFilterDocType(null);
                      setFilterEvidence(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
                {demoMode && (
                  <Button type="button" variant="secondary" onClick={reloadDemo}>
                    Recarregar demo
                  </Button>
                )}
              </div>
            </Card>

            {!hasWindow && (
              <Card className="p-4 text-sm text-slate-600">
                <div>Para ativar validações: defina Unidade + Embarque + Desembarque.</div>
                {employees.length > 0 && demoMode && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={reloadDemo}>
                      Carregar dados de demonstração
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6 space-y-4">
              <div className="text-sm font-semibold text-slate-900">Cobertura documental na janela</div>
              {!hasWindow && (
                <div className="text-xs text-slate-500">Aguardando janela para calcular cobertura.</div>
              )}
              <div className="space-y-3">
                {docCoverage.map((doc) => {
                  const percent = doc.total ? Math.round((doc.ok / doc.total) * 100) : 0;
                  const active = filterDocType === doc.type;
                  return (
                    <button
                      key={doc.type}
                      type="button"
                      className={
                        'w-full rounded-xl border p-3 text-left transition ' +
                        (active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')
                      }
                      onClick={() => setFilterDocType(active ? null : doc.type)}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                        <span>{doc.type}</span>
                        <span>
                          {doc.ok}/{doc.total || 0}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Vence durante: {doc.expiring} • Vencido/ausente: {doc.expired}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Pendências de evidência/verificação</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'SEM_EVIDENCIA', label: 'Sem evidência', tone: 'red', value: evidenceCounts.SEM_EVIDENCIA },
                  {
                    key: 'PENDENTE_VERIFICACAO',
                    label: 'Pendente verificação',
                    tone: 'amber',
                    value: evidenceCounts.PENDENTE_VERIFICACAO
                  },
                  { key: 'VERIFICADO', label: 'Verificados', tone: 'green', value: evidenceCounts.VERIFICADO }
                ].map((chip) => {
                  const active = filterEvidence === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      className={
                        'rounded-full border px-3 py-1 text-xs transition ' +
                        (active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600')
                      }
                      onClick={() => setFilterEvidence(active ? null : chip.key)}
                    >
                      {chip.label} ({chip.value})
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="text-sm font-semibold text-slate-900">Escalados</div>
              {!!selectedProgramacao &&
                selectedProgramacao.COLABORADORES.length === 0 &&
                employees.length > 0 &&
                demoMode && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={reloadDemo}>
                    Carregar dados de demonstração
                  </Button>
                </div>
              )}
              {!employees.length && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Importe colaboradores para exibir nomes completos.
                </div>
              )}
              <div className="space-y-3">
                {filteredEscalados.map(({ colab, id, employee, apt, reasons }) => {
                  const aptLabel =
                    apt.level === 'APTO' ? '✅ APTO' : apt.level === 'ATENCAO' ? '⚠️ ATENÇÃO' : '✖ NÃO APTO';
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
                        {reasons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reasons.slice(0, 4).map((reason) => (
                              <Badge key={reason} tone="gray">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCardModal({ employee, colab })}
                          >
                            Cartão
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => handleRemoveColaborador(id)}>
                            Remover
                          </Button>
                        </div>
                      </div>

                      {selectedMemberId === id && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {REQUIRED_DOCS.map((type) => {
                              const doc = (docsByEmployee.get(id) || []).find(
                                (d) => normalizeDocType(d.TIPO_DOCUMENTO) === type
                              );
                              const status = doc
                                ? docWindowStatus(doc, selectedProgramacao.EMBARQUE_DT, selectedProgramacao.DESEMBARQUE_DT)
                                : 'AUSENTE';
                              const label =
                                status === 'OK'
                                  ? '✅ OK'
                                  : status === 'VENCE_DURANTE'
                                    ? '⚠️ Vence durante'
                                    : status === 'VENCIDO'
                                      ? '✖ Vencido'
                                      : '✖ Ausente';
                              return (
                                <div key={type} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1">
                                  <span>{type}</span>
                                  <span>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!filteredEscalados.length && (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                    Nenhum colaborador encontrado para os filtros atuais.
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
                    Nenhuma sugestão apta disponível para esta janela.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
      <Modal
        open={!!cardModal}
        title="Cartão de embarque"
        onClose={() => setCardModal(null)}
        className="max-w-2xl"
      >
        {cardModal ? (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              {cardModal.employee?.name || `ID ${cardModal.colab.COLABORADOR_ID}`}
            </div>
            <div className="text-xs text-slate-500">
              Status da passagem: {cardModal.colab.PASSAGEM_STATUS || 'Não comprada'}
            </div>
            {cardModal.colab.PASSAGEM_STATUS !== 'Emitida' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Aguardando emissão do cartão.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>Código</span>
                  <span className="font-semibold">{cardModal.colab.CARTAO_EMBARQUE?.codigo || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>Apresentação</span>
                  <span>{formatDateTime(cardModal.colab.CARTAO_EMBARQUE?.apresentacao_dt)}</span>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-xs text-slate-500">Roteiro</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(cardModal.colab.CARTAO_EMBARQUE?.roteiro || []).map((step) => (
                      <Badge key={step} tone="gray">
                        {step}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>Contato</span>
                  <span>{cardModal.colab.CARTAO_EMBARQUE?.contato || '—'}</span>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
                  {cardModal.colab.CARTAO_EMBARQUE?.observacoes || 'Sem observações.'}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
