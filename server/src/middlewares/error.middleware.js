export function notFoundHandler(req, res) {
  res.status(404).json({ code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

export function globalErrorHandler(error, _req, res, next) {
  // Correção: evita "Cannot set headers after they are sent" em fluxos parcialmente respondidos.
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'JSON inválido no corpo da requisição.' });
  }

  console.error('[UNHANDLED_ERROR]', {
    message: error?.message,
    stack: error?.stack,
  });

  return res.status(error?.statusCode || 500).json({
    code: error?.code || 'INTERNAL_SERVER_ERROR',
    message: error?.publicMessage || 'Erro interno do servidor.',
  });
}
