import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
try { process.loadEnvFile(path.join(root, 'backend', '.env')); } catch { /* .env optional */ }
const env = process.env;
const isProd = env.NODE_ENV === 'production';

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET must be set in production');
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set - using a random per-process secret (sessions reset on restart).');
}

export const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  root,
  port: Number(env.PORT) || 4000,
  jwtSecret,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  dataDir: path.resolve(root, env.DATA_DIR || 'data'),
  seedDemo: env.SEED_DEMO_DATA !== 'false',
  demoAdminName: env.DEMO_ADMIN_NAME || 'Waghchaure Sir',
  demoAdminEmail: env.DEMO_ADMIN_EMAIL || 'admin@college.edu.in',
  demoAdminPassword: env.DEMO_ADMIN_PASSWORD || 'admin123',
  crnPattern: env.CRN_PATTERN || '^[0-9]{10}$',
};
