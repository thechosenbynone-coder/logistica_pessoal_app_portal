function redactPath(value) {
  if (!value) return value;
  return String(value)
    .replace(/(token=)[^&]+/gi, '$1[REDACTED]')
    .replace(/(access_token=)[^&]+/gi, '$1[REDACTED]');
}

export function structuredRequestLog(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    
    console.log(JSON.stringify({
      type: 'http_request',
      method: req.method,
      path: redactPath(req.originalUrl),
      statusCode: res.statusCode,
      elapsedMs,
      requestId: req.audit?.requestId || null,
      actorId: req.audit?.actorId || null,
    }));
  });

  next();
}
