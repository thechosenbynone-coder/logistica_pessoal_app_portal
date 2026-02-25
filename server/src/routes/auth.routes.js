import express from 'express';
import bcrypt from 'bcryptjs';
import { signEmployeeToken } from '../auth.js';
import { prisma } from '../prismaClient.js';
import { handleServerError, mapEmployee, normalizeCPF, parseEmployeeIdParam } from '../helpers.js';

const router = express.Router();
const shouldLogAuthDebug = process.env.DEBUG_AUTH === 'true';

router.post('/api/auth/login', async (req, res) => {
  try {
    const cpf = normalizeCPF(req.body?.cpf);
    const senha = String(req.body?.senha ?? req.body?.pin ?? '').trim();

    if (!cpf || !senha) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Informe cpf e senha.' });
    }
    if (cpf.length !== 11) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Informe cpf e senha.' });
    }

    const employee = await prisma.employee.findFirst({ where: { cpf } });
    if (!employee?.accessPinHash) {
      if (shouldLogAuthDebug) console.log('[AUTH_DEBUG]', { cpfReceived: req.body?.cpf, cpfNorm: cpf, reason: 'not_found_or_no_hash' });
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'CPF ou senha inválidos.' });
    }

    const isValid = await bcrypt.compare(senha, employee.accessPinHash);
    if (!isValid) {
      if (shouldLogAuthDebug) console.log('[AUTH_DEBUG]', { cpfReceived: req.body?.cpf, cpfNorm: cpf, reason: 'invalid_password' });
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'CPF ou senha inválidos.' });
    }

    const token = signEmployeeToken(employee.id);
    return res.json({ token, employee: mapEmployee(employee) });
  } catch (error) {
    handleServerError(res, error, 'auth-login');
  }
});

router.post('/api/admin/employees/:id/pin', async (req, res) => {
  try {
    if (req.auth?.role !== 'admin') return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Acesso admin obrigatório' });
    const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return;
    const pin = String(req.body?.pin || '').trim();
    if (!pin || pin.length < 4 || pin.length > 12 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'PIN inválido (use 4-12 dígitos)' });
    }
    const hash = await bcrypt.hash(pin, 10);
    const result = await prisma.employee.updateMany({ where: { id: employeeId }, data: { accessPinHash: hash, accessPinUpdatedAt: new Date() } });
    if (result.count === 0) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    return res.json({ ok: true });
  } catch (error) { handleServerError(res, error, 'admin-set-pin'); }
});

export default router;
