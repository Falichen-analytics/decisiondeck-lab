# Media Capture Plan

Verified screenshots and a short demonstration will be captured during Phase 3
after the GitHub Pages base path and production deployment workflow are ready.
No interface state will be mocked or reconstructed outside the running
application.

## Screenshot matrix

| File | Viewport | Actual state to capture |
| --- | --- | --- |
| `01-desktop-hero.png` | 1440 × 900 | Built-in synthetic dataset; hero and executive brief |
| `02-import-preview.png` | 1440 × 900 | Public sample CSV selected; first 20 rows previewed |
| `03-column-mapping.png` | 1440 × 900 | All seven required fields mapped in the import workspace |
| `04-validation-errors.png` | 1440 × 900 | Temporary synthetic source with real row-level validation errors; active dataset unchanged |
| `05-passing-gates.png` | 1440 × 900 | Built-in or public sample data with calculated passing gates |
| `06-blocked-decision.png` | 1440 × 900 | Valid temporary synthetic data whose calculated quality gates fail |
| `07-scenario-lab.png` | 1440 × 900 | Scenario inputs, sample size and forecast disclaimer visible |
| `08-evidence-story.png` | 1440 × 900 | Passing evidence-linked decision story |
| `09-mobile-view.png` | 390 × 844 | Actual responsive application with no horizontal overflow |

Planned destination: `docs/assets/screenshots/`. The directory will be created
when verified image files are available; empty or fabricated placeholders will
not be committed.

## Capture data

- Use the immutable built-in data or
  `examples/sample-triage-cases.csv` for passing states.
- Produce invalid and gate-failing states from temporary synthetic files created
  solely for capture.
- Do not use names, organisations, local paths or real operational figures.
- Keep synthetic and non-clinical-use labels visible where practical.

## Short demonstration

Target duration: 30–45 seconds.

| Time | Action |
| ---: | --- |
| 0–4 s | Show the synthetic demonstration and current readiness |
| 4–8 s | Select `sample-triage-cases.csv` |
| 8–13 s | Inspect the raw preview and detected columns |
| 13–18 s | Review all seven mappings |
| 18–23 s | Validate the candidate |
| 23–27 s | Explicitly confirm activation |
| 27–33 s | Show recalculated KPIs and passing gates |
| 33–38 s | Show the illustrative scenario and assumptions |
| 38–45 s | Finish on the evidence-linked decision story |

Preferred format: MP4 for quality and accessibility, with an optional short GIF
for the README. Include concise captions and avoid rapid cursor movement.

## Verification before publishing media

- capture from the production build or verified GitHub Pages URL;
- check desktop and mobile cropping;
- confirm no browser chrome exposes local paths or usernames;
- inspect every frame for private data;
- confirm displayed values match the active synthetic dataset;
- add useful alt text to every README image;
- keep the repository private until the final media and privacy audit passes.
