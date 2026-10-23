import { AppError } from '../utils/errors.js';

export const notFoundHandler = (req, _res, next) => next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`));
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' } });
  if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, error: { code: 'TOO_LARGE', message: 'Request is too large.' } });
  console.error('[error]', err);   // technical detail stays in the server log only
  res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong on our side. Please try again.' } });
}
