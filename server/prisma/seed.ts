import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Populando banco para espelhar o Dashboard atual...')

    try {
        await prisma.deployment.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany();
    } catch (e) { }

    // 1. Criar as Plataformas (Para o gráfico de Pizza funcionar futuramente)
    const p70 = await prisma.project.create({ data: { name: 'P-70' } })
    const p75 = await prisma.project.create({ data: { name: 'P-75' } })
    const base = await prisma.project.create({ data: { name: 'Base Macaé' } })

    // 2. Criar Colaboradores em Massa (Para dar volume aos cards)
    // Gera 10 pessoas na P-70
    for (let i = 0; i < 10; i++) {
        await prisma.user.create({
            data: {
                name: `Colaborador P70 ${i}`,
                email: `p70.${i}@demo.com`,
                registration: `MAT-70${i}`,
                role: 'COLLABORATOR',
                deployments: {
                    create: { projectId: p70.id, destination: 'P-70', embarkDate: new Date(), status: 'ONBOARD' }
                }
            }
        })
    }

    // Gera 5 pessoas na P-75
    for (let i = 0; i < 5; i++) {
        await prisma.user.create({
            data: {
                name: `Colaborador P75 ${i}`,
                email: `p75.${i}@demo.com`,
                registration: `MAT-75${i}`,
                role: 'COLLABORATOR',
                deployments: {
                    create: { projectId: p75.id, destination: 'P-75', embarkDate: new Date(), status: 'ONBOARD' }
                }
            }
        })
    }

    // 3. Criar "Ações Recomendadas" (Documentos Vencendo)
    const userRisco = await prisma.user.create({
        data: {
            name: 'João Risco',
            email: 'risco@demo.com',
            registration: 'MAT-999',
            jobTitle: 'Soldador'
        }
    })

    // Documento vencido para aparecer no alerta
    await prisma.userDocument.create({
        data: {
            userId: userRisco.id,
            name: 'CBSP',
            expiryDate: new Date('2023-01-01'), // Passado
            status: 'EXPIRED'
        }
    })

    console.log('✅ Banco populado. Dashboard visual não foi alterado.')
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect())
