import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMetrics,
  calculateScenario,
  evaluateQualityGates,
} from "../src/core/metrics.ts";
import { syntheticCases } from "../src/data/syntheticCases.ts";

test("calculates the frozen synthetic baseline reproducibly", () => {
  const first = calculateMetrics(syntheticCases);
  const second = calculateMetrics(syntheticCases);

  assert.deepEqual(first, second);
  assert.equal(first.total, 48);
  assert.equal(first.escalatedCount, 16);
  assert.equal(first.duplicateIds, 0);
  assert.equal(first.completeness, 95.83333333333334);
  assert.equal(first.agreement, 93.75);
  assert.equal(first.safetyCriticalRecall, 100);
  assert.equal(evaluateQualityGates(first).every((gate) => gate.passed), true);
});

test("keeps scenario calculations transparent and deterministic", () => {
  assert.deepEqual(
    calculateScenario(
      {
        monthlyVolume: 2400,
        escalationReduction: 6,
        escalationCost: 92,
      },
      33.33333333333333,
    ),
    {
      annualVolume: 28800,
      activeEscalationRate: 33.33333333333333,
      baselineEscalations: 9600,
      avoidedEscalations: 576,
      grossSavings: 52992,
      hoursReleased: 211,
    },
  );
});
