// apps/portal-rh/src/data/mock.js
// Mock de 100 colaboradores (Escala e Embarque) com cenários para testar alertas.
// - Sem marketplace: usamos `base` (em terra) e `unit` (unidade embarcada).
// - Inclui casos propositais: docs vencidos, docs vencendo, embarque sem transporte, embarque atrasado,
//   pendência de devolução de equipamento, inconsistências de status.
//
// Observação: o mock é determinístico (seed fixa) e relativo à data atual do runtime (new Date()).

const SEED = 1337;

// PRNG simples e determinístico (xorshift32)
function rngFactory(seed) {
  let x = seed >>> 0;
  return function rand() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}

const rand = rngFactory(SEED);

const FIRST = [
  "Ana", "Bruno", "Carla", "Diego", "Elisa", "Fabio", "Gabriela", "Hugo", "Iara", "João",
  "Karla", "Lucas", "Marina", "Natan", "Otávio", "Paula", "Rafael", "Sofia", "Tiago", "Vera",
  "Wagner", "Yasmin", "Zeca", "Bianca", "Caio", "Davi", "Emanuel", "Fernanda", "Gustavo", "Helena",
];
const LAST = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Ferreira", "Costa", "Pereira", "Rodrigues", "Almeida",
  "Gonçalves", "Carvalho", "Ribeiro", "Barbosa", "Mendes", "Araújo", "Cardoso", "Martins", "Rocha", "Dias",
];
const ROLES = [
  "Motorista", "Ajudante", "Operador", "Técnico de Segurança", "Supervisor", "Almoxarife",
  "Mecânico", "Eletricista", "Cozinheiro", "Marinheiro", "Rádio Operador", "Enfermeiro", "Instrumentista",
];

const BASES = [
  "São Gonçalo", "Duque de Caxias", "Niterói", "Macaé", "Campos", "Rio das Ostras", "Itaboraí",
  "Base Cabiúnas", "Base Imbetiba", "Base Açu",
];

const UNITS = [
  "Plataforma P-74", "Plataforma P-58", "Plataforma P-09", "Plataforma P-12",
  "FPSO MODEC", "FPSO SBM", "FPSO ESS",
  "Sonda NS-42", "Sonda NS-18",
  "Embarcação Alpha", "Embarcação Beta", "Embarcação Delta", "Embarcação Gama",
  "PSV Atlântico", "OSRV Mar Limpo",
];

const TRANSPORT = ["HELICÓPTERO", "ÔNIBUS", "BARCO", "AVIÃO", "VAN"];

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateISO(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
function addDays(base, days) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

// CPF fake formatado (não válido de propósito, só formato)
function fakeCpf(i) {
  const a = (100 + (i * 7) % 900);
  const b = (100 + (i * 13) % 900);
  const c = (100 + (i * 17) % 900);
  const d = (10 + (i * 3) % 90);
  return `${a}.${b}.${c}-${d}`;
}

function makeName() {
  const f1 = pick(FIRST);
  const f2 = rand() > 0.65 ? pick(FIRST) : null;
  const l1 = pick(LAST);
  const l2 = rand() > 0.50 ? pick(LAST) : null;
  return [f1, f2, l1, l2].filter(Boolean).join(" ");
}

// Gate simples baseado em docs/equip (para testar badge)
function gateFrom(docs, equipment) {
  if ((docs?.expired ?? 0) > 0) return { level: "NAO_APTO", reason: "Documentação vencida" };
  if ((equipment?.pendingReturn ?? 0) > 0) return { level: "APTO_RESTRICAO", reason: "Devolução pendente" };
  if ((docs?.warning ?? 0) > 0) return { level: "APTO_RESTRICAO", reason: "Documentação vencendo" };
  return { level: "APTO", reason: "OK" };
}

function buildEmployee(i, now) {
  const id = `u_${String(i + 1).padStart(3, "0")}`;
  const name = makeName();
  const registration = `MT-${10000 + i}`;
  const cpf = fakeCpf(i);
  const phone = `21 9${String(8000 + (i * 37) % 1999).padStart(4, "0")}-${String(1000 + (i * 91) % 8999).padStart(4, "0")}`;
  const role = pick(ROLES);

  const base = pick(BASES);

  const opStatuses = ["EMBARCADO", "EM_TRANSITO", "EM_BASE", "HOSPEDADO", "FOLGA"];
  let opStatus = pick(opStatuses);

  const unit = (opStatus === "EMBARCADO" || rand() > 0.7) ? pick(UNITS) : "";

  let docs = { valid: 6, warning: 0, expired: 0 };
  let equipment = { assigned: 4, pendingReturn: 0 };
  let nextDeployment = null;

  const tags = [];

  if (i === 0) {
    nextDeployment = { destination: "Plataforma P-74", embarkDate: dateISO(addDays(now, 1)), transport: null };
    docs = { valid: 4, warning: 2, expired: 0 };
    tags.push("EMBARQUE_24H_SEM_TRANSPORTE", "DOCS_VENCENDO");
    opStatus = "EM_BASE";
  } else if (i === 1) {
    nextDeployment = { destination: "FPSO MODEC", embarkDate: dateISO(addDays(now, 1)), transport: "HELICÓPTERO" };
    docs = { valid: 1, warning: 0, expired: 2 };
    tags.push("DOCS_VENCIDOS", "ESCALADO_NAO_APTO");
    opStatus = "EM_BASE";
  } else if (i === 2) {
    nextDeployment = { destination: "Sonda NS-42", embarkDate: dateISO(addDays(now, -2)), transport: "BARCO" };
    docs = { valid: 5, warning: 0, expired: 0 };
    tags.push("EMBARQUE_ATRASADO");
    opStatus = "EM_TRANSITO";
  } else if (i === 3) {
    nextDeployment = { destination: "Plataforma P-58", embarkDate: dateISO(addDays(now, 2)), transport: "ÔNIBUS" };
    equipment = { assigned: 6, pendingReturn: 2 };
    docs = { valid: 6, warning: 0, expired: 0 };
    tags.push("PENDENCIA_DEVOLUCAO", "ESCALADO_COM_RESTRICAO");
    opStatus = "EM_BASE";
  } else if (i === 4) {
    nextDeployment = { destination: "Embarcação Alpha", embarkDate: dateISO(addDays(now, 3)), transport: "BARCO" };
    docs = { valid: 6, warning: 0, expired: 0 };
    tags.push("INCONSISTENCIA_STATUS");
    opStatus = "FOLGA";
  } else if (i === 5) {
    nextDeployment = { destination: "FPSO SBM", embarkDate: dateISO(addDays(now, 10)), transport: "HELICÓPTERO" };
    docs = { valid: 3, warning: 3, expired: 0 };
    tags.push("DOCS_VENCENDO", "PRE_ALERTA");
    opStatus = "EM_BASE";
  } else if (i === 6) {
    nextDeployment = null;
    docs = { valid: 2, warning: 0, expired: 1 };
    tags.push("DOCS_VENCIDOS");
    opStatus = "EMBARCADO";
  } else if (i === 7) {
    nextDeployment = { destination: "Plataforma P-12", embarkDate: dateISO(addDays(now, 0)), transport: "" };
    docs = { valid: 6, warning: 0, expired: 0 };
    tags.push("EMBARQUE_HOJE_SEM_TRANSPORTE");
    opStatus = "HOSPEDADO";
  } else if (i === 8) {
    nextDeployment = { destination: "Base Cabiúnas", embarkDate: dateISO(addDays(now, 0)), transport: "HELICÓPTERO" };
    docs = { valid: 6, warning: 0, expired: 0 };
    tags.push("MOVIMENTO_HOJE");
    opStatus = "EM_TRANSITO";
  } else if (i === 9) {
    nextDeployment = { destination: "Base Imbetiba", embarkDate: dateISO(addDays(now, 1)), transport: "HELICÓPTERO" };
    docs = { valid: 4, warning: 1, expired: 0 };
    tags.push("DOCS_VENCENDO", "MOVIMENTO_24H");
    opStatus = "EMBARCADO";
  } else {
    const roll = rand();

    if (roll < 0.10) {
      docs = { valid: 2, warning: 0, expired: 1 };
      tags.push("DOCS_VENCIDOS");
    } else if (roll < 0.30) {
      docs = { valid: 4, warning: 1 + Math.floor(rand() * 2), expired: 0 };
      tags.push("DOCS_VENCENDO");
    } else {
      docs = { valid: 6, warning: 0, expired: 0 };
    }

    const rollEq = rand();
    if (rollEq < 0.18) {
      equipment = { assigned: 3 + Math.floor(rand() * 5), pendingReturn: 1 + Math.floor(rand() * 2) };
      tags.push("PENDENCIA_DEVOLUCAO");
    } else {
      equipment = { assigned: 2 + Math.floor(rand() * 6), pendingReturn: 0 };
    }

    const rollMove = rand();
    if (rollMove < 0.25) {
      nextDeployment = null;
    } else {
      const delta = Math.floor((rand() * 23) - 1); // -1..+21
      const dest = (rand() > 0.45) ? pick(UNITS) : pick(BASES);
      let transport = pick(TRANSPORT);
      if (rand() < 0.12) {
        transport = null;
        tags.push("SEM_TRANSPORTE");
      }
      nextDeployment = { destination: dest, embarkDate: dateISO(addDays(now, delta)), transport };

      if (delta < 0) tags.push("MOVIMENTO_ATRASADO");
      if (delta === 0) tags.push("MOVIMENTO_HOJE");
      if (delta === 1) tags.push("MOVIMENTO_24H");
    }

    if (nextDeployment && (tags.includes("MOVIMENTO_HOJE") || tags.includes("MOVIMENTO_24H")) && opStatus === "FOLGA") {
      opStatus = "EM_BASE";
    }
  }

  let status = "ATIVO";
  if (i === 4) status = "INATIVO"; // inconsistente proposital
  if (rand() < 0.06) status = "INATIVO";

  const gate = gateFrom(docs, equipment);
  if (gate.level === "NAO_APTO") tags.push("GATE_NAO_APTO");
  if (gate.level === "APTO_RESTRICAO") tags.push("GATE_RESTRICAO");

  const currentLocation =
    opStatus === "EMBARCADO"
      ? { kind: "unit", name: unit || pick(UNITS) }
      : { kind: "base", name: base };

  return {
    id,
    name,
    registration,
    cpf,
    phone,
    role,
    base,
    unit: unit || "",
    status,
    opStatus,
    currentLocation,
    nextDeployment,
    docs,
    equipment,
    gate,
    alertTestTags: tags,
  };
}

const now = new Date();

export const mockEmployees = Array.from({ length: 100 }, (_, i) => buildEmployee(i, now));

export const mockEquipmentCatalog = [
  { id: 'eq_001', type: 'EPI', name: 'Capacete', requiresSize: false, requiresCode: true },
  { id: 'eq_002', type: 'EPI', name: 'Bota', requiresSize: true, requiresCode: false },
  { id: 'eq_003', type: 'EPI', name: 'Óculos de proteção', requiresSize: false, requiresCode: false },
  { id: 'eq_004', type: 'Equipamento', name: 'Celular corporativo', requiresSize: false, requiresCode: true },
  { id: 'eq_005', type: 'Equipamento', name: 'Crachá', requiresSize: false, requiresCode: true }
];
