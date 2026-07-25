import Papa from "papaparse";
import readWorkbook from "read-excel-file/browser";
import { IMPORT_LIMITS, SUPPORTED_EXTENSIONS } from "./config.ts";
import type {
  FormulaCell,
  ImportSourceType,
  RawCell,
  RawRow,
  RawSheet,
  RawWorkbook,
} from "./types.ts";

export class ImportFileError extends Error {
  readonly code:
    | "unsupported-format"
    | "file-too-large"
    | "parse-error"
    | "encrypted-workbook";

  constructor(
    message: string,
    code:
      | "unsupported-format"
      | "file-too-large"
      | "parse-error"
      | "encrypted-workbook",
  ) {
    super(message);
    this.code = code;
    this.name = "ImportFileError";
  }
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLocaleLowerCase("en");
}

function rowIsBlank(row: RawRow): boolean {
  return row.every(
    (cell) =>
      cell === null ||
      cell === "" ||
      (typeof cell === "string" && cell.trim() === ""),
  );
}

export function trimTrailingBlankRows(rows: RawRow[]): RawRow[] {
  const trimmed = rows.slice();
  while (trimmed.length > 0 && rowIsBlank(trimmed[trimmed.length - 1])) {
    trimmed.pop();
  }
  return trimmed;
}

function ensureFileAccepted(file: File): ImportSourceType {
  const extension = fileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension as ".csv" | ".xlsx")) {
    throw new ImportFileError(
      "Unsupported file type. Select a .csv or .xlsx file. Legacy .xls, macro-enabled .xlsm and other formats are not accepted.",
      "unsupported-format",
    );
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new ImportFileError(
      `The selected file is larger than ${IMPORT_LIMITS.maxFileLabel}.`,
      "file-too-large",
    );
  }
  return extension === ".csv" ? "csv-import" : "xlsx-import";
}

function ensureColumnLimit(rows: RawRow[]): void {
  const columns = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  if (columns > IMPORT_LIMITS.maxColumns) {
    throw new ImportFileError(
      `The file contains ${columns} columns; the configured limit is ${IMPORT_LIMITS.maxColumns}.`,
      "parse-error",
    );
  }
}

export function parseCsvText(text: string): {
  rows: RawRow[];
  warnings: string[];
} {
  const result = Papa.parse<string[]>(text, {
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  const blockingErrors = result.errors.filter(
    (error) => error.code !== "UndetectableDelimiter",
  );
  if (blockingErrors.length > 0) {
    throw new ImportFileError(
      blockingErrors
        .map((error) => `Row ${Number(error.row ?? 0) + 1}: ${error.message}`)
        .join(" "),
      "parse-error",
    );
  }
  const rows = trimTrailingBlankRows(
    result.data.map((row) => row.map((cell) => cell as RawCell)),
  );
  ensureColumnLimit(rows);
  return {
    rows,
    warnings: result.errors.map((error) => error.message),
  };
}

async function parseCsvFile(file: File): Promise<RawWorkbook> {
  const text = await file.text();
  const parsed = parseCsvText(text);
  return {
    sourceType: "csv-import",
    fileName: file.name,
    sheets: [{ name: "CSV", rows: parsed.rows, formulaCells: [] }],
    parserWarnings: parsed.warnings,
  };
}

type ZipEntry = {
  name: string;
  method: number;
  encrypted: boolean;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function findEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new ImportFileError(
    "The XLSX archive is invalid or unsupported.",
    "parse-error",
  );
}

function readZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const endOffset = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new ImportFileError(
        "The XLSX central directory is invalid.",
        "parse-error",
      );
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      new Uint8Array(buffer, offset + 46, nameLength),
    );
    entries.push({
      name,
      method,
      encrypted: Boolean(flags & 1),
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function extractEntry(
  buffer: ArrayBuffer,
  entry: ZipEntry,
): Promise<Uint8Array> {
  if (entry.encrypted) {
    throw new ImportFileError(
      "Encrypted or password-protected XLSX files are not supported.",
      "encrypted-workbook",
    );
  }
  if (entry.uncompressedSize > 25 * 1024 * 1024) {
    throw new ImportFileError(
      "The expanded workbook XML is too large to inspect safely.",
      "parse-error",
    );
  }
  const view = new DataView(buffer);
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) {
    throw new ImportFileError(
      "The XLSX local file record is invalid.",
      "parse-error",
    );
  }
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(
    buffer,
    start,
    entry.compressedSize,
  ).slice();
  if (entry.method === 0) return compressed;
  if (entry.method !== 8 || typeof DecompressionStream === "undefined") {
    throw new ImportFileError(
      "The XLSX compression method is not supported by this browser.",
      "parse-error",
    );
  }
  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function normaliseArchivePath(path: string): string {
  const parts: string[] = [];
  path.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });
  return parts.join("/");
}

function columnNumber(reference: string): number | null {
  const match = reference.replaceAll("$", "").match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  let column = 0;
  for (const character of match[1].toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  return column;
}

function formulaCellsFromWorksheet(xml: string): FormulaCell[] {
  const formulas: FormulaCell[] = [];
  const cellPattern =
    /<(?:[\w-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?c>/g;
  for (const match of xml.matchAll(cellPattern)) {
    if (
      !/<(?:[\w-]+:)?f(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?f>|<(?:[\w-]+:)?f(?:\s[^>]*)?\/>/.test(
        match[2],
      )
    ) {
      continue;
    }
    const reference = /\br="([^"]+)"/.exec(match[1])?.[1] ?? "";
    const row = Number(reference.replaceAll("$", "").match(/\d+$/)?.[0]);
    const column = columnNumber(reference);
    if (Number.isInteger(row) && row > 0 && column) {
      formulas.push({ row, column, reference });
    }
  }
  return formulas;
}

async function inspectFormulaCells(
  file: File,
): Promise<Map<string, FormulaCell[]>> {
  const buffer = await file.arrayBuffer();
  const entries = readZipEntries(buffer);
  if (entries.some((entry) => entry.encrypted)) {
    throw new ImportFileError(
      "Encrypted or password-protected XLSX files are not supported.",
      "encrypted-workbook",
    );
  }
  const entriesByName = new Map(entries.map((entry) => [entry.name, entry]));
  const decoder = new TextDecoder();
  const extractText = async (name: string) => {
    const entry = entriesByName.get(name);
    return entry ? decoder.decode(await extractEntry(buffer, entry)) : "";
  };
  const workbookXml = await extractText("xl/workbook.xml");
  const relationshipsXml = await extractText(
    "xl/_rels/workbook.xml.rels",
  );
  const relationshipTargets = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(
    /<(?:[\w-]+:)?Relationship\b([^>]*)\/?>/g,
  )) {
    const id = /\bId="([^"]+)"/.exec(match[1])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(match[1])?.[1];
    if (id && target) {
      relationshipTargets.set(
        id,
        normaliseArchivePath(
          target.startsWith("/") ? target.slice(1) : `xl/${target}`,
        ),
      );
    }
  }

  const formulasBySheet = new Map<string, FormulaCell[]>();
  for (const match of workbookXml.matchAll(
    /<(?:[\w-]+:)?sheet\b([^>]*)\/?>/g,
  )) {
    const name = /\bname="([^"]+)"/.exec(match[1])?.[1];
    const relationshipId = /\br:id="([^"]+)"/.exec(match[1])?.[1];
    const target = relationshipId
      ? relationshipTargets.get(relationshipId)
      : undefined;
    if (!name || !target) continue;
    const worksheetXml = await extractText(target);
    formulasBySheet.set(
      decodeXml(name),
      formulaCellsFromWorksheet(worksheetXml),
    );
  }
  return formulasBySheet;
}

async function parseXlsxFile(file: File): Promise<RawWorkbook> {
  try {
    const [sheets, formulasBySheet] = await Promise.all([
      readWorkbook(file, { trim: false }),
      inspectFormulaCells(file),
    ]);
    const rawSheets: RawSheet[] = sheets.map((sheet) => {
      const rows = trimTrailingBlankRows(
        sheet.data.map((row) =>
          row.map((cell) => (cell === undefined ? null : (cell as RawCell))),
        ),
      );
      ensureColumnLimit(rows);
      return {
        name: sheet.sheet,
        rows,
        formulaCells: formulasBySheet.get(sheet.sheet) ?? [],
      };
    });
    return {
      sourceType: "xlsx-import",
      fileName: file.name,
      sheets: rawSheets,
      parserWarnings: [],
    };
  } catch (error) {
    if (error instanceof ImportFileError) throw error;
    throw new ImportFileError(
      "The XLSX file could not be read. It may be damaged, password-protected or use an unsupported workbook feature.",
      "parse-error",
    );
  }
}

export async function parseLocalFile(file: File): Promise<RawWorkbook> {
  const sourceType = ensureFileAccepted(file);
  return sourceType === "csv-import"
    ? parseCsvFile(file)
    : parseXlsxFile(file);
}
