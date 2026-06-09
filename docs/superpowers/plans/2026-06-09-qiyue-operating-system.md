# Qiyue Operating System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Markdown-first company operating system for 苏州启樾投资有限公司 with structured JSON data and a local interactive frontend dashboard.

**Architecture:** The project uses Markdown for durable business records, JSON for dashboard data, and a static HTML/CSS/JavaScript frontend for daily review. A small Node.js static server serves the local page without external dependencies.

**Tech Stack:** Markdown, JSON, HTML, CSS, vanilla JavaScript modules, Node.js built-in test runner.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/site-contract.test.mjs`

- [x] Write a Node.js contract test that verifies required project files, structured data shape, and data-driven frontend references.
- [x] Run `node --test tests/site-contract.test.mjs` and verify it fails before implementation because required files do not exist.

### Task 2: Project Shell

**Files:**
- Create: `README.md`
- Create: `package.json`
- Create: `index.html`
- Create: `scripts/serve.mjs`
- Create: `.gitignore`

- [x] Add local serve and test scripts.
- [x] Add a static server with safe path resolution and no-store caching.
- [x] Add README usage, directory map, data update rules, and information security principles.

### Task 3: Frontend Dashboard

**Files:**
- Create: `assets/app.mjs`
- Create: `assets/styles.css`

- [x] Load `data/*.json` through `fetch`.
- [x] Render Dashboard, 创业项目, 商业计划, 想法池, 运营节奏, 关系维护, 会议决策.
- [x] Use a professional operating-console layout, responsive grids, and restrained business styling.

### Task 4: Business Data

**Files:**
- Create: `data/company.json`
- Create: `data/ventures.json`
- Create: `data/business-plans.json`
- Create: `data/ideas.json`
- Create: `data/relationships.json`
- Create: `data/tasks.json`
- Create: `data/decisions.json`

- [x] Seed non-sensitive example data for company focus, ventures, BP versions, ideas, relationships, tasks, and decisions.
- [x] Keep all private or commercially sensitive details as generic placeholders.

### Task 5: Knowledge Base And Templates

**Files:**
- Create files under `00-inbox/`, `01-company/`, `02-ventures/`, `03-business-plans/`, `04-operations/`, `05-relationships/`, `06-meetings/`, `99-archive/`
- Create files under `templates/`
- Create: `docs/initialization-prompt.md`

- [x] Add initial company, operations, relationship, meeting, and archive notes.
- [x] Add reusable templates for ventures, BP, meetings, decisions, relationship notes, and weekly reviews.
- [x] Preserve the professional initialization prompt for reuse.

### Task 6: Verification

**Files:**
- Use all project files

- [x] Run `npm test` and verify all contract tests pass.
- [x] Start `npm run serve:only` and open the local page.
- [x] Verify the page renders non-empty Dashboard content in a browser.
