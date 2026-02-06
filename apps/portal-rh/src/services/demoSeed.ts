import { REQUIRED_DOC_TYPES } from '../lib/documentationUtils';
import { buildMinimalCollaborators } from './portalXlsxImporter';

type Scenario = 'saudavel' | 'risco' | 'critico';

const UNIDADES = ['MODEC - MV26', 'MODEC - MV27', 'MODEC - MV28', 'SBM - Tamandaré'];
const BASES = ['Macaé', 'Rio das Ostras', 'Niterói'];
const FUNCOES = ['Técnico de Segurança', 'Supervisor Offshore', 'Operador de Guindaste', 'Mecânico', 'Enfermeiro'];

function shiftDays(base: Date, days: number): string {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function shiftHours(base: Date, hours: number): string {
  const next = new Date(base);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function employee(index: number) {
  return {
    COLABORADOR_ID: `D${String(index + 1).padStart(4, '0')}`,
    NOME_COMPLETO: `Colaborador Demo ${index + 1}`,
    CPF: `99988877${String(index).padStart(3, '0')}`,
    CARGO_FUNCAO: FUNCOES[index % FUNCOES.length],
    BASE_OPERACIONAL: BASES[index % BASES.length],
    UNIDADE: UNIDADES[index % UNIDADES.length],
    STATUS_ATUAL: 'ATIVO',
    FUNCAO_OFFSHORE: 'SIM'
  };
}

function buildProgramDates(now: Date) {
  return {
    p4: { embarque: shiftDays(now, -24), desembarque: shiftDays(now, -18) },
    p1: { embarque: shiftDays(now, -2), desembarque: shiftDays(now, 2) },
    p2: { embarque: shiftDays(now, 2), desembarque: shiftDays(now, 6) },
    p3: { embarque: shiftDays(now, 10), desembarque: shiftDays(now, 14) }
  };
}

function buildMember(employeeId: string, stage: string, now: Date, noShow = false) {
  const stageNormalized = stage.toLowerCase();
  const localAtual = stageNormalized === 'hotel' ? 'Hospedado' : stageNormalized === 'embarcado' ? 'Embarcado' : 'Base';
  return {
    COLABORADOR_ID: employeeId,
    LOCAL_ATUAL: localAtual,
    PASSAGEM_STATUS: ['voo', 'embarcado', 'check-in heliporto'].includes(stageNormalized) ? 'Emitida' : 'Comprada',
    CARTAO_EMBARQUE_REF: '',
    OBS: noShow ? 'No-show no deslocamento' : '',
    JORNADA: {
      STAGE: stage,
      HOTEL_NOME: stageNormalized === 'hotel' ? 'Hotel Atlântico' : '',
      HOTEL_CIDADE: stageNormalized === 'hotel' ? 'Macaé' : '',
      CHECKIN_HOTEL_AT: stageNormalized === 'hotel' ? shiftHours(now, -6) : '',
      CHECKIN_HELIPORTO_AT:
        stageNormalized === 'check-in heliporto' || stageNormalized === 'embarcado' ? shiftHours(now, -2) : '',
      NO_SHOW: noShow
    }
  };
}

function buildProgramacoes(colaboradores: any[], now: Date) {
  const dates = buildProgramDates(now);
  const existingIds = new Set(colaboradores.map((c) => c.COLABORADOR_ID));
  const id = (n: number) => `D${String(n).padStart(4, '0')}`;

  const p1Ids = Array.from({ length: 12 }, (_, i) => id(i + 1)).filter((v) => existingIds.has(v));
  const p2Ids = Array.from({ length: 12 }, (_, i) => id(i + 7)).filter((v) => existingIds.has(v));
  const p3Ids = Array.from({ length: 12 }, (_, i) => id(i + 13)).filter((v) => existingIds.has(v));
  const p4Ids = Array.from({ length: 10 }, (_, i) => id(i + 1)).filter((v) => existingIds.has(v));

  const p1Stages = ['Embarcado', 'Hotel', 'Hotel', 'Check-in Heliporto', 'Hotel', 'Voo', 'Casa', 'Hotel'];
  const p2Stages = ['Casa', 'Voo', 'Check-in Heliporto', 'Hotel', 'Casa'];
  const p3Stages = ['Casa', 'Voo', 'Casa', 'Hotel'];

  const p1Members = p1Ids.map((employeeId, index) => {
    const noShow = index === 9 || index === 10;
    return buildMember(employeeId, p1Stages[index % p1Stages.length], now, noShow);
  });
  const p2Members = p2Ids.map((employeeId, index) => buildMember(employeeId, p2Stages[index % p2Stages.length], now));
  const p3Members = p3Ids.map((employeeId, index) => buildMember(employeeId, p3Stages[index % p3Stages.length], now));
  const p4Members = p4Ids.map((employeeId, index) => buildMember(employeeId, index % 2 === 0 ? 'Embarcado' : 'Casa', now));

  return {
    programacoes: [
      {
        PROG_ID: 'DEMO-PROG-1',
        UNIDADE: UNIDADES[0],
        BASE: BASES[0],
        EMBARQUE_DT: dates.p1.embarque,
        DESEMBARQUE_DT: dates.p1.desembarque,
        STATUS: 'Em andamento',
        NOTES: 'Operação em andamento com casos de risco e troca.',
        COLABORADORES: p1Members
      },
      {
        PROG_ID: 'DEMO-PROG-2',
        UNIDADE: UNIDADES[1],
        BASE: BASES[1],
        EMBARQUE_DT: dates.p2.embarque,
        DESEMBARQUE_DT: dates.p2.desembarque,
        STATUS: 'Confirmado',
        NOTES: 'Embarque confirmado para curto prazo.',
        COLABORADORES: p2Members
      },
      {
        PROG_ID: 'DEMO-PROG-3',
        UNIDADE: UNIDADES[2],
        BASE: BASES[2],
        EMBARQUE_DT: dates.p3.embarque,
        DESEMBARQUE_DT: dates.p3.desembarque,
        STATUS: 'Planejado',
        NOTES: 'Planejamento da próxima janela.',
        COLABORADORES: p3Members
      },
      {
        PROG_ID: 'DEMO-PROG-4',
        UNIDADE: UNIDADES[3],
        BASE: BASES[0],
        EMBARQUE_DT: dates.p4.embarque,
        DESEMBARQUE_DT: dates.p4.desembarque,
        STATUS: 'Finalizado',
        NOTES: 'Programação encerrada.',
        COLABORADORES: p4Members
      }
    ],
    windows: dates
  };
}

function createBaseDocs(colaboradores: any[], now: Date) {
  return colaboradores.flatMap((colab) =>
    REQUIRED_DOC_TYPES.map((tipo) => ({
      COLABORADOR_ID: colab.COLABORADOR_ID,
      TIPO_DOCUMENTO: tipo,
      DATA_EMISSAO: shiftDays(now, -180),
      DATA_VENCIMENTO: shiftDays(now, 160),
      EVIDENCIA_TIPO: 'UPLOAD',
      EVIDENCIA_REF: `doc_${colab.COLABORADOR_ID}_${tipo}.pdf`,
      OBS: '',
      VERIFIED: true,
      VERIFIED_BY: 'Auditoria Demo',
      VERIFIED_AT: shiftDays(now, -7)
    }))
  );
}

function applyDocPatch(
  docsByKey: Map<string, any>,
  employeeId: string,
  docType: string,
  patch: Partial<any>
) {
  const key = `${employeeId}::${docType}`;
  const current = docsByKey.get(key);
  if (!current) return;
  docsByKey.set(key, { ...current, ...patch });
}

function applyScenarioPatches(
  scenario: Scenario,
  docsByKey: Map<string, any>,
  windows: any
) {
  const overlapP1P2 = ['D0007', 'D0008', 'D0009', 'D0010'];
  const overlapP2P3 = ['D0013', 'D0014', 'D0015', 'D0016'];
  const atencaoBase = ['D0003', 'D0004', 'D0005', 'D0011'];
  const naoAptoBase = ['D0002'];
  const evidenceBase = ['D0003', 'D0011'];

  const scenarioConfig = {
    saudavel: {
      atencao: atencaoBase,
      naoApto: naoAptoBase,
      pendencias: evidenceBase,
      trocaP1P2: overlapP1P2.slice(0, 2),
      trocaP2P3: overlapP2P3.slice(0, 1)
    },
    risco: {
      atencao: [...atencaoBase, 'D0012', 'D0017', 'D0018'],
      naoApto: [...naoAptoBase, 'D0009', 'D0014'],
      pendencias: [...evidenceBase, 'D0012', 'D0015', 'D0018'],
      trocaP1P2: overlapP1P2.slice(0, 3),
      trocaP2P3: overlapP2P3.slice(0, 2)
    },
    critico: {
      atencao: [...atencaoBase, 'D0012', 'D0017', 'D0018', 'D0019', 'D0020'],
      naoApto: [...naoAptoBase, 'D0009', 'D0014', 'D0015', 'D0016'],
      pendencias: [...evidenceBase, 'D0012', 'D0015', 'D0018', 'D0019', 'D0020'],
      trocaP1P2: overlapP1P2,
      trocaP2P3: overlapP2P3.slice(0, 3)
    }
  }[scenario];

  scenarioConfig.naoApto.forEach((employeeId) => {
    applyDocPatch(docsByKey, employeeId, REQUIRED_DOC_TYPES[0], {
      DATA_VENCIMENTO: shiftDays(new Date(), -1),
      OBS: 'Documento vencido antes do embarque.'
    });
  });

  scenarioConfig.atencao.forEach((employeeId, idx) => {
    applyDocPatch(docsByKey, employeeId, REQUIRED_DOC_TYPES[1], {
      DATA_VENCIMENTO: shiftHours(new Date(windows.p1.embarque), 24 + idx * 2),
      OBS: 'Documento vence durante a janela operacional.'
    });
  });

  scenarioConfig.trocaP1P2.forEach((employeeId, idx) => {
    applyDocPatch(docsByKey, employeeId, REQUIRED_DOC_TYPES[2], {
      DATA_VENCIMENTO: shiftHours(new Date(windows.p1.desembarque), 4 + idx),
      OBS: 'Documento vence entre P1 e P2 (troca).'
    });
  });

  scenarioConfig.trocaP2P3.forEach((employeeId, idx) => {
    applyDocPatch(docsByKey, employeeId, REQUIRED_DOC_TYPES[3], {
      DATA_VENCIMENTO: shiftHours(new Date(windows.p2.desembarque), 5 + idx),
      OBS: 'Documento vence entre P2 e P3 (troca).'
    });
  });

  scenarioConfig.pendencias.forEach((employeeId, idx) => {
    applyDocPatch(docsByKey, employeeId, REQUIRED_DOC_TYPES[(idx + 1) % REQUIRED_DOC_TYPES.length], {
      VERIFIED: false,
      VERIFIED_BY: '',
      VERIFIED_AT: '',
      OBS: 'Evidência pendente de validação.'
    });
  });
}

export function buildDemoPayload(scenario: Scenario = 'saudavel') {
  const now = new Date();
  const colaboradores = Array.from({ length: 96 }, (_, idx) => employee(idx));
  const { programacoes, windows } = buildProgramacoes(colaboradores, now);

  const baseDocs = createBaseDocs(colaboradores, now);
  const docsByKey = new Map(baseDocs.map((doc) => [`${doc.COLABORADOR_ID}::${doc.TIPO_DOCUMENTO}`, doc]));
  applyScenarioPatches(scenario, docsByKey, windows);
  const documentacoes = Array.from(docsByKey.values());

  return {
    version: 1,
    importedAt: now.toISOString(),
    dataset: { colaboradores, documentacoes, programacoes },
    metrics: {},
    colaboradores_minimos: buildMinimalCollaborators(colaboradores)
  };
}
