import express from 'express';
import { prisma } from '../prismaClient.js';
import {
  employeeBodyAuth,
  employeeParamsAuth,
  handleServerError,
  parseEmployeeIdParam,
  parseDateInputOrError,
} from '../helpers.js';

const router = express.Router();

const VALID_TRANSITIONS = {
  'BASE': ['EM_DESLOCAMENTO'],
  'MOBILIZANDO': ['EM_DESLOCAMENTO'],
  'EM_DESLOCAMENTO': ['AGUARDANDO_EMBARQUE'],
  'AGUARDANDO_EMBARQUE': ['EMBARCADO'],
  'EMBARCADO': ['BASE', 'FOLGA'], // resolved dynamically by postDisembarkPlan
  'FOLGA': ['BASE'],
};

router.post('/api/employees/:id/checkin', ...employeeBodyAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;

    const { to_status, geo, notes } = req.body || {};
    if (!to_status) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'to_status é obrigatório' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { currentStatus: true, postDisembarkPlan: true }
    });

    if (!employee) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    }

    const current = employee.currentStatus || 'BASE';
    const allowedNext = VALID_TRANSITIONS[current] || [];

    // Special logic for desembarque
    let resolvedToStatus = to_status;
    let postDisembarkPlanReset = employee.postDisembarkPlan;
    if (current === 'EMBARCADO' && ['BASE', 'FOLGA'].includes(to_status)) {
      resolvedToStatus = employee.postDisembarkPlan === 'FOLGA' ? 'FOLGA' : 'BASE';
      postDisembarkPlanReset = null; // Clear it out
      
      // se a transição pedida não bate com a resolvida (ex: pediu pra BASE mas tava agendado FOLGA)
      // a regra "resolver a partir de postDisembarkPlan" implica que nós forçamos o postDisembarkPlan
      // Mas se o cara já passou o status correto ok.
      if (to_status !== resolvedToStatus) {
         // podemos apenas sobrescrever
         resolvedToStatus = employee.postDisembarkPlan === 'FOLGA' ? 'FOLGA' : 'BASE';
      }
    } else if (!allowedNext.includes(to_status)) {
      return res.status(400).json({
        errorCode: 'INVALID_TRANSITION',
        message: `Transição inválida de ${current} para ${to_status}. Permitidos: ${allowedNext.join(', ')}`
      });
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        currentStatus: resolvedToStatus,
        statusUpdatedAt: new Date(),
        postDisembarkPlan: postDisembarkPlanReset,
        statusLogs: {
          create: {
            fromStatus: current,
            toStatus: resolvedToStatus,
            geo: geo || null,
            notes: notes || null,
            origin: 'CHECKIN_APP'
          }
        }
      }
    });

    res.json({
      success: true,
      current_status: updated.currentStatus,
      status_updated_at: updated.statusUpdatedAt
    });
  } catch (error) {
    handleServerError(res, error, 'employee-checkin');
  }
});

router.get('/api/employees/:id/status', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    }

    const current = employee.currentStatus || 'BASE';
    let next_allowed = VALID_TRANSITIONS[current] || [];

    // Apply disembark resolution rule for UI
    if (current === 'EMBARCADO') {
      next_allowed = [employee.postDisembarkPlan === 'FOLGA' ? 'FOLGA' : 'BASE'];
    }

    res.json({
      current_status: current,
      status_updated_at: employee.statusUpdatedAt,
      next_allowed,
      logs: employee.statusLogs.map(log => ({
        id: log.id,
        from_status: log.fromStatus,
        to_status: log.toStatus,
        created_at: log.createdAt,
        geo: log.geo,
        notes: log.notes
      }))
    });
  } catch (error) {
    handleServerError(res, error, 'employee-status-get');
  }
});

router.patch('/api/employees/:id/status', ...employeeBodyAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;

    const { current_status, post_disembark_plan, folga_return_date } = req.body || {};
    
    const updateData = {};
    if (current_status !== undefined) {
      updateData.currentStatus = current_status;
      updateData.statusUpdatedAt = new Date();
    }
    
    if (post_disembark_plan !== undefined) {
      updateData.postDisembarkPlan = post_disembark_plan;
    }

    if (folga_return_date !== undefined) {
      const pDate = parseDateInputOrError(folga_return_date, 'folga_return_date', false);
      if (pDate.error) {
        return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: pDate.error });
      }
      updateData.folgaReturnDate = pDate.value;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Nenhum campo para atualizar' });
    }

    // Se estivermos mudando o status manualmente, vamos registrar um log
    if (current_status) {
       const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { currentStatus: true } });
       updateData.statusLogs = {
          create: {
            fromStatus: employee?.currentStatus || 'BASE',
            toStatus: current_status,
            origin: 'MANUAL_RH'
          }
       };
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData
    });

    res.json({
      current_status: updated.currentStatus,
      post_disembark_plan: updated.postDisembarkPlan,
      folga_return_date: updated.folgaReturnDate
    });
  } catch (error) {
    handleServerError(res, error, 'employee-status-patch');
  }
});

export default router;
