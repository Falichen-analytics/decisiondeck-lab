import assert from "node:assert/strict";
import test from "node:test";

import {
  activateValidatedCandidate,
  cancelCandidate,
  createDemoActiveDataset,
  replaceCandidate,
} from "../src/import/activation.ts";
import { IMPORT_LIMITS } from "../src/import/config.ts";
import {
  analyseHeaders,
  suggestMapping,
} from "../src/import/mapping.ts";
import { parseCsvText } from "../src/import/parsers.ts";
import { validateSheet } from "../src/import/validation.ts";
import { syntheticCases } from "../src/data/syntheticCases.ts";

const headers = [
  "id",
  "category",
  "complete",
  "safetyCritical",
  "referenceUrgency",
  "predictedUrgency",
  "assessmentMinutes",
];

const validRow = [
  "IMPORT-001",
  "Chest pain",
  "true",
  "true",
  "A1",
  "A1",
  "14",
];

function sheet(rows, formulaCells = [], name = "CSV") {
  return { name, rows, formulaCells };
}

function mappingFor(sourceHeaders = headers) {
  return suggestMapping(analyseHeaders(sourceHeaders).headers);
}

function codes(result) {
  return result.issues.map((item) => item.code);
}

test("parses quoted CSV locally without dynamic type coercion", () => {
  const parsed = parseCsvText(
    `${headers.join(",")}\n"IMPORT-001","Other acute","true","false","C1","C1","12"\n`,
  );
  assert.deepEqual(parsed.rows[1], [
    "IMPORT-001",
    "Other acute",
    "true",
    "false",
    "C1",
    "C1",
    "12",
  ]);
});

test("accepts extra unmapped columns without changing the activated schema", () => {
  const sourceHeaders = [...headers, "analyst note"];
  const result = validateSheet(
    sheet([sourceHeaders, [...validRow, "not imported"]]),
    mappingFor(sourceHeaders),
    "csv-import",
  );
  assert.equal(result.valid, true);
  assert.deepEqual(Object.keys(result.cases[0]), headers);
});

test("reports empty CSV, header-only CSV and blank XLSX sheets distinctly", () => {
  const empty = validateSheet(sheet([]), mappingFor(), "csv-import");
  const headerOnly = validateSheet(
    sheet([headers]),
    mappingFor(),
    "csv-import",
  );
  const blankXlsx = validateSheet(
    sheet([[]], [], "Blank"),
    mappingFor(),
    "xlsx-import",
  );
  assert.ok(codes(empty).includes("empty-file"));
  assert.ok(codes(headerOnly).includes("header-only"));
  assert.ok(codes(blankXlsx).includes("blank-sheet"));
});

test("reports blank and ambiguous duplicate headers", () => {
  const sourceHeaders = [...headers];
  sourceHeaders[1] = " ";
  sourceHeaders.push(" ID ");
  const result = validateSheet(
    sheet([sourceHeaders, [...validRow, "IMPORT-002"]]),
    mappingFor(sourceHeaders),
    "csv-import",
  );
  assert.ok(codes(result).includes("blank-header"));
  assert.ok(codes(result).includes("duplicate-header"));
});

test("reports missing columns, cells, duplicate IDs and invalid values", () => {
  const sourceHeaders = headers.slice(0, -1);
  const mapping = mappingFor(sourceHeaders);
  const rows = [
    sourceHeaders,
    validRow.slice(0, -1),
    [
      "IMPORT-001",
      "chest pain",
      "TRUE",
      "false",
      "a1",
      "",
    ],
  ];
  const result = validateSheet(
    sheet(rows),
    mapping,
    "csv-import",
  );
  assert.ok(codes(result).includes("missing-column"));
  assert.ok(codes(result).includes("missing-cell"));
  assert.ok(codes(result).includes("duplicate-id"));
  assert.ok(codes(result).includes("invalid-value"));
});

test("documents trimming while preserving case-sensitive enums and booleans", () => {
  const trimmed = validateSheet(
    sheet([
      headers,
      [
        "  IMPORT-001  ",
        "  Chest pain  ",
        " true ",
        " false ",
        " A1 ",
        " A1 ",
        " 14 ",
      ],
    ]),
    mappingFor(),
    "csv-import",
  );
  const wrongCase = validateSheet(
    sheet([
      headers,
      [
        "IMPORT-002",
        "chest pain",
        "True",
        "false",
        "a1",
        "A1",
        "14",
      ],
    ]),
    mappingFor(),
    "csv-import",
  );
  assert.equal(trimmed.valid, true);
  assert.equal(trimmed.cases[0].id, "IMPORT-001");
  assert.equal(wrongCase.valid, false);
  assert.equal(
    wrongCase.issues.filter((item) => item.code === "invalid-value").length,
    3,
  );
});

test("rejects formulas in mapped fields even when a cached scalar exists", () => {
  const result = validateSheet(
    sheet([headers, validRow], [
      { row: 2, column: 7, reference: "G2" },
    ]),
    mappingFor(),
    "xlsx-import",
  );
  assert.ok(codes(result).includes("formula-cell"));
  assert.equal(result.valid, false);
});

test("enforces central row and column limits", () => {
  const tooWide = Array.from(
    { length: IMPORT_LIMITS.maxColumns + 1 },
    (_, index) => `column-${index}`,
  );
  const wideResult = validateSheet(
    sheet([tooWide, tooWide]),
    mappingFor(tooWide),
    "csv-import",
  );
  const manyRows = [
    headers,
    ...Array.from({ length: IMPORT_LIMITS.maxDataRows + 1 }, (_, index) => [
      `IMPORT-${index}`,
      ...validRow.slice(1),
    ]),
  ];
  const rowResult = validateSheet(
    sheet(manyRows),
    mappingFor(),
    "csv-import",
  );
  assert.ok(codes(wideResult).includes("column-limit"));
  assert.ok(codes(rowResult).includes("row-limit"));
});

test("candidate replacement and cancellation never mutate active data", () => {
  const active = createDemoActiveDataset();
  const first = {
    workbook: {
      sourceType: "csv-import",
      fileName: "first.csv",
      sheets: [sheet([headers, validRow])],
      parserWarnings: [],
    },
    selectedSheetIndex: 0,
    mapping: mappingFor(),
    validation: null,
  };
  const second = {
    ...first,
    workbook: { ...first.workbook, fileName: "second.csv" },
  };
  assert.equal(replaceCandidate(first, second), second);
  assert.equal(cancelCandidate(), null);
  assert.deepEqual(active.cases, syntheticCases);
});

test("activation records safe provenance and reset restores the exact demo", () => {
  const importSheet = sheet([headers, validRow]);
  const candidate = {
    workbook: {
      sourceType: "xlsx-import",
      fileName: "reviewed-sample.xlsx",
      sheets: [{ ...importSheet, name: "Cases" }],
      parserWarnings: [],
    },
    selectedSheetIndex: 0,
    mapping: mappingFor(),
    validation: null,
  };
  const validation = validateSheet(
    candidate.workbook.sheets[0],
    candidate.mapping,
    "xlsx-import",
  );
  const active = activateValidatedCandidate(
    candidate,
    validation,
    "2026-07-26T10:00:00.000Z",
  );
  const exported = JSON.stringify(active.provenance);

  assert.deepEqual(active.provenance, {
    sourceType: "xlsx-import",
    displayName: "reviewed-sample.xlsx",
    rowCount: 1,
    sheetName: "Cases",
    importedAt: "2026-07-26T10:00:00.000Z",
    originalFileName: "reviewed-sample.xlsx",
  });
  assert.doesNotMatch(exported, /\/Users\/|\\\\Users\\\\|file:\/\//i);
  assert.deepEqual(createDemoActiveDataset().cases, syntheticCases);
});

test("the configured small-sample warning threshold is conservative", () => {
  assert.equal(IMPORT_LIMITS.smallSampleRows, 30);
  assert.equal(1 < IMPORT_LIMITS.smallSampleRows, true);
});
