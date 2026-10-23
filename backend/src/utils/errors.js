export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}
export const badRequest = (msg, details) => new AppError(400, 'BAD_REQUEST', msg, details);
export const validation = (msg, details) => new AppError(422, 'VALIDATION_ERROR', msg, details);
export const unauthorized = (msg = 'Please sign in to continue.') => new AppError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new AppError(403, 'FORBIDDEN', msg);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} was not found.`);
export const conflict = (msg, details) => new AppError(409, 'CONFLICT', msg, details);
export const notImplemented = (msg) => new AppError(501, 'NOT_IMPLEMENTED', msg);
