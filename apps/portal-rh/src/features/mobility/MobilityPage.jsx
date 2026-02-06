import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import { REQUIRED_DOC_TYPES, normalizeDocType, normalizeText } from '../../lib/documentationUtils';
import { readPayload } from '../../services/portalStorage';
import { getDemoScenario, isDemoMode, seedDemoDataIfNeeded } from '../../services/demoMode';
import {
  buildDocsByEmployee,
  buildTurnaroundRiskIndex,
  computeProgramacaoKPIs,
  computeReadiness,
  normalizeLocal,
  toDate
} from './mobilitySelectors';

const ZERO_KPIS = {
  total: 0,
  apto: 0,
  atencao: 0,
  naoApto: 0,
  evidencePending: 0,
  venceDurante: 0,
  hospedado: 0,
  embarcado: 0,
  base: 0,
  venceNaTroca: 0
};

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function buildProgramacao(prog) {
  return {
    PROG_ID: normalizeText(prog?.PROG_ID) || `prog_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    UNIDADE: normalizeText(prog?.UNIDADE),
    BASE: normalizeText(prog?.BASE) || 'Base',
    EMBARQUE_DT: prog?.EMBARQUE_DT || '',
    DESEMBARQUE_DT: prog?.DESEMBARQUE_DT || '',
    STATUS: normalizeText(prog?.STATUS) || 'Planejado',
    NOTES: normalizeText(prog?.NOTES),
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
    cpf: normalizeText(row.CPF || row.cpf)
  }));
}

function findDefaultProgramacaoId(programacoesOrdenadas, currentSelectedId) {
  if (!programacoesOrdenadas.length) return '';
  if (currentSelectedId && programacoesOrdenadas.some((prog) => prog.PROG_ID === currentSelectedId)) {
    return currentSelectedId;
  }

  const now = new Date();
  const minus24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const relevant = programacoesOrdenadas.filter((prog) => {
    const disembark = toDate(prog.DESEMBARQUE_DT);
    return disembark && disembark >= minus24h;
  });

  if (relevant.length) return relevant[0].PROG_ID;
  return programacoesOrdenadas[0].PROG_ID;
}

function isHospedado(member) {
  if (normalizeLocal(member?.LOCAL_ATUAL) === 'hospedado') return true;
  const stage = (normalizeText(member?.JORNADA?.STAGE) || '').toLowerCase();
  return stage === 'hotel';
}

function isNoShow(member) {
  return Boolean(member?.JORNADA?.NO_SHOW ?? member?.NO_SHOW ?? false);
}

export default function MobilityPage() {
  const [programacoes, setProgramacoes] = useState([]);
  const [selectedProgId, setSelectedProgId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [documentacoes, setDocumentacoes] = useState([]);
  const [activeTab, setActiveTab] = useState('emRisco');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    evidencePending: false,
    venceDurante: false,
    venceNaTroca: false,
    hospedado: false,
    noShow: false
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const demoMode = isDemoMode();

  useEffect(() => {
    const load = () => {
      const payload = readPayload();
      const nextProgramacoes = Array.isArray(payload?.dataset?.programacoes)
        ? payload.dataset.programacoes.map(buildProgramacao)
        : [];
      const ordered = [...nextProgramacoes].sort((a, b) => {
        const aDate = toDate(a.EMBARQUE_DT)?.getTime() || 0;
        const bDate = toDate(b.EMBARQUE_DT)?.getTime() || 0;
        return aDate - bDate;
      });

      setProgramacoes(nextProgramacoes);
      setEmployees(mapEmployees(payload));
      setDocumentacoes(Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : []);
      setSelectedProgId((current) => findDefaultProgramacaoId(ordered, current));
    };

    load();
    window.addEventListener('portal_rh_xlsx_updated', load);
    return () => window.removeEventListener('portal_rh_xlsx_updated', load);
  }, []);

  const employeesById = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (emp.id) map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  const docsByEmployee = useMemo(() => buildDocsByEmployee(documentacoes), [documentacoes]);

  const programacoesOrdenadas = useMemo(() => {
    return [...programacoes].sort((a, b) => {
      const aDate = toDate(a.EMBARQUE_DT)?.getTime() || 0;
      const bDate = toDate(b.EMBARQUE_DT)?.getTime() || 0;
      return aDate - bDate;
    });
  }, [programacoes]);

  const turnaroundRiskIndex = useMemo(
    () => buildTurnaroundRiskIndex(programacoesOrdenadas, docsByEmployee),
    [programacoesOrdenadas, docsByEmployee]
  );

  const selectedProgramacao = useMemo(
    () => programacoesOrdenadas.find((prog) => prog.PROG_ID === selectedProgId) || programacoesOrdenadas[0] || null,
    [programacoesOrdenadas, selectedProgId]
  );

  useEffect(() => {
    setSelectedMember(null);
    setSearchTerm('');
    setFilters({
      evidencePending: false,
      venceDurante: false,
      venceNaTroca: false,
      hospedado: false,
      noShow: false
    });
    setActiveTab('emRisco');
  }, [selectedProgId]);

  useEffect(() => {
    if (!selectedMember) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedMember(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMember]);

  useEffect(() => {
    if (!selectedMember) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMember]);

  const programacoesComResumo = useMemo(() => {
    return programacoesOrdenadas.map((prog) => ({
      ...prog,
      counts: computeProgramacaoKPIs(prog, docsByEmployee, turnaroundRiskIndex)
    }));
  }, [programacoesOrdenadas, docsByEmployee, turnaroundRiskIndex]);

  const selectedKPIs = useMemo(() => {
    if (!selectedProgramacao) return ZERO_KPIS;
    return computeProgramacaoKPIs(selectedProgramacao, docsByEmployee, turnaroundRiskIndex);
  }, [selectedProgramacao, docsByEmployee, turnaroundRiskIndex]);

  const nowKPIs = useMemo(() => {
    const now = new Date();
    const plus14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const proximas14d = programacoesOrdenadas.filter((prog) => {
      const embark = toDate(prog.EMBARQUE_DT);
      return embark && embark >= now && embark <= plus14;
    }).length;

    let hospedadosAgora = 0;
    let noShowAgora = 0;

    programacoesOrdenadas.forEach((prog) => {
      const embark = toDate(prog.EMBARQUE_DT);
      const disembark = toDate(prog.DESEMBARQUE_DT);
      if (!embark || !disembark) return;
      const hotelStart = new Date(embark.getTime() - 24 * 60 * 60 * 1000);
      if (now < hotelStart || now > disembark) return;

      (prog.COLABORADORES || []).forEach((member) => {
        if (isHospedado(member)) hospedadosAgora += 1;
        if (isNoShow(member)) noShowAgora += 1;
      });
    });

    return { proximas14d, hospedadosAgora, noShowAgora };
  }, [programacoesOrdenadas]);

  const membrosSelecionados = useMemo(() => {
    if (!selectedProgramacao) return [];

    const selectedProgIdNormalized = normalizeText(selectedProgramacao.PROG_ID);
    return selectedProgramacao.COLABORADORES.map((member) => {
      const employeeId = normalizeText(member?.COLABORADOR_ID || member?.id);
      const employee = employeesById.get(employeeId);
      const readiness = computeReadiness({
        docsByEmployee,
        employeeId,
        embarkDate: selectedProgramacao.EMBARQUE_DT,
        disembarkDate: selectedProgramacao.DESEMBARQUE_DT
      });

      const riskKey = `${employeeId}::${selectedProgIdNormalized}`;
      const turnaroundRisk = turnaroundRiskIndex.get(riskKey) || null;
      const needsAttention = readiness.level === 'ATENCAO' || turnaroundRisk || readiness.evidencePending;
      const badge =
        readiness.level === 'NAO_APTO'
          ? { tone: 'red', label: 'NÃO APTO' }
          : needsAttention
            ? { tone: 'amber', label: 'ATENÇÃO' }
            : { tone: 'green', label: 'APTO' };

      return { member, employeeId, employee, readiness, turnaroundRisk, badge };
    });
  }, [selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex]);

  const secoes = useMemo(() => {
    const aptos = [];
    const emRisco = [];
    const barrados = [];
    const hospedados = [];
    const noShow = [];

    membrosSelecionados.forEach((item) => {
      if (item.readiness.level === 'NAO_APTO') barrados.push(item);
      else if (item.readiness.level === 'ATENCAO' || item.turnaroundRisk || item.readiness.evidencePending) {
        emRisco.push(item);
      } else {
        aptos.push(item);
      }

      if (isHospedado(item.member)) hospedados.push(item);
      if (isNoShow(item.member)) noShow.push(item);
    });

    return { aptos, emRisco, barrados, hospedados, noShow };
  }, [membrosSelecionados]);

  function renderKpi(label, value, tone = 'gray') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3" key={label}>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div
          className={`mt-1 text-lg font-semibold ${
            tone === 'green'
              ? 'text-emerald-700'
              : tone === 'amber'
                ? 'text-amber-700'
                : tone === 'red'
                  ? 'text-rose-700'
                  : 'text-slate-900'
          }`}
        >
          {value}
        </div>
      </div>
    );
  }

  function resolveDocStatus(readiness, type) {
    if (readiness.missing.includes(type)) return 'AUSENTE';
    if (readiness.expired.includes(type)) return 'VENCIDO';
    if (readiness.during.includes(type)) return 'VENCE_DURANTE';
    return 'OK';
  }

  const tabs = useMemo(
    () => [
      { key: 'emRisco', label: 'Em risco', count: secoes.emRisco.length },
      { key: 'barrados', label: 'Barrado', count: secoes.barrados.length },
      { key: 'aptos', label: 'Aptos', count: secoes.aptos.length },
      { key: 'hospedados', label: 'Hospedados', count: secoes.hospedados.length },
      { key: 'noShow', label: 'No-show', count: secoes.noShow.length }
    ],
    [secoes]
  );

  const normalizedQuery = (normalizeText(searchTerm) || '').toLowerCase();
  const hasActiveFilters = Boolean(
    normalizedQuery ||
      filters.evidencePending ||
      filters.venceDurante ||
      filters.venceNaTroca ||
      filters.hospedado ||
      filters.noShow
  );

  const activeItems = useMemo(() => {
    return secoes[activeTab] || [];
  }, [secoes, activeTab]);

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      if (normalizedQuery) {
        const name = (normalizeText(item.employee?.name) || '').toLowerCase();
        const cpf = (normalizeText(item.employee?.cpf) || '').toLowerCase();
        const id = (normalizeText(item.employeeId) || '').toLowerCase();
        const match =
          (name && name.includes(normalizedQuery)) ||
          (cpf && cpf.includes(normalizedQuery)) ||
          (id && id.includes(normalizedQuery));
        if (!match) return false;
      }

      if (filters.evidencePending && !item.readiness.evidencePending) return false;
      if (filters.venceDurante && item.readiness.during.length === 0) return false;
      if (filters.venceNaTroca && !item.turnaroundRisk) return false;
      if (filters.hospedado && !isHospedado(item.member)) return false;
      if (filters.noShow && !isNoShow(item.member)) return false;

      return true;
    });
  }, [activeItems, normalizedQuery, filters]);

  const orderedItems = useMemo(() => {
    const items = [...filteredItems];
    if (activeTab !== 'emRisco') return items;
    return items.sort((a, b) => {
      const aName = normalizeText(a.employee?.name || a.employeeId) || '';
      const bName = normalizeText(b.employee?.name || b.employeeId) || '';
      const aScore = [
        a.readiness.level === 'NAO_APTO' ? 0 : 1,
        a.readiness.evidencePending ? 0 : 1,
        a.readiness.during.length > 0 ? 0 : 1,
        a.turnaroundRisk ? 0 : 1
      ];
      const bScore = [
        b.readiness.level === 'NAO_APTO' ? 0 : 1,
        b.readiness.evidencePending ? 0 : 1,
        b.readiness.during.length > 0 ? 0 : 1,
        b.turnaroundRisk ? 0 : 1
      ];
      for (let idx = 0; idx < aScore.length; idx += 1) {
        if (aScore[idx] !== bScore[idx]) return aScore[idx] - bScore[idx];
      }
      return aName.localeCompare(bName, 'pt-BR');
    });
  }, [filteredItems, activeTab]);

  if (!programacoesOrdenadas.length) {
    return <Card className="p-6 text-sm text-slate-500">Não há programações disponíveis no momento.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-slate-900">Escala e Embarque</div>
          {demoMode && (
            <Button type="button" variant="secondary" onClick={() => seedDemoDataIfNeeded(getDemoScenario(), true)}>
              Recarregar demo
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {renderKpi('Programações (próx 14d)', nowKPIs.proximas14d)}
          {renderKpi('Aptos', selectedKPIs.apto, 'green')}
          {renderKpi('Atenção', selectedKPIs.atencao, 'amber')}
          {renderKpi('Não aptos', selectedKPIs.naoApto, 'red')}
          {renderKpi('Vence na troca', selectedKPIs.venceNaTroca, 'amber')}
          {renderKpi('Hospedados agora', nowKPIs.hospedadosAgora)}
          {renderKpi('No-show agora', nowKPIs.noShowAgora, 'red')}
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-4 self-start">
          <Card className="p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Próximas Programações</div>
            {programacoesComResumo.map((prog) => {
              const isActive = selectedProgramacao?.PROG_ID === prog.PROG_ID;
              return (
                <button
                  key={prog.PROG_ID}
                  type="button"
                  onClick={() => setSelectedProgId(prog.PROG_ID)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{prog.UNIDADE || 'Unidade não definida'}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(prog.EMBARQUE_DT)} → {formatDateTime(prog.DESEMBARQUE_DT)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="green">Aptos {prog.counts.apto}</Badge>
                    <Badge tone="amber">Atenção {prog.counts.atencao}</Badge>
                    <Badge tone="red">Não aptos {prog.counts.naoApto}</Badge>
                    <Badge tone="amber">Troca {prog.counts.venceNaTroca}</Badge>
                  </div>
                </button>
              );
            })}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-3 relative">
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {selectedProgramacao?.UNIDADE || 'Programação'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Base {selectedProgramacao?.BASE || '—'} • {selectedProgramacao?.STATUS || '—'}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDateTime(selectedProgramacao?.EMBARQUE_DT)} →{' '}
                  {formatDateTime(selectedProgramacao?.DESEMBARQUE_DT)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="gray">Total {selectedKPIs.total}</Badge>
                <Badge tone="green">Aptos {selectedKPIs.apto}</Badge>
                <Badge tone="amber">Atenção {selectedKPIs.atencao}</Badge>
                <Badge tone="red">Não aptos {selectedKPIs.naoApto}</Badge>
                <Badge tone="amber">Evidência pendente {selectedKPIs.evidencePending}</Badge>
                <Badge tone="amber">Vence durante {selectedKPIs.venceDurante}</Badge>
                <Badge tone="amber">Vence na troca {selectedKPIs.venceNaTroca}</Badge>
                <Badge tone="gray">Hospedado {selectedKPIs.hospedado}</Badge>
                <Badge tone="gray">Embarcado {selectedKPIs.embarcado}</Badge>
                <Badge tone="gray">Base {selectedKPIs.base}</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, CPF ou ID…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 md:flex-1"
                />
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({
                        evidencePending: false,
                        venceDurante: false,
                        venceNaTroca: false,
                        hospedado: false,
                        noShow: false
                      });
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'evidencePending', label: 'Evidência pendente' },
                  { key: 'venceDurante', label: 'Vence durante' },
                  { key: 'venceNaTroca', label: 'Vence na troca' },
                  { key: 'hospedado', label: 'Hospedado' },
                  { key: 'noShow', label: 'No-show' }
                ].map((chip) => {
                  const isActive = filters[chip.key];
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFilters((current) => ({ ...current, [chip.key]: !current[chip.key] }))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {!orderedItems.length ? (
                <div className="text-xs text-slate-500">
                  {hasActiveFilters ? 'Nenhum colaborador encontrado com os filtros atuais.' : 'Sem colaboradores nesta seção.'}
                </div>
              ) : (
                orderedItems.map((item) => {
                  const name = item.employee?.name || `ID ${item.employeeId}`;
                  const cpf = item.employee?.cpf ? `CPF ${item.employee.cpf}` : 'CPF não informado';
                  const details = [];
                  const isSelected = selectedMember?.employeeId === item.employeeId;

                  if (item.readiness.during.length > 0) {
                    details.push(`Vence durante: ${item.readiness.during.join(', ')}`);
                  }
                  if (item.readiness.evidencePending) {
                    details.push('Evidência pendente');
                  }
                  if (item.turnaroundRisk?.docs?.length) {
                    details.push(`Vence na troca: ${item.turnaroundRisk.docs.join(', ')}`);
                  }

                  return (
                    <button
                      key={`${item.employeeId}-${activeTab}`}
                      type="button"
                      onClick={() => setSelectedMember(item)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{name}</div>
                          <div className="text-xs text-slate-500">{cpf}</div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
                          {item.turnaroundRisk && <Badge tone="amber">VENCE NA TROCA</Badge>}
                          <span className="text-xs font-semibold text-blue-600">Detalhes →</span>
                        </div>
                      </div>
                      {details.length > 0 && <div className="mt-1 text-xs text-slate-600">{details.join(' • ')}</div>}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {selectedMember && (
            <>
              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSelectedMember(null)}
                className="fixed inset-0 z-20 cursor-default bg-black/30"
              />
              <aside className="fixed right-0 top-0 z-30 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-xl">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {selectedMember.employee?.name || `ID ${selectedMember.employeeId}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedMember.employee?.cpf ? `CPF ${selectedMember.employee.cpf}` : 'CPF não informado'}
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setSelectedMember(null)}>
                      Fechar
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={selectedMember.badge.tone}>{selectedMember.badge.label}</Badge>
                      {selectedMember.turnaroundRisk && <Badge tone="amber">VENCE NA TROCA</Badge>}
                    </div>
                    <div className="text-xs text-slate-600">
                      {selectedMember.readiness.level === 'NAO_APTO' && (
                        <>
                          {selectedMember.readiness.missing.length > 0 && (
                            <div>Ausente: {selectedMember.readiness.missing.join(', ')}</div>
                          )}
                          {selectedMember.readiness.expired.length > 0 && (
                            <div>Vencido: {selectedMember.readiness.expired.join(', ')}</div>
                          )}
                        </>
                      )}
                      {selectedMember.readiness.level !== 'NAO_APTO' && (
                        <>
                          {selectedMember.readiness.during.length > 0 && (
                            <div>Vence durante: {selectedMember.readiness.during.join(', ')}</div>
                          )}
                          {selectedMember.readiness.evidencePending && <div>Evidência pendente</div>}
                          {selectedMember.turnaroundRisk?.docs?.length && (
                            <div>Vence na troca: {selectedMember.turnaroundRisk.docs.join(', ')}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documentações</div>
                    <div className="space-y-2">
                      {REQUIRED_DOC_TYPES.map((type) => {
                        const docs = docsByEmployee.get(selectedMember.employeeId) || [];
                        const doc = docs.find((item) => normalizeDocType(item?.TIPO_DOCUMENTO) === type);
                        const status = resolveDocStatus(selectedMember.readiness, type);
                        return (
                          <div
                            key={type}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-800">{type}</div>
                              <Badge tone={status === 'OK' ? 'green' : status === 'VENCIDO' ? 'red' : 'amber'}>
                                {status}
                              </Badge>
                            </div>
                            <div className="mt-1">
                              Vencimento: {doc?.DATA_VENCIMENTO ? formatDateTime(doc.DATA_VENCIMENTO) : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedMember.member?.JORNADA && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jornada</div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 space-y-1">
                        {selectedMember.member?.JORNADA?.STAGE && (
                          <div>Etapa: {selectedMember.member.JORNADA.STAGE}</div>
                        )}
                        {(selectedMember.member?.JORNADA?.HOTEL_NOME || selectedMember.member?.JORNADA?.HOTEL_CIDADE) && (
                          <div>
                            Hotel: {selectedMember.member.JORNADA.HOTEL_NOME || 'Não informado'} •{' '}
                            {selectedMember.member.JORNADA.HOTEL_CIDADE || 'Cidade não informada'}
                          </div>
                        )}
                        {isNoShow(selectedMember.member) && <div>Flag: NO-SHOW</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
