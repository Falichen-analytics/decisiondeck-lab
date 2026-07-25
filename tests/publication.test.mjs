import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("static application shell identifies DecisionDeck Lab", async () => {
  const html = await text("index.html");

  assert.match(html, /<title>DecisionDeck Lab<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /src="\/src\/main\.tsx"/i);
});

test("planned features are explicit and trust labels are state-derived", async () => {
  const component = await text("src/components/DecisionDeckLab.tsx");
  const decision = await text("src/core/decision.ts");

  for (const feature of ["CSV import", "XLSX import", "Baseline comparison"]) {
    assert.match(component, new RegExp(feature, "i"));
  }
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
