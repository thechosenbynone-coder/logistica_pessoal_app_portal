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
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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
  const normalizedId = normalizeText(employeeId);
  const docs = docsByEmployee?.get(normalizedId) || [];
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

  if (missing.length > 0 || expired.length > 0) {
    return { level: 'NAO_APTO', missing, expired, during, evidencePending };
  }
  if (during.length > 0) {
    return { level: 'ATENCAO', missing, expired, during, evidencePending };
  }
  return { level: 'APTO', missing, expired, during, evidencePending };
}

function buildTurnaroundRiskIndex(programacoes, docsByEmployee) {
  const byEmployee = new Map();
  const riskIndex = new Map();

  (Array.isArray(programacoes) ? programacoes : []).forEach((prog) => {
    const progId = normalizeText(prog?.PROG_ID);
    const embarkDate = toDate(prog?.EMBARQUE_DT);
    const disembarkDate = toDate(prog?.DESEMBARQUE_DT);
    if (!progId || !embarkDate || !disembarkDate) return;

    (Array.isArray(prog?.COLABORADORES) ? prog.COLABORADORES : []).forEach((member) => {
      const employeeId = normalizeText(member?.COLABORADOR_ID || member?.id);
      if (!employeeId) return;
      const current = byEmployee.get(employeeId) || [];
      current.push({ employeeId, progId, embarkDate, disembarkDate });
      byEmployee.set(employeeId, current);
    });
  });

  for (const [employeeId, employeeProgramacoes] of byEmployee.entries()) {
    employeeProgramacoes.sort((a, b) => a.embarkDate.getTime() - b.embarkDate.getTime());

    for (let idx = 0; idx < employeeProgramacoes.length - 1; idx += 1) {
      const current = employeeProgramacoes[idx];
      const next = employeeProgramacoes[idx + 1];
      const docs = docsByEmployee?.get(employeeId) || [];

      const docsAtRisk = REQUIRED_DOC_TYPES.filter((type) => {
        const doc = docs.find((item) => normalizeDocType(item?.TIPO_DOCUMENTO) === type);
        const expiry = toDate(doc?.DATA_VENCIMENTO);
        if (!expiry) return false;
        return expiry > current.disembarkDate && expiry < next.embarkDate;
      });

      if (!docsAtRisk.length) continue;

      const key = `${normalizeText(employeeId)}::${normalizeText(current.progId)}`;
      riskIndex.set(key, {
        employeeId: normalizeText(employeeId),
        progId: normalizeText(current.progId),
        nextProgId: normalizeText(next.progId),
        docs: docsAtRisk
      });
    }
  }

  return riskIndex;
}

function normalizeLocal(localAtual) {
  const local = normalizeText(localAtual).toLowerCase();
  if (local === 'hospedado') return 'hospedado';
  if (local === 'embarcado') return 'embarcado';
  return 'base';
}

function computeProgramacaoKPIs(programacao, employeesById, docsByEmployee, turnaroundRiskIndex) {
  void employeesById;
  const members = Array.isArray(programacao?.COLABORADORES) ? programacao.COLABORADORES : [];
  const progId = normalizeText(programacao?.PROG_ID);
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
    const employeeId = normalizeText(member?.COLABORADOR_ID || member?.id);
    if (!employeeId) return;

    const readiness = computeReadiness({
      docsByEmployee,
      employeeId,
      embarkDate: programacao?.EMBARQUE_DT,
      disembarkDate: programacao?.DESEMBARQUE_DT
    });

    if (readiness.level === 'APTO') kpis.apto += 1;
    if (readiness.level === 'ATENCAO') kpis.atencao += 1;
    if (readiness.level === 'NAO_APTO') kpis.naoApto += 1;
    if (readiness.evidencePending) kpis.evidencePending += 1;
    if (readiness.during.length > 0) kpis.venceDurante += 1;

    const riskKey = `${employeeId}::${progId}`;
    if (turnaroundRiskIndex?.has(riskKey)) kpis.venceNaTroca += 1;

    const local = normalizeLocal(member?.LOCAL_ATUAL || 'Base');
    if (local === 'hospedado') kpis.hospedado += 1;
    if (local === 'embarcado') kpis.embarcado += 1;
    if (local === 'base') kpis.base += 1;
  });

  return kpis;
}

export { buildDocsByEmployee, computeReadiness, buildTurnaroundRiskIndex, computeProgramacaoKPIs };
