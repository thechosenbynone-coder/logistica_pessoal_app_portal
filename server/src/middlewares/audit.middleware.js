export function auditTrail(req, _res, next) {
  req.audit = {
    requestId: req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    actorId: req.auth?.userId || null,
    actorRole: req.auth?.role || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
    startedAt: new Date().toISOString(),
  };

  next();
}
