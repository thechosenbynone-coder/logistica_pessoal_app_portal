import { buildMinimalCollaborators } from './portalXlsxImporter';

type Scenario = 'saudavel' | 'risco' | 'critico';

const SCENARIO_RISK: Record<Scenario, number> = {
  saudavel: 0.2,
  risco: 0.35,
  critico: 0.5
};

const UNIDADES = [
  'MODEC - MV26',
  'MODEC - MV27',
  'MODEC - MV28',
  'MODEC - MV30',
  'SBM - Tamandaré',
  'Transocean - Unidade Atlântica (demo)',
  'Transocean - Unidade Boreal (demo)'
];

const BASES = ['Macaé', 'Rio das Ostras', 'Niterói'];
const FUNCOES = ['Técnico de Segurança', 'Supervisor Offshore', 'Operador de Guindaste', 'Mecânico', 'Enfermeiro'];
const DOC_TYPES = ['ASO', 'CBSP', 'T-HUET', 'NR-10', 'NR-33'];
const PROG_STATUS = ['Planejado', 'Confirmado', 'Em andamento', 'Finalizado'];

function shiftDays(base: Date, days: number): string {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
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

function buildDocs(colaboradores: any[], scenario: Scenario) {
  const now = new Date();
  const riskRatio = SCENARIO_RISK[scenario];
  return colaboradores.flatMap((colab, idx) => {
    const isRisk = idx % 10 < Math.round(riskRatio * 10);
    return DOC_TYPES.map((tipo, docIdx) => {
      const riskDoc = isRisk && docIdx % 2 === 0;
      const vencimentoOffset = riskDoc ? -((idx + docIdx) % 12) : 20 + ((idx + docIdx) % 90);
      const emissaoOffset = vencimentoOffset - 180;
      return {
        COLABORADOR_ID: colab.COLABORADOR_ID,
        TIPO_DOCUMENTO: tipo,
        DATA_EMISSAO: shiftDays(now, emissaoOffset),
        DATA_VENCIMENTO: shiftDays(now, vencimentoOffset),
        EVIDENCIA_TIPO: 'UPLOAD',
        EVIDENCIA_REF: `doc_${colab.COLABORADOR_ID}_${tipo}.pdf`,
        OBS: riskDoc ? 'Renovação necessária' : '',
        VERIFIED: !riskDoc,
        VERIFIED_BY: !riskDoc ? 'Auditoria Demo' : '',
        VERIFIED_AT: !riskDoc ? shiftDays(now, -5) : ''
      };
    });
  });
}

function getLocalAtual(embarqueISO: string, desembarqueISO: string, now = new Date()) {
  const embarque = new Date(embarqueISO);
  const desembarque = new Date(desembarqueISO);
  const janelaHospedagem = new Date(embarque);
  janelaHospedagem.setDate(janelaHospedagem.getDate() - 1);
  if (now >= embarque && now <= desembarque) return 'Embarcado';
  if (now >= janelaHospedagem && now < embarque) return 'Hospedado';
  return 'Base';
}

function buildCartao(embarqueISO: string, idx: number) {
  const apresentacao = new Date(embarqueISO);
  apresentacao.setHours(apresentacao.getHours() - 4);
  return {
    codigo: `DEMO-CART-${String(idx + 1).padStart(4, '0')}`,
    apresentacao_dt: apresentacao.toISOString(),
    roteiro: ['Base', 'Aeroporto', 'Heliponto', 'Unidade'],
    contato: '(22) 98888-0000',
    observacoes: 'Documento com foto obrigatório.'
  };
}

function buildProgramacoes(colaboradores: any[]) {
  const now = new Date();
  return UNIDADES.slice(0, 4).map((unidade, idx) => {
    const embarque = shiftDays(now, idx * 3 - 6);
    const desembarque = shiftDays(new Date(embarque), 14);
    const escalados = colaboradores.slice(idx * 8, idx * 8 + 12).map((colab, escIdx) => ({
      COLABORADOR_ID: colab.COLABORADOR_ID,
      LOCAL_ATUAL: getLocalAtual(embarque, desembarque),
      PASSAGEM_STATUS: ['Planejada', 'Confirmada', 'Emitida'][escIdx % 3],
      CARTAO_EMBARQUE_REF: '',
      CARTAO_EMBARQUE: buildCartao(embarque, idx * 12 + escIdx),
      OBS: escIdx % 5 === 0 ? 'Checar integração' : ''
    }));

    return {
      PROG_ID: `DEMO-PROG-${idx + 1}`,
      UNIDADE: unidade,
      BASE: BASES[idx % BASES.length],
      EMBARQUE_DT: embarque,
      DESEMBARQUE_DT: desembarque,
      STATUS: PROG_STATUS[idx % PROG_STATUS.length],
      NOTES: 'Janela planejada para operação demo',
      COLABORADORES: escalados
    };
  });
}

export function buildDemoPayload(scenario: Scenario = 'saudavel') {
  const colaboradores = Array.from({ length: 96 }, (_, idx) => employee(idx));
  const documentacoes = buildDocs(colaboradores, scenario);
  const programacoes = buildProgramacoes(colaboradores);

  return {
    version: 1,
    importedAt: new Date().toISOString(),
    dataset: { colaboradores, documentacoes, programacoes },
    metrics: {},
    colaboradores_minimos: buildMinimalCollaborators(colaboradores)
  };
}
