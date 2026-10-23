import { db } from '../store/jsonStore.js';
import { check, emailOk } from '../validators/schema.js';
import { ROLES } from '../utils/constants.js';
import { hashSecret } from '../auth/credentials.js';
import { conflict, notFound, validation } from '../utils/errors.js';

const strip = ({ passwordHash, ...a }) => a;
export const list = () => db.admins.all().map(strip);
export function create(body) {
  const v = check(body, { name: { type: 'string', required: true, max: 80 }, email: { type: 'string', required: true, max: 120 },
    password: { type: 'string', required: true, label: 'Password' }, role: { type: 'string', required: true, enum: [ROLES.SUPER, ROLES.ORGANIZER] } });
  if (!emailOk(v.email)) throw validation('Enter a valid email address.', [{ field: 'email', message: 'Invalid email.' }]);
  if (v.password.length < 8) throw validation('Password must be at least 8 characters.', [{ field: 'password', message: 'Too short.' }]);
  if (db.admins.where((a) => a.email.toLowerCase() === v.email.toLowerCase()).length) throw conflict('An administrator with that email already exists.');
  return strip(db.admins.insert({ name: v.name, email: v.email.toLowerCase(), role: v.role, active: true, passwordHash: hashSecret(v.password) }));
}
export function update(id, body, actor) {
  const a = db.admins.find(id); if (!a) throw notFound('Administrator');
  const patch = {};
  if (body.role !== undefined) { if (![ROLES.SUPER, ROLES.ORGANIZER].includes(body.role)) throw validation('Unknown role.'); patch.role = body.role; }
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.password) { if (String(body.password).length < 8) throw validation('Password must be at least 8 characters.'); patch.passwordHash = hashSecret(body.password); }
  if (a.id === actor.sub && (patch.active === false || (patch.role && patch.role !== a.role))) throw conflict('You cannot deactivate or demote your own account.');
  const wouldLoseSuper = a.role === ROLES.SUPER && (patch.active === false || (patch.role && patch.role !== ROLES.SUPER));
  if (wouldLoseSuper && db.admins.where((x) => x.role === ROLES.SUPER && x.active !== false).length <= 1) throw conflict('At least one active super admin is required.');
  return strip(db.admins.update(id, patch));
}
