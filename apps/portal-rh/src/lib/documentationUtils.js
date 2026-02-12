const REQUIRED_DOC_TYPES = ['ASO', 'CBSP', 'HUET', 'NR-33', 'NR-35'];
const OPTIONAL_DOC_TYPES = ['NR-37'];

function normalizeDigitsOnly(value) {
  return (value || '').toString().replace(/\D/g, '');
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function normalizeDocType(value) {
  return normalizeText(value).toUpperCase();
}

function toDate(value) {
  if (value === undefined || value === null || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;

    if (Math.abs(value) < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const excelDate = new Date(excelEpoch.getTime() + Math.trunc(value) * 86400000);
      return Number.isNaN(excelDate.getTime()) ? null : excelDate;
    }

    if (Math.abs(value) < 100000000000) {
      const secondsDate = new Date(value * 1000);
      return Number.isNaN(secondsDate.getTime()) ? null : secondsDate;
    }

    const tsDate = new Date(value);
    return Number.isNaN(tsDate.getTime()) ? null : tsDate;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    return toDate(Number(text));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const ymdDate = new Date(year, month - 1, day);
    return Number.isNaN(ymdDate.getTime()) ? null : ymdDate;
  }

  const isoDate = new Date(text);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
}

function startOfDay(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateYmd(value) {
  const date = toDate(value);
  if (!date) return '';
  return startOfDay(date).toISOString().slice(0, 10);
}

function isWithinInclusive(date, start, end) {
  if (!date || !start || !end) return false;
  const target = startOfDay(date).getTime();
  const from = startOfDay(start).getTime();
  const to = startOfDay(end).getTime();
  return target >= from && target <= to;
}

function getDeploymentWindow(deploymentActive) {
  const start = toDate(
    deploymentActive?.start_date || deploymentActive?.startDate || deploymentActive?.embarkDate
  );
  const end = toDate(
    deploymentActive?.end_date_actual ||
      deploymentActive?.endDateActual ||
      deploymentActive?.end_date_expected ||
      deploymentActive?.endDateExpected ||
      deploymentActive?.disembarkDate
  );
  if (!start || !end) return null;
  return { start, end };
}

function computeDocumentStatus({ doc, docType, deploymentActive, now = new Date() }) {
  const requiresExpiration = Boolean(docType?.requires_expiration ?? docType?.requiresExpiration ?? true);
  const expirationDate = toDate(doc?.expiration_date || doc?.expirationDate || doc?.DATA_VENCIMENTO);

  if (!requiresExpiration) return 'SEM_VALIDADE';
  if (!expirationDate) return 'FALTANDO';

  const today = startOfDay(now);
  const expirationDay = startOfDay(expirationDate);

  if (expirationDay < today) return 'VENCIDO';

  const window = getDeploymentWindow(deploymentActive);
  if (window && isWithinInclusive(expirationDate, window.start, window.end)) {
    return 'DURANTE_EMBARQUE';
  }

  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  if (expirationDay <= inThirtyDays) return 'VENCENDO';

  return 'OK';
}

function docValidityStatus(doc, now = new Date()) {
  const status = computeDocumentStatus({
    doc: {
      expiration_date: doc?.DATA_VENCIMENTO || doc?.expiration_date || doc?.expirationDate,
    },
    docType: { requires_expiration: true },
    now,
  });
  if (status === 'SEM_VALIDADE' || status === 'FALTANDO') return '';
  return status;
}

function docWindowStatus(doc, embarkDate, disembarkDate) {
  const status = computeDocumentStatus({
    doc: { expiration_date: doc?.DATA_VENCIMENTO || doc?.expiration_date || doc?.expirationDate },
    docType: { requires_expiration: true },
    deploymentActive: { start_date: embarkDate, end_date_expected: disembarkDate },
  });

  if (status === 'VENCIDO') return 'VENCIDO';
  if (status === 'DURANTE_EMBARQUE') return 'VENCE_DURANTE';
  if (status === 'FALTANDO') return 'FALTANDO';
  return status === 'SEM_VALIDADE' ? '' : 'OK';
}

function evidenceStatus(doc) {
  const tipo = normalizeText(doc?.EVIDENCIA_TIPO || doc?.evidence_type);
  const ref = normalizeText(doc?.EVIDENCIA_REF || doc?.evidence_ref || doc?.file_url);
  if (!tipo && !ref) return 'SEM_EVIDENCIA';
  if (!doc?.VERIFIED && !doc?.verified) return 'PENDENTE_VERIFICACAO';
  return 'VERIFICADO';
}

export {
  REQUIRED_DOC_TYPES,
  OPTIONAL_DOC_TYPES,
  normalizeDigitsOnly,
  normalizeDocType,
  normalizeText,
  docValidityStatus,
  docWindowStatus,
  evidenceStatus,
  computeDocumentStatus,
  getDeploymentWindow,
  toDate,
  toDateYmd,
};
