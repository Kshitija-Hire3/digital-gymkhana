import { verifyToken } from '../auth/tokens.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { ROLES } from '../utils/constants.js';

export function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(unauthorized());
  try { req.user = verifyToken(token); req.token = req.user; next(); }
  catch { next(unauthorized('Your session has expired. Please sign in again.')); }
}
export const requireRole = (...roles) => [authenticate, (req, _res, next) => (roles.includes(req.user.role) ? next() : next(forbidden()))];
export const anyUser = [authenticate];
export const studentOnly = requireRole(ROLES.STUDENT);
export const adminOnly = requireRole(ROLES.SUPER, ROLES.ORGANIZER);
export const superOnly = requireRole(ROLES.SUPER);
export const isAdmin = (u) => u.role === ROLES.SUPER || u.role === ROLES.ORGANIZER;
