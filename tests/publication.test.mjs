import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  analyseHeaders,
  suggestMapping,
} from "../src/import/mapping.ts";
import { parseCsvText } from "../src/import/parsers.ts";
import { validateSheet } from "../src/import/validation.ts";

const root = new URL("../", import.meta.url);
const requiredHeaders = [
  "id",
  "category",
  "complete",
  "safetyCritical",
  "referenceUrgency",
  "predictedUrgency",
  "assessmentMinutes",
];

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("static application shell identifies DecisionDeck Lab", async () => {
  const html = await text("index.html");

  assert.match(html, /<title>DecisionDeck Lab<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /src="\/src\/main\.tsx"/i);
});

test("data import is operational, remaining plans are explicit and trust labels are state-derived", async () => {
  const component = await text("src/components/DecisionDeckLab.tsx");
  const importPanel = await text("src/components/DataImportPanel.tsx");
  const decision = await text("src/core/decision.ts");

  assert.match(importPanel, /CSV\/XLSX validation workspace/i);
  assert.match(importPanel, /Confirm and activate import/i);
  assert.match(component, /Baseline comparison/i);
  assert.match(component, /Planned · unavailable/);
  assert.match(component, /decisionState\.evidenceCoverage/);
  assert.match(component, /decisionState\.readinessLabel/);
  assert.match(component, /decisionState\.decisionStatusLabel/);
  assert.match(component, /decisionState\.exportStatusLabel/);
  assert.doesNotMatch(component, /<strong>100%<\/strong>/);
  assert.match(decision, /calculateEvidenceCoverage/);
});

test("the active toolchain contains no removed starter infrastructure", async () => {
  const packageJson = await text("package.json");
  const viteConfig = await text("vite.config.ts");

  assert.doesNotMatch(
    packageJson,
    /vinext|wrangler|cloudflare|tailwind|next|react-server-dom/i,
  );
  assert.doesNotMatch(viteConfig, /vinext|wrangler|cloudflare|sites/i);
});

test("public documentation states the synthetic and independent portfolio boundary", async () => {
  const readme = await text("README.md");
  const component = await text("src/components/DecisionDeckLab.tsx");
  const normalisedReadme = readme
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ");

  assert.match(
    normalisedReadme,
    /independent portfolio demonstration using fictional and synthetic healthcare triage data/i,
  );
  assert.match(
    normalisedReadme,
    /not affiliated with, endorsed by or representative of any healthcare organisation or clinical programme/i,
  );
  assert.match(readme, /not a medical device/i);
  assert.match(readme, /not forecasts/i);
  assert.doesNotMatch(component, /same\s+frozen dataset/i);
  assert.match(component, /same\s+active dataset/i);
});

test("the public sample uses the exact schema and passes the real import validator", async () => {
  const csv = await text("examples/sample-triage-cases.csv");
  const parsed = parseCsvText(csv);
  const headers = analyseHeaders(parsed.rows[0]).headers;
  const validation = validateSheet(
    { name: "CSV", rows: parsed.rows, formulaCells: [] },
    suggestMapping(headers),
    "csv-import",
  );

  assert.deepEqual(headers, requiredHeaders);
  assert.equal(validation.valid, true);
  assert.equal(validation.rowCount, 32);
  assert.equal(new Set(validation.cases.map((item) => item.id)).size, 32);
  assert.doesNotMatch(
    csv,
    /(^|[^A-Za-z])(ARR|VRR)([^A-Za-z]|$)|\/Users\/|@/i,
  );
});
