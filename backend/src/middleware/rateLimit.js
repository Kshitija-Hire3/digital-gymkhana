import { AppError } from '../utils/errors.js';

/** Minimal in-memory limiter (per key). Replace with a shared store if the app is ever run on multiple instances. */
export function rateLimit({ windowMs, max, key }) {
  const hits = new Map();
  return (req, _res, next) => {
    const now = Date.now(); const k = key(req);
    const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.'));
    arr.push(now); hits.set(k, arr);
    if (hits.size > 5000) for (const [kk, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(kk);
    next();
  };
}
