import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import { normalizeText } from '../../lib/documentationUtils';
import { readPayload } from '../../services/portalStorage';
import { getDemoScenario, isDemoMode, seedDemoDataIfNeeded } from '../../services/demoMode';
import {
  buildDocsByEmployee,
  buildTurnaroundRiskIndex,
  computeProgramacaoKPIs,
  computeReadiness
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

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

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

function normalizeStage(stage) {
  return normalizeText(stage).toLowerCase();
}

export default function MobilityPage() {
  const [programacoes, setProgramacoes] = useState([]);
  const [selectedProgId, setSelectedProgId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [documentacoes, setDocumentacoes] = useState([]);
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

  const programacoesComResumo = useMemo(() => {
    return programacoesOrdenadas.map((prog) => ({
      ...prog,
      counts: computeProgramacaoKPIs(prog, employeesById, docsByEmployee, turnaroundRiskIndex)
    }));
  }, [programacoesOrdenadas, employeesById, docsByEmployee, turnaroundRiskIndex]);

  const selectedKPIs = useMemo(() => {
    if (!selectedProgramacao) return ZERO_KPIS;
    return computeProgramacaoKPIs(selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex);
  }, [selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex]);

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
      if (!embark || !disembark || now < embark || now > disembark) return;

      (prog.COLABORADORES || []).forEach((member) => {
        if (normalizeStage(member?.JORNADA?.STAGE) === 'hotel') hospedadosAgora += 1;
        if (Boolean(member?.JORNADA?.NO_SHOW)) noShowAgora += 1;
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
      const badge =
        readiness.level === 'NAO_APTO'
          ? { tone: 'red', label: 'NÃO APTO' }
          : readiness.level === 'ATENCAO' || turnaroundRisk
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
      if (item.readiness.level === 'ATENCAO' || item.turnaroundRisk) emRisco.push(item);
      if (item.readiness.level === 'APTO' && !item.turnaroundRisk) aptos.push(item);
      if (normalizeStage(item.member?.JORNADA?.STAGE) === 'hotel') hospedados.push(item);
      if (Boolean(item.member?.JORNADA?.NO_SHOW)) noShow.push(item);
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

  function renderSection(items, kind) {
    if (!items.length) return <div className="text-xs text-slate-500">Sem colaboradores nesta seção.</div>;

    return (
      <div className="space-y-2">
        {items.map((item) => {
          const name = item.employee?.name || `ID ${item.employeeId}`;
          const cpf = item.employee?.cpf ? `CPF ${item.employee.cpf}` : 'CPF não informado';
          const key = `${item.employeeId}-${kind}`;
          const details = [];

          if (kind === 'risco' && item.readiness.during.length > 0) {
            details.push(`Vence durante: ${item.readiness.during.join(', ')}`);
          }
          if (kind === 'risco' && item.turnaroundRisk?.docs?.length) {
            details.push(`Vence na troca: ${item.turnaroundRisk.docs.join(', ')}`);
          }
          if (kind === 'barrado') {
            if (item.readiness.missing.length > 0) details.push(`Ausente: ${item.readiness.missing.join(', ')}`);
            if (item.readiness.expired.length > 0) details.push(`Vencido: ${item.readiness.expired.join(', ')}`);
          }
          if (kind === 'hotel') {
            const hotel = normalizeText(item.member?.JORNADA?.HOTEL_NOME) || 'Hotel não informado';
            const city = normalizeText(item.member?.JORNADA?.HOTEL_CIDADE) || 'Cidade não informada';
            details.push(`${hotel} • ${city}`);
          }
          if (kind === 'noshow') {
            const stage = normalizeText(item.member?.JORNADA?.STAGE) || 'Etapa não informada';
            details.push(`Última etapa: ${stage}`);
          }

          return (
            <div key={key} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{name}</div>
                  <div className="text-xs text-slate-500">{cpf}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
                  {item.turnaroundRisk && <Badge tone="amber">VENCE NA TROCA</Badge>}
                </div>
              </div>
              {details.length > 0 && <div className="mt-1 text-xs text-slate-600">{details.join(' • ')}</div>}
            </div>
          );
        })}
      </div>
    );
  }

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
        <div className="col-span-12 lg:col-span-4">
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

        <div className="col-span-12 lg:col-span-8 space-y-3">
          <Card className="p-4">
            <div className="text-base font-semibold text-slate-900">{selectedProgramacao?.UNIDADE || 'Programação'}</div>
            <div className="text-xs text-slate-500 mt-1">
              Base {selectedProgramacao?.BASE || '—'} • {selectedProgramacao?.STATUS || '—'}
            </div>
            <div className="text-xs text-slate-500">
              {formatDateTime(selectedProgramacao?.EMBARQUE_DT)} → {formatDateTime(selectedProgramacao?.DESEMBARQUE_DT)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Quem pode embarcar</div>
            {renderSection(secoes.aptos, 'apto')}
          </Card>
          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Em risco</div>
            {renderSection(secoes.emRisco, 'risco')}
          </Card>
          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Barrado</div>
            {renderSection(secoes.barrados, 'barrado')}
          </Card>
          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Hospedados</div>
            {renderSection(secoes.hospedados, 'hotel')}
          </Card>
          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">No-show</div>
            {renderSection(secoes.noShow, 'noshow')}
          </Card>
        </div>
      </div>
    </div>
  );
}
