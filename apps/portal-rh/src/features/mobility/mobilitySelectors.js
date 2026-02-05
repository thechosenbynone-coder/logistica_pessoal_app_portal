import {
  REQUIRED_DOC_TYPES,
  docWindowStatus,
  evidenceStatus,
  normalizeText
} from '../../lib/documentationUtils';

function normalizeDocType(value) {
  return normalizeText(value).toUpperCase();
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

    const evidStatus = evidenceStatus(doc);
    if (evidStatus !== 'VERIFICADO') evidencePending = true;
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

function computeProgramacaoKPIs(programacao, employeesById, docsByEmployee) {
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
    base: 0
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
    }

    const local = normalizeLocal(member?.LOCAL_ATUAL || 'Base');
    if (local === 'hospedado') kpis.hospedado += 1;
    if (local === 'embarcado') kpis.embarcado += 1;
    if (local === 'base') kpis.base += 1;

  });

  return kpis;
}

export { buildDocsByEmployee, computeReadiness, computeProgramacaoKPIs };
