import { datasetMetadata, syntheticCases } from "../data/syntheticCases.ts";
import type {
  ActiveDataset,
  ImportCandidate,
  ValidationResult,
} from "./types.ts";

export function createDemoActiveDataset(): ActiveDataset {
  return {
    cases: syntheticCases.map((item) => ({ ...item })),
    provenance: {
      sourceType: "synthetic-demo",
      displayName: datasetMetadata.name,
      rowCount: syntheticCases.length,
    },
  };
}

export function activateValidatedCandidate(
  candidate: ImportCandidate,
  validation: ValidationResult,
  importedAt: string,
): ActiveDataset {
  if (!validation.valid) {
    throw new Error("Only a valid candidate can become the active dataset.");
  }

  const sheet = candidate.workbook.sheets[candidate.selectedSheetIndex];
  return {
    cases: validation.cases.map((item) => ({ ...item })),
    provenance: {
      sourceType: candidate.workbook.sourceType,
      displayName: candidate.workbook.fileName,
      rowCount: validation.cases.length,
      sheetName:
        candidate.workbook.sourceType === "xlsx-import"
          ? sheet.name
          : undefined,
      importedAt,
      originalFileName: candidate.workbook.fileName,
    },
  };
}

export function replaceCandidate(
  _current: ImportCandidate | null,
  next: ImportCandidate,
): ImportCandidate {
  return next;
}

export function cancelCandidate(): null {
  return null;
}
