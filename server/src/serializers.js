// Prisma Decimal objects can't be JSON-stringified directly in some runtimes.
// This helper converts Decimal, Date, and BigInt to JSON-friendly formats.

function isDecimalLike(v) {
  return v && typeof v === 'object' && typeof v.toString === 'function' && v.constructor && v.constructor.name === 'Decimal';
}

export function toJson(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (isDecimalLike(value)) return Number(value.toString());

  if (Array.isArray(value)) return value.map(toJson);

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJson(v);
    }
    return out;
  }

  return value;
}
