import {
  REQUIRED_DOC_TYPES,
  OPTIONAL_DOC_TYPES,
  docWindowStatus,
  evidenceStatus,
  normalizeDocType
} from '../lib/documentationUtils';
import { buildMinimalCollaborators } from './portalXlsxImporter';

const DEMO_KEY = 'portal_rh_xlsx_demo_v1';
const PROD_KEY = 'portal_rh_xlsx_v1';
const DEMO_MODE_KEY = 'portal_rh_demo_mode';
const DEMO_SCENARIO_KEY = 'portal_rh_demo_scenario';
const PASSAGEM_OPTIONS = ['Não comprada', 'Comprada', 'Emitida'];

const SCENARIOS = {
  saudavel: { ok: 0.85, expiring: 0.1, expired: 0.05, evidenceMissing: 0.08, verifyPending: 0.12 },
  risco: { ok: 0.6, expiring: 0.25, expired: 0.15, evidenceMissing: 0.2, verifyPending: 0.25 },
  critico: { ok: 0.35, expiring: 0.3, expired: 0.35, evidenceMissing: 0.35, verifyPending: 0.4 }
};

function getScenarioConfig(scenario) {
  return SCENARIOS[scenario] || SCENARIOS.saudavel;
}

function isDemoRoute() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/demo');
}

export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  if (isDemoRoute()) return true;
  if (import.meta?.env?.VITE_DEMO_MODE === 'true') return true;
  return window.localStorage.getItem(DEMO_MODE_KEY) === '1';
}

export function setDemoMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(DEMO_MODE_KEY, '1');
  } else {
    window.localStorage.removeItem(DEMO_MODE_KEY);
  }
}

export function getStorageKey() {
  return isDemoMode() ? DEMO_KEY : PROD_KEY;
}

export function getDemoScenario() {
  if (typeof window === 'undefined') return 'saudavel';
  const stored = window.localStorage.getItem(DEMO_SCENARIO_KEY);
  return stored && SCENARIOS[stored] ? stored : 'saudavel';
}

export function setDemoScenario(scenario) {
  if (typeof window === 'undefined') return;
  if (!SCENARIOS[scenario]) return;
  window.localStorage.setItem(DEMO_SCENARIO_KEY, scenario);
}

function makeDemoEmployees(count = 100) {
  const first = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gabi', 'Henrique', 'Iris', 'Joao'];
  const last = ['Silva', 'Souza', 'Oliveira', 'Costa', 'Almeida', 'Santos', 'Pereira', 'Lima', 'Gomes', 'Ribeiro'];
  const units = ['P-74', 'Plataforma Beta', 'Sonda Ômega', 'UPGN Cabiúnas'];
  const bases = ['Coelho Neto', 'Macaé'];
  const roles = ['Técnico', 'Operador', 'Supervisor', 'Engenheiro', 'Eletricista'];

  return Array.from({ length: count }, (_, idx) => {
    const id = 1001 + idx;
    const name = `${first[idx % first.length]} ${last[idx % last.length]}`;
    return {
      COLABORADOR_ID: String(id),
      NOME_COMPLETO: name,
      CPF: `000000000${String(idx).padStart(2, '0')}`,
      CARGO_FUNCAO: roles[idx % roles.length],
      BASE_OPERACIONAL: bases[idx % bases.length],
      UNIDADE: units[idx % units.length],
      STATUS_ATUAL: idx % 4 === 0 ? 'EMBARCADO' : 'ATIVO',
      FUNCAO_OFFSHORE: idx % 3 === 0 ? 'SIM' : 'NAO'
    };
  });
}

function buildDemoDocs(employees, scenario) {
  const config = getScenarioConfig(scenario);
  const allTypes = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];
  const now = new Date();
  const docs = [];

  employees.forEach((emp, idx) => {
    allTypes.forEach((type, tIdx) => {
      const rolling = (idx + tIdx) % 100;
      const statusMarker = rolling / 100;
      let vencDate = new Date(now);
      if (statusMarker < config.ok) {
        vencDate.setDate(now.getDate() + 45 + (rolling % 20));
      } else if (statusMarker < config.ok + config.expiring) {
        vencDate.setDate(now.getDate() + 7 + (rolling % 7));
      } else {
        vencDate.setDate(now.getDate() - (3 + (rolling % 10)));
      }
      const evidenceMarker = (rolling + 13) / 100;
      const hasEvidence = evidenceMarker > config.evidenceMissing;
      const verified = hasEvidence && evidenceMarker > config.verifyPending;
      docs.push({
        COLABORADOR_ID: emp.COLABORADOR_ID,
        TIPO_DOCUMENTO: type,
        DATA_EMISSAO: now.toISOString(),
        DATA_VENCIMENTO: vencDate.toISOString(),
        EVIDENCIA_TIPO: hasEvidence ? 'UPLOAD' : '',
        EVIDENCIA_REF: hasEvidence ? `${type}_${emp.COLABORADOR_ID}.pdf` : '',
        OBS: '',
        VERIFIED: verified,
        VERIFIED_BY: verified ? 'Demo' : '',
        VERIFIED_AT: verified ? now.toISOString() : ''
      });
    });
  });

  return docs;
}

function computeAptidao(docsByEmployee, employeeId, embarkDate, disembarkDate) {
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

  if (missing.length || expired.length) return { level: 'NAO_APTO', missing, expired, expiring, evidencePending };
  if (expiring.length) return { level: 'ATENCAO', missing, expired, expiring, evidencePending };
  return { level: 'APTO', missing, expired, expiring, evidencePending };
}

function computeLocalAtual(embarkDate, disembarkDate, now) {
  const embark = new Date(embarkDate);
  const disembark = new Date(disembarkDate);
  const hospedadoStart = new Date(embark);
  hospedadoStart.setHours(hospedadoStart.getHours() - 24);
  if (now >= embark && now <= disembark) return 'Embarcado';
  if (now >= hospedadoStart && now < embark) return 'Hospedado';
  return 'Base';
}

function buildDemoCard(embarkDate, index) {
  const code = `BR-EMB-${String(index + 1).padStart(3, '0')}`;
  const presentation = new Date(embarkDate);
  presentation.setHours(presentation.getHours() - 6);
  return {
    codigo: code,
    apresentacao_dt: presentation.toISOString(),
    roteiro: ['Base', 'Aeroporto', 'Heliponto', 'Unidade'],
    contato: '(21) 99999-0000',
    observacoes: 'Chegar com 2h de antecedência.'
  };
}

function buildDemoProgramacoes(employees, docsByEmployee, scenario) {
  const now = new Date();
  const base = 'Coelho Neto';
  const definitions = [
    { label: 'P-74', status: 'Planejado', offset: 5 },
    { label: 'Plataforma Beta', status: 'Confirmado', offset: 1 },
    { label: 'Sonda Ômega', status: 'Em andamento', offset: -3 },
    { label: 'UPGN Cabiúnas', status: 'Finalizado', offset: -25 }
  ];

  return definitions.map((def, index) => {
    const embark = new Date(now);
    embark.setDate(now.getDate() + def.offset);
    embark.setHours(6, 0, 0, 0);
    const disembark = new Date(embark);
    disembark.setDate(embark.getDate() + 14);
    disembark.setHours(18, 0, 0, 0);

    const aptGroups = { APTO: [], ATENCAO: [], NAO_APTO: [] };
    employees.forEach((emp) => {
      const apt = computeAptidao(docsByEmployee, emp.COLABORADOR_ID, embark, disembark);
      aptGroups[apt.level].push(emp);
    });

    const total = Math.min(18, employees.length);
    const selected = [
      ...aptGroups.APTO.slice(0, Math.round(total * 0.6)),
      ...aptGroups.ATENCAO.slice(0, Math.round(total * 0.25)),
      ...aptGroups.NAO_APTO.slice(0, Math.round(total * 0.15))
    ];
    if (selected.length < 12) {
      const remaining = employees.filter((emp) => !selected.some((item) => item.COLABORADOR_ID === emp.COLABORADOR_ID));
      selected.push(...remaining.slice(0, 12 - selected.length));
    }

    const escalados = selected.slice(0, total).map((emp, idx) => ({
      COLABORADOR_ID: emp.COLABORADOR_ID,
      LOCAL_ATUAL: computeLocalAtual(embark, disembark, now),
      PASSAGEM_STATUS: PASSAGEM_OPTIONS[(idx + index) % PASSAGEM_OPTIONS.length],
      CARTAO_EMBARQUE_REF: '',
      CARTAO_EMBARQUE: buildDemoCard(embark, idx + index * 4),
      OBS: ''
    }));

    return {
      PROG_ID: `demo_${Date.now()}_${index}`,
      UNIDADE: def.label,
      BASE: base,
      EMBARQUE_DT: embark.toISOString(),
      DESEMBARQUE_DT: disembark.toISOString(),
      STATUS: def.status,
      NOTES: `Cenário ${scenario}`,
      COLABORADORES: escalados
    };
  });
}

function getDemoPayload(scenario) {
  const employees = makeDemoEmployees(100);
  const documentacoes = buildDemoDocs(employees, scenario);
  const docsByEmployee = new Map();
  documentacoes.forEach((doc) => {
    const current = docsByEmployee.get(doc.COLABORADOR_ID) || [];
    current.push(doc);
    docsByEmployee.set(doc.COLABORADOR_ID, current);
  });
  const programacoes = buildDemoProgramacoes(employees, docsByEmployee, scenario);
  return {
    version: 1,
    importedAt: new Date().toISOString(),
    dataset: { colaboradores: employees, documentacoes, programacoes },
    colaboradores_minimos: buildMinimalCollaborators(employees)
  };
}

export function seedDemoDataIfNeeded(scenario, force = false) {
  if (typeof window === 'undefined') return;
  if (!isDemoMode()) return;
  const key = DEMO_KEY;
  const raw = window.localStorage.getItem(key);
  if (raw && !force) return;
  const nextScenario = scenario || getDemoScenario();
  const payload = getDemoPayload(nextScenario);
  window.localStorage.setItem(key, JSON.stringify(payload));
  window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
}

export function clearDemoData() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_KEY);
  window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
}

export function ensureDemoSeedFromRoute() {
  if (!isDemoRoute()) return;
  setDemoMode(true);
  seedDemoDataIfNeeded(getDemoScenario());
}
