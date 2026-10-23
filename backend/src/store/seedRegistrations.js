// Optional: creates a few demo registrations THROUGH the real submit flow (writes to Excel). Run: npm run seed:demo
// Uses the first three students of the seed file (Ron, Ab, K when data/seed/students.seed.json is present).
import { seedIfEmpty } from './seed.js';
import { db } from './jsonStore.js';
import * as reg from '../services/registrationService.js';

seedIfEmpty();
const [a, b, c] = db.students.all().map((s) => s.crn);
if (!a || !b || !c) { console.error('Need at least 3 students in the seed file.'); process.exit(1); }
const u = (crn) => ({ crn, role: 'student' });
const tryRun = async (label, fn) => { try { const r = await fn(); console.log('created', label, r.id); } catch (e) { console.log('skipped', label, '-', e.message); } };
await tryRun('chess / first student', () => reg.submit(u(a), { eventId: 'evt-chess', answers: { contact: '9876543210', category: 'Intermediate', rating: '1450' } }));
await tryRun('chess / second student', () => reg.submit(u(b), { eventId: 'evt-chess', answers: { contact: '98765 43211', category: 'advanced' } }));
await tryRun('cricket team', () => reg.submit(u(a), { eventId: 'evt-cricket', answers: { contact: '9876543212', preferred_format: 'Tennis ball' }, team: { name: 'IT TY Strikers', members: [b, c] } }));
await tryRun('carrom pair', () => reg.submit(u(c), { eventId: 'evt-carrom', answers: { contact: '9876543213' }, team: { name: 'Board Breakers', members: [b] } }));
