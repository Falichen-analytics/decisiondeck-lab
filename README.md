# DecisionDeck Lab

Turn validated data, assumptions and scenarios into an auditable executive
decision story.

DecisionDeck Lab is a browser-based analytics portfolio application using a
fully synthetic Triage+ healthcare case. It demonstrates how an analyst can
connect data-quality checks, transparent KPIs, scenario modelling,
evidence-linked recommendations and executive communication in one controlled
workflow.

## Demonstration boundaries

- The built-in triage cases and urgency assignments are fictional and generated
  for this demonstration.
- Optional CSV/XLSX files are processed only in browser memory. Users must not
  select identifiable patient or confidential operational data.
- No real patients, clinicians, healthcare organisations or operational systems
  are represented.
- No live AI model or external API is used.
- Scenario results are illustrative assumptions, not forecasts.
- The application is not a medical device and must not be used for clinical or
  patient-care decisions.

## Current workflow

1. Use the immutable built-in synthetic dataset, or stage a local CSV/XLSX file.
2. Preview a sheet, map required fields and resolve row-level validation issues.
3. Explicitly confirm a valid import before it replaces the active dataset.
4. Inspect recalculated urgency-classification and safety metrics.
5. Review automated data and analytical quality gates.
6. Change explicit scenario assumptions and review the illustrative projection.
7. Review and export the evidence-linked decision brief only when every required
   gate passes.

## Portfolio capabilities

- deterministic synthetic data;
- local browser-only CSV and XLSX parsing;
- schema preview, explicit column mapping and row-level validation;
- active/import-candidate separation with explicit activation;
- safe dataset provenance without local file paths;
- reusable TypeScript calculation functions;
- data completeness and duplicate checks;
- urgency-code agreement and safety-critical recall metrics;
- scenario analysis with explicit assumptions;
- evidence-linked management recommendations;
- calculated evidence coverage and readiness status;
- enforced blocking of decision and export actions when a gate fails;
- responsive presentation-oriented interface;
- accessible tab and keyboard navigation;
- downloadable structured decision brief;
- automated calculation, gate-enforcement and publication checks.

## Technology

- React;
- TypeScript;
- Vite;
- PapaParse for RFC-style CSV parsing;
- read-excel-file for browser-side XLSX values and sheet discovery;
- plain CSS with design tokens;
- browser-based deterministic calculations;
- Node test runner.

## Local development

Use the package scripts provided in `package.json`:

- `pnpm dev` starts local development;
- `pnpm typecheck` validates TypeScript;
- `pnpm lint` checks source quality;
- `pnpm test` runs deterministic behavioural tests;
- `pnpm build` creates the static production application;
- `pnpm preview` previews the production build.

## Project structure

```text
index.html           Static browser entry
src/main.tsx         React application bootstrap
src/components/      Interactive portfolio experience
src/core/            Types, metrics, scenarios and quality gates
src/data/            Synthetic demonstration dataset
src/import/          Parsing, mapping, validation and activation layers
tests/               Rendered application checks
```

## Import contract

Required fields are `id`, `category`, `complete`, `safetyCritical`,
`referenceUrgency`, `predictedUrgency` and `assessmentMinutes`. Surrounding
whitespace is trimmed; internal whitespace is preserved. Categories and urgency
codes are case-sensitive. CSV booleans accept only exact lowercase `true` or
`false`; XLSX native booleans are also accepted. Assessment time must be a
finite positive number without grouping symbols.

The central limits are 5 MB, 5,000 data rows, 100 columns and 20 preview rows.
Only `.csv` and `.xlsx` are accepted. Legacy `.xls`, macro-enabled `.xlsm`,
password-protected and unsupported workbooks are rejected.

Spreadsheet formulas are not executed. Formula cells in required mapped XLSX
fields are rejected even when a cached display value exists. The application
does not claim to scan or sanitise macros. Spreadsheet-formula injection must
be addressed before any future CSV/XLSX export capability is added.

Imported rows are never written to localStorage, IndexedDB or cookies. JSON
evidence exports contain dataset provenance (source type, display name, row
count, selected sheet, import time and original filename) but not imported
rows, local paths, usernames or machine metadata.

## Planned work

- baseline comparison (planned and unavailable);
- automatic data profiling;
- central KPI and data dictionaries;
- project snapshots;
- a constrained decision-story editor;
- broader unit and accessibility tests;
- optional evidence-grounded AI assistance;
- optional editable PowerPoint export.

## Privacy

Do not select personal, confidential, regulated or commercially sensitive
records in the public demonstration. Local parsing reduces data movement but is
not a complete governance or clinical-safety control. A real-data edition would
require a separate private architecture, access controls, retention policies,
secure audit storage and organisational approval.

## Licence

Licence selection remains pending an ownership and publication-rights review.
