import { Card } from './ui.jsx';

const ROWS = [['Name', 'name'], ['CRN', 'crn'], ['Mobile number', 'phone'], ['Email ID', 'email'], ['Branch', 'branch'], ['Class', 'class'], ['Division', 'division'], ['Shift', 'shift']];
/** Prefilled student details (name, number, mail, branch, class, division, shift). */
export default function StudentDetails({ student, title = 'Student details', action, note }) {
  return (
    <Card title={title} action={action}>
      <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
        {ROWS.map(([label, key]) => <div key={key} style={{ display: 'contents' }}><dt>{label}</dt><dd>{student[key] || '—'}</dd></div>)}
      </dl>
      {note && <p className="muted small" style={{ marginTop: 8 }}>{note}</p>}
    </Card>
  );
}
