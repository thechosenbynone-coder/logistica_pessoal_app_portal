const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando banco SQLite para espelhar o Dashboard...')

  // Limpeza segura
  try {
    await prisma.expense.deleteMany()
    await prisma.timeSheet.deleteMany()
    await prisma.userDocument.deleteMany()
    await prisma.deployment.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  } catch (e) { console.log('Banco novo ou erro de limpeza ignorado.') }

  // 1. Criar as Plataformas (Para os gráficos de distribuição)
  const p70 = await prisma.project.create({ data: { name: 'P-70' } })
  const p75 = await prisma.project.create({ data: { name: 'P-75' } })
  const base = await prisma.project.create({ data: { name: 'Base Macaé' } })

  // 2. Criar Colaboradores em P-70 (10 pessoas)
  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        name: `Operador P70-${i}`,
        email: `p70.${i}@demo.com`,
        registration: `MAT-70${i}`,
        role: 'COLLABORATOR',
        deployments: {
          create: { projectId: p70.id, destination: 'P-70', embarkDate: new Date(), status: 'ONBOARD' }
        }
      }
    })
  }

  // 3. Criar Colaboradores em P-75 (5 pessoas)
  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        name: `Técnico P75-${i}`,
        email: `p75.${i}@demo.com`,
        registration: `MAT-75${i}`,
        role: 'COLLABORATOR',
        deployments: {
          create: { projectId: p75.id, destination: 'P-75', embarkDate: new Date(), status: 'ONBOARD' }
        }
      }
    })
  }

  // 4. Criar o Caso de Alerta (Compliance)
  const userRisco = await prisma.user.create({
    data: {
      name: 'João da Silva (Risco)',
      email: 'risco@demo.com',
      registration: 'MAT-999',
      jobTitle: 'Soldador N1'
    }
  })

  // Documento VENCIDO (Gera alerta no dashboard)
  await prisma.userDocument.create({
    data: {
      userId: userRisco.id,
      name: 'CBSP',
      expiryDate: new Date('2023-01-01'), // Data no passado
      status: 'EXPIRED'
    }
  })

  console.log('✅ Banco SQLite populado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
