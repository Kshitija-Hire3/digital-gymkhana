// Demo data. Sports list and team sizes are placeholders - see README "Open decisions".
// Students are read from data/seed/students.seed.json (git-ignored, contains DOBs);
// if that file is missing, data/seed/students.seed.example.json (fictional) is used instead.
import fs from 'node:fs';
import path from 'node:path';
import { db } from './jsonStore.js';
import { config } from '../config/index.js';
import { hashSecret } from '../auth/credentials.js';
import { ROLES } from '../utils/constants.js';

const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const phone = (label = 'Contact number') => ({ key: 'contact', label, type: 'phone', required: true, placeholder: '10-digit mobile number' });

export function loadSeedStudents() {
  const dir = path.join(config.root, 'data', 'seed');
  const real = path.join(dir, 'students.seed.json');
  const file = fs.existsSync(real) ? real : path.join(dir, 'students.seed.example.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const need = ['crn', 'name', 'dob'];
  list.forEach((s, i) => need.forEach((k) => { if (!s[k]) throw new Error(`${path.basename(file)}: student #${i + 1} is missing "${k}"`); }));
  return list;
}

export function seedIfEmpty() {
  if (db.admins.count() === 0) {
    db.admins.insert({ id: 'adm-demo-super', name: config.demoAdminName, email: config.demoAdminEmail.toLowerCase(), role: ROLES.SUPER, active: true, passwordHash: hashSecret(config.demoAdminPassword) });
  }
  if (!config.seedDemo || db.events.count() > 0 || db.students.count() > 0) return;

  ['Cricket', 'Volleyball', 'Basketball', 'Table Tennis', 'Chess', 'Carrom'].forEach((name) => db.sports.insert({ name, description: '' }));

  // The login "password" is the date of birth exactly as written in the seed file (e.g. 18032006 = DDMMYYYY). Only its hash is stored.
  loadSeedStudents().forEach((s) => db.students.insert({
    crn: String(s.crn).trim(), name: s.name, phone: s.phone || '', email: s.email || '', branch: s.branch || '', class: s.class || '',
    division: s.division || '', shift: s.shift || '', active: true, secretHash: hashSecret(String(s.dob).trim()),
  }));

  const forms = {
    cricket: { title: 'Cricket Tournament Registration', description: 'Captain submits team details.', fields: [phone('Captain contact number'),
      { key: 'preferred_format', label: 'Preferred format', type: 'radio', required: true, options: ['Tennis ball', 'Leather ball'] },
      { key: 'notes', label: 'Additional notes', type: 'textarea', required: false }] },
    chess: { title: 'Chess Championship Registration', description: 'Individual entry.', fields: [phone(),
      { key: 'category', label: 'Skill category', type: 'dropdown', required: true, options: ['Beginner', 'Intermediate', 'Advanced'] },
      { key: 'rating', label: 'Rating (if any)', type: 'number', required: false, min: 0, max: 3500 }] },
    volleyball: { title: 'Volleyball League Registration', description: 'Captain submits team details.', fields: [phone('Captain contact number'),
      { key: 'notes', label: 'Additional notes', type: 'textarea', required: false }] },
    basketball: { title: 'Basketball 3x3 Registration', description: 'Captain submits team details.', fields: [phone('Captain contact number'),
      { key: 'availability', label: 'Availability', type: 'checkbox', required: true, options: ['Morning', 'Afternoon', 'Evening'] }] },
    carrom: { title: 'Carrom Doubles Registration', description: 'Captain registers a pair.', fields: [phone('Captain contact number')] },
  };
  for (const [k, f] of Object.entries(forms)) db.forms.insert({ id: `frm-${k}`, ...f, fields: f.fields.map((x, i) => ({ options: [], placeholder: '', helpText: '', ...x, order: i })), status: 'published' });

  const ev = (k, title, sport, mode, date, deadline, extra = {}) => db.events.insert({ id: `evt-${k}`, title, sport, description: `${title} - demo event.`, venue: 'College Ground', date: inDays(date), registrationDeadline: inDays(deadline), mode, formId: `frm-${k}`, status: 'open', rules: '', ...extra });
  // DEMO team sizes (2-3 so the three seeded students can form teams). Set the real sizes via Admin > Events > Edit.
  ev('cricket', 'Inter-Branch Cricket Tournament', 'Cricket', 'team', 20, 10, { teamMin: 2, teamMax: 3, venue: 'Main Cricket Ground' });
  ev('chess', 'Annual Chess Championship', 'Chess', 'individual', 14, 5, { venue: 'Indoor Games Hall' });
  ev('volleyball', 'Volleyball League — Spring', 'Volleyball', 'team', 25, 15, { teamMin: 2, teamMax: 3, venue: 'Volleyball Court' });
  ev('basketball', 'Basketball 3×3 Tournament', 'Basketball', 'team', 28, 18, { teamMin: 2, teamMax: 3, venue: 'Basketball Court' });
  ev('carrom', 'Carrom Doubles', 'Carrom', 'team', 16, 8, { teamMin: 2, teamMax: 2, venue: 'Indoor Games Hall' });

  db.announcements.insert({ title: 'Sports Week — Schedule Announced', body: 'The complete schedule for Sports Week has been released. Check the Schedule section.', author: config.demoAdminName });
  db.announcements.insert({ title: 'Cricket Tournament Venue Change', body: 'The cricket matches will be played at the Main Cricket Ground.', author: 'Gymkhana Office' });
  db.schedule.insert({ eventId: 'evt-chess', title: 'Round 1', date: inDays(14), time: '10:00', venue: 'Indoor Games Hall', round: 'Round 1', notes: '' });
}
