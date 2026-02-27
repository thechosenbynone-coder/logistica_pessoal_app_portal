import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const [,, username, password, name] = process.argv;

if (!username || !password || !name) {
  console.error('Uso: node src/scripts/createPortalUser.js <username> <senha> <nome>');
  console.error('Exemplo: node src/scripts/createPortalUser.js jessica minhasenha "Jéssica Lima"');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

try {
  const user = await prisma.portalUser.upsert({
    where: { username: username.toLowerCase() },
    update: { passwordHash, name, active: true },
    create: { username: username.toLowerCase(), passwordHash, name, role: 'admin' },
  });
  console.log(`✓ Usuário "${user.username}" criado/atualizado com sucesso. ID: ${user.id}`);
} catch (error) {
  console.error('Erro ao criar usuário:', error.message);
} finally {
  await prisma.$disconnect();
}
