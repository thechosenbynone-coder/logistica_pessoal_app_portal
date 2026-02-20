import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const nomes = ['João', 'Carlos', 'Pedro', 'Lucas', 'Rafael', 'Bruno', 'Diego', 'Felipe', 'Gustavo', 'Thiago'];
const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Ferreira', 'Costa'];
const cargos = ['Pedreiro', 'Mestre de Obras', 'Engenheiro Civil', 'Eletricista', 'Técnico de Segurança'];
const bases = ['Base Macaé', 'Base Rio das Ostras', 'Base Campos'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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

const randomDateWithin45Days = () => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 45));
  return date;
};

export const runSeed = async () => {
  const usedCpfs = new Set();
  const pinHash = await bcrypt.hash('1234', 10);

  await prisma.$transaction(async (tx) => {
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
      data: [
        { code: 'ASO', name: 'ASO', category: 'Médico', requiresExpiration: true },
        { code: 'CBSP', name: 'CBSP', category: 'Treinamento', requiresExpiration: true },
        { code: 'HUET', name: 'HUET', category: 'Treinamento', requiresExpiration: true },
        { code: 'NR-33', name: 'NR-33', category: 'NR', requiresExpiration: true },
        { code: 'NR-35', name: 'NR-35', category: 'NR', requiresExpiration: true },
        { code: 'NR-37', name: 'NR-37', category: 'NR', requiresExpiration: true },
      ],
      skipDuplicates: true,
    });
  });

  const employeesPayload = [
    {
      name: 'Jéssica Martins Tavares da Silva',
      role: 'Diretora de RH',
      email: 'jessica@demo.com',
      cpf: generateValidCpf(usedCpfs),
      phone: `552197${Math.floor(1000000 + Math.random() * 9000000)}`,
      base: pick(bases),
      accessPinHash: pinHash,
      accessPinUpdatedAt: new Date(),
    },
  ];

  for (let index = 0; index < 64; index += 1) {
    employeesPayload.push({
      name: `${pick(nomes)} ${pick(sobrenomes)} ${pick(sobrenomes)}`,
      role: pick(cargos),
      email: `colaborador${index + 1}@demo.com`,
      cpf: generateValidCpf(usedCpfs),
      phone: `552197${Math.floor(1000000 + Math.random() * 9000000)}`,
      base: pick(bases),
      accessPinHash: pinHash,
      accessPinUpdatedAt: new Date(),
    });
  }

  await prisma.employee.createMany({ data: employeesPayload });

  const employees = await prisma.employee.findMany({ select: { id: true } });
  const employeeIds = employees.map((employee) => employee.id);

  const serviceOrders = Array.from({ length: 150 }, (_, index) => ({
    employeeId: pick(employeeIds),
    osNumber: `OS-${20000 + index}`,
    title: `RDO ${index + 1} - Frente Offshore`,
    description: 'Execução de atividade de campo e registro diário de obra em altura.',
    priority: pick(['BAIXA', 'MEDIA', 'ALTA']),
    openedAt: randomDateWithin45Days(),
    approvalStatus: index % 4 === 0 ? 'PENDING' : 'APPROVED',
    status: pick(['OPEN', 'IN_PROGRESS', 'CONCLUDED']),
  }));

  const dailyReports = Array.from({ length: 150 }, (_, index) => ({
    employeeId: pick(employeeIds),
    reportDate: randomDateWithin45Days(),
    description: `RDO diário ${index + 1}`,
    hoursWorked: 8,
    approvalStatus: index % 3 === 0 ? 'Pendente' : 'Aprovado',
    approvedBy: index % 3 === 0 ? null : 'RH',
  }));

  await prisma.serviceOrder.createMany({ data: serviceOrders });
  await prisma.dailyReport.createMany({ data: dailyReports });

  return {
    ok: true,
    employees: employeesPayload.length,
    serviceOrders: serviceOrders.length,
    dailyReports: dailyReports.length,
  };
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
