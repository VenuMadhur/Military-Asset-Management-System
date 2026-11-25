import env from '../config/env.js';

/**
 * Structured HTTP request/response logger middleware.
 * Avoids logging sensitive headers, tokens, or request passwords.
 */
export function loggerMiddleware(req, res, next) {
  if (env.isTest) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const actor = req.user ? `${req.user.username}(${req.user.role})` : 'anonymous';
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms actor=${actor}`
    );
  });

  return next();
}
