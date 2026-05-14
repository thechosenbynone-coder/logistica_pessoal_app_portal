const DEFAULT_TRIM_FIELDS = new Set([
  'cpf',
  'username',
  'name',
  'email',
  'matricula',
  'search',
]);

function trimWhitelistedFields(source, fields) {
  if (!source || typeof source !== 'object') return;

  for (const field of fields) {
    if (typeof source[field] === 'string') {
      // Correção: trim seletivo evita alterar senha/token/hash por acidente.
      source[field] = source[field].trim();
    }
  }
}

export function sanitizeInput(options = {}) {
  const trimFields = new Set(options.trimFields || DEFAULT_TRIM_FIELDS);

  return (req, _res, next) => {
    // Correção: aplica apenas campos explícitos para reduzir risco de quebra comportamental.
    if (req.body && typeof req.body === 'object') {
      trimWhitelistedFields(req.body, trimFields);
    }

    if (req.query && typeof req.query === 'object') {
      // Correção: não reatribuir req.query, apenas mutação pontual compatível com Express.
      trimWhitelistedFields(req.query, trimFields);
    }

    next();
  };
}
