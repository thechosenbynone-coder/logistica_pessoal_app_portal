import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Arrays de dados realistas
const nomes = ['João', 'Carlos', 'Pedro', 'Lucas', 'Rafael', 'Bruno', 'Diego', 'Felipe', 'Gustavo', 'Thiago', 'Rodrigo', 'Leandro', 'Marcio', 'Eduardo', 'Gabriel', 'Marcelo', 'Fernando', 'Alexandre', 'Ricardo', 'Vinicius', 'Daniel', 'Marcos', 'Antonio', 'Francisco', 'Paulo', 'Jose', 'Luiz', 'Sergio', 'Roberto', 'Claudio'];
const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves', 'Carvalho', 'Mendes', 'Ribeiro', 'Martins', 'Gonçalves', 'Barbosa', 'Rocha', 'Dias', 'Monteiro', 'Moraes', 'Cavalcanti', 'Moura', 'Cardoso', 'Freitas', 'Tavares', 'Vieira', 'Araujo', 'Neves'];
const cargos = ['Pedreiro', 'Mestre de Obras', 'Engenheiro Civil', 'Eletricista', 'Encanador', 'Operador de Máquinas', 'Técnico de Segurança', 'Soldador', 'Caldeireiro', 'Pintor Industrial', 'Alpinista N1', 'Rádio Operador', 'Supervisor de Convés'];
const bases = ['Base Macaé', 'Base Rio das Ostras', 'Base Campos'];
const docTypes = ['CBSP', 'HUET', 'NR-35', 'NR-33', 'ASO', 'Passaporte'];

// Funções Utilitárias
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Gerador de CPF válido (Matemática Módulo 11)
function gerarCpfValido() {
  const num = () => Math.floor(Math.random() * 10);
  const n = Array.from({ length: 9 }, num);
  
  let d1 = n.reduce((total, number, index) => total + (number * (10 - index)), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  
  let d2 = n.reduce((total, number, index) => total + (number * (11 - index)), 0) + (d1 * 2);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  
  return [...n, d1, d2].join('');
}

async function main() {
  console.log('🌱 Iniciando Seed Robusto (65+ Colaboradores, Alertas e RDOs)...');

  // 1. Limpeza segura e nativa do ORM
  try {
    // Tabelas do ecossistema Dashboard/RH
    await prisma.expense.deleteMany();
    await prisma.timeSheet.deleteMany();
    await prisma.userDocument.deleteMany();
    await prisma.deployment.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    
    // Tabelas do ecossistema Colaborador (Mobile)
    await prisma.dailyReport.deleteMany();
    await prisma.financialRequest.deleteMany();
    await prisma.serviceOrder.deleteMany();
    await prisma.employee.deleteMany();
  } catch (e) {
    console.log('Aviso: O banco estava vazio ou em transição. Continuando...');
  }

  const pinHash = await bcrypt.hash('1234', 10);

  // 2. Criar Projetos / Plataformas (Para popular gráficos de pizza)
  const p70 = await prisma.project.create({ data: { name: 'P-70 (Petrobras)' } });
  const p75 = await prisma.project.create({ data: { name: 'P-75 (Petrobras)' } });
  const arraial = await prisma.project.create({ data: { name: 'UMS Cidade de Arraial' } });
  const baseOp = await prisma.project.create({ data: { name: 'Base Operacional Macaé' } });
  const projetos = [p70, p75, arraial, baseOp];

  const colaboradoresData = [];
  
  // 3. O DADO CANÁRIO (Homenagem - Jéssica)
  colaboradoresData.push({
    name: 'Jéssica Martins Tavares da Silva',
    cpf: gerarCpfValido(),
    email: 'jessica@demo.com',
    role: 'Diretora de RH',
    phone: `552197${Math.floor(1000000 + Math.random() * 9000000)}`,
    base: 'Base Rio das Ostras',
    registration: 'MAT-0001',
    isCanary: true
  });

  // 4. Gerar os demais 65 colaboradores realistas
  for (let i = 2; i <= 66; i++) {
    const nome = random(nomes);
    const sobrenome1 = random(sobrenomes);
    const sobrenome2 = random(sobrenomes);
    
    colaboradoresData.push({
      name: `${nome} ${sobrenome1} ${sobrenome2}`,
      cpf: gerarCpfValido(),
      email: `colaborador${i}@demo.com`,
      role: random(cargos),
      phone: `552197${Math.floor(1000000 + Math.random() * 9000000)}`,
      base: random(bases),
      registration: `MAT-${1000 + i}`
    });
  }

  console.log('👥 Inserindo colaboradores e forçando histórico de compliance...');
  
  const employeeIds = [];
  let index = 0;

  for (const data of colaboradoresData) {
    index++;
    
    // -> Criação do 'User' para o Dashboard de RH
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        registration: data.registration,
        role: data.role === 'Diretora de RH' ? 'HR' : 'COLLABORATOR',
        jobTitle: data.role
      }
    });

    // -> Criação do 'Employee' para o Login no App Colaborador
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        cpf: data.cpf,
        email: data.email,
        role: data.role,
        phone: data.phone,
        base: data.base,
        accessPinHash: pinHash,
        accessPinUpdatedAt: new Date()
      }
    });
    employeeIds.push(employee.id);

    // ========================================================
    // MOTOR DE COMPLIANCE: FORÇANDO OS ALERTAS DO SEU DASHBOARD
    // ========================================================
    const projeto = random(projetos);
    const hoje = new Date();
    
    let casoEspecial = 'NORMAL';
    if (index === 2) casoEspecial = 'VENCIDO';
    if (index === 3) casoEspecial = 'VENCE_DURANTE';
    if (index === 4) casoEspecial = 'RISCO_REEMBARQUE';
    if (index === 5) casoEspecial = 'ALERTA_PROXIMO';

    // Gestão da Viagem (Deployment)
    if (casoEspecial === 'VENCE_DURANTE') {
      const desembarque = new Date(hoje);
      desembarque.setDate(hoje.getDate() + 14); // Viagem de 14 dias
      
      await prisma.deployment.create({
        data: { userId: user.id, projectId: projeto.id, destination: projeto.name, embarkDate: hoje, disembarkDate: desembarque, status: 'ONBOARD' }
      });
      
      const venceMeio = new Date(hoje);
      venceMeio.setDate(hoje.getDate() + 7); // Documento venceu no 7º dia a bordo! (Alerta Vermelho)
      await prisma.userDocument.create({
        data: { userId: user.id, name: 'CBSP', issueDate: new Date('2019-01-01'), expiryDate: venceMeio, status: 'WARNING' }
      });
      
    } else if (casoEspecial === 'RISCO_REEMBARQUE') {
      const reembarque = new Date(hoje);
      reembarque.setDate(hoje.getDate() + 10); // Próximo embarque marcado para daqui a 10 dias
      
      await prisma.deployment.create({
        data: { userId: user.id, projectId: projeto.id, destination: projeto.name, embarkDate: reembarque, status: 'SCHEDULED' }
      });
      
      const venceAmanha = new Date(hoje);
      venceAmanha.setDate(hoje.getDate() + 1); // Documento vence amanhã, ele vai perder a escala!
      await prisma.userDocument.create({
        data: { userId: user.id, name: 'HUET', issueDate: new Date('2020-01-01'), expiryDate: venceAmanha, status: 'WARNING' }
      });

    } else {
      // Embarques e escalas normais
      const embarcado = Math.random() > 0.4;
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - Math.floor(Math.random() * 20));
      
      await prisma.deployment.create({
        data: {
          userId: user.id, projectId: projeto.id, destination: projeto.name, embarkDate: inicio,
          disembarkDate: embarcado ? new Date(inicio.getTime() + (14 * 24 * 60 * 60 * 1000)) : null,
          status: embarcado ? 'ONBOARD' : 'SCHEDULED'
        }
      });
    }

    // Gerando o restante da documentação
    const numDocs = Math.floor(Math.random() * 4) + 2; 
    for (let d = 0; d < numDocs; d++) {
      const tipo = random(docTypes);
      let status = 'VALID';
      let expiracao = new Date(hoje);
      
      if (casoEspecial === 'VENCIDO' && d === 0) {
        expiracao.setDate(hoje.getDate() - 30); // Vencido a 1 mês
        status = 'EXPIRED';
      } else if (casoEspecial === 'ALERTA_PROXIMO' && d === 0) {
        expiracao.setDate(hoje.getDate() + 15); // Vence em 15 dias (Amarelo)
        status = 'WARNING';
      } else {
        expiracao.setDate(hoje.getDate() + 100 + Math.floor(Math.random() * 500)); // Tudo em dia
      }

      await prisma.userDocument.create({
        data: { userId: user.id, name: tipo, issueDate: new Date('2021-01-01'), expiryDate: expiracao, status: status }
      });
    }
  }

  // ==========================================
  // DISTRIBUIÇÃO GRÁFICA DE RDOs (SERVICE ORDERS)
  // ==========================================
  console.log('📝 Gerando 150 Service Orders (RDOs) espalhados no tempo...');
  const prioridades = ['BAIXA', 'MEDIA', 'ALTA'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'CONCLUDED'];
  
  for (let i = 0; i < 150; i++) {
    const randomEmployeeId = random(employeeIds);
    // Distribui as O.S. perfeitamente ao longo dos últimos 45 dias
    const diasAtras = Math.floor(Math.random() * 45);
    const dataAbertura = new Date();
    dataAbertura.setDate(dataAbertura.getDate() - diasAtras);
    
    await prisma.serviceOrder.create({
      data: {
        employeeId: randomEmployeeId,
        osNumber: `OS-${20000 + i}`,
        title: `RDO ${i + 1} - Frente Offshore`,
        description: 'Execução de atividade de campo e registro diário de obra em altura.',
        priority: random(prioridades),
        status: random(statuses),
        approvalStatus: i % 4 === 0 ? 'PENDING' : 'APPROVED',
        openedAt: dataAbertura
      }
    });
  }

  console.log(`✅ Seed concluído com sucesso!`);
  console.log(`✅ A Diretora Jéssica Tavares da Silva foi incluída com sucesso.`);
  console.log(`✅ Motor de compliance injetou cenários de VENCE DURANTE, VENCIDO e RISCO REEMBARQUE.`);
}

main()
  .catch((e) => {
    console.error('❌ Falha no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
