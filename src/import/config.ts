import type { CaseCategory, UrgencyLevel } from "../core/types.ts";

export const IMPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxFileLabel: "5 MB",
  maxDataRows: 5_000,
  maxColumns: 100,
  previewRows: 20,
  smallSampleRows: 30,
} as const;

export const SUPPORTED_EXTENSIONS = [".csv", ".xlsx"] as const;

export const TRIAGE_CATEGORIES: readonly CaseCategory[] = [
  "Chest pain",
  "Breathing difficulty",
  "Neurological",
  "Other acute",
];

export const URGENCY_LEVELS: readonly UrgencyLevel[] = [
  "A0",
  "A1",
  "A2",
  "C1",
  "C2",
];

export const BOOLEAN_TEXT_VALUES = ["true", "false"] as const;

export const IMPORT_RULES = {
  whitespace:
    "Surrounding whitespace is trimmed from headers and text cells. Internal whitespace is preserved.",
  booleans:
    'Boolean fields accept native spreadsheet booleans or the exact lowercase CSV values "true" and "false".',
  enums:
    "Categories and urgency codes are case-sensitive after surrounding whitespace is trimmed.",
  formulas:
    "Spreadsheet formulas are never executed. Formula cells in required mapped fields are rejected.",
} as const;
