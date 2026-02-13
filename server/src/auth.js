import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-secret' : '');

if (!process.env.JWT_SECRET && !isProd) {
  console.warn('[AUTH] JWT_SECRET ausente em desenvolvimento. Usando fallback inseguro local.');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET no ambiente antes de iniciar o servidor.');
}

export const signEmployeeToken = (employeeId) =>
  jwt.sign({ role: 'employee', employee_id: employeeId }, JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const authOptional = (req, _res, next) => {
  const adminKeyHeader = req.header('x-admin-key');
  if (process.env.ADMIN_KEY && adminKeyHeader && adminKeyHeader === process.env.ADMIN_KEY) {
    req.auth = { role: 'admin' };
    return next();
  }

  const authHeader = req.header('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      req.auth = verifyToken(token);
    } catch {
      req.auth = null;
    }
  } else {
    req.auth = null;
  }

  next();
};

export const requireEmployeeAuth = (req, res, next) => {
  if (!req.auth || (req.auth.role !== 'employee' && req.auth.role !== 'admin')) {
    return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Autenticação obrigatória' });
  }
  next();
};

export const guardEmployeeScope = (source = 'params') => (req, res, next) => {
  if (req.auth?.role === 'admin') return next();
  if (!req.auth || req.auth.role !== 'employee') {
    return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Autenticação obrigatória' });
  }

  const scopedValue = source === 'body' ? req.body?.employee_id : req.params?.id;
  const scopedEmployeeId = Number(scopedValue);

  if (!Number.isInteger(scopedEmployeeId) || scopedEmployeeId !== Number(req.auth.employee_id)) {
    return res.status(403).json({ errorCode: 'FORBIDDEN', message: 'Acesso fora do escopo do colaborador' });
  }

  next();
};
