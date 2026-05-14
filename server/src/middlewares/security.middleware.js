export function helmetLike(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
}

const ipHits = new Map();
let lastSweepAt = 0;

export function rateLimitLike({ windowMs = 15 * 60 * 1000, max = 500 } = {}) {
  // in-memory only (not shared across instances)
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';

    // cleanup expired entries
    if (now - lastSweepAt > windowMs) {
      for (const [ip, item] of ipHits.entries()) {
        if (now - item.start > windowMs) ipHits.delete(ip);
      }
      lastSweepAt = now;
    }

    const current = ipHits.get(key) || { count: 0, start: now };

    if (now - current.start > windowMs) {
      current.count = 0;
      current.start = now;
    }

    current.count += 1;
    ipHits.set(key, current);

    if (current.count > max) {
      return res.status(429).json({ code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.' });
    }

    next();
  };
}
