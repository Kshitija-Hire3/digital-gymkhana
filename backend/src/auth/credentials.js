import crypto from 'node:crypto';

/** scrypt hashing (Node built-in). Format: scrypt$<saltHex>$<hashHex> */
export function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(secret), salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export function verifySecret(secret, stored) {
  try {
    const [algo, saltHex, hashHex] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(secret), Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
