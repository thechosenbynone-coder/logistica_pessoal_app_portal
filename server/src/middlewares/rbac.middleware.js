export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Permissão insuficiente.' });
    }

    next();
  };
}
