# Requirements audit

**How to read this.** *Implemented* = the code for the interaction exists end-to-end. *Tested* uses three levels:
**Unit** = automated backend test that passed (`npm test`, 24 tests, in-memory stand-in for the `xlsx` package);
**Static** = syntax/import cross-check only (frontend); **Not run** = never executed. The frontend, Express routing, JWT middleware and the real `xlsx` adapter
**have not been executed** in the environment where this was written (no network → no `npm install`). Treat every "Not run" as unverified until you run it.

| Requirement | Implemented | Tested | Notes |
|---|---|---|---|
| Excel as registration store (append on submit) | Yes | Unit | Append/read/update/preview via `excelService`; real file I/O only in `xlsxAdapter` (Not run) |
| Sport-specific schema from form definition | Yes | Unit | Meta columns + one column per field; team columns for team events; extra file columns preserved |
| Configurable column mapping | Yes | Unit (settings validation) | Settings → Excel headers; per-field "Excel column header" |
| Pipeline: validate → normalize → duplicates → standardize → organize | Yes | Unit | Summary computed from rows; verified on the sample workbook: 7/3/3/1 |
| Duplicate CRN / duplicate team member detection | Yes | Unit | First occurrence wins |
| Invalid phone / CRN / option / number / missing field detection | Yes | Unit | Patterns configurable |
| Branch standardization | Yes (mechanism) | Unit | **No institutional aliases shipped** – supply via Settings |
| Data Processing statuses (Not Processed / Processing / Processed / Needs Attention / Failed) | Yes | Unit (service) / Not run (UI) | Retry supported; interrupted runs → Failed on restart |
| Data Processing UI (select sport/event, inspect raw, run, summary, issues, preview, download) | Yes | Static | |
| Missing / corrupt workbook handling | Yes | Unit | Corrupt file isolated: other events keep working |
| Prefilled student details (name, mobile, email, branch, class, division, shift) | Yes | Unit (lookup, masking, Excel columns) / Static (UI) | Captain's own details shown in full; other students' phone/email masked |
| ID-card barcode scan during registration | Yes (camera + keyboard-scanner) | **Not run** | Uses browser `BarcodeDetector`; needs Chrome/Edge + HTTPS/localhost. Assumes barcode = CRN (first 10 digits) – **unverified against a real ID card** |
| Student login (CRN) | Yes | Unit (hashing) / Not run (endpoint) | scrypt hash; rate limited; isolated in `credentialProvider.js` |
| Admin login, roles, protected routes, logout | Yes | Not run | JWT + `requireRole`; revocation on logout; `RequireAuth` on client |
| Unauthorized/forbidden states | Yes | Not run | 401 → auto sign-out; 403 UI |
| Student: dashboard, events, search/filter, details | Yes | Static | Filters: text, sport, type, availability |
| Individual registration | Yes | Unit (service) | |
| Team/captain registration (CRN lookup, size limits, no duplicates) | Yes | Unit (service) | Sizes are event-specific |
| Registration confirmation, my registrations, detail, status | Yes | Unit (service) / Static (UI) | |
| Participation history | Yes | Static | Shows past-dated events with outcome if published |
| Results (student view) | Yes | Unit (service) | Only published results, only for events the student is in |
| Certificates interface | Yes (records only) | Unit | **No generation, no PDF, no Autocrat**; downloads disabled with explanation |
| Notifications (in-app) | Yes | Unit (service) | New event, registration, schedule, results, announcements, certificate records |
| Profile | Yes | Static | Read-only (college data) |
| Admin: event CRUD + publish/close/complete | Yes | Unit (service) | Cannot open without a published form; cannot delete events with data |
| Dynamic form builder (types, order, options, required, preview, publish) | Yes | Unit (validation) / Static (UI) | 9 field types |
| Dynamic form rendering for students | Yes | Static | Single `DynamicField` component, no per-sport components |
| Registration management (review/approve/reject) | Yes | Unit (service) | Updates the Excel row + notifies |
| Participants / Teams views | Yes | Static | Derived from Excel data |
| Schedule, Announcements | Yes | Unit (service) | |
| Results entry/publish | Yes | Unit | Free-text position/outcome; **no ranking logic** |
| Admin users, Settings | Yes | Unit (settings) / Not run (users endpoints) | Super-admin only; last super-admin protected |
| REST API structure, central errors, validation | Yes | Not run (HTTP) | Consistent `{success,data|error}` envelope |
| Security (no secrets in source, env vars, server-side authz, path safety) | Yes | Partial | Event ids validated before touching files; no upload endpoints |
| Responsive design | Yes (CSS) | Not run | Drawer nav < 900px, stacked-card tables < 720px, filter collapse, sticky action bars |
| Figma fidelity | Partial | Not run | Only 4 frames were provided (student login/dashboard, admin login/dashboard). Other screens follow the same tokens/patterns but are **not** from Figma. No visual comparison has been done |
| `.env.example`, README, sample data | Yes | – | |
| Lint | **No** | – | No ESLint config was added |
| Frontend tests / production build | **No** | – | Not run here |

## Conflicts between Figma and the written requirements
1. **Credential field** – Figma: "Password / Date of Birth" with a demo value `password`. Kept the label; credential is hashed, never in URLs/logs; hint box gated by `VITE_SHOW_DEMO_HINT`.
2. **Data-processing status names** – Figma: Completed / Pending / Processing. Spec: Not Processed / Processing / Processed / Needs Attention / Failed. **Spec names are used** (Completed→Processed, Pending→Not Processed).
3. **Registration statuses** – Figma: Submitted / Under Review / Approved. Added **Rejected**.
4. **Figma demo strings** (names, `REG-2024-…`, dates) are not hard-coded; seed data is clearly fictional and event dates are relative to today.
5. **Login marketing list** (Cricket Tournament, …) is static copy in `pages/student/Login.jsx` (`HIGHLIGHTS`).

## Manual UI checklist (please run before relying on this)
Student: sign in (valid/invalid) → dashboard → events search/filter → event details → individual registration → team registration (unknown CRN, duplicate CRN, too few members) → confirmation → my registrations → notifications (mark read) → certificates (disabled download message) → sign out → protected URL redirects to login.
Admin: sign in → create event → create form (all field types, reorder, preview) → publish form → publish event → student registers → approve/reject → schedule/announcement → results (save, publish) → Data Processing (copy `data/sample/evt-chess-messy-sample.xlsx` first; run; inspect tabs; download) → Users/Settings.
Responsive: repeat a few flows at ~390px, ~768px, ~1280px widths.
