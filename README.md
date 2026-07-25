# DecisionDeck Lab

Turn validated data, assumptions and scenarios into an auditable executive
decision story.

DecisionDeck Lab is a browser-based analytics portfolio application using a
fully synthetic Triage+ healthcare case. It demonstrates how an analyst can
connect data-quality checks, transparent KPIs, scenario modelling,
evidence-linked recommendations and executive communication in one controlled
workflow.

## Demonstration boundaries

- All triage cases and urgency assignments are fictional and generated for this
  demonstration.
- No real patients, clinicians, healthcare organisations or operational systems
  are represented.
- No live AI model or external API is used.
- Scenario results are illustrative assumptions, not forecasts.
- The application is not a medical device and must not be used for clinical or
  patient-care decisions.

## Current workflow

1. Review the synthetic Triage+ evaluation dataset.
2. Inspect calculated urgency-classification and safety metrics.
3. Review automated data and analytical quality gates.
4. Change explicit scenario assumptions.
5. Review the calculated annual opportunity.
6. Review the evidence-linked executive decision brief.
7. Export the current brief as JSON only when every required gate passes.

## Portfolio capabilities

- deterministic synthetic data;
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
tests/               Rendered application checks
```

## Planned work

- CSV import (planned and unavailable);
- XLSX import (planned and unavailable);
- baseline comparison (planned and unavailable);
- automatic data profiling;
- central KPI and data dictionaries;
- project snapshots;
- a constrained decision-story editor;
- broader unit and accessibility tests;
- optional evidence-grounded AI assistance;
- optional editable PowerPoint export.

## Privacy

Do not place personal, confidential, regulated or commercially sensitive
records in the public demonstration. A real-data edition would require a
separate private architecture, access controls, retention policies, secure
audit storage and organisational approval.

## Licence

Licence selection remains pending an ownership and publication-rights review.
