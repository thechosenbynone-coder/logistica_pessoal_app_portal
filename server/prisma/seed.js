import dotenv from 'dotenv';
import { PrismaClient, TransportType, DeploymentStatus, DocStatus, ExpenseStatus, AdvanceStatus, AssetStatus } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'joao.silva@example.com';
  const registration = '12345';
  const cpf = '123.456.789-00';

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'João Silva',
      registration,
      cpf,
      photoUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D47A1&color=fff&size=128'
    },
    create: {
      name: 'João Silva',
      registration,
      email,
      cpf,
      passwordHash: 'DEV_ONLY',
      role: 'COLLABORATOR',
      photoUrl: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D47A1&color=fff&size=128',
    }
  });

  // Create one scheduled deployment + some completed deployments
  // First, clean old demo data for this user (optional)
  await prisma.checkIn.deleteMany({ where: { userId: user.id } });
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.advanceRequest.deleteMany({ where: { userId: user.id } });
  await prisma.deployment.deleteMany({ where: { userId: user.id } });
  await prisma.userDocument.deleteMany({ where: { userId: user.id } });
  await prisma.assetAssignment.deleteMany({ where: { userId: user.id } });

  const deploymentCurrent = await prisma.deployment.create({
    data: {
      userId: user.id,
      destination: 'Plataforma P-74',
      location: 'Bacia de Campos - RJ',
      embarkDate: new Date('2026-01-18T09:30:00.000Z'),
      disembarkDate: new Date('2026-02-01T17:00:00.000Z'),
      transportType: TransportType.HELICOPTER,
      flightInfo: 'HEL-458',
      status: DeploymentStatus.SCHEDULED,
      qrCodeData: 'SECURE_TOKEN_V1_748291_HMAC_SIG'
    }
  });

  const deploymentPrev = await prisma.deployment.createMany({
    data: [
      {
        userId: user.id,
        destination: 'Plataforma P-62',
        location: 'Bacia de Campos - RJ',
        embarkDate: new Date('2025-12-20T09:30:00.000Z'),
        disembarkDate: new Date('2026-01-03T17:00:00.000Z'),
        transportType: TransportType.HELICOPTER,
        flightInfo: 'HEL-322',
        status: DeploymentStatus.COMPLETED
      },
      {
        userId: user.id,
        destination: 'FPSO P-70',
        location: 'Bacia de Santos - SP',
        embarkDate: new Date('2025-11-22T09:30:00.000Z'),
        disembarkDate: new Date('2025-12-06T17:00:00.000Z'),
        transportType: TransportType.BOAT,
        flightInfo: null,
        status: DeploymentStatus.COMPLETED
      },
      {
        userId: user.id,
        destination: 'Plataforma P-58',
        location: 'Bacia de Campos - RJ',
        embarkDate: new Date('2025-10-25T09:30:00.000Z'),
        disembarkDate: new Date('2025-11-08T17:00:00.000Z'),
        transportType: TransportType.HELICOPTER,
        flightInfo: 'HEL-201',
        status: DeploymentStatus.COMPLETED
      },
      {
        userId: user.id,
        destination: 'Plataforma P-74',
        location: 'Bacia de Campos - RJ',
        embarkDate: new Date('2025-09-27T09:30:00.000Z'),
        disembarkDate: new Date('2025-10-11T17:00:00.000Z'),
        transportType: TransportType.HELICOPTER,
        flightInfo: 'HEL-167',
        status: DeploymentStatus.COMPLETED
      }
    ]
  });

  // Documents
  await prisma.userDocument.createMany({
    data: [
      {
        userId: user.id,
        name: 'RG',
        number: '12.345.678-9',
        issueDate: new Date('2020-03-15T00:00:00.000Z'),
        expiryDate: null,
        status: DocStatus.VALID
      },
      {
        userId: user.id,
        name: 'CPF',
        number: cpf,
        issueDate: new Date('2000-01-10T00:00:00.000Z'),
        expiryDate: null,
        status: DocStatus.VALID
      },
      {
        userId: user.id,
        name: 'CNH',
        number: '12345678900',
        issueDate: new Date('2021-06-20T00:00:00.000Z'),
        expiryDate: new Date('2026-06-20T00:00:00.000Z'),
        status: DocStatus.VALID
      },
      {
        userId: user.id,
        name: 'ASO',
        number: 'ASO-2024-001',
        issueDate: new Date('2026-01-10T00:00:00.000Z'),
        expiryDate: new Date('2026-07-10T00:00:00.000Z'),
        status: DocStatus.VALID
      },
      {
        userId: user.id,
        name: 'NR-35 (Trabalho em Altura)',
        number: 'NR35-2024-456',
        issueDate: new Date('2024-02-05T00:00:00.000Z'),
        expiryDate: new Date('2026-02-05T00:00:00.000Z'),
        status: DocStatus.WARNING
      },
      {
        userId: user.id,
        name: 'NR-10 (Segurança Elétrica)',
        number: 'NR10-2023-789',
        issueDate: new Date('2023-12-15T00:00:00.000Z'),
        expiryDate: new Date('2025-12-15T00:00:00.000Z'),
        status: DocStatus.EXPIRED
      }
    ]
  });

  // Assets / EPIs
  await prisma.assetAssignment.createMany({
    data: [
      { userId: user.id, name: 'Capacete de Segurança', code: 'EPI-001', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Óculos de Proteção', code: 'EPI-002', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Luvas de Segurança', code: 'EPI-003', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Botina com Biqueira', code: 'EPI-004', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Protetor Auricular', code: 'EPI-005', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Cinto de Segurança', code: 'EPI-006', isRequired: true, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Talabarte', code: 'EPI-007', isRequired: false, condition: 'novo', status: AssetStatus.ON_BASE },
      { userId: user.id, name: 'Notebook Dell', code: 'EQP-101', isRequired: false, condition: 'bom', status: AssetStatus.ON_BOARD },
      { userId: user.id, name: 'Tablet Samsung', code: 'EQP-102', isRequired: false, condition: 'bom', status: AssetStatus.ON_BASE }
    ]
  });

  // Advances
  await prisma.advanceRequest.createMany({
    data: [
      {
        userId: user.id,
        deploymentId: deploymentCurrent.id,
        value: 500.0,
        justification: 'Despesas iniciais de viagem',
        status: AdvanceStatus.APPROVED,
        paidAt: new Date('2026-01-10T12:00:00.000Z')
      },
      {
        userId: user.id,
        deploymentId: deploymentCurrent.id,
        value: 300.0,
        justification: 'Reforço de caixa',
        status: AdvanceStatus.PAID,
        paidAt: new Date('2025-12-20T12:00:00.000Z')
      }
    ]
  });

  // Expenses
  await prisma.expense.createMany({
    data: [
      {
        userId: user.id,
        deploymentId: deploymentCurrent.id,
        type: 'Alimentação',
        value: 85.5,
        date: new Date('2026-01-15T00:00:00.000Z'),
        description: 'Restaurante',
        receiptUrl: 'https://example.com/receipt-1.jpg',
        status: ExpenseStatus.APPROVED
      },
      {
        userId: user.id,
        deploymentId: deploymentCurrent.id,
        type: 'Transporte',
        value: 45.0,
        date: new Date('2026-01-15T00:00:00.000Z'),
        description: 'Táxi',
        receiptUrl: 'https://example.com/receipt-2.jpg',
        status: ExpenseStatus.PENDING
      },
      {
        userId: user.id,
        deploymentId: deploymentCurrent.id,
        type: 'Hospedagem',
        value: 220.0,
        date: new Date('2026-01-14T00:00:00.000Z'),
        description: 'Hotel',
        receiptUrl: 'https://example.com/receipt-3.jpg',
        status: ExpenseStatus.APPROVED
      }
    ]
  });

  console.log('Seed completo! UserId:', user.id, 'Deployment atual:', deploymentCurrent.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
