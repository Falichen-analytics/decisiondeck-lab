import type {
  CaseCategory,
  TriageCase,
  UrgencyLevel,
} from "../core/types";

const categories: CaseCategory[] = [
  "Chest pain",
  "Breathing difficulty",
  "Neurological",
  "Other acute",
];

const referenceUrgencyFor = (index: number): UrgencyLevel => {
  if (index % 13 === 0) return "A0";
  if (index % 11 === 0) return "A1";
  if (index % 5 === 0) return "A2";
  if (index % 3 === 0) return "C1";
  return "C2";
};

export const syntheticCases: TriageCase[] = Array.from(
  { length: 48 },
  (_, offset) => {
    const index = offset + 1;
    const category = categories[offset % categories.length];
    const referenceUrgency = referenceUrgencyFor(index);
    const isKnownNonCriticalMiss = [3, 18, 27].includes(index);

    return {
      id: `SYN-TRIAGE-${String(index).padStart(3, "0")}`,
      category,
      complete: ![18, 43].includes(index),
      safetyCritical:
        referenceUrgency === "A0" || referenceUrgency === "A1",
      referenceUrgency,
      predictedUrgency: isKnownNonCriticalMiss ? "C2" : referenceUrgency,
      assessmentMinutes: 8 + ((index * 7) % 29),
    };
  },
);

export const datasetMetadata = {
  name: "Synthetic Triage+ Evaluation Cases",
  version: "TRIAGE-SYN-2026.1",
  generatedOn: "2026-07-25",
  description:
    "A deterministic, fictional urgent-care triage dataset created for a public portfolio demonstration.",
} as const;
