import { authenticateStudent, authenticateAdmin } from '../auth/credentialProvider.js';
import { signToken, revokeToken } from '../auth/tokens.js';
import { check } from '../validators/schema.js';
import { AppError } from '../utils/errors.js';
import { ROLES } from '../utils/constants.js';
import { db } from '../store/jsonStore.js';

const studentUser = (s) => ({ id: s.id, name: s.name, crn: s.crn, phone: s.phone || '', email: s.email || '', branch: s.branch || '', class: s.class || '', division: s.division || '', shift: s.shift || '', role: ROLES.STUDENT });
const BAD = () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials. Please check and try again.');
export async function studentLogin(body) {
  const v = check(body, { crn: { type: 'string', required: true, max: 20, label: 'CRN' }, password: { type: 'string', required: true, max: 100, label: 'Password' } });
  const s = await authenticateStudent(v.crn, v.password); if (!s) throw BAD();
  const user = studentUser(s);
  return { token: signToken({ sub: s.id, role: ROLES.STUDENT, crn: s.crn, name: s.name }), user };
}
export async function adminLogin(body) {
  const v = check(body, { email: { type: 'string', required: true, max: 120 }, password: { type: 'string', required: true, max: 100 } });
  const a = await authenticateAdmin(v.email, v.password); if (!a) throw BAD();
  return { token: signToken({ sub: a.id, role: a.role, name: a.name }), user: { id: a.id, name: a.name, email: a.email, role: a.role } };
}
export const logout = (tokenPayload) => revokeToken(tokenPayload);
export function me(u) {
  if (u.role === ROLES.STUDENT) { const s = db.students.find(u.sub); return s && studentUser(s); }
  const a = db.admins.find(u.sub); return a && { id: a.id, name: a.name, email: a.email, role: a.role };
}
