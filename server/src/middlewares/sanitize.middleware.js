const DEFAULT_TRIM_FIELDS = new Set([
  'cpf',
  'username',
  'name',
  'email',
  'matricula',
  'search',
]);

const SENSITIVE_FIELDS = /password|senha|token|hash|secret|pin/i;

function trimWhitelistedFields(source, fields, allowNested) {
  if (!source || typeof source !== 'object') return;

  for (const field of fields) {
    if (SENSITIVE_FIELDS.test(field)) continue;

    const value = source[field];
    if (typeof value === 'string') {
      // Correção: trim seletivo evita alterar credenciais/tokens por acidente.
      source[field] = value.trim();
      continue;
    }

    if (allowNested && value && typeof value === 'object' && !Array.isArray(value)) {
      // Correção incremental: suporta nested object raso mantendo whitelist explícita.
      trimWhitelistedFields(value, fields, false);
    }
  }
}

export function sanitizeInput(options = {}) {
  const trimFields = new Set(options.trimFields || DEFAULT_TRIM_FIELDS);

  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      trimWhitelistedFields(req.body, trimFields, true);
    }

    if (req.query && typeof req.query === 'object') {
      // Compatibilidade Express: mutação pontual sem reatribuir req.query.
      trimWhitelistedFields(req.query, trimFields, true);
    }

    next();
  };
}
