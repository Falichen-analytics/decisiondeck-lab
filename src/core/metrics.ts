import type {
  QualityGate,
  ScenarioInputs,
  TriageCase,
} from "./types";

const escalatedUrgencies = new Set(["A0", "A1", "A2"]);

export function calculateMetrics(cases: TriageCase[]) {
  const total = cases.length;
  const complete = cases.filter((item) => item.complete).length;
  const correct = cases.filter(
    (item) => item.predictedUrgency === item.referenceUrgency,
  ).length;
  const escalated = cases.filter(
    (item) => escalatedUrgencies.has(item.predictedUrgency),
  ).length;
  const safetyCritical = cases.filter((item) => item.safetyCritical);
  const protectedSafetyCritical = safetyCritical.filter(
    (item) => escalatedUrgencies.has(item.predictedUrgency),
  ).length;
  const averageHandling =
    cases.reduce((sum, item) => sum + item.assessmentMinutes, 0) /
    Math.max(total, 1);

  return {
    total,
    escalatedCount: escalated,
    completeness: (complete / Math.max(total, 1)) * 100,
    agreement: (correct / Math.max(total, 1)) * 100,
    escalationRate: (escalated / Math.max(total, 1)) * 100,
    safetyCriticalRecall:
      (protectedSafetyCritical / Math.max(safetyCritical.length, 1)) * 100,
    averageHandling,
    duplicateIds: total - new Set(cases.map((item) => item.id)).size,
  };
}

export function calculateScenario(
  inputs: ScenarioInputs,
  activeEscalationRate: number,
) {
  const annualVolume = inputs.monthlyVolume * 12;
  const baselineEscalations =
    annualVolume * (activeEscalationRate / 100);
  const avoidedEscalations =
    baselineEscalations * (inputs.escalationReduction / 100);
  const grossSavings = avoidedEscalations * inputs.escalationCost;
  const hoursReleased = (avoidedEscalations * 22) / 60;

  return {
    annualVolume,
    activeEscalationRate,
    baselineEscalations: Math.round(baselineEscalations),
    avoidedEscalations: Math.round(avoidedEscalations),
    grossSavings: Math.round(grossSavings),
    hoursReleased: Math.round(hoursReleased),
  };
}

export function evaluateQualityGates(
  metrics: ReturnType<typeof calculateMetrics>,
): QualityGate[] {
  return [
    {
      id: "completeness",
      label: "Data completeness",
      measured: `${metrics.completeness.toFixed(1)}%`,
      required: "≥ 95%",
      passed: metrics.completeness >= 95,
      explanation:
        "Required fields must be populated before results are used.",
    },
    {
      id: "duplicates",
      label: "Duplicate identifiers",
      measured: String(metrics.duplicateIds),
      required: "0",
      passed: metrics.duplicateIds === 0,
      explanation:
        "Each active triage contact must have one stable identifier.",
    },
    {
      id: "agreement",
      label: "Overall agreement",
      measured: `${metrics.agreement.toFixed(1)}%`,
      required: "≥ 85%",
      passed: metrics.agreement >= 85,
      explanation:
        "Predicted urgency codes are compared with the frozen reference standard.",
    },
    {
      id: "safetyCriticalRecall",
      label: "Safety-critical recall",
      measured: `${metrics.safetyCriticalRecall.toFixed(1)}%`,
      required: "≥ 80%",
      passed: metrics.safetyCriticalRecall >= 80,
      explanation:
        "Safety-critical cases must retain an A0, A1 or A2 escalation pathway.",
    },
  ];
}
