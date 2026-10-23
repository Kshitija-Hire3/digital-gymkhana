import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const revoked = new Map(); // jti -> exp(seconds); in-memory (cleared on restart; tokens are short-lived)
export function signToken(payload) {
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, config.jwtSecret, { expiresIn: config.jwtExpiresIn, algorithm: 'HS256' });
}
export function verifyToken(token) {
  const p = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (revoked.has(p.jti)) throw new Error('revoked');
  return p;
}
export function revokeToken(p) {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, exp] of revoked) if (exp < now) revoked.delete(k);
  revoked.set(p.jti, p.exp);
}
