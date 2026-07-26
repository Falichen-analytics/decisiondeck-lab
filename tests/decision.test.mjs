import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceItems,
  calculateEvidenceCoverage,
  createDecisionBrief,
  deriveDecisionState,
} from "../src/core/decision.ts";
import {
  calculateMetrics,
  calculateScenario,
  evaluateQualityGates,
} from "../src/core/metrics.ts";
import {
  datasetMetadata,
  syntheticCases,
} from "../src/data/syntheticCases.ts";

const scenario = {
  monthlyVolume: 2400,
  escalationReduction: 6,
  escalationCost: 92,
};
const metrics = calculateMetrics(syntheticCases);
const scenarioResult = calculateScenario(scenario, metrics.escalationRate);
const passingGates = evaluateQualityGates(metrics);

function briefInput(gates, decisionState, evidenceItems) {
  return {
    product: "DecisionDeck Lab",
    demonstration: "Synthetic Triage+ healthcare case",
    dataset: datasetMetadata,
    metrics,
    qualityGates: gates,
    evidenceItems,
    decisionState,
    scenario: { inputs: scenario, results: scenarioResult },
    recommendation:
      "Pilot bounded decision support for repeatable lower-urgency triage contacts.",
    limitations: ["Synthetic demonstration only."],
  };
}

test("State A derives evidence, readiness and an exportable matching brief", () => {
  const evidenceItems = buildEvidenceItems(
    metrics,
    passingGates,
    scenario,
    scenarioResult,
  );
  const state = deriveDecisionState(passingGates, evidenceItems);
  const result = createDecisionBrief(
    briefInput(passingGates, state, evidenceItems),
  );

  assert.equal(calculateEvidenceCoverage(evidenceItems), 100);
  assert.equal(state.canPresent, true);
  assert.equal(state.canExport, true);
  assert.equal(state.readinessLabel, "Ready for review");
  assert.equal(state.decisionStatusLabel, "Conditionally ready");
  assert.equal(result.ok, true);
  assert.deepEqual(result.brief.metrics, metrics);
  assert.deepEqual(result.brief.qualityGates, passingGates);
  assert.deepEqual(result.brief.scenario.results, scenarioResult);
  assert.equal(result.brief.evidenceCoverage, state.evidenceCoverage);
});

test("State B blocks final decision and export when one gate fails", () => {
  const gates = passingGates.map((gate) =>
    gate.id === "completeness"
      ? { ...gate, measured: "80.0%", passed: false }
      : gate,
  );
  const evidenceItems = buildEvidenceItems(
    metrics,
    gates,
    scenario,
    scenarioResult,
  );
  const state = deriveDecisionState(gates, evidenceItems);
  const result = createDecisionBrief(briefInput(gates, state, evidenceItems));

  assert.equal(state.canPresent, false);
  assert.equal(state.canExport, false);
  assert.deepEqual(
    state.failedGates.map((gate) => gate.label),
    ["Data completeness"],
  );
  assert.equal(state.readinessLabel, "Blocked — quality review required");
  assert.equal(result.ok, false);
  assert.equal("brief" in result, false);
  assert.match(result.reason, /1 required quality gate has failed/);
});

test("State C lists every failed gate and remains blocked", () => {
  const failedIds = new Set([
    "duplicates",
    "agreement",
    "safetyCriticalRecall",
  ]);
  const gates = passingGates.map((gate) =>
    failedIds.has(gate.id) ? { ...gate, passed: false } : gate,
  );
  const evidenceItems = buildEvidenceItems(
    metrics,
    gates,
    scenario,
    scenarioResult,
  );
  const state = deriveDecisionState(gates, evidenceItems);
  const result = createDecisionBrief(briefInput(gates, state, evidenceItems));

  assert.equal(state.canPresent, false);
  assert.equal(state.canExport, false);
  assert.deepEqual(
    state.failedGates.map((gate) => gate.id),
    ["duplicates", "agreement", "safetyCriticalRecall"],
  );
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failedGates.map((gate) => gate.id),
    ["duplicates", "agreement", "safetyCriticalRecall"],
  );
  assert.match(result.reason, /3 required quality gates have failed/);
});

test("incomplete evidence lowers calculated coverage and blocks readiness", () => {
  const evidenceItems = buildEvidenceItems(
    metrics,
    passingGates,
    scenario,
    scenarioResult,
  ).map((item) =>
    item.id === "scenario-results" ? { ...item, available: false } : item,
  );
  const state = deriveDecisionState(passingGates, evidenceItems);

  assert.equal(state.evidenceCoverage, 80);
  assert.equal(state.canPresent, false);
  assert.equal(state.canExport, false);
  assert.equal(state.readinessLabel, "Blocked — evidence incomplete");
});
