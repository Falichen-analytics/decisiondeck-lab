# Sample Data Schema

The public example at
[`examples/sample-triage-cases.csv`](../examples/sample-triage-cases.csv)
contains 32 fictional rows. It is large enough to avoid the interface's
small-sample warning and contains no real patient or organisation information.

## Required columns

The header must contain these seven fields:

```csv
id,category,complete,safetyCritical,referenceUrgency,predictedUrgency,assessmentMinutes
```

| Field | Type | Meaning | Validation |
| --- | --- | --- | --- |
| `id` | Text | Synthetic row identifier | Required and unique |
| `category` | Enum | Fictional symptom grouping | Case-sensitive approved value |
| `complete` | Boolean | Whether required assessment information is complete | CSV: exact `true` or `false` |
| `safetyCritical` | Boolean | Whether the fictional case is used in the safety-recall calculation | CSV: exact `true` or `false` |
| `referenceUrgency` | Enum | Fictional comparison urgency | `A0`, `A1`, `A2`, `C1` or `C2` |
| `predictedUrgency` | Enum | Fictional evaluated urgency | `A0`, `A1`, `A2`, `C1` or `C2` |
| `assessmentMinutes` | Number | Illustrative assessment duration | Finite and greater than zero |

## Accepted categories

- `Chest pain`
- `Breathing difficulty`
- `Neurological`
- `Other acute`

These labels are demonstration categories. They do not define a clinical
taxonomy or decision protocol.

## Formatting rules

- Surrounding whitespace is trimmed.
- Internal whitespace remains unchanged.
- Category and urgency values are case-sensitive.
- CSV booleans must be lowercase.
- Native XLSX booleans are accepted.
- Numbers may use an integer or decimal point but not grouping symbols.
- Extra columns may be left unmapped.
- Blank or duplicate headers are rejected.
- Formula cells in required mapped XLSX fields are rejected.

## File limits

| Limit | Value |
| --- | ---: |
| File size | 5 MB |
| Data rows | 5,000 |
| Columns | 100 |
| Preview rows | 20 |
| Small-sample warning | Fewer than 30 rows |

## Example characteristics

The public CSV:

- has 32 unique `DEMO-###` identifiers;
- covers all four accepted categories;
- uses several urgency levels;
- contains one fictional incomplete row while remaining above the completeness
  gate;
- contains one non-safety-critical disagreement for visible but passing
  agreement;
- preserves escalation for every fictional safety-critical row;
- is intended solely to exercise the import and analytics workflow.

## Safety boundary

Do not replace the fictional rows with identifiable patient, clinician or
confidential operational data in the public demonstration. Local parsing
reduces data movement but does not provide governance, access control,
retention management or clinical validation.
