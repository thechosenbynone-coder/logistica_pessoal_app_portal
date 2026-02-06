import {
  REQUIRED_DOC_TYPES,
  docWindowStatus,
  evidenceStatus,
  normalizeText
} from '../../lib/documentationUtils';

function normalizeDocType(value) {
  return normalizeText(value).toUpperCase();
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDocsByEmployee(documentacoes) {
  const map = new Map();
  if (!Array.isArray(documentacoes)) return map;

  documentacoes.forEach((doc) => {
    const employeeId = normalizeText(doc?.COLABORADOR_ID);
    if (!employeeId) return;
    const current = map.get(employeeId) || [];
    current.push(doc);
    map.set(employeeId, current);
  });

  return map;
}

function computeReadiness({ docsByEmployee, employeeId, embarkDate, disembarkDate }) {
  const docs = docsByEmployee?.get(employeeId) || [];
  const missing = [];
  const expired = [];
  const during = [];
  let evidencePending = false;

  REQUIRED_DOC_TYPES.forEach((type) => {
    const doc = docs.find((item) => normalizeDocType(item?.TIPO_DOCUMENTO) === type);
    if (!doc) {
      missing.push(type);
      return;
    }

    const status = docWindowStatus(doc, embarkDate, disembarkDate);
    if (status === 'VENCIDO') expired.push(type);
    if (status === 'VENCE_DURANTE') during.push(type);

    if (evidenceStatus(doc) !== 'VERIFICADO') evidencePending = true;
  });

  if (missing.length || expired.length) {
    return { level: 'NAO_APTO', missing, expired, during, evidencePending };
  }
  if (during.length) {
    return { level: 'ATENCAO', missing, expired, during, evidencePending };
  }
  return { level: 'APTO', missing, expired, during, evidencePending };
}

function normalizeLocal(localAtual) {
  const normalized = normalizeText(localAtual).toLowerCase();
  if (normalized === 'hospedado') return 'hospedado';
  if (normalized === 'embarcado') return 'embarcado';
  return 'base';
}

function buildTurnaroundRiskIndex(programacoes, docsByEmployee) {
  const byEmployee = new Map();
  const risk = new Map();

  (Array.isArray(programacoes) ? programacoes : []).forEach((prog) => {
    const embarkDate = toDate(prog?.EMBARQUE_DT);
    const disembarkDate = toDate(prog?.DESEMBARQUE_DT);
    if (!embarkDate || !disembarkDate) return;

    (Array.isArray(prog?.COLABORADORES) ? prog.COLABORADORES : []).forEach((member) => {
      const employeeId = normalizeText(member?.COLABORADOR_ID);
      if (!employeeId) return;
      const list = byEmployee.get(employeeId) || [];
      list.push({
        employeeId,
        progId: normalizeText(prog?.PROG_ID),
        embarkDate,
        disembarkDate
      });
      byEmployee.set(employeeId, list);
    });
  });

  for (const [employeeId, itens] of byEmployee.entries()) {
    itens.sort((a, b) => a.embarkDate.getTime() - b.embarkDate.getTime());

    for (let idx = 0; idx < itens.length - 1; idx += 1) {
      const current = itens[idx];
      const next = itens[idx + 1];
      const docs = docsByEmployee?.get(employeeId) || [];

      const expiringBetween = REQUIRED_DOC_TYPES.filter((type) => {
        const doc = docs.find((item) => normalizeDocType(item?.TIPO_DOCUMENTO) === type);
        if (!doc?.DATA_VENCIMENTO) return false;
        const venc = toDate(doc.DATA_VENCIMENTO);
        if (!venc) return false;
        return venc >= current.disembarkDate && venc <= next.embarkDate;
      });

      if (!expiringBetween.length) continue;

      risk.set(`${employeeId}::${current.progId}`, {
        employeeId,
        progId: current.progId,
        nextProgId: next.progId,
        docs: expiringBetween
      });
    }
  }

  return risk;
}

function computeProgramacaoKPIs(programacao, employeesById, docsByEmployee, turnaroundRiskIndex) {
  const members = Array.isArray(programacao?.COLABORADORES) ? programacao.COLABORADORES : [];
  const kpis = {
    total: members.length,
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

  members.forEach((member) => {
    const employeeId = normalizeText(member?.COLABORADOR_ID) || normalizeText(member?.id);
    const employee = employeeId ? employeesById?.get(employeeId) : null;
    const resolvedEmployeeId = employeeId || normalizeText(employee?.id);

    if (resolvedEmployeeId) {
      const readiness = computeReadiness({
        docsByEmployee,
        employeeId: resolvedEmployeeId,
        embarkDate: programacao?.EMBARQUE_DT,
        disembarkDate: programacao?.DESEMBARQUE_DT
      });

      if (readiness.level === 'APTO') kpis.apto += 1;
      if (readiness.level === 'ATENCAO') kpis.atencao += 1;
      if (readiness.level === 'NAO_APTO') kpis.naoApto += 1;
      if (readiness.evidencePending) kpis.evidencePending += 1;
      if (readiness.during.length > 0) kpis.venceDurante += 1;

      const riskKey = `${resolvedEmployeeId}::${normalizeText(programacao?.PROG_ID)}`;
      if (turnaroundRiskIndex?.has(riskKey)) kpis.venceNaTroca += 1;
    }

    const local = normalizeLocal(member?.LOCAL_ATUAL || 'Base');
    if (local === 'hospedado') kpis.hospedado += 1;
    if (local === 'embarcado') kpis.embarcado += 1;
    if (local === 'base') kpis.base += 1;
  });

  return kpis;
}

export { buildDocsByEmployee, computeReadiness, buildTurnaroundRiskIndex, computeProgramacaoKPIs };
