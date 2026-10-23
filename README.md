# Digital Gymkhana

A web-based sports event management system (B.Tech IT project-based learning project).
Students browse and register for events; organizers configure events and sport-specific forms, review registrations, publish results,
and run a data-cleaning pipeline over the **Excel** registration data.

> **Status: prototype, not production-ready.** See [Open decisions](#open-decisions) and [docs/REQUIREMENTS_AUDIT.md](docs/REQUIREMENTS_AUDIT.md)
> for exactly what is implemented, what has been tested, and what has not.

## Features
- **Student:** login (CRN), dashboard, event search/filter, event details, individual and team (captain) registration with CRN lookup, registration status, history, results, certificate records, in-app notifications, profile.
- **Admin:** login, dashboard, event CRUD + publish/close/complete, **dynamic form builder** (9 field types, ordering, live preview, publish), registrations review (status changes), participants, teams, schedule, announcements, results entry/publish, certificate records, **Data Processing** (validate → normalize → de-duplicate → standardize → organize → clean Excel), Excel viewer/download, admin users, settings (normalization rules, CRN/phone patterns, Excel headers).
- **Excel is the registration store.** Every submission is appended to `data/excel/raw/<eventId>.xlsx`; the cleaner writes `data/excel/clean/<eventId>_clean.xlsx` (sheets: Clean, Needs Attention, Duplicates, Summary).

## Architecture
```
React (Vite)  ──REST──▶  Express  ──▶  routes → controllers → services ──▶ excel/ (registrations)
                                                                     └──▶ store/ (JSON metadata)
```
- **Registration responses** → Excel only (`backend/src/excel/`: `excelService`, `excelReader`, `excelWriter`, `xlsxAdapter`, `schemaMapper`, `dataValidator`, `dataCleaner`).
- **Everything else** (events, forms, students, admins, announcements, notifications, schedule, results, certificate records, processing status) → small JSON files in `data/store/`.
  *Why:* the brief forbids adding an SQL database without genuine need, and this metadata is small. This is a prototype decision; it is isolated behind `backend/src/store/jsonStore.js` if it ever needs replacing.
- The form definition drives the Excel schema: fixed columns (RegistrationID, CRN, Name, …) + one column per form field. Headers are configurable (field "Excel column header", Settings → Excel column headers). If a form changes, new columns are added; existing columns/data are kept.
- **Auth:** JWT (HS256), scrypt-hashed credentials, role middleware (`student`, `organizer`, `super_admin`), login rate limiting, token revocation on logout. Verification is isolated in `backend/src/auth/credentialProvider.js` so college SSO can replace it.
- **Certificates:** records + UI only. `backend/src/services/certificateService.js` exposes a `generator` boundary; nothing is generated or faked.

## Folder structure
```
frontend/src/{components,layouts,pages/{student,admin},hooks,services,styles}
backend/src/{routes,controllers,services,middleware,validators,utils,config,excel,auth,store}
backend/test/           node:test suites
data/excel/{raw,clean}/ registration workbooks (git-ignored)
data/store/             JSON metadata (git-ignored, created on first start)
data/sample/            sample messy workbook + notes
docs/                   requirements audit
```

## Prerequisites
Node.js **≥ 20.12** (22 recommended) and npm. No database.

## Installation
```bash
cd digital-gymkhana
npm run install:all          # installs root, backend and frontend dependencies
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env     # optional
```

## Environment
`backend/.env` (see `backend/.env.example`): `PORT`, `JWT_SECRET` (**required in production**; a random one is generated in dev), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `DATA_DIR`,
`SEED_DEMO_DATA`, `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `CRN_PATTERN` (default: exactly 10 digits).
`frontend/.env`: `VITE_API_URL` (blank in dev), `VITE_SHOW_DEMO_HINT`.
Set a real `JWT_SECRET` (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and change or disable demo credentials before any real use.

## Run
```bash
npm run dev:backend      # terminal 1 → http://localhost:4000  (creates data/ folders, seeds demo data on first start)
npm run dev:frontend     # terminal 2 → http://localhost:5173
```
Open http://localhost:5173. Logins:
| Portal | Username | Password |
|---|---|---|
| Student | CRN from `data/seed/students.seed.json` | date of birth as `DDMMYYYY` (also from that file) |
| Admin (shown as *Waghchaure Sir*) | `admin@college.edu.in` | `admin123` (**placeholder – set `DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD` before first start**) |

### Students and seed data
Students are seeded from `data/seed/students.seed.json` (**git-ignored – it contains dates of birth, never commit it**). If that file is missing, the fictional
`data/seed/students.seed.example.json` is used. Each entry: `crn, name, phone, email, branch, class, division, shift, dob`. The DOB is only used to create the login credential and only its hash is stored.
Seeding happens **only when `data/store` is empty**. After changing the seed file, stop the backend, delete `data/store/*.json` (and `data/excel/**/*.xlsx` if you don't need old registrations) and start again.
Also update `CRN_PATTERN` in your existing `backend/.env` (or delete that line) – the default is now 10 digits.
Demo team sizes are 2–3 (carrom 2) so the three seeded students can form teams; set real sizes in Admin → Events → Edit.

### Registration: prefilled details and ID-card scanning
- The registration form starts with the signed-in student's prefilled details (name, mobile, email, branch, class, division, shift), taken from college records and saved with the registration.
- For team events, the captain types or scans a member's CRN; that student's details open for confirmation before being added (other students' phone/email are masked).
- **Scan ID card** uses the browser camera (`BarcodeDetector`: Chrome/Edge; needs HTTPS or `localhost`, so it will not work over plain `http://<lan-ip>` on a phone). USB/Bluetooth barcode scanners also work: click the CRN box and scan.
- The scanned value is treated as the CRN (first 10-digit run). If the ID-card barcode encodes something else, adjust `extractCrn` in `frontend/src/components/ScanButton.jsx`.

Optional: create a few demo registrations (first three seed students) through the real submit flow (writes Excel): `cd backend && npm run seed:demo`.
Try the cleaner on a messy workbook: see [data/sample/README.md](data/sample/README.md).

## Excel data setup
Nothing to prepare: `data/excel/raw` and `data/excel/clean` are created automatically. Workbook files are named after the event id and are only reachable through validated API routes (no arbitrary paths).
The **final Sports Department Excel format is not yet known**; adjust headers in *Settings* and per-field *Excel column header* once it is supplied.

## Testing
```bash
npm test        # backend: node --test (24 tests)
```
Covers the cleaning pipeline, validators, schema mapping, registration rules (duplicates, team rules, closed events, concurrency), Excel append/update/preview/download paths, missing/corrupt workbooks, results, certificates boundary, form builder and settings validation. The suite uses an in-memory stand-in for the `xlsx` package; the real adapter (`xlsxAdapter.js`) is exercised only when you run the app.
There are **no automated frontend or HTTP-level tests yet**; verify the UI manually using the checklist in `docs/REQUIREMENTS_AUDIT.md`.

## Build
```bash
npm run build        # frontend production build → frontend/dist
NODE_ENV=production JWT_SECRET=... npm start --prefix backend
```
The backend does not serve `frontend/dist`; host it with any static server and set `CORS_ORIGIN`/`VITE_API_URL` accordingly.

## Troubleshooting
- **`process.loadEnvFile is not a function`** → upgrade Node to ≥ 20.12.
- **Logged out after every backend restart** → set `JWT_SECRET` in `backend/.env`.
- **Frontend shows "Cannot reach the server"** → backend not running on `PORT`, or `VITE_PROXY_TARGET` / `VITE_API_URL` mismatch.
- **"The Excel file could not be read"** → the workbook is corrupted or open/locked; restore from backup or delete `data/excel/raw/<event>.xlsx` (registrations in it are lost). Other events keep working.
- **Reset demo data** → stop the backend and delete `data/store/*.json` (and `data/excel/**/*.xlsx`).
- **Processing stuck on "Processing"** → restart the backend; interrupted runs become "Failed" and can be retried.

## Open decisions
Not invented by this implementation — each has a configurable placeholder:
1. **Final sports list** – six demo sports are seeded; add/rename in the database of sports (`/api/sports`).
2. **Final Sports Department Excel schema** – configurable headers/mapping; defaults are placeholders.
3. **College student database integration** – students come from the seed file → `data/store/students.json`. Replace via `credentialProvider.js` and a real student data source.
4. **Production authentication** – the prototype CRN + secret model is not production-grade (DOB is a weak secret). Swap in SSO/college auth.
5. **Certificate generation workflow** – records only; plug a generator into `certificateService.generator`.
6. **Team sizes / sport rules** – event-specific min/max; demo values (cricket 11–15, etc.) are placeholders.
7. **Deployment environment** – undecided; no Docker/cloud config included.

## Known limitations
- `xlsx` (SheetJS) on npm is at 0.18.5, which has published security advisories for parsing *untrusted* files. This app only reads workbooks it wrote itself and has no upload feature; do **not** add file upload without reviewing this.
- Revoked tokens and login rate limits are in-memory (single instance only).
- Session token is kept in `sessionStorage` (cleared when the tab closes); consider httpOnly cookies for production.
- JSON/Excel storage is single-process; concurrent writers from multiple server instances are not supported.
