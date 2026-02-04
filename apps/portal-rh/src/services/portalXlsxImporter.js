import * as XLSX from 'xlsx';
import { REQUIRED_DOC_TYPES, docValidityStatus, normalizeDigitsOnly, normalizeDocType } from '../lib/documentationUtils';

const SHEET_ALIASES = {
  Colaboradores: ['Colaboradores'],
  Docs_Pessoais: ['Docs_Pessoais', 'Docs Pessoais', 'Docs-Pessoais', 'DocsPessoais'],
  Certificacoes: ['Certificacoes', 'Certificações', 'Certificacoes ', 'Certificações '],
  Saude_Exames: ['Saude_Exames', 'Saúde_Exames', 'Saude Exames', 'Saúde Exames', 'Saude-Exames'],
  CONFIG: ['CONFIG', 'Config', 'config']
};

const REQUIRED_COLAB_HEADERS = [
  'COLABORADOR_ID',
  'NOME_COMPLETO',
  'CPF',
  'CARGO_FUNCAO',
  'BASE_OPERACIONAL',
  'UNIDADE'
];

const REQUIRED_DOCUMENTACAO_HEADERS = [
  'COLABORADOR_ID',
  'TIPO_DOCUMENTO',
  'DATA_EMISSAO',
  'DATA_VENCIMENTO',
  'EVIDENCIA_TIPO',
  'EVIDENCIA_REF',
  'OBS'
];

function findSheetName(workbook, sheetKey) {
  const aliases = SHEET_ALIASES[sheetKey] || [sheetKey];
  const names = workbook.SheetNames || [];
  return aliases.find((alias) => names.includes(alias)) || null;
}

function toRows(workbook, sheetKey) {
  const sheetName = findSheetName(workbook, sheetKey);
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function parseConfigSheet(workbook) {
  const sheetName = findSheetName(workbook, 'CONFIG');
  if (!sheetName) return {};
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return {};
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return rows.reduce((acc, row) => {
    const key = normalizeText(row?.[0]);
    if (!key || !/^[A-Z0-9_]+$/.test(key)) return acc;
    const value = row?.[1];
    acc[key] = value;
    return acc;
  }, {});
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function normalizeSheetName(value) {
  return normalizeHeader(value).replace(/_+/g, '');
}

function isValidCollaborator(row) {
  const cpf = normalizeText(row.CPF);
  const id = normalizeText(row.COLABORADOR_ID);
  const nome = normalizeText(row.NOME_COMPLETO);
  return Boolean(cpf || id || nome);
}

function getAlertDays(configRows) {
  const parsed = toNumber(configRows?.ALERTA_PRAZO_DIAS);
  return parsed != null ? parsed : 30;
}

function resolveStatusPrazo(row, alertDays) {
  const status = normalizeText(row.STATUS_PRAZO).toUpperCase();
  const dias = toNumber(row.DIAS_PARA_PRAZO);
  if (status === 'VENCIDO' || (dias != null && dias < 0)) return 'VENCIDO';
  if (status === 'ALERTA' || (dias != null && dias <= alertDays && dias >= 0)) return 'ALERTA';
  if (status === 'OK') return 'OK';
  return '';
}

function countStatus(rows, alertDays) {
  return rows.reduce(
    (acc, row) => {
      const status = resolveStatusPrazo(row, alertDays);
      if (status === 'VENCIDO') acc.expired += 1;
      if (status === 'ALERTA') acc.expiring += 1;
      return acc;
    },
    { expired: 0, expiring: 0 }
  );
}

function getHeaderRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) return { header: [], rows: [] };
  const header = rows[0].map((cell) => normalizeHeader(cell));
  return { header, rows: rows.slice(1) };
}

function hasRequiredHeaders(header) {
  if (!header.length) return false;
  return REQUIRED_COLAB_HEADERS.every((required) => header.includes(required));
}

function findCollaboradoresSheet(workbook) {
  const names = workbook.SheetNames || [];
  const direct = names.find((name) => normalizeHeader(name) === 'COLABORADORES');
  if (direct) return { sheetName: direct, reason: 'COLABORADORES' };
  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const { header } = getHeaderRows(sheet);
    if (hasRequiredHeaders(header)) return { sheetName: name, reason: 'HEADERS' };
  }
  return { sheetName: null, reason: 'NOT_FOUND' };
}

function parseCollaboradoresSheet(workbook) {
  const { sheetName, reason } = findCollaboradoresSheet(workbook);
  if (!sheetName) return { rows: [], reason, sheetName: null };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], reason: 'NOT_FOUND', sheetName: null };
  const { header, rows } = getHeaderRows(sheet);
  if (!hasRequiredHeaders(header)) {
    return { rows: [], reason: 'MISSING_HEADERS', sheetName };
  }
  const items = [];
  rows.forEach((row) => {
    const isEmpty = row.every((cell) => normalizeText(cell) === '');
    if (isEmpty) return;
    const item = {};
    header.forEach((key, idx) => {
      if (!key) return;
      const rawValue = row[idx];
      if (rawValue == null || rawValue === '') {
        item[key] = '';
        return;
      }
      if (key === 'CPF' || key === 'TELEFONE') {
        item[key] = normalizeDigitsOnly(rawValue);
        return;
      }
      item[key] = normalizeText(rawValue);
    });
    if (!isValidCollaborator(item)) return;
    items.push(item);
  });
  return { rows: items, reason: 'OK', sheetName };
}

function parseExcelDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, '0');
    const d = String(parsed.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return '';
  return asDate.toISOString();
}

function parseDocumentacoesSheet(workbook) {
  const names = workbook.SheetNames || [];
  const target = names.find((name) => normalizeSheetName(name) === 'DOCUMENTACOES');
  if (!target) return { rows: [], reason: 'NOT_FOUND', sheetName: null };
  const sheet = workbook.Sheets[target];
  if (!sheet) return { rows: [], reason: 'NOT_FOUND', sheetName: null };
  const { header, rows } = getHeaderRows(sheet);
  const hasRequired = REQUIRED_DOCUMENTACAO_HEADERS.every((required) => header.includes(required));
  if (!hasRequired) {
    return { rows: [], reason: 'MISSING_HEADERS', sheetName: target };
  }
  const items = [];
  rows.forEach((row) => {
    const isEmpty = row.every((cell) => normalizeText(cell) === '');
    if (isEmpty) return;
    const item = {};
    header.forEach((key, idx) => {
      if (!key) return;
      const rawValue = row[idx];
      if (key === 'DATA_EMISSAO' || key === 'DATA_VENCIMENTO') {
        item[key] = parseExcelDate(rawValue);
        return;
      }
      if (key === 'COLABORADOR_ID') {
        item[key] = normalizeText(rawValue);
        return;
      }
      item[key] = normalizeText(rawValue);
    });
    if (!item.COLABORADOR_ID || !item.TIPO_DOCUMENTO) return;
    items.push({
      COLABORADOR_ID: item.COLABORADOR_ID,
      TIPO_DOCUMENTO: item.TIPO_DOCUMENTO,
      DATA_EMISSAO: item.DATA_EMISSAO,
      DATA_VENCIMENTO: item.DATA_VENCIMENTO,
      EVIDENCIA_TIPO: item.EVIDENCIA_TIPO || '',
      EVIDENCIA_REF: item.EVIDENCIA_REF || '',
      OBS: item.OBS || '',
      VERIFIED: false,
      VERIFIED_BY: '',
      VERIFIED_AT: ''
    });
  });
  return { rows: items, reason: 'OK', sheetName: target };
}

export function parseXlsxToDataset(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const colaboradoresResult = parseCollaboradoresSheet(workbook);
        const colaboradores = colaboradoresResult.rows;
        const docs_pessoais = toRows(workbook, 'Docs_Pessoais');
        const certificacoes = toRows(workbook, 'Certificacoes');
        const saude_exames = toRows(workbook, 'Saude_Exames');
        const config = parseConfigSheet(workbook);

        if (colaboradoresResult.sheetName) {
          console.debug(
            `[portal-rh] Aba colaboradores: ${colaboradoresResult.sheetName} (${colaboradores.length} linhas).`
          );
        }
        if (!colaboradores.length) {
          const reason =
            colaboradoresResult.reason === 'MISSING_HEADERS'
              ? 'headers obrigatórios ausentes'
              : 'aba não encontrada';
          console.warn(`[portal-rh] Nenhum colaborador importado (${reason}).`);
        }

        resolve({ colaboradores, docs_pessoais, certificacoes, saude_exames, config });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo XLSX.'));

    reader.readAsArrayBuffer(file);
  });
}

export function parseXlsxToDocumentacoes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const docsResult = parseDocumentacoesSheet(workbook);
        const documentacoes = docsResult.rows;

        if (docsResult.sheetName) {
          console.debug(
            `[portal-rh] Aba documentações: ${docsResult.sheetName} (${documentacoes.length} linhas).`
          );
        }
        if (!documentacoes.length) {
          const reason =
            docsResult.reason === 'MISSING_HEADERS' ? 'headers obrigatórios ausentes' : 'aba não encontrada';
          console.warn(`[portal-rh] Nenhuma documentação importada (${reason}).`);
        }

        resolve(documentacoes);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo XLSX.'));

    reader.readAsArrayBuffer(file);
  });
}

export function computeDashboardMetrics(dataset) {
  if (!dataset) {
    return {
      hc: { total: 0, embarked: 0, base: 0, delta: '' },
      docs: { expiring30: 0, expired: 0, missing: 0 },
      inventory: { epiLowStock: 0, critical: 0, deltaLowStock: '' },
      requests: { pendingApprovals: 0, upcomingEmbark: 0, deltaPending: '' },
      rdo: { generated: 0, pendingApproval: 0, rejected: 0, missingDays: 0 },
      os: { generated: 0, pendingApproval: 0, rejected: 0, missingDays: 0 },
      distribution: { platforms: [], vessels: [] },
      recommendedActions: [],
      recentActivity: []
    };
  }

  const colaboradores = Array.isArray(dataset.colaboradores) ? dataset.colaboradores : [];
  const validColabs = colaboradores.filter(isValidCollaborator);
  const embarked = validColabs.filter((row) => {
    const status = normalizeText(row.STATUS_ATUAL || row.STATUS).toLowerCase();
    const offshore = normalizeText(row.FUNCAO_OFFSHORE).toLowerCase();
    return status.includes('embar') || offshore === 'sim';
  }).length;
  const total = validColabs.length;
  const base = Math.max(total - embarked, 0);

  const documentacoes = Array.isArray(dataset.documentacoes) ? dataset.documentacoes : [];
  const docsByColab = new Map();
  documentacoes.forEach((doc) => {
    const key = normalizeText(doc.COLABORADOR_ID);
    if (!key) return;
    const current = docsByColab.get(key) || [];
    current.push(doc);
    docsByColab.set(key, current);
  });
  let docsExpired = 0;
  let docsExpiring = 0;
  if (documentacoes.length > 0) {
    validColabs.forEach((collab) => {
      const key = normalizeText(collab.COLABORADOR_ID);
      const docs = docsByColab.get(key) || [];
      let hasExpired = false;
      let hasExpiring = false;
      REQUIRED_DOC_TYPES.forEach((type) => {
        const doc = docs.find((item) => normalizeDocType(item.TIPO_DOCUMENTO) === type);
        if (!doc) {
          hasExpired = true;
          return;
        }
        const status = docValidityStatus(doc);
        if (status === 'VENCIDO') hasExpired = true;
        if (status === 'VENCENDO') hasExpiring = true;
      });
      if (hasExpired) docsExpired += 1;
      if (!hasExpired && hasExpiring) docsExpiring += 1;
    });
  }

  const platformTotals = new Map();
  const vesselTotals = new Map();
  validColabs.forEach((row) => {
    const platform = normalizeText(row.BASE_OPERACIONAL);
    const vessel = normalizeText(row.UNIDADE);
    if (!platform) return;
    platformTotals.set(platform, (platformTotals.get(platform) || 0) + 1);
    if (!vessel) return;
    vesselTotals.set(vessel, (vesselTotals.get(vessel) || 0) + 1);
  });
  const platforms = Array.from(platformTotals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const vessels = Array.from(vesselTotals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return {
    hc: { total, embarked, base, delta: '' },
    docs: { expiring30: docsExpiring, expired: docsExpired, missing: 0 },
    inventory: { epiLowStock: 0, critical: 0, deltaLowStock: '' },
    requests: { pendingApprovals: 0, upcomingEmbark: 0, deltaPending: '' },
    rdo: { generated: 0, pendingApproval: 0, rejected: 0, missingDays: 0 },
    os: { generated: 0, pendingApproval: 0, rejected: 0, missingDays: 0 },
    distribution: { platforms, vessels },
    recommendedActions: [],
    recentActivity: []
  };
}

export function buildMinimalCollaborators(colaboradores) {
  const rows = Array.isArray(colaboradores) ? colaboradores : [];
  return rows.map((row) => ({
    id: normalizeText(row.COLABORADOR_ID),
    nome: normalizeText(row.NOME_COMPLETO),
    cpf: normalizeText(row.CPF),
    base: normalizeText(row.BASE_OPERACIONAL),
    unidade: normalizeText(row.UNIDADE),
    status: normalizeText(row.STATUS_ATUAL || row.STATUS),
    plataforma: normalizeText(row.BASE_OPERACIONAL)
  }));
}
