// ISOLATION POINT for identity verification.
// Prototype: student "secret" is compared against a scrypt hash stored per student (demo value in the seed).
// Real DOB-based use: hash the college-supplied DOB in a fixed format when importing students.
// To move to college SSO/LDAP/DB: replace the two functions below - nothing else in the app depends on how it works.
import { db } from '../store/jsonStore.js';
import { verifySecret, hashSecret } from './credentials.js';

const DUMMY = hashSecret('dummy-for-constant-time');   // avoids user-enumeration timing differences

export async function authenticateStudent(crn, secret) {
  const s = db.students.where((x) => x.crn.toUpperCase() === String(crn).trim().toUpperCase())[0];
  const good = verifySecret(String(secret).trim(), s ? s.secretHash : DUMMY);
  return s && good && s.active !== false ? s : null;
}
export async function authenticateAdmin(email, password) {
  const a = db.admins.where((x) => x.email.toLowerCase() === String(email).trim().toLowerCase())[0];
  const good = verifySecret(String(password), a ? a.passwordHash : DUMMY);
  return a && good && a.active !== false ? a : null;
}
