import type {
  DecisionState,
  EvidenceItem,
  QualityGate,
  ScenarioInputs,
} from "./types";

type Metrics = {
  total: number;
  escalatedCount: number;
  completeness: number;
  agreement: number;
  escalationRate: number;
  safetyCriticalRecall: number;
  averageHandling: number;
  duplicateIds: number;
};

type ScenarioResult = {
  annualVolume: number;
  activeEscalationRate: number;
  baselineEscalations: number;
  avoidedEscalations: number;
  grossSavings: number;
  hoursReleased: number;
};

export function buildEvidenceItems(
  metrics: Metrics,
  gates: QualityGate[],
  scenario: ScenarioInputs,
  scenarioResult: ScenarioResult,
): EvidenceItem[] {
  const hasFiniteMetrics =
    metrics.total > 0 &&
    [
      metrics.completeness,
      metrics.agreement,
      metrics.escalationRate,
      metrics.safetyCriticalRecall,
      metrics.averageHandling,
      metrics.duplicateIds,
      metrics.escalatedCount,
    ].every(Number.isFinite);
  const allGatesEvaluated =
    gates.length > 0 &&
    gates.every(
      (gate) =>
        Boolean(gate.id) &&
        Boolean(gate.measured) &&
        Boolean(gate.required) &&
        typeof gate.passed === "boolean",
    );
  const hasScenarioInputs = [
    scenario.monthlyVolume,
    scenario.escalationReduction,
    scenario.escalationCost,
  ].every((value) => Number.isFinite(value) && value > 0);
  const hasScenarioResults = [
    scenarioResult.annualVolume,
    scenarioResult.activeEscalationRate,
    scenarioResult.baselineEscalations,
    scenarioResult.avoidedEscalations,
    scenarioResult.grossSavings,
    scenarioResult.hoursReleased,
  ].every((value) => Number.isFinite(value) && value >= 0);

  return [
    {
      id: "dataset",
      label: "Active validated dataset",
      source: "dataset",
      available: metrics.total > 0,
    },
    {
      id: "performance",
      label: "Calculated performance metrics",
      source: "metric",
      available: hasFiniteMetrics,
    },
    {
      id: "quality",
      label: "Evaluated quality gates",
      source: "quality-gate",
      available: allGatesEvaluated,
    },
    {
      id: "scenario-inputs",
      label: "Explicit scenario assumptions",
      source: "assumption",
      available: hasScenarioInputs,
    },
    {
      id: "scenario-results",
      label: "Calculated scenario outputs",
      source: "metric",
      available: hasScenarioResults,
    },
  ];
}

export function calculateEvidenceCoverage(items: EvidenceItem[]): number {
  if (items.length === 0) return 0;
  return (
    (items.filter((item) => item.available).length / items.length) * 100
  );
}

export function deriveDecisionState(
  gates: QualityGate[],
  evidenceItems: EvidenceItem[],
): DecisionState {
  const failedGates = gates.filter((gate) => !gate.passed);
  const passedGateCount = gates.length - failedGates.length;
  const evidenceCoverage = calculateEvidenceCoverage(evidenceItems);
  const evidenceComplete = evidenceCoverage === 100;
  const automatedChecksPass = gates.length > 0 && failedGates.length === 0;
  const canPresent = automatedChecksPass && evidenceComplete;
  const canExport = canPresent;

  if (failedGates.length > 0) {
    return {
      evidenceCoverage,
      passedGateCount,
      failedGates,
      canPresent,
      canExport,
      readinessLabel: "Blocked — quality review required",
      decisionStatusLabel: "Blocked",
      exportStatusLabel: "Export blocked",
      explanation: `${failedGates.length} required quality ${
        failedGates.length === 1 ? "gate has" : "gates have"
      } failed.`,
    };
  }

  if (!evidenceComplete) {
    return {
      evidenceCoverage,
      passedGateCount,
      failedGates,
      canPresent,
      canExport,
      readinessLabel: "Blocked — evidence incomplete",
      decisionStatusLabel: "Evidence incomplete",
      exportStatusLabel: "Export blocked",
      explanation: `Only ${evidenceCoverage.toFixed(0)}% of required evidence is available.`,
    };
  }

  return {
    evidenceCoverage,
    passedGateCount,
    failedGates,
    canPresent,
    canExport,
    readinessLabel: "Ready for review",
    decisionStatusLabel: "Conditionally ready",
    exportStatusLabel: "Export ready",
    explanation:
      "All required gates pass and every decision claim has a traceable evidence source.",
  };
}

type BriefInput = {
  product: string;
  demonstration: string;
  dataset: unknown;
  metrics: Metrics;
  qualityGates: QualityGate[];
  evidenceItems: EvidenceItem[];
  decisionState: DecisionState;
  scenario: {
    inputs: ScenarioInputs;
    results: ScenarioResult;
  };
  recommendation: string;
  limitations: string[];
};

export type BriefResult =
  | {
      ok: true;
      brief: BriefInput & {
        evidenceCoverage: number;
        approvalScope: "Demonstration only";
      };
    }
  | {
      ok: false;
      failedGates: QualityGate[];
      reason: string;
    };

export function createDecisionBrief(input: BriefInput): BriefResult {
  if (!input.decisionState.canExport) {
    return {
      ok: false,
      failedGates: input.decisionState.failedGates,
      reason: input.decisionState.explanation,
    };
  }

  return {
    ok: true,
    brief: {
      ...input,
      evidenceCoverage: input.decisionState.evidenceCoverage,
      approvalScope: "Demonstration only",
    },
  };
}
