import { buildMinimalCollaborators } from './portalXlsxImporter';

type Scenario = 'saudavel' | 'risco' | 'critico';

type DocProfile = 'apto' | 'atencao' | 'nao_apto' | 'troca_p1_p2' | 'troca_p2_p3';

const UNIDADES = ['MODEC - MV26', 'MODEC - MV27', 'MODEC - MV28', 'SBM - Tamandaré'];
const BASES = ['Macaé', 'Rio das Ostras', 'Niterói'];
const FUNCOES = ['Técnico de Segurança', 'Supervisor Offshore', 'Operador de Guindaste', 'Mecânico', 'Enfermeiro'];
const DOC_TYPES = ['ASO', 'CBSP', 'HUET', 'NR-33', 'NR-35'];

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
  const p4Embarque = shiftDays(now, -20);
  const p4Desembarque = shiftDays(now, -15);

  const p1Embarque = shiftDays(now, -2);
  const p1Desembarque = shiftDays(now, 1);

  const p2Embarque = shiftDays(now, 2);
  const p2Desembarque = shiftDays(now, 5);

  const p3Embarque = shiftDays(now, 9);
  const p3Desembarque = shiftDays(now, 12);

  return {
    p1: { embarque: p1Embarque, desembarque: p1Desembarque },
    p2: { embarque: p2Embarque, desembarque: p2Desembarque },
    p3: { embarque: p3Embarque, desembarque: p3Desembarque },
    p4: { embarque: p4Embarque, desembarque: p4Desembarque }
  };
}

function resolveProfile(index: number): DocProfile {
  if ([2, 9, 14].includes(index + 1)) return 'nao_apto';
  if ([7, 8, 11].includes(index + 1)) return 'troca_p1_p2';
  if ([13, 18].includes(index + 1)) return 'troca_p2_p3';
  if ([3, 4, 5, 10, 15, 16, 17].includes(index + 1)) return 'atencao';
  return 'apto';
}

function buildDocs(colaboradores: any[], now: Date) {
  return colaboradores.flatMap((colab, idx) => {
    const profile = resolveProfile(idx);

    return DOC_TYPES.map((tipo) => {
      let vencimentoOffsetDays = 120;

      if (profile === 'nao_apto' && tipo === 'ASO') vencimentoOffsetDays = -1;
      if (profile === 'atencao' && tipo === 'CBSP') vencimentoOffsetDays = 3;
      if (profile === 'troca_p1_p2' && tipo === 'NR-35') vencimentoOffsetDays = 1.6;
      if (profile === 'troca_p2_p3' && tipo === 'HUET') vencimentoOffsetDays = 7;

      const dataVencimento = shiftHours(now, vencimentoOffsetDays * 24);
      const isPendingEvidence = profile === 'atencao' && ['CBSP', 'NR-33'].includes(tipo);

      return {
        COLABORADOR_ID: colab.COLABORADOR_ID,
        TIPO_DOCUMENTO: tipo,
        DATA_EMISSAO: shiftDays(now, -180),
        DATA_VENCIMENTO: dataVencimento,
        EVIDENCIA_TIPO: 'UPLOAD',
        EVIDENCIA_REF: `doc_${colab.COLABORADOR_ID}_${tipo}.pdf`,
        OBS: profile !== 'apto' ? 'Atenção em janela operacional' : '',
        VERIFIED: !isPendingEvidence,
        VERIFIED_BY: !isPendingEvidence ? 'Auditoria Demo' : '',
        VERIFIED_AT: !isPendingEvidence ? shiftDays(now, -5) : ''
      };
    });
  });
}

function buildMember(employeeId: string, stage: string, now: Date, noShow = false) {
  const isHotel = stage === 'Hotel';
  const isEmbarcado = stage === 'Embarcado';
  const isVoo = stage === 'Voo';
  const localAtual = isHotel ? 'Hospedado' : isEmbarcado ? 'Embarcado' : 'Base';

  return {
    COLABORADOR_ID: employeeId,
    LOCAL_ATUAL: localAtual,
    PASSAGEM_STATUS: isVoo || isEmbarcado ? 'Emitida' : 'Comprada',
    CARTAO_EMBARQUE_REF: '',
    OBS: noShow ? 'No-show no deslocamento' : '',
    JORNADA: {
      STAGE: stage,
      HOTEL_NOME: isHotel ? 'Hotel Atlântico' : '',
      HOTEL_CIDADE: isHotel ? 'Macaé' : '',
      CHECKIN_HOTEL_AT: isHotel ? shiftHours(now, -6) : '',
      CHECKIN_HELIPORTO_AT: stage === 'Check-in Heliporto' || isEmbarcado ? shiftHours(now, -2) : '',
      NO_SHOW: noShow
    }
  };
}

function buildProgramacoes(colaboradores: any[], now: Date) {
  const dates = buildProgramDates(now);
  const byId = new Map(colaboradores.map((c) => [c.COLABORADOR_ID, c]));
  const mk = (idNum: number) => `D${String(idNum).padStart(4, '0')}`;

  const p1Ids = Array.from({ length: 12 }, (_, i) => mk(i + 1));
  const p2Ids = Array.from({ length: 12 }, (_, i) => mk(i + 7));
  const p3Ids = Array.from({ length: 12 }, (_, i) => mk(i + 13));
  const p4Ids = Array.from({ length: 10 }, (_, i) => mk(i + 1));

  const p1Members = p1Ids
    .filter((id) => byId.has(id))
    .map((id, idx) => {
      const stage = ['Embarcado', 'Hotel', 'Hotel', 'Check-in Heliporto', 'Hotel', 'Casa'][idx % 6];
      const noShow = idx === 9 || idx === 10;
      return buildMember(id, stage, now, noShow);
    });

  const p2Members = p2Ids
    .filter((id) => byId.has(id))
    .map((id, idx) => buildMember(id, ['Casa', 'Voo', 'Hotel', 'Check-in Heliporto'][idx % 4], now));

  const p3Members = p3Ids
    .filter((id) => byId.has(id))
    .map((id, idx) => buildMember(id, ['Casa', 'Voo', 'Casa', 'Hotel'][idx % 4], now));

  const p4Members = p4Ids
    .filter((id) => byId.has(id))
    .map((id, idx) => buildMember(id, idx % 2 === 0 ? 'Embarcado' : 'Casa', now));

  return [
    {
      PROG_ID: 'DEMO-PROG-1',
      UNIDADE: UNIDADES[0],
      BASE: BASES[0],
      EMBARQUE_DT: dates.p1.embarque,
      DESEMBARQUE_DT: dates.p1.desembarque,
      STATUS: 'Em andamento',
      NOTES: 'Turma em andamento com casos de risco operacional.',
      COLABORADORES: p1Members
    },
    {
      PROG_ID: 'DEMO-PROG-2',
      UNIDADE: UNIDADES[1],
      BASE: BASES[1],
      EMBARQUE_DT: dates.p2.embarque,
      DESEMBARQUE_DT: dates.p2.desembarque,
      STATUS: 'Confirmado',
      NOTES: 'Embarque confirmado para as próximas 24-48h.',
      COLABORADORES: p2Members
    },
    {
      PROG_ID: 'DEMO-PROG-3',
      UNIDADE: UNIDADES[2],
      BASE: BASES[2],
      EMBARQUE_DT: dates.p3.embarque,
      DESEMBARQUE_DT: dates.p3.desembarque,
      STATUS: 'Planejado',
      NOTES: 'Planejamento da próxima janela (7-10 dias).',
      COLABORADORES: p3Members
    },
    {
      PROG_ID: 'DEMO-PROG-4',
      UNIDADE: UNIDADES[3],
      BASE: BASES[0],
      EMBARQUE_DT: dates.p4.embarque,
      DESEMBARQUE_DT: dates.p4.desembarque,
      STATUS: 'Finalizado',
      NOTES: 'Programação encerrada para histórico.',
      COLABORADORES: p4Members
    }
  ];
}

export function buildDemoPayload(scenario: Scenario = 'saudavel') {
  void scenario;
  const now = new Date();
  const colaboradores = Array.from({ length: 40 }, (_, idx) => employee(idx));
  const documentacoes = buildDocs(colaboradores, now);
  const programacoes = buildProgramacoes(colaboradores, now);

  return {
    version: 1,
    importedAt: now.toISOString(),
    dataset: { colaboradores, documentacoes, programacoes },
    metrics: {},
    colaboradores_minimos: buildMinimalCollaborators(colaboradores)
  };
}
