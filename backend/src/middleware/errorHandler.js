function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  const isOperational = status < 500;
  res.status(status).json({
    error: true,
    message: isOperational ? err.message : 'Error interno del servidor',
    code: isOperational ? (err.code || 'ERROR') : 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
