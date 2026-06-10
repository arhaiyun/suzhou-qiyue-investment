import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const readText = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

test("project includes the expected operating-system files", async () => {
  const requiredFiles = [
    "README.md",
    "package.json",
    "index.html",
    "assets/app.mjs",
    "assets/styles.css",
    "scripts/serve.mjs",
    "data/company.json",
    "data/ventures.json",
    "data/business-plans.json",
    "data/ideas.json",
    "data/relationships.json",
    "data/tasks.json",
    "data/decisions.json",
    "data/documents.json",
    "templates/venture-brief.md",
    "templates/business-plan.md",
    "templates/meeting-notes.md",
    "templates/decision-record.md",
    "templates/relationship-note.md",
    "templates/weekly-review.md",
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("business data describes Qiyue as a company operating system", async () => {
  const company = await readJson("data/company.json");
  const ventures = await readJson("data/ventures.json");
  const plans = await readJson("data/business-plans.json");
  const relationships = await readJson("data/relationships.json");
  const tasks = await readJson("data/tasks.json");
  const documents = await readJson("data/documents.json");

  assert.equal(company.name, "苏州启樾投资有限公司");
  assert.ok(company.positioning.includes("经营操作系统"));
  assert.ok(Array.isArray(company.focusAreas));
  assert.ok(company.focusAreas.length >= 4);
  assert.ok(Array.isArray(ventures));
  assert.ok(ventures.length >= 2);
  assert.ok(ventures.every((venture) => venture.stage && venture.nextAction));
  assert.ok(Array.isArray(plans));
  assert.ok(plans.every((plan) => plan.audience && plan.maturity));
  assert.ok(Array.isArray(relationships));
  assert.ok(relationships.every((item) => item.category && item.followUpRhythm));
  assert.ok(Array.isArray(tasks));
  assert.ok(tasks.every((task) => task.owner && task.status));
  assert.ok(Array.isArray(documents));
  assert.ok(documents.length >= 3);
  assert.ok(documents.every((document) => document.title && document.path && document.category));
});

test("frontend is data-driven and exposes the operating views", async () => {
  const html = await readText("index.html");
  const app = await readText("assets/app.mjs");
  const css = await readText("assets/styles.css");

  assert.match(html, /<div id="app"><\/div>/);
  assert.match(html, /assets\/app\.mjs/);
  assert.match(app, /data\/company\.json/);
  assert.match(app, /data\/ventures\.json/);
  assert.match(app, /data\/relationships\.json/);
  assert.match(app, /data\/documents\.json/);
  assert.match(app, /renderMarkdown/);

  for (const view of ["Dashboard", "创业项目", "商业计划", "想法池", "运营节奏", "关系维护", "会议决策", "项目文档"]) {
    assert.match(app, new RegExp(view));
  }

  assert.match(css, /--ink:/);
  assert.match(css, /grid-template-columns/);
});
