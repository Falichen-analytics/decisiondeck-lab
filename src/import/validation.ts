import type {
  CaseCategory,
  TriageCase,
  UrgencyLevel,
} from "../core/types.ts";
import {
  IMPORT_LIMITS,
  TRIAGE_CATEGORIES,
  URGENCY_LEVELS,
} from "./config.ts";
import {
  analyseHeaders,
  mappingHasDuplicateColumns,
} from "./mapping.ts";
import {
  DECISIONDECK_FIELDS,
  type ColumnMapping,
  type DecisionDeckField,
  type RawCell,
  type RawSheet,
  type ImportSourceType,
  type ValidationIssue,
  type ValidationResult,
} from "./types.ts";

function issue(
  partial: Omit<ValidationIssue, "caseId"> & { caseId?: string | null },
): ValidationIssue {
  return { caseId: null, ...partial };
}

function isBlank(value: RawCell | undefined): boolean {
  return value === null || value === undefined || value === "";
}

function trimmedText(value: RawCell): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function parseBoolean(value: RawCell): boolean | null {
  if (typeof value === "boolean") return value;
  const text = trimmedText(value);
  if (text === "true") return true;
  if (text === "false") return false;
  return null;
}

function parsePositiveNumber(value: RawCell): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const text = trimmedText(value);
  if (!text || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseEnum<T extends string>(
  value: RawCell,
  allowed: readonly T[],
): T | null {
  const text = trimmedText(value);
  return text && allowed.includes(text as T) ? (text as T) : null;
}

function sourceColumn(
  headers: string[],
  mapping: ColumnMapping,
  field: DecisionDeckField,
): string | null {
  const index = mapping[field];
  return index === null ? null : headers[index] || `Column ${index + 1}`;
}

function rawFor(
  row: RawCell[],
  mapping: ColumnMapping,
  field: DecisionDeckField,
): RawCell | undefined {
  const index = mapping[field];
  return index === null ? undefined : row[index];
}

export function validateSheet(
  sheet: RawSheet,
  mapping: ColumnMapping,
  sourceType?: ImportSourceType,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rows = sheet.rows;
  const headerAnalysis = analyseHeaders(rows[0]);
  const dataRows = rows.slice(1);

  if (rows.length === 0 || rows.every((row) => row.every(isBlank))) {
    return {
      valid: false,
      cases: null,
      rowCount: 0,
      issues: [
        issue({
          code: sourceType === "csv-import" ? "empty-file" : "blank-sheet",
          row: null,
          field: null,
          sourceColumn: null,
          rawValue: null,
          message:
            sourceType === "csv-import"
              ? "The selected CSV file is empty."
              : "The selected sheet is blank.",
          correction: "Choose a populated sheet or select another file.",
        }),
      ],
    };
  }

  if (rows.length === 1) {
    issues.push(
      issue({
        code: "header-only",
        row: 1,
        field: null,
        sourceColumn: null,
        rawValue: null,
        message: "The selected sheet contains headers but no data rows.",
        correction: "Add at least one data row before importing.",
      }),
    );
  }

  if (headerAnalysis.headers.length > IMPORT_LIMITS.maxColumns) {
    issues.push(
      issue({
        code: "column-limit",
        row: 1,
        field: null,
        sourceColumn: null,
        rawValue: headerAnalysis.headers.length,
        message: `The sheet contains ${headerAnalysis.headers.length} columns; the limit is ${IMPORT_LIMITS.maxColumns}.`,
        correction: "Remove unnecessary columns and try again.",
      }),
    );
  }

  if (dataRows.length > IMPORT_LIMITS.maxDataRows) {
    issues.push(
      issue({
        code: "row-limit",
        row: null,
        field: null,
        sourceColumn: null,
        rawValue: dataRows.length,
        message: `The sheet contains ${dataRows.length} data rows; the limit is ${IMPORT_LIMITS.maxDataRows}.`,
        correction: "Split the file into a smaller evaluation sample.",
      }),
    );
  }

  headerAnalysis.blankHeaderIndexes.forEach((index) => {
    issues.push(
      issue({
        code: "blank-header",
        row: 1,
        field: null,
        sourceColumn: `Column ${index + 1}`,
        rawValue: rows[0]?.[index] ?? null,
        message: `Column ${index + 1} has a blank header.`,
        correction: "Give every source column a unique, descriptive header.",
      }),
    );
  });

  headerAnalysis.duplicateHeaders.forEach(({ header, indexes }) => {
    issues.push(
      issue({
        code: "duplicate-header",
        row: 1,
        field: null,
        sourceColumn: indexes.map((index) => index + 1).join(", "),
        rawValue: header,
        message: `Header "${header}" appears more than once after documented whitespace and case normalisation.`,
        correction: "Rename duplicate source columns before importing.",
      }),
    );
  });

  DECISIONDECK_FIELDS.forEach((field) => {
    if (mapping[field] === null) {
      issues.push(
        issue({
          code: "missing-column",
          row: 1,
          field,
          sourceColumn: null,
          rawValue: null,
          message: `No source column is mapped to ${field}.`,
          correction: "Select a source column for every required field.",
        }),
      );
    }
  });

  if (mappingHasDuplicateColumns(mapping)) {
    issues.push(
      issue({
        code: "duplicate-mapping",
        row: 1,
        field: null,
        sourceColumn: null,
        rawValue: null,
        message: "A source column is mapped to more than one required field.",
        correction: "Use each source column only once.",
      }),
    );
  }

  const formulaLookup = new Set(
    sheet.formulaCells.map((cell) => `${cell.row}:${cell.column}`),
  );
  const parsedCases: TriageCase[] = [];
  const idRows = new Map<string, number[]>();

  dataRows.forEach((row, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const rawId = rawFor(row, mapping, "id");
    const caseId = typeof rawId === "string" ? rawId.trim() || null : null;
    const parsed: Partial<TriageCase> = {};
    if (caseId) {
      if (!idRows.has(caseId)) idRows.set(caseId, []);
      idRows.get(caseId)?.push(rowNumber);
    }

    DECISIONDECK_FIELDS.forEach((field) => {
      const columnIndex = mapping[field];
      if (columnIndex === null) return;
      const rawValue = row[columnIndex];
      const columnName = sourceColumn(
        headerAnalysis.headers,
        mapping,
        field,
      );

      if (formulaLookup.has(`${rowNumber}:${columnIndex + 1}`)) {
        issues.push(
          issue({
            code: "formula-cell",
            row: rowNumber,
            caseId,
            field,
            sourceColumn: columnName,
            rawValue: rawValue ?? null,
            message: `Row ${rowNumber} uses a formula in required field ${field}.`,
            correction:
              "Replace the formula with a reviewed static value before importing.",
          }),
        );
        return;
      }

      if (isBlank(rawValue)) {
        issues.push(
          issue({
            code: "missing-cell",
            row: rowNumber,
            caseId,
            field,
            sourceColumn: columnName,
            rawValue: rawValue ?? null,
            message: `Row ${rowNumber} is missing required field ${field}.`,
            correction: "Populate the required cell and validate again.",
          }),
        );
        return;
      }

      if (field === "id") {
        const value = trimmedText(rawValue);
        if (!value) {
          issues.push(
            issue({
              code: "invalid-value",
              row: rowNumber,
              caseId,
              field,
              sourceColumn: columnName,
              rawValue,
              message: `Row ${rowNumber} has an invalid case identifier.`,
              correction: "Use a non-empty text identifier.",
            }),
          );
        } else {
          parsed.id = value;
        }
        return;
      }

      if (field === "category") {
        const value = parseEnum(rawValue, TRIAGE_CATEGORIES);
        if (value) parsed.category = value as CaseCategory;
        else
          issues.push(
            issue({
              code: "invalid-value",
              row: rowNumber,
              caseId,
              field,
              sourceColumn: columnName,
              rawValue,
              message: `Row ${rowNumber} has an invalid, case-sensitive category.`,
              correction: `Use one of: ${TRIAGE_CATEGORIES.join(", ")}.`,
            }),
          );
        return;
      }

      if (field === "complete" || field === "safetyCritical") {
        const value = parseBoolean(rawValue);
        if (value === null)
          issues.push(
            issue({
              code: "invalid-value",
              row: rowNumber,
              caseId,
              field,
              sourceColumn: columnName,
              rawValue,
              message: `Row ${rowNumber} has an invalid boolean in ${field}.`,
              correction:
                'Use a native XLSX boolean or exact lowercase "true" or "false".',
            }),
          );
        else parsed[field] = value;
        return;
      }

      if (
        field === "referenceUrgency" ||
        field === "predictedUrgency"
      ) {
        const value = parseEnum(rawValue, URGENCY_LEVELS);
        if (value) parsed[field] = value as UrgencyLevel;
        else
          issues.push(
            issue({
              code: "invalid-value",
              row: rowNumber,
              caseId,
              field,
              sourceColumn: columnName,
              rawValue,
              message: `Row ${rowNumber} has an invalid, case-sensitive urgency code.`,
              correction: `Use one of: ${URGENCY_LEVELS.join(", ")}.`,
            }),
          );
        return;
      }

      const value = parsePositiveNumber(rawValue);
      if (value === null)
        issues.push(
          issue({
            code: "invalid-value",
            row: rowNumber,
            caseId,
            field,
            sourceColumn: columnName,
            rawValue,
            message: `Row ${rowNumber} has an invalid assessment duration.`,
            correction: "Use a finite positive number without grouping symbols.",
          }),
        );
      else parsed.assessmentMinutes = value;
    });

    if (DECISIONDECK_FIELDS.every((field) => parsed[field] !== undefined)) {
      parsedCases.push(parsed as TriageCase);
    }
  });

  idRows.forEach((rowNumbers, id) => {
    if (rowNumbers.length < 2) return;
    rowNumbers.forEach((rowNumber) => {
      issues.push(
        issue({
          code: "duplicate-id",
          row: rowNumber,
          caseId: id,
          field: "id",
          sourceColumn: sourceColumn(
            headerAnalysis.headers,
            mapping,
            "id",
          ),
          rawValue: id,
          message: `Case ID "${id}" is duplicated on rows ${rowNumbers.join(", ")}.`,
          correction: "Assign one unique identifier to each row.",
        }),
      );
    });
  });

  if (issues.length > 0) {
    return {
      valid: false,
      cases: null,
      issues,
      rowCount: dataRows.length,
    };
  }

  return {
    valid: true,
    cases: parsedCases,
    issues: [],
    rowCount: dataRows.length,
  };
}
