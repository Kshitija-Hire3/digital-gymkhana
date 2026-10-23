import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpDataDir, memoryAdapter } from './helpers.js';
tmpDataDir();
const excel = await import('../src/excel/excelService.js');
const adapter = memoryAdapter(); excel.setAdapter(adapter);
const { seedIfEmpty } = await import('../src/store/seed.js');
const reg = await import('../src/services/registrationService.js');
const dp = await import('../src/services/dataProcessingService.js');
const results = await import('../src/services/resultService.js');
const events = await import('../src/services/eventService.js');
const forms = await import('../src/services/formService.js');
const certs = await import('../src/services/certificateService.js');
const notif = await import('../src/services/notificationService.js');
const { db } = await import('../src/store/jsonStore.js');
const { getSettings, updateSettings } = await import('../src/services/settingsService.js');
const { hashSecret, verifySecret } = await import('../src/auth/credentials.js');
seedIfEmpty();
const RON = '9900000001', AB = '9900000002', K = '9900000003';
const mkStudent = (crn, name, phone, email) => ({ id: `stu-${crn}`, crn, name, phone, email, branch: 'IT', class: 'TY', division: 'H', shift: 'Regular', active: true, secretHash: hashSecret('01012000') });
db.students.replaceAll([mkStudent(RON, 'Ron', '8585858585', 'ron@example.com'), mkStudent(AB, 'Ab', '9696969696', 'ab@example.com'), mkStudent(K, 'K', '7474747474', 'k@example.com')]);
const u = (crn) => ({ crn, role: 'student' });
const rejects = (p, code) => assert.rejects(p, (e) => { assert.equal(e.code, code, e.message); return true; });

test('password hashing', () => { const h = hashSecret('x'); assert.ok(verifySecret('x', h)); assert.ok(!verifySecret('y', h)); assert.ok(!verifySecret('x', 'garbage')); });
test('seed created demo data', () => { assert.equal(db.sports.count(), 6); assert.equal(db.events.count(), 5); assert.ok(db.students.count() >= 3); });
test('event filters', () => {
  assert.equal(events.list({ sport: 'Chess' }).length, 1); assert.equal(events.list({ q: 'cricket' }).length, 1);
  assert.equal(events.list({ mode: 'team' }).length, 4); assert.equal(events.list({ q: 'nomatch' }).length, 0);
});
test('individual registration writes to Excel and rejects duplicates', async () => {
  const r = await reg.submit(u(RON), { eventId: 'evt-chess', answers: { contact: '9876543210', category: 'Intermediate' } });
  assert.match(r.id, /^REG-\d{4}-0001$/); assert.equal(r.status, 'Submitted');
  assert.ok(adapter.files.has(excel.rawPath('evt-chess')));
  const rows = adapter.files.get(excel.rawPath('evt-chess')).Registrations; assert.equal(rows.length, 2); assert.ok(rows[0].includes('CRN'));
  await rejects(reg.submit(u(RON), { eventId: 'evt-chess', answers: { contact: '9876543210', category: 'Beginner' } }), 'CONFLICT');
  assert.equal((await reg.listMine(u(RON))).length, 1);
});
test('invalid form data is rejected with field details', async () => {
  await assert.rejects(reg.submit(u(AB), { eventId: 'evt-chess', answers: { contact: '12', category: 'Wizard' } }), (e) => e.code === 'VALIDATION_ERROR' && e.details.length === 2);
  await rejects(reg.submit(u(AB), { eventId: 'nope', answers: {} }), 'NOT_FOUND');
});
test('closed / draft events reject registration', async () => {
  events.setStatus('evt-chess', 'closed');
  await rejects(reg.submit(u(AB), { eventId: 'evt-chess', answers: { contact: '9876543211', category: 'Advanced' } }), 'REGISTRATION_CLOSED');
  events.setStatus('evt-chess', 'open');
});
test('team registration rules', async () => {
  const base = { eventId: 'evt-carrom', answers: { contact: '9876543213' } };
  await rejects(reg.submit(u(K), { ...base, team: { name: '', members: [AB] } }), 'VALIDATION_ERROR');                    // no team name
  await rejects(reg.submit(u(K), { ...base, team: { name: 'T', members: [] } }), 'VALIDATION_ERROR');                     // too small
  await rejects(reg.submit(u(K), { ...base, team: { name: 'T', members: [K] } }), 'VALIDATION_ERROR');                    // captain as member
  await rejects(reg.submit(u(K), { ...base, team: { name: 'T', members: ['9999999999'] } }), 'VALIDATION_ERROR');         // unknown CRN
  await rejects(reg.submit(u(K), { ...base, team: { name: 'T', members: ['ABC'] } }), 'VALIDATION_ERROR');               // invalid CRN format
  await rejects(reg.submit(u(K), { ...base, team: { name: 'T', members: [AB, RON] } }), 'VALIDATION_ERROR');              // too large (max 2)
  const r = await reg.submit(u(K), { ...base, team: { name: 'Board Breakers', members: [AB] } });
  assert.equal(r.teamSize, 2); assert.equal(r.teamMembers[0].crn, AB); assert.equal(r.phone, '7474747474'); assert.equal(r.division, 'H');
  await rejects(reg.submit(u(RON), { ...base, team: { name: 'Dup', members: [AB] } }), 'CONFLICT');                        // member already registered
  assert.equal((await reg.listMine(u(AB)))[0].role, 'Team member');
});
test('student lookup returns prefilled details; others are masked', () => {
  const self = reg.lookupStudent(RON, RON);
  assert.deepEqual(self, { crn: RON, name: 'Ron', phone: '8585858585', email: 'ron@example.com', branch: 'IT', class: 'TY', division: 'H', shift: 'Regular' });
  const other = reg.lookupStudent(AB, RON);
  assert.equal(other.name, 'Ab'); assert.equal(other.phone, '••••••9696'); assert.match(other.email, /^a•+@example\.com$/); assert.equal(other.masked, true);
  assert.equal(reg.lookupStudent('9999999999', RON), null);
});
test('status change + notifications', async () => {
  const id = (await reg.listMine(u(RON)))[0].id;
  const r = await reg.setStatus(id, 'Approved'); assert.equal(r.status, 'Approved');
  await rejects(reg.setStatus(id, 'Bogus'), 'VALIDATION_ERROR'); await rejects(reg.setStatus('REG-0000-0000', 'Approved'), 'NOT_FOUND');
  const n = notif.listFor(RON); assert.ok(n.some((x) => /Approved/.test(x.title)));
  notif.markAllRead(RON); assert.equal(notif.unreadCount(RON), 0);
});
test('data processing produces clean output from real data', async () => {
  assert.equal((await dp.status('evt-chess')).status, 'Not Processed');
  // inject a messy row directly into the raw sheet (simulates dirty data)
  const file = excel.rawPath('evt-chess'); const sheets = adapter.files.get(file); const [h, ...rows] = sheets.Registrations;
  const messy = h.map((c) => ({ RegistrationID: 'REG-X', EventID: 'evt-chess', Sport: 'chess', Mode: 'individual', CRN: RON, Name: ' ron  ', Branch: 'x', Status: 'Submitted', SubmittedAt: '2099', Contact: 'bad', 'Skill category': 'Advanced' }[c] ?? ''));
  sheets.Registrations = [h, ...rows, messy];
  const s = await dp.run('evt-chess');
  assert.equal(s.status, 'Needs Attention'); assert.equal(s.summary.processed, 2); assert.equal(s.summary.valid, 1); assert.equal(s.summary.duplicates, 1);
  const p = await dp.preview('evt-chess', 'clean', 'Clean'); assert.equal(p.total, 1);
  assert.equal((await dp.issues('evt-chess')).duplicates.length, 1);
  assert.ok(dp.downloadPath('evt-chess', 'clean').file.endsWith('evt-chess_clean.xlsx'));
});
test('processing edge cases: no data, missing file, corrupt file', async () => {
  await rejects(dp.run('evt-basketball'), 'NO_DATA'); assert.equal((await dp.status('evt-basketball')).status, 'Failed');
  assert.throws(() => dp.downloadPath('evt-basketball', 'clean'), (e) => e.code === 'NOT_FOUND');
  await rejects(dp.issues('evt-basketball'), 'NOT_FOUND');
  adapter.files.set(excel.rawPath('evt-volleyball'), 'CORRUPT'); const { AppError } = await import('../src/utils/errors.js');
  fs_touch(excel.rawPath('evt-volleyball'));
  await rejects(dp.run('evt-volleyball'), 'EXCEL_CORRUPT'); assert.equal((await dp.status('evt-volleyball')).status, 'Failed'); void AppError;
});
import fs from 'node:fs';
function fs_touch(p) { fs.writeFileSync(p, 'x'); }
test('results validation, publish and student view', async () => {
  const cur = await results.getForEvent('evt-chess'); assert.equal(cur.entries.length, 2);   // includes injected REG-X row
  const real = cur.entries.find((e) => e.registrationId !== 'REG-X');
  await rejects(results.save('evt-chess', { entries: [{ registrationId: 'REG-NOPE', position: '1' }] }), 'VALIDATION_ERROR');
  await rejects(results.save('evt-chess', { entries: [{ registrationId: real.registrationId, position: 'x'.repeat(40) }] }), 'VALIDATION_ERROR');
  assert.equal((await results.listForStudent(u(RON))).length, 0);
  await results.save('evt-chess', { published: true, entries: [{ registrationId: real.registrationId, position: '1', outcome: 'Winner' }] });
  const mine = await results.listForStudent(u(RON)); assert.equal(mine[0].entries[0].mine, true);
});
test('certificate records exist but generation is not faked', async () => {
  const id = (await reg.listMine(u(RON))).find((r) => r.id !== 'REG-X').id;
  const c = await certs.issueRecord({ registrationId: id, type: 'participation' }); assert.equal(c.length, 1);
  await rejects(certs.issueRecord({ registrationId: id, type: 'participation' }), 'CONFLICT');
  assert.equal(certs.listForStudent(RON)[0].downloadable, false);
  await rejects(certs.download(c[0].id, u(RON)), 'NOT_IMPLEMENTED');
});
test('form builder validation and event publish guard', async () => {
  await rejects(Promise.resolve().then(() => forms.create({ title: 'F', fields: [{ label: 'Pick', type: 'dropdown', options: [] }] })), 'VALIDATION_ERROR');
  await rejects(Promise.resolve().then(() => forms.create({ title: 'F', fields: [{ label: 'A', type: 'text' }, { label: 'A', type: 'text' }] })), 'VALIDATION_ERROR');
  const f = forms.create({ title: 'New', fields: [{ label: 'Team colour', type: 'radio', options: ['Red', 'Blue'], required: true }] });
  const e = events.create({ title: 'Table Tennis Open', sport: 'Table Tennis', mode: 'individual', formId: f.id });
  await rejects(Promise.resolve().then(() => events.setStatus(e.id, 'open')), 'VALIDATION_ERROR');   // form not published
  forms.setStatus(f.id, 'published'); assert.equal(events.setStatus(e.id, 'open').status, 'open');
  assert.throws(() => events.create({ title: 'x', sport: 'Nope', mode: 'individual' }), (er) => er.code === 'VALIDATION_ERROR');
  assert.throws(() => events.create({ title: 'x', sport: 'Chess', mode: 'team' }), (er) => er.code === 'VALIDATION_ERROR');
});
test('settings validation is enforced', () => {
  assert.throws(() => updateSettings({ normalization: { crnPattern: '(' } }), (e) => e.code === 'VALIDATION_ERROR');
  assert.equal(updateSettings({ normalization: { branchAliases: { 'info tech': 'Information Technology' } } }).normalization.branchAliases['info tech'], 'Information Technology');
  assert.equal(getSettings().excel.metaHeaders.crn, 'CRN');
});
test('concurrent double-submit by the same student creates exactly one registration', async () => {
  const body = { eventId: 'evt-chess', answers: { contact: '9876500000', category: 'Beginner' } };
  const res = await Promise.allSettled([reg.submit(u(K), body), reg.submit(u(K), body), reg.submit(u(K), body)]);
  assert.equal(res.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(res.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'CONFLICT'));
  const rows = adapter.files.get(excel.rawPath('evt-chess')).Registrations.slice(1);
  assert.equal(rows.filter((r) => r.includes(K)).length, 1);
});
