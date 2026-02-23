import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './prismaClient.js';

const [, , employeeIdArg, pinArg] = process.argv;

const usage = () => {
  console.error('Uso: npm run set-pin -- <employeeId> <pin>');
  console.error('Exemplo: npm run set-pin -- 1 1234');
};

const main = async () => {
  const employeeId = Number(employeeIdArg);
  const pin = String(pinArg || '').trim();

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    usage();
    process.exit(1);
  }

  if (!/^\d{4,12}$/.test(pin)) {
    console.error('PIN inválido. Use apenas dígitos (4 a 12).');
    process.exit(1);
  }

  const hash = await bcrypt.hash(pin, 10);
  const result = await prisma.employee.updateMany({
    where: { id: employeeId },
    data: { accessPinHash: hash, accessPinUpdatedAt: new Date() },
  });

  if (result.count === 0) {
    console.error('Colaborador não encontrado.');
    process.exit(1);
  }

  console.log(`PIN atualizado com sucesso para employee_id=${employeeId}`);
};

main()
  .catch((error) => {
    console.error('Erro ao atualizar PIN:', error?.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
