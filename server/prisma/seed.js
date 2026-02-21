import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_BCRYPT_ROUNDS = Number(process.env.SEED_BCRYPT_ROUNDS || 4);

const nomes = [
  'João',
  'Carlos',
  'Pedro',
  'Lucas',
  'Rafael',
  'Bruno',
  'Diego',
  'Felipe',
  'Gustavo',
  'Thiago',
  'Marcos',
  'André',
  'Renato',
  'Leandro',
  'Fernando',
];
const sobrenomes = [
  'Silva',
  'Santos',
  'Oliveira',
  'Souza',
  'Pereira',
  'Lima',
  'Ferreira',
  'Costa',
  'Rodrigues',
  'Almeida',
  'Barbosa',
  'Mendes',
];
const cargos = ['Pedreiro', 'Mestre de Obras', 'Engenheiro Civil', 'Eletricista', 'Técnico de Segurança'];
const bases = ['Base Macaé', 'Base Rio das Ostras', 'Base Campos'];

const vesselSeed = [
  { name: 'MV Atlântico Norte', type: 'PSV', client: 'Petrobras' },
  { name: 'OSV Vitória', type: 'OSRV', client: 'Equinor' },
  { name: 'P-76 Support', type: 'AHTS', client: 'Petrobras' },
  { name: 'Cidade de Niterói', type: 'Crew Boat', client: 'Subsea7' },
  { name: 'Rio Offshore I', type: 'Supply', client: 'Shell' },
  { name: 'Campos Explorer', type: 'Utility', client: 'TotalEnergies' },
];

const epiCatalogSeed = [
  { name: 'Capacete Classe B', code: 'EPI-001', ca: '12345', unit: 'UN', stockQty: 18, minStock: 12 },
  { name: 'Luva Vaqueta', code: 'EPI-002', ca: '12346', unit: 'PAR', stockQty: 80, minStock: 30 },
  { name: 'Óculos Incolor', code: 'EPI-003', ca: '12347', unit: 'UN', stockQty: 10, minStock: 12 },
  { name: 'Botina PVC', code: 'EPI-004', ca: '12348', unit: 'PAR', stockQty: 26, minStock: 20 },
  { name: 'Protetor Auricular Plug', code: 'EPI-005', ca: '12349', unit: 'PAR', stockQty: 15, minStock: 20 },
  { name: 'Respirador PFF2', code: 'EPI-006', ca: '12350', unit: 'UN', stockQty: 45, minStock: 25 },
  { name: 'Cinto Paraquedista', code: 'EPI-007', ca: '12351', unit: 'UN', stockQty: 7, minStock: 10 },
  { name: 'Talabarte Duplo', code: 'EPI-008', ca: '12352', unit: 'UN', stockQty: 14, minStock: 14 },
  { name: 'Macacão Antichama', code: 'EPI-009', ca: '12353', unit: 'UN', stockQty: 33, minStock: 20 },
  { name: 'Máscara de Solda', code: 'EPI-010', ca: '12354', unit: 'UN', stockQty: 6, minStock: 8 },
  { name: 'Avental Raspa', code: 'EPI-011', ca: '12355', unit: 'UN', stockQty: 12, minStock: 10 },
  { name: 'Luva Nitrílica', code: 'EPI-012', ca: '12356', unit: 'PAR', stockQty: 65, minStock: 25 },
  { name: 'Face Shield', code: 'EPI-013', ca: '12357', unit: 'UN', stockQty: 19, minStock: 15 },
  { name: 'Bota de Segurança', code: 'EPI-014', ca: '12358', unit: 'PAR', stockQty: 23, minStock: 18 },
  { name: 'Colete Refletivo', code: 'EPI-015', ca: '12359', unit: 'UN', stockQty: 11, minStock: 16 },
  { name: 'Perneira de Raspa', code: 'EPI-016', ca: '12360', unit: 'PAR', stockQty: 5, minStock: 9 },
  { name: 'Creme Protetor Solar', code: 'EPI-017', ca: '12361', unit: 'UN', stockQty: 40, minStock: 18 },
  { name: 'Capuz Balaclava', code: 'EPI-018', ca: '12362', unit: 'UN', stockQty: 9, minStock: 12 },
  { name: 'Detector de Gás Portátil', code: 'EPI-019', ca: '12363', unit: 'UN', stockQty: 8, minStock: 8 },
  { name: 'Lanterna Intrinsecamente Segura', code: 'EPI-020', ca: '12364', unit: 'UN', stockQty: 4, minStock: 7 },
];

const documentTypeDefaults = [
  { code: 'ASO', name: 'ASO', category: 'Médico', requiresExpiration: true },
  { code: 'CBSP', name: 'CBSP', category: 'Treinamento', requiresExpiration: true },
  { code: 'HUET', name: 'HUET', category: 'Treinamento', requiresExpiration: true },
  { code: 'NR-33', name: 'NR-33', category: 'NR', requiresExpiration: true },
  { code: 'NR-35', name: 'NR-35', category: 'NR', requiresExpiration: true },
  { code: 'NR-37', name: 'NR-37', category: 'NR', requiresExpiration: true },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const cpfDigit = (digits, startWeight) => {
  const total = digits.reduce((acc, number, index) => acc + number * (startWeight - index), 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const generateValidCpf = (usedCpfs) => {
  while (true) {
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const d1 = cpfDigit(base, 10);
    const d2 = cpfDigit([...base, d1], 11);
    const cpf = `${base.join('')}${d1}${d2}`;
    if (!usedCpfs.has(cpf)) {
      usedCpfs.add(cpf);
      return cpf;
    }
  }
};

const dateFromNow = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const randomDateWithin45Days = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - Math.floor(Math.random() * 45));
  return date;
};

export const runSeed = async () => {
  const usedCpfs = new Set();
  const employeesPayload = [];

  for (let index = 0; index < 65; index += 1) {
    const cpf = generateValidCpf(usedCpfs);
    const pinHash = await bcrypt.hash(cpf.slice(0, 4), SEED_BCRYPT_ROUNDS);
    employeesPayload.push({
      name:
        index === 0
          ? 'Jéssica Martins Tavares da Silva'
          : `${pick(nomes)} ${pick(sobrenomes)} ${pick(sobrenomes)}`,
      role: index === 0 ? 'Diretora de RH' : pick(cargos),
      email: index === 0 ? 'jessica@demo.com' : `colaborador${index}@demo.com`,
      cpf,
      phone: `552197${Math.floor(1000000 + Math.random() * 9000000)}`,
      base: pick(bases),
      accessPinHash: pinHash,
      accessPinUpdatedAt: new Date(),
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.dailyReport.deleteMany();
    await tx.serviceOrder.deleteMany();
    await tx.epiDelivery.deleteMany();
    await tx.financialRequest.deleteMany();
    await tx.deployment.deleteMany();
    await tx.document.deleteMany();
    await tx.employee.deleteMany();
    await tx.documentType.deleteMany();
    await tx.epiCatalog.deleteMany();
    await tx.vessel.deleteMany();

    await tx.documentType.createMany({
      data: documentTypeDefaults,
      skipDuplicates: true,
    });

    await tx.employee.createMany({ data: employeesPayload });
    await tx.vessel.createMany({ data: vesselSeed });
    await tx.epiCatalog.createMany({ data: epiCatalogSeed });

    const [employees, vessels, documentTypes, epiCatalog] = await Promise.all([
      tx.employee.findMany({ select: { id: true } }),
      tx.vessel.findMany({ select: { id: true } }),
      tx.documentType.findMany({ select: { id: true, code: true } }),
      tx.epiCatalog.findMany({ select: { id: true } }),
    ]);

    const employeeIds = employees.map((employee) => employee.id);
    const vesselIds = vessels.map((vessel) => vessel.id);
    const epiItemIds = epiCatalog.map((item) => item.id);
    const documentTypesByCode = Object.fromEntries(documentTypes.map((type) => [type.code, type.id]));
    const mandatoryDocCodes = ['ASO', 'CBSP', 'HUET', 'NR-33', 'NR-35', 'NR-37'];

    const shuffledEmployees = shuffle(employeeIds);
    const expiredEmployeeIds = new Set(shuffledEmployees.slice(0, 10));
    const expiringSoonEmployeeIds = new Set(shuffledEmployees.slice(10, 25));
    const expiringDuringDeploymentEmployeeIds = new Set(shuffledEmployees.slice(25, 35));
    const missingMandatoryEmployeeIds = new Set(shuffledEmployees.slice(35, 45));

    const onboardEmployees = [
      ...Array.from(expiringDuringDeploymentEmployeeIds),
      ...shuffle(employeeIds.filter((id) => !expiringDuringDeploymentEmployeeIds.has(id))).slice(0, 20),
    ];

    const deployments = [];

    for (let i = 0; i < 30; i += 1) {
      const startOffset = -pick([28, 24, 21, 18, 15, 12, 10, 8, 6, 4]);
      const endOffset = pick([4, 7, 10, 12, 15, 18, 21]);
      deployments.push({
        employeeId: onboardEmployees[i % onboardEmployees.length],
        vesselId: vesselIds[i % vesselIds.length],
        startDate: dateFromNow(startOffset),
        endDateExpected: dateFromNow(endOffset),
        endDateActual: null,
        notes: 'Mobilização em andamento - escala offshore.',
      });
    }

    for (let i = 0; i < 30; i += 1) {
      const startOffset = pick([2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 30]);
      const endOffset = startOffset + pick([7, 10, 14, 21]);
      deployments.push({
        employeeId: employeeIds[(i + 5) % employeeIds.length],
        vesselId: vesselIds[(i + 2) % vesselIds.length],
        startDate: dateFromNow(startOffset),
        endDateExpected: dateFromNow(endOffset),
        endDateActual: null,
        notes: 'Programado para próxima janela operacional.',
      });
    }

    for (let i = 0; i < 20; i += 1) {
      const startOffset = -pick([40, 36, 33, 30, 27, 24, 21, 18, 15]);
      const duration = pick([7, 10, 14]);
      const endOffset = startOffset + duration;
      deployments.push({
        employeeId: employeeIds[(i + 17) % employeeIds.length],
        vesselId: vesselIds[(i + 1) % vesselIds.length],
        startDate: dateFromNow(startOffset),
        endDateExpected: dateFromNow(endOffset),
        endDateActual: dateFromNow(endOffset + pick([0, 1, 2])),
        notes: 'Campanha concluída e desembarcado.',
      });
    }

    await tx.deployment.createMany({ data: deployments });

    const onboardDeployments = await tx.deployment.findMany({
      where: {
        endDateActual: null,
        startDate: { lte: new Date() },
        endDateExpected: { gte: new Date() },
        employeeId: { in: Array.from(expiringDuringDeploymentEmployeeIds) },
      },
      select: { employeeId: true, startDate: true, endDateExpected: true },
    });

    const onboardByEmployee = new Map(onboardDeployments.map((item) => [item.employeeId, item]));

    const documents = [];

    for (const employeeId of employeeIds) {
      const isMissing = missingMandatoryEmployeeIds.has(employeeId);
      const missingCode = isMissing ? mandatoryDocCodes[employeeId % mandatoryDocCodes.length] : null;
      const availableCodes = mandatoryDocCodes.filter((code) => code !== missingCode);
      const desiredCount = isMissing ? 5 : pick([3, 4, 5, 6]);
      const selectedCodes = shuffle(availableCodes).slice(0, desiredCount);

      const forceCode = expiredEmployeeIds.has(employeeId)
        ? 'ASO'
        : expiringSoonEmployeeIds.has(employeeId)
          ? 'NR-35'
          : expiringDuringDeploymentEmployeeIds.has(employeeId)
            ? 'CBSP'
            : null;

      if (forceCode && !selectedCodes.includes(forceCode) && availableCodes.includes(forceCode)) {
        selectedCodes[selectedCodes.length - 1] = forceCode;
      }

      for (const code of selectedCodes) {
        const issueDate = dateFromNow(-pick([280, 240, 210, 180, 150, 120, 90]));
        let expirationDate = dateFromNow(pick([30, 45, 60, 90, 120, 180, 240]));

        if (expiredEmployeeIds.has(employeeId) && code === 'ASO') {
          expirationDate = dateFromNow(-pick([30, 45, 60, 90]));
        }

        if (expiringSoonEmployeeIds.has(employeeId) && code === 'NR-35') {
          expirationDate = dateFromNow(pick([2, 5, 8, 10, 12, 14]));
        }

        if (expiringDuringDeploymentEmployeeIds.has(employeeId) && code === 'CBSP') {
          const deployment = onboardByEmployee.get(employeeId);
          if (deployment?.startDate && deployment?.endDateExpected) {
            const start = new Date(deployment.startDate);
            const end = new Date(deployment.endDateExpected);
            const durationMs = end.getTime() - start.getTime();
            expirationDate = new Date(start.getTime() + Math.max(1, Math.floor(durationMs / 2)));
          }
        }

        documents.push({
          employeeId,
          documentTypeId: documentTypesByCode[code],
          issueDate,
          expirationDate,
          fileUrl: `https://files.demo.local/documents/${employeeId}-${code}.pdf`,
          evidenceType: 'upload',
          evidenceRef: `DOC-${employeeId}-${code}`,
          notes: 'Documento de compliance para operação offshore.',
          verified: Math.random() > 0.2,
          verifiedBy: 'RH Demo',
          verifiedAt: new Date(),
        });
      }
    }

    await tx.document.createMany({ data: documents, skipDuplicates: true });

    const epiDeliveries = Array.from({ length: 120 }, (_, index) => ({
      employeeId: employeeIds[index % employeeIds.length],
      epiItemId: epiItemIds[index % epiItemIds.length],
      deliveryDate: dateFromNow(-pick([1, 2, 3, 5, 7, 10, 14, 20, 25, 30, 40])),
      quantity: pick([1, 1, 1, 2, 2, 3]),
      signatureUrl:
        index < 60 ? null : `https://signatures.demo.local/epi/${employeeIds[index % employeeIds.length]}-${index}.png`,
    }));

    await tx.epiDelivery.createMany({ data: epiDeliveries });

    const financialRequests = Array.from({ length: 90 }, (_, index) => ({
      employeeId: employeeIds[(index * 3) % employeeIds.length],
      type: pick(['Reembolso', 'Adiantamento']),
      amount: Number((50 + Math.random() * 3950).toFixed(2)),
      description: `Solicitação financeira #${index + 1} para despesas operacionais.`,
      status: pick(['Solicitado', 'Aprovado', 'Rejeitado', 'Pago']),
      createdAt: dateFromNow(-pick([0, 1, 2, 3, 5, 7, 10, 12, 15, 20, 25, 30])),
    }));

    await tx.financialRequest.createMany({ data: financialRequests });

    const serviceOrders = Array.from({ length: 150 }, (_, index) => ({
      employeeId: employeeIds[index % employeeIds.length],
      vesselId: vesselIds[index % vesselIds.length],
      osNumber: `OS-${30000 + index}`,
      title: `OS ${index + 1} - Frente Offshore`,
      description: 'Execução de atividade de campo e registro diário de obra em altura.',
      priority: pick(['BAIXA', 'MEDIA', 'ALTA']),
      openedAt: randomDateWithin45Days(),
      approvalStatus: index % 4 === 0 ? 'Pendente' : 'Aprovado',
      status: pick(['OPEN', 'IN_PROGRESS', 'CONCLUDED']),
    }));

    const dailyReports = Array.from({ length: 150 }, (_, index) => ({
      employeeId: employeeIds[(index * 2) % employeeIds.length],
      reportDate: randomDateWithin45Days(),
      description: `RDO diário ${index + 1}`,
      hoursWorked: 8,
      approvalStatus: index % 3 === 0 ? 'Pendente' : 'Aprovado',
      approvedBy: index % 3 === 0 ? null : 'RH',
    }));

    await tx.serviceOrder.createMany({ data: serviceOrders });
    await tx.dailyReport.createMany({ data: dailyReports });

    return {
      ok: true,
      employees: employeesPayload.length,
      vessels: vesselSeed.length,
      deployments: deployments.length,
      documents: documents.length,
      epiDeliveries: epiDeliveries.length,
      financialRequests: financialRequests.length,
      serviceOrders: serviceOrders.length,
      dailyReports: dailyReports.length,
    };
  });

  return result;
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then((result) => {
      console.log('✅ Seed executado:', result);
    })
    .catch((error) => {
      console.error('❌ Falha no seed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
