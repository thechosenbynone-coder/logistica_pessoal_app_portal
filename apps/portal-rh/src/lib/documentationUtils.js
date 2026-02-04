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
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = String(value).trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffInDays(a, b) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86400000);
}

function docValidityStatus(doc, now = new Date()) {
  const venc = toDate(doc?.DATA_VENCIMENTO);
  if (!venc) return '';
  const days = diffInDays(venc, now);
  if (days < 0) return 'VENCIDO';
  if (days <= 20) return 'VENCENDO';
  return 'OK';
}

function docWindowStatus(doc, embarkDate, disembarkDate) {
  const venc = toDate(doc?.DATA_VENCIMENTO);
  const embark = toDate(embarkDate);
  const disembark = toDate(disembarkDate);
  if (!venc || !embark || !disembark) return '';
  if (venc < embark) return 'VENCIDO';
  if (venc >= embark && venc <= disembark) return 'VENCE_DURANTE';
  return 'OK';
}

function evidenceStatus(doc) {
  const tipo = normalizeText(doc?.EVIDENCIA_TIPO);
  const ref = normalizeText(doc?.EVIDENCIA_REF);
  if (!tipo || !ref) return 'SEM_EVIDENCIA';
  if (!doc?.VERIFIED) return 'PENDENTE_VERIFICACAO';
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
  toDate
};
