import logger from '../logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  const status = err.statusCode || err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.path}`,
  });
}
