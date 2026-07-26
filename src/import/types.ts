import type { TriageCase } from "../core/types.ts";

export const DECISIONDECK_FIELDS = [
  "id",
  "category",
  "complete",
  "safetyCritical",
  "referenceUrgency",
  "predictedUrgency",
  "assessmentMinutes",
] as const;

export type DecisionDeckField = (typeof DECISIONDECK_FIELDS)[number];

export type ImportSourceType = "csv-import" | "xlsx-import";
export type DatasetSourceType = "synthetic-demo" | ImportSourceType;
export type RawCell = string | number | boolean | Date | null;
export type RawRow = RawCell[];

export type FormulaCell = {
  row: number;
  column: number;
  reference: string;
};

export type RawSheet = {
  name: string;
  rows: RawRow[];
  formulaCells: FormulaCell[];
};

export type RawWorkbook = {
  sourceType: ImportSourceType;
  fileName: string;
  sheets: RawSheet[];
  parserWarnings: string[];
};

export type ColumnMapping = Record<DecisionDeckField, number | null>;

export type HeaderAnalysis = {
  headers: string[];
  blankHeaderIndexes: number[];
  duplicateHeaders: Array<{ header: string; indexes: number[] }>;
};

export type ValidationIssueCode =
  | "blank-header"
  | "duplicate-header"
  | "duplicate-mapping"
  | "missing-column"
  | "missing-cell"
  | "duplicate-id"
  | "invalid-value"
  | "formula-cell"
  | "empty-file"
  | "header-only"
  | "blank-sheet"
  | "row-limit"
  | "column-limit";

export type ValidationIssue = {
  code: ValidationIssueCode;
  row: number | null;
  caseId: string | null;
  field: DecisionDeckField | null;
  sourceColumn: string | null;
  rawValue: RawCell;
  message: string;
  correction: string;
};

export type ValidationResult =
  | {
      valid: true;
      issues: [];
      cases: TriageCase[];
      rowCount: number;
    }
  | {
      valid: false;
      issues: ValidationIssue[];
      cases: null;
      rowCount: number;
    };

export type DatasetProvenance = {
  sourceType: DatasetSourceType;
  displayName: string;
  rowCount: number;
  sheetName?: string;
  importedAt?: string;
  originalFileName?: string;
};

export type ActiveDataset = {
  cases: TriageCase[];
  provenance: DatasetProvenance;
};

export type ImportCandidate = {
  workbook: RawWorkbook;
  selectedSheetIndex: number;
  mapping: ColumnMapping;
  validation: ValidationResult | null;
};
