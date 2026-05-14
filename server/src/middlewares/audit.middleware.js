import { randomUUID } from 'crypto';

export function auditTrail(req, _res, next) {
  req.audit = {
    // Correção: UUID reduz risco de colisão em alta concorrência e múltiplas instâncias.
    requestId: req.headers['x-request-id'] || randomUUID(),
    actorId: req.auth?.userId || null,
    actorRole: req.auth?.role || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
    startedAt: new Date().toISOString(),
  };

  next();
}
