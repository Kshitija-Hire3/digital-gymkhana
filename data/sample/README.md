# Sample data

`evt-chess-messy-sample.xlsx` — a deliberately messy registration workbook for the seeded **Annual Chess Championship** (`evt-chess`).
It contains: extra whitespace, wrong capitalization, spaced/hyphenated phone numbers, a duplicate CRN, a bad phone, a bad CRN,
an unknown option, a non-numeric rating and a missing name.

Try the cleaning pipeline:

1. Start the backend once (creates demo events).
2. Copy the file: `cp data/sample/evt-chess-messy-sample.xlsx data/excel/raw/evt-chess.xlsx`
3. Sign in as admin → **Data Processing** → select *Annual Chess Championship* → **Run validation & cleaning**.
4. Inspect the *Cleaned data*, *Needs correction* and *Duplicates* tabs, or download the cleaned workbook.

Expected result for this file: **7 processed, 3 valid, 3 need correction, 1 duplicate**
(the counts are computed from the file at run time, not hard-coded).

Note: `info tech` in row 1 stays as-is in the cleaned output until you add a mapping under **Settings → Branch / program name standardization** (the app ships with no institution-specific aliases). Also, the sample is a plain fixture. Its column headers follow the defaults in Settings → Excel column headers (Phone, Email, Branch, Class, Division, Shift, …). All CRNs and names in the file are fictional.

## Students

Students are seeded from `data/seed/students.seed.json` (git-ignored) into `data/store/students.json` on first start. Each stored record: `{ crn, name, phone, email, branch, class, division, shift, active, secretHash }`.
`secretHash` is a scrypt hash — never store plain credentials. Real student data must come from the college (open decision).
