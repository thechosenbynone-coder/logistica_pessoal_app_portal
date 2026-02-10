import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- Geradores de Dados Aleatórios ---
const primeirosNomes = ["Carlos", "Ana", "Paulo", "Fernanda", "Lucas", "Mariana", "Roberto", "Juliana", "Marcos", "Beatriz", "Ricardo", "Camila", "Jorge", "Larissa", "Miguel", "Sofia", "Rodrigo", "Patrícia", "André", "Cristina", "Bruno", "Aline", "Gustavo", "Eliane"]
const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Alves", "Carvalho", "Mendes", "Ribeiro"]
const cargos = ["Soldador N1", "Soldador N2", "Pintor Industrial", "Caldeireiro", "Eletricista", "Téc. Segurança", "Alpinista N1", "Rádio Operador", "Supervisor de Convés"]

const random = (arr) => arr[Math.floor(Math.random() * arr.length)]
const gerarNome = () => `${random(primeirosNomes)} ${random(sobrenomes)}`

async function main() {
  console.log('🚀 Iniciando Seed Avançado (100 Colaboradores + Lógica de Turnaround)...')

  // 1. Limpeza de Dados Antigos
  try {
    await prisma.expense.deleteMany()
    await prisma.timeSheet.deleteMany()
    await prisma.userDocument.deleteMany()
    await prisma.deployment.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  } catch (e) {}

  // 2. Criar Plataformas
  const p70 = await prisma.project.create({ data: { name: 'P-70 (Petrobras)' } })
  const p75 = await prisma.project.create({ data: { name: 'P-75 (Petrobras)' } })
  const arraial = await prisma.project.create({ data: { name: 'UMS Cidade de Arraial' } })
  const base = await prisma.project.create({ data: { name: 'Base Operacional Macaé' } })

  const projetos = [p70, p75, arraial]

  // =========================================================================
  // CENÁRIO 1: O DOCUMENTO VENCE *DURANTE* O EMBARQUE
  // (O seu código documentationUtils.js deteta isto como 'VENCE_DURANTE')
  // =========================================================================
  console.log('⚠️ Gerando Caso: Vence Durante o Embarque...')
  const userDurante = await prisma.user.create({
    data: {
      name: '[DEMO] Marcos Vence-A-Bordo',
      email: 'durante@demo.com',
      registration: 'MAT-DURANTE',
      role: 'COLLABORATOR',
      jobTitle: 'Supervisor de Convés',
      deployments: {
        create: {
          projectId: p70.id,
          destination: 'P-70 (Petrobras)',
          embarkDate: new Date(), // Embarca hoje
          disembarkDate: new Date(new Date().setDate(new Date().getDate() + 28)), // Fica 28 dias
          status: 'ONBOARD'
        }
      }
    }
  })
  // O documento vence daqui a 14 dias (no meio da viagem de 28 dias)
  const dataMeioViagem = new Date()
  dataMeioViagem.setDate(dataMeioViagem.getDate() + 14)

  await prisma.userDocument.create({
    data: {
      userId: userDurante.id,
      name: 'HUET',
      issueDate: new Date('2020-01-01'),
      expiryDate: dataMeioViagem,
      status: 'WARNING' // O sistema deve recalcular para risco crítico
    }
  })

  // =========================================================================
  // CENÁRIO 2: RISCO DE REEMBARQUE (TURNAROUND)
  // (O documento vence na folga, impedindo o próximo embarque)
  // =========================================================================
  console.log('🔄 Gerando Caso: Risco de Reembarque...')
  const userTurnaround = await prisma.user.create({
    data: {
      name: '[DEMO] Ana Reembarque',
      email: 'turnaround@demo.com',
      registration: 'MAT-TROCA',
      role: 'COLLABORATOR',
      jobTitle: 'Téc. Segurança'
    }
  })

  // Viagem 1: Termina Hoje
  await prisma.deployment.create({
    data: {
      userId: userTurnaround.id,
      projectId: p75.id,
      destination: 'P-75 (Petrobras)',
      embarkDate: new Date(new Date().setDate(new Date().getDate() - 14)),
      disembarkDate: new Date(), // Desembarca hoje
      status: 'ASHORE' // Está a desembarcar
    }
  })

  // Viagem 2: Começa daqui a 7 dias (Reembarque)
  const dataProxEmbarque = new Date()
  dataProxEmbarque.setDate(dataProxEmbarque.getDate() + 7)
  
  await prisma.deployment.create({
    data: {
      userId: userTurnaround.id,
      projectId: arraial.id,
      destination: 'UMS Cidade de Arraial',
      embarkDate: dataProxEmbarque,
      status: 'SCHEDULED'
    }
  })

  // O Documento vence daqui a 3 dias (No meio da folga, antes do próximo embarque)
  const dataVenceFolga = new Date()
  dataVenceFolga.setDate(dataVenceFolga.getDate() + 3)

  await prisma.userDocument.create({
    data: {
      userId: userTurnaround.id,
      name: 'CBSP',
      issueDate: new Date('2019-01-01'),
      expiryDate: dataVenceFolga,
      status: 'WARNING'
    }
  })

  // =========================================================================
  // CENÁRIO 3: MASSA DE DADOS (100 Pessoas para Volume)
  // =========================================================================
  console.log('👥 Gerando Massa de Dados (98 Colaboradores)...')
  
  for (let i = 0; i < 98; i++) {
    const projetoSorteado = random(projetos)
    const status = Math.random() > 0.4 ? 'ONBOARD' : 'SCHEDULED' // 60% embarcado
    const nome = gerarNome()
    
    // Alguns com documentos vencidos (5%)
    const temProblema = Math.random() < 0.05
    
    const user = await prisma.user.create({
      data: {
        name: temProblema ? `[ALERTA] ${nome}` : nome,
        email: `func${i}@demo.com`,
        registration: `MAT-${1000+i}`,
        role: 'COLLABORATOR',
        jobTitle: random(cargos),
        deployments: {
          create: {
            projectId: projetoSorteado.id,
            destination: projetoSorteado.name,
            embarkDate: new Date(),
            disembarkDate: new Date(new Date().setDate(new Date().getDate() + 14)),
            status: status
          }
        }
      }
    })

    // Documentação
    if (temProblema) {
      // Vencido
      const dataPassada = new Date()
      dataPassada.setDate(dataPassada.getDate() - 10)
      await prisma.userDocument.create({
        data: { userId: user.id, name: 'CBSP', issueDate: new Date('2018-01-01'), expiryDate: dataPassada, status: 'EXPIRED' }
      })
    } else {
      // Válido
      const dataFutura = new Date()
      dataFutura.setDate(dataFutura.getDate() + 365)
      await prisma.userDocument.create({
        data: { userId: user.id, name: 'CBSP', issueDate: new Date(), expiryDate: dataFutura, status: 'VALID' }
      })
    }
  }

  console.log('✅ Base de dados atualizada com sucesso!')
  console.log('👉 Procure por "[DEMO] Marcos" para testar o alerta de "Vence Durante"')
  console.log('👉 Procure por "[DEMO] Ana" para testar o alerta de "Risco no Reembarque"')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
