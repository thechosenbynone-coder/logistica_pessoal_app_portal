import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import { normalizeText } from '../../lib/documentationUtils';
import { readPayload } from '../../services/portalStorage';
import {
  buildDocsByEmployee,
  buildTurnaroundRiskIndex,
  computeProgramacaoKPIs,
  computeReadiness
} from './mobilitySelectors';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function buildProgramacao(prog) {
  return {
    PROG_ID: prog?.PROG_ID || '',
    UNIDADE: prog?.UNIDADE || '',
    BASE: prog?.BASE || 'Base',
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
    role: normalizeText(row.CARGO_FUNCAO || row.cargo || row.role)
  }));
}

function getBadgeFromReadiness(readiness, hasTurnaroundRisk) {
  if (readiness.level === 'NAO_APTO') return { tone: 'red', label: 'NÃO APTO' };
  if (readiness.level === 'ATENCAO' || hasTurnaroundRisk) return { tone: 'amber', label: 'ATENÇÃO' };
  return { tone: 'green', label: 'APTO' };
}

function renderKpi(label, value, tone = 'gray') {
  const palette =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'red'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-white text-slate-700';

  return (
    <div key={label} className={`rounded-xl border px-3 py-2 ${palette}`}>
      <div className="text-[11px] uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function MobilityPage() {
  const [programacoes, setProgramacoes] = useState([]);
  const [selectedProgId, setSelectedProgId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [documentacoes, setDocumentacoes] = useState([]);

  useEffect(() => {
    const load = () => {
      const payload = readPayload();
      const nextProgramacoes = Array.isArray(payload?.dataset?.programacoes)
        ? payload.dataset.programacoes.map(buildProgramacao)
        : [];
      setProgramacoes(nextProgramacoes);
      setEmployees(mapEmployees(payload));
      setDocumentacoes(Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : []);
      if (!selectedProgId && nextProgramacoes[0]?.PROG_ID) setSelectedProgId(nextProgramacoes[0].PROG_ID);
    };

    load();
    window.addEventListener('portal_rh_xlsx_updated', load);
    return () => window.removeEventListener('portal_rh_xlsx_updated', load);
  }, [selectedProgId]);

  const employeesById = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (emp.id) map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  const docsByEmployee = useMemo(() => buildDocsByEmployee(documentacoes), [documentacoes]);

  const turnaroundRiskIndex = useMemo(
    () => buildTurnaroundRiskIndex(programacoes, docsByEmployee),
    [programacoes, docsByEmployee]
  );

  const programacoesOrdenadas = useMemo(() => {
    return [...programacoes].sort((a, b) => new Date(a.EMBARQUE_DT).getTime() - new Date(b.EMBARQUE_DT).getTime());
  }, [programacoes]);

  const selectedProgramacao = useMemo(
    () => programacoesOrdenadas.find((prog) => prog.PROG_ID === selectedProgId) || programacoesOrdenadas[0] || null,
    [programacoesOrdenadas, selectedProgId]
  );

  const programacoesComResumo = useMemo(() => {
    return programacoesOrdenadas.map((prog) => {
      const counts = computeProgramacaoKPIs(prog, employeesById, docsByEmployee, turnaroundRiskIndex);
      return { ...prog, counts };
    });
  }, [programacoesOrdenadas, employeesById, docsByEmployee, turnaroundRiskIndex]);

  const membrosSelecionados = useMemo(() => {
    if (!selectedProgramacao) return [];

    return selectedProgramacao.COLABORADORES.map((member) => {
      const employeeId = normalizeText(member.COLABORADOR_ID);
      const employee = employeesById.get(employeeId);
      const readiness = computeReadiness({
        docsByEmployee,
        employeeId,
        embarkDate: selectedProgramacao.EMBARQUE_DT,
        disembarkDate: selectedProgramacao.DESEMBARQUE_DT
      });
      const turnaroundRisk = turnaroundRiskIndex.get(`${employeeId}::${selectedProgramacao.PROG_ID}`) || null;
      const badge = getBadgeFromReadiness(readiness, Boolean(turnaroundRisk));

      return {
        member,
        employeeId,
        employee,
        readiness,
        badge,
        turnaroundRisk
      };
    });
  }, [selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex]);

  const selectedKPIs = useMemo(() => {
    if (!selectedProgramacao) {
      return {
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
    }
    return computeProgramacaoKPIs(selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex);
  }, [selectedProgramacao, employeesById, docsByEmployee, turnaroundRiskIndex]);

  const nowKPIs = useMemo(() => {
    const now = new Date();
    const plus14 = new Date(now);
    plus14.setDate(plus14.getDate() + 14);

    const proximas14d = programacoesOrdenadas.filter((prog) => {
      const embark = new Date(prog.EMBARQUE_DT);
      if (Number.isNaN(embark.getTime())) return false;
      return embark >= now && embark <= plus14;
    }).length;

    let hospedadosAgora = 0;
    let noShowAgora = 0;

    programacoes.forEach((prog) => {
      (prog.COLABORADORES || []).forEach((member) => {
        if (member?.JORNADA?.STAGE === 'Hotel') hospedadosAgora += 1;
        if (member?.JORNADA?.NO_SHOW) noShowAgora += 1;
      });
    });

    return { proximas14d, hospedadosAgora, noShowAgora };
  }, [programacoesOrdenadas, programacoes]);

  const secoes = useMemo(() => {
    const aptos = [];
    const emRisco = [];
    const barrados = [];
    const hospedados = [];
    const noShow = [];

    membrosSelecionados.forEach((item) => {
      if (item.readiness.level === 'NAO_APTO') barrados.push(item);
      else if (item.readiness.level === 'ATENCAO' || item.turnaroundRisk) emRisco.push(item);
      else aptos.push(item);

      if (item.member?.JORNADA?.STAGE === 'Hotel') hospedados.push(item);
      if (item.member?.JORNADA?.NO_SHOW) noShow.push(item);
    });

    return { aptos, emRisco, barrados, hospedados, noShow };
  }, [membrosSelecionados]);

  const renderList = (items, kind) => {
    if (!items.length) {
      return <div className="text-xs text-slate-500">Sem colaboradores nesta seção.</div>;
    }

    return (
      <div className="space-y-2">
        {items.map((item) => {
          const name = item.employee?.name || `ID ${item.employeeId}`;
          const cpf = item.employee?.cpf ? `CPF ${item.employee.cpf}` : 'CPF não informado';
          const details = [];

          if (kind === 'risco' && item.readiness.during.length) details.push(`Vence durante: ${item.readiness.during.join(', ')}`);
          if (kind === 'risco' && item.turnaroundRisk?.docs?.length) {
            details.push(`Vence na troca: ${item.turnaroundRisk.docs.join(', ')}`);
          }
          if (kind === 'barrado') {
            if (item.readiness.missing.length) details.push(`Ausente: ${item.readiness.missing.join(', ')}`);
            if (item.readiness.expired.length) details.push(`Vencido: ${item.readiness.expired.join(', ')}`);
          }
          if (kind === 'hotel') {
            const hotel = item.member?.JORNADA?.HOTEL_NOME || 'Hotel não informado';
            const cidade = item.member?.JORNADA?.HOTEL_CIDADE || 'Cidade não informada';
            details.push(`${hotel} • ${cidade}`);
          }
          if (kind === 'noshow') details.push('Sem apresentação no deslocamento.');

          return (
            <div key={`${item.employeeId}-${kind}`} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{name}</div>
                  <div className="text-xs text-slate-500">{cpf}</div>
                </div>
                <div className="flex items-center gap-1.5">
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
  };

  if (!programacoes.length) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        Nenhuma programação disponível. Em produção isso pode ocorrer sem carga inicial; em demo, recarregue os dados.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-lg font-semibold text-slate-900">Escala e Embarque</div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <Card className="p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Próximas Programações</div>
            {programacoesComResumo.map((prog) => {
              const active = selectedProgramacao?.PROG_ID === prog.PROG_ID;
              return (
                <button
                  type="button"
                  key={prog.PROG_ID}
                  onClick={() => setSelectedProgId(prog.PROG_ID)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{prog.UNIDADE || 'Unidade não definida'}</div>
                  <div className="text-xs text-slate-500">{formatDateTime(prog.EMBARQUE_DT)} → {formatDateTime(prog.DESEMBARQUE_DT)}</div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold text-slate-900">{selectedProgramacao?.UNIDADE || 'Programação'}</div>
                <div className="text-xs text-slate-500">Base {selectedProgramacao?.BASE || '—'} • {selectedProgramacao?.STATUS || '—'}</div>
                <div className="text-xs text-slate-500">{formatDateTime(selectedProgramacao?.EMBARQUE_DT)} → {formatDateTime(selectedProgramacao?.DESEMBARQUE_DT)}</div>
              </div>
              <Badge tone="gray">Total escalados {selectedKPIs.total}</Badge>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Quem pode embarcar</div>
            {renderList(secoes.aptos, 'apto')}
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Em risco</div>
            {renderList(secoes.emRisco, 'risco')}
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Barrado</div>
            {renderList(secoes.barrados, 'barrado')}
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Hospedados</div>
            {renderList(secoes.hospedados, 'hotel')}
          </Card>

          <Card className="p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">No-show</div>
            {renderList(secoes.noShow, 'noshow')}
          </Card>
        </div>
      </div>
    </div>
  );
}
