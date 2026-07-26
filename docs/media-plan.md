# Media Capture Plan

The screenshots below were captured from the real production build during
Phase 3. They use only the built-in fictional data, the public synthetic sample
CSV or temporary synthetic fixtures. No interface state was mocked.

## Screenshot matrix

| File | Dimensions | Verified application state |
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

All nine files are stored in `docs/assets/screenshots/` and were visually
inspected after capture. The images contain no browser chrome, desktop content,
notifications, local paths, confidential filenames, real organisations or
individuals.

## Capture data

- Use the immutable built-in data or
  `examples/sample-triage-cases.csv` for passing states.
- Produce invalid and gate-failing states from temporary synthetic files created
  solely for capture.
- Do not use names, organisations, local paths or real operational figures.
- Keep synthetic and non-clinical-use labels visible where practical.

## Short demonstration — deferred

The target remains 30–45 seconds:

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

No MP4 or GIF was created because reliable capture tooling was unavailable.
Future recording should prefer MP4 for quality and accessibility, include
concise captions and avoid rapid cursor movement. It must repeat the privacy
review before publication.

## Social preview

`public/social-preview.png` is exactly 1280 × 640. It combines the approved
tagline, a synthetic-demonstration label and a crop of the real desktop hero
capture. It introduces no invented KPI values or external branding.

## Verification before publishing media

- captured from the production build under `/decisiondeck-lab/`;
- desktop and 390 × 844 mobile cropping inspected;
- no browser chrome, local paths or usernames visible;
- every included image inspected for private data;
- displayed values checked against the active synthetic dataset;
- README media includes useful alt text;
- image dimensions and PNG metadata checked automatically;
- repository remains private pending the final release audit.
