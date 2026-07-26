import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function pngDimensions(path) {
  const bytes = await readFile(new URL(path, root));
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("Vite serves local development at root and production under the repository path", async () => {
  const config = await text("vite.config.ts");

  assert.match(config, /command === "serve" && mode === "development"/);
  assert.match(config, /"\/decisiondeck-lab\/"/);
  assert.match(config, /\?\s*"\/"/);
});

test("the Pages workflow is manual, bounded and uses the approved official actions", async () => {
  const workflow = await text(".github/workflows/pages.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(push|pull_request):/m);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /pnpm\/action-setup@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);

  const configureIndex = workflow.indexOf("Configure GitHub Pages");
  const buildIndex = workflow.indexOf("- name: Build");
  const uploadIndex = workflow.indexOf("Upload Pages artifact");

  assert.ok(configureIndex < buildIndex);
  assert.ok(buildIndex < uploadIndex);
});

test("public metadata references the nested favicon and deployed social image", async () => {
  const html = await text("index.html");

  assert.match(html, /name="theme-color"\s+content="#071824"/);
  assert.match(
    html,
    /<link\s+rel="icon"[^>]+href="%BASE_URL%favicon\.svg"/,
  );
  assert.match(
    html,
    /https:\/\/falichen-analytics\.github\.io\/decisiondeck-lab\/social-preview\.png/,
  );
});

test("all verified screenshots and the social preview have their required dimensions", async () => {
  const expected = new Map([
    ["docs/assets/screenshots/01-desktop-hero.png", [1440, 900]],
    ["docs/assets/screenshots/02-import-preview.png", [1440, 900]],
    ["docs/assets/screenshots/03-column-mapping.png", [1440, 900]],
    ["docs/assets/screenshots/04-validation-errors.png", [1440, 900]],
    ["docs/assets/screenshots/05-passing-gates.png", [1440, 900]],
    ["docs/assets/screenshots/06-blocked-decision.png", [1440, 900]],
    ["docs/assets/screenshots/07-scenario-lab.png", [1440, 900]],
    ["docs/assets/screenshots/08-evidence-story.png", [1440, 900]],
    ["docs/assets/screenshots/09-mobile-view.png", [390, 844]],
    ["public/social-preview.png", [1280, 640]],
  ]);

  for (const [path, [width, height]] of expected) {
    await access(new URL(path, root));
    assert.deepEqual(await pngDimensions(path), { width, height }, path);
  }
});

test("README media references are real files and no fake live URL is published", async () => {
  const readme = await text("README.md");
  const imageLinks = [...readme.matchAll(/\]\((docs\/assets\/screenshots\/[^)]+)\)/g)]
    .map((match) => match[1]);

  assert.ok(imageLinks.length >= 9);
  for (const path of new Set(imageLinks)) {
    await access(new URL(path, root));
  }

  assert.doesNotMatch(
    readme,
    /https:\/\/falichen-analytics\.github\.io\/decisiondeck-lab\//,
  );
  assert.match(readme, /No public deployment is available yet/i);
});
