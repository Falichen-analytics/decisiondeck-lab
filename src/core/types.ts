export type CaseCategory =
  | "Chest pain"
  | "Breathing difficulty"
  | "Neurological"
  | "Other acute";

export type UrgencyLevel = "A0" | "A1" | "A2" | "C1" | "C2";

export type TriageCase = {
  id: string;
  category: CaseCategory;
  complete: boolean;
  safetyCritical: boolean;
  referenceUrgency: UrgencyLevel;
  predictedUrgency: UrgencyLevel;
  assessmentMinutes: number;
};

export type QualityGate = {
  id:
    | "completeness"
    | "duplicates"
    | "agreement"
    | "safetyCriticalRecall";
  label: string;
  measured: string;
  required: string;
  passed: boolean;
  explanation: string;
};

export type ScenarioInputs = {
  monthlyVolume: number;
  escalationReduction: number;
  escalationCost: number;
};

export type EvidenceItem = {
  id: string;
  label: string;
  source: "dataset" | "metric" | "quality-gate" | "assumption";
  available: boolean;
};

export type DecisionState = {
  evidenceCoverage: number;
  passedGateCount: number;
  failedGates: QualityGate[];
  canPresent: boolean;
  canExport: boolean;
  readinessLabel: string;
  decisionStatusLabel: string;
  exportStatusLabel: string;
  explanation: string;
};
