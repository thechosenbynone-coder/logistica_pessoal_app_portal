import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prismaClient.js';
import {
  signPortalAccessToken,
  signPortalRefreshToken,
  verifyPortalRefreshToken,
} from '../auth.js';
import { handleServerError } from '../helpers.js';

const router = express.Router();

const COOKIE_NAME = 'portal_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/portal/auth',
};

router.post('/api/portal/auth/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Usuário e senha são obrigatórios.' });
    }

    const user = await prisma.portalUser.findUnique({ where: { username } });
    if (!user || !user.active) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' });
    }

    const accessToken = signPortalAccessToken(user.id);
    const refreshToken = signPortalRefreshToken(user.id);

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTS);
    return res.json({
      access_token: accessToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (error) {
    handleServerError(res, error, 'portal-auth-login');
  }
});

router.post('/api/portal/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ errorCode: 'NO_REFRESH_TOKEN', message: 'Sessão expirada.' });
    }

    let payload;
    try {
      payload = verifyPortalRefreshToken(token);
    } catch {
      res.clearCookie(COOKIE_NAME, { path: '/api/portal/auth' });
      return res.status(401).json({ errorCode: 'REFRESH_EXPIRED', message: 'Sessão expirada. Faça login novamente.' });
    }

    const user = await prisma.portalUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      res.clearCookie(COOKIE_NAME, { path: '/api/portal/auth' });
      return res.status(401).json({ errorCode: 'USER_INACTIVE', message: 'Usuário inativo.' });
    }

    const newAccessToken = signPortalAccessToken(user.id);
    return res.json({ access_token: newAccessToken });
  } catch (error) {
    handleServerError(res, error, 'portal-auth-refresh');
  }
});

router.post('/api/portal/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/api/portal/auth' });
  return res.json({ ok: true });
});

export default router;
