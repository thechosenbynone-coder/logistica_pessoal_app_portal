export function validate(schema) {
  return (req, res, next) => {
    if (!schema) return next();

    const errors = schema(req);
    if (!errors || errors.length === 0) return next();

    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos na requisição.',
      errors,
    });
  };
}
