import {
  DECISIONDECK_FIELDS,
  type ColumnMapping,
  type DecisionDeckField,
  type HeaderAnalysis,
  type RawRow,
} from "./types.ts";

const aliases: Record<DecisionDeckField, string[]> = {
  id: ["id", "case id", "case_id"],
  category: ["category", "symptom category", "symptom_category"],
  complete: ["complete", "completeness"],
  safetyCritical: [
    "safetycritical",
    "safety critical",
    "safety_critical",
  ],
  referenceUrgency: [
    "referenceurgency",
    "reference urgency",
    "reference_urgency",
  ],
  predictedUrgency: [
    "predictedurgency",
    "predicted urgency",
    "predicted_urgency",
  ],
  assessmentMinutes: [
    "assessmentminutes",
    "assessment minutes",
    "assessment_minutes",
  ],
};

export function normaliseHeader(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function headerKey(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

export function analyseHeaders(row: RawRow | undefined): HeaderAnalysis {
  const headers = (row ?? []).map(normaliseHeader);
  const blankHeaderIndexes: number[] = [];
  const grouped = new Map<string, number[]>();

  headers.forEach((header, index) => {
    const key = headerKey(header);
    if (!key) blankHeaderIndexes.push(index);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(index);
  });

  const duplicateHeaders = [...grouped.entries()]
    .filter(([key, indexes]) => Boolean(key) && indexes.length > 1)
    .map(([header, indexes]) => ({ header, indexes }));

  return { headers, blankHeaderIndexes, duplicateHeaders };
}

export function createEmptyMapping(): ColumnMapping {
  return Object.fromEntries(
    DECISIONDECK_FIELDS.map((field) => [field, null]),
  ) as ColumnMapping;
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping = createEmptyMapping();
  const claimed = new Set<number>();

  DECISIONDECK_FIELDS.forEach((field) => {
    const index = headers.findIndex(
      (header, candidateIndex) =>
        !claimed.has(candidateIndex) &&
        aliases[field].includes(headerKey(header)),
    );
    if (index >= 0) {
      mapping[field] = index;
      claimed.add(index);
    }
  });

  return mapping;
}

export function mappingHasDuplicateColumns(mapping: ColumnMapping): boolean {
  const selected = Object.values(mapping).filter(
    (value): value is number => value !== null,
  );
  return new Set(selected).size !== selected.length;
}
