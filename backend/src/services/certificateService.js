// SERVICE BOUNDARY for certificates. Records are real; file generation is intentionally NOT implemented
// (final workflow undecided). A real generator (PDF, template engine, external service...) plugs into `generator`.
import { db } from '../store/jsonStore.js';
import { notFound, notImplemented, validation, conflict } from '../utils/errors.js';
import { notify } from './notificationService.js';
import * as regSvc from './registrationService.js';

export const generator = {
  configured: false,
  async generate(/* record */) { throw notImplemented('Certificate file generation is not configured yet. The record exists, but no certificate file can be produced.'); },
};
export const listAll = () => db.certificates.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const listForStudent = (crn) => listAll().filter((c) => c.crn.toUpperCase() === crn.toUpperCase())
  .map((c) => ({ ...c, downloadable: generator.configured && c.status === 'available' }));
export async function issueRecord({ registrationId, type = 'participation', note }) {
  if (!['participation', 'achievement', 'winner', 'runner-up'].includes(type)) throw validation('Unknown certificate type.');
  const reg = await regSvc.getById(registrationId);
  const crns = [reg.crn, ...reg.teamMembers.map((m) => m.crn)]; const created = [];
  for (const crn of crns) {
    if (db.certificates.where((c) => c.registrationId === registrationId && c.crn === crn && c.type === type).length) continue;
    const name = crn === reg.crn ? reg.name : reg.teamMembers.find((m) => m.crn === crn)?.name;
    created.push(db.certificates.insert({ registrationId, eventId: reg.eventId, eventTitle: reg.eventTitle, crn, name, type, note: note || '', status: 'available', issuedAt: new Date().toISOString() }));
  }
  if (!created.length) throw conflict('Those certificate records already exist.');
  created.forEach((c) => notify({ audience: c.crn, type: 'certificate', title: `Certificate Record — ${reg.eventTitle}`, message: `A ${type} certificate record is available for ${reg.eventTitle}.`, link: '/student/certificates' }));
  return created;
}
export function removeRecord(id) { if (!db.certificates.remove(id)) throw notFound('Certificate record'); }
export async function download(id, user) {
  const c = db.certificates.find(id);
  if (!c || (user.role === 'student' && c.crn.toUpperCase() !== user.crn.toUpperCase())) throw notFound('Certificate');
  return generator.generate(c);
}
