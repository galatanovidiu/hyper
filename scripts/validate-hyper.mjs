#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const README = path.join(ROOT, "README.md");
const DATA_MODEL = path.join(ROOT, "skills", "hyper", "reference", "data-model.md");
const HYPER_ITERATE_SKILL = path.join(ROOT, "skills", "hyper-iterate", "SKILL.md");
const HYPER_ITERATE_TEMPLATE = path.join(ROOT, "skills", "hyper-iterate", "templates", "loop.md");
const HYPER_TECHNICAL_PLAN_TEMPLATE = path.join(ROOT, "skills", "hyper-technical-plan", "templates", "03-technical-plan.md");
const HYPER_TECHNICAL_PLAN_BUGFIX_TEMPLATE = path.join(ROOT, "skills", "hyper-technical-plan", "templates", "03-technical-plan-bugfix.md");
const HYPER_SKILL = path.join(ROOT, "skills", "hyper", "SKILL.md");
const HYPER_GATES = path.join(ROOT, "skills", "hyper", "reference", "gates.md");
const HYPER_IMPLEMENT_SKILL = path.join(ROOT, "skills", "hyper-implement", "SKILL.md");
const HYPER_WORKER_SKILL = path.join(ROOT, "skills", "hyper-worker", "SKILL.md");
const HYPER_TECHNICAL_PLAN_SKILL = path.join(ROOT, "skills", "hyper-technical-plan", "SKILL.md");
const HYPER_RESEARCH_SKILL = path.join(ROOT, "skills", "hyper-research", "SKILL.md");
const STATE_PROBE = path.join(ROOT, "skills", "hyper", "scripts", "state.mjs");

const USER_FACING_HYPER = new Set([
  "hyper",
  "hyper-task",
  "hyper-backlog",
  "hyper-handoff",
  "hyper-retro",
  "hyper-code-review",
  "hyper-recipe",
  "hyper-iterate",
  "hyper-team",
  "hyper-short-story",
  "hyper-digest",
]);

const INTERNAL_HYPER = new Set([
  "hyper-intake",
  "hyper-spec",
  "hyper-technical-plan",
  "hyper-execution-plan",
  "hyper-execution-plan-review",
  "hyper-research",
  "hyper-implement",
  "hyper-worker",
  "hyper-verify",
  "hyper-docs",
]);

const ERRORS = [];

function fail(message) {
  ERRORS.push(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseFrontmatter(text, filePath) {
  const match = text.match(/^---\n(.*?)\n---\n/s);
  if (!match) {
    fail(`${filePath}: missing frontmatter block`);
    return {};
  }

  const frontmatter = match[1];
  const result = {};
  let currentKey = null;
  let currentValueLines = [];

  for (const rawLine of frontmatter.split("\n")) {
    if (/^[A-Za-z0-9_-]+:\s*/.test(rawLine)) {
      if (currentKey !== null) {
        result[currentKey] = currentValueLines.join("\n").trim();
      }
      const splitIndex = rawLine.indexOf(":");
      currentKey = rawLine.slice(0, splitIndex).trim();
      currentValueLines = [rawLine.slice(splitIndex + 1).trim()];
      continue;
    }

    if (currentKey === null) {
      fail(`${filePath}: could not parse frontmatter line: ${JSON.stringify(rawLine)}`);
      return {};
    }

    currentValueLines.push(rawLine);
  }

  if (currentKey !== null) {
    result[currentKey] = currentValueLines.join("\n").trim();
  }

  return result;
}

function extractReferencePaths(text) {
  return [...text.matchAll(/`([^`]*?(?:templates|reference)\/[^`]+\.md)`/g)].map(
    (match) => match[1],
  );
}

function relativeToRoot(resolvedPath) {
  return path.relative(ROOT, resolvedPath);
}

function isWithinRoot(resolvedPath) {
  const relativePath = relativeToRoot(resolvedPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function validateSkillFiles() {
  const skillDirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(SKILLS_DIR, entry.name))
    .filter((skillDir) => fs.existsSync(path.join(skillDir, "SKILL.md")))
    .sort();

  const names = new Set(skillDirs.map((skillDir) => path.basename(skillDir)));
  const expected = new Set([...USER_FACING_HYPER, ...INTERNAL_HYPER]);

  const missing = [...expected].filter((name) => !names.has(name)).sort();
  const extra = [...names].filter((name) => !expected.has(name)).sort();
  if (missing.length > 0) {
    fail(`skills/: missing expected skill dirs: ${JSON.stringify(missing)}`);
  }
  if (extra.length > 0) {
    fail(`skills/: unexpected skill dirs: ${JSON.stringify(extra)}`);
  }

  for (const skillDir of skillDirs) {
    const skillFile = path.join(skillDir, "SKILL.md");
    const text = read(skillFile);
    const skillName = path.basename(skillDir);

    if (skillName.startsWith("hyper")) {
      const lineCount = text.split("\n").length;
      if (lineCount > 500) {
        fail(`${skillFile}: exceeds 500 lines (${lineCount})`);
      }
    }

    const frontmatter = parseFrontmatter(text, skillFile);
    const name = (frontmatter.name ?? "").trim().replace(/^['"]|['"]$/g, "");
    const description = frontmatter.description ?? "";
    const descClean = description.replace(/^>\s*/gm, "").trim().replace(/^['"]|['"]$/g, "");

    if (name !== skillName) {
      fail(`${skillFile}: frontmatter name ${JSON.stringify(name)} does not match dir ${JSON.stringify(skillName)}`);
    }
    if (!descClean) {
      fail(`${skillFile}: missing description`);
    }
    if (descClean.length > 1024) {
      fail(`${skillFile}: description exceeds 1024 chars (${descClean.length})`);
    }

    const userInvocable = (frontmatter["user-invocable"] ?? "").trim().toLowerCase();
    if (INTERNAL_HYPER.has(skillName) && userInvocable !== "false") {
      fail(`${skillFile}: internal Hyper skill must set user-invocable: false`);
    }
    if (USER_FACING_HYPER.has(skillName) && userInvocable === "false") {
      fail(`${skillFile}: user-facing Hyper skill must not set user-invocable: false`);
    }

    for (const rel of extractReferencePaths(text)) {
      if (rel.includes("*")) {
        continue;
      }

      const refPath = rel.startsWith("skills/")
        ? path.resolve(ROOT, rel)
        : path.resolve(skillDir, rel);

      if (!isWithinRoot(refPath)) {
        fail(`${skillFile}: reference escapes repo root: ${rel}`);
        continue;
      }
      if (!fs.existsSync(refPath)) {
        fail(`${skillFile}: referenced file does not exist: ${rel}`);
      }
    }

    for (const match of text.matchAll(/Invoke the `([a-z0-9-]+)` skill/g)) {
      if (!names.has(match[1])) {
        fail(`${skillFile}: invokes missing skill ${JSON.stringify(match[1])}`);
      }
    }
    for (const match of text.matchAll(/Load the `([a-z0-9-]+)` skill/g)) {
      if (!names.has(match[1])) {
        fail(`${skillFile}: loads missing skill ${JSON.stringify(match[1])}`);
      }
    }
  }
}

function ensureContains(filePath, needle) {
  const text = read(filePath);
  if (!text.includes(needle)) {
    fail(`${filePath}: missing expected text: ${JSON.stringify(needle)}`);
  }
}

function ensureNotContains(filePath, needle) {
  const text = read(filePath);
  if (text.includes(needle)) {
    fail(`${filePath}: contains forbidden text: ${JSON.stringify(needle)}`);
  }
}

function validateReadmeAndDataModel() {
  ensureContains(README, "Internal skills such as");
  for (const skill of [...USER_FACING_HYPER, ...INTERNAL_HYPER].sort()) {
    ensureContains(README, `\`${skill}\``);
  }

  ensureContains(README, "Workflow 1 — `hyper` (phased)");
  ensureContains(README, "Workflow 2 — `hyper-iterate` (adaptive)");

  ensureContains(DATA_MODEL, "Users invoke eleven Hyper skills directly");
  ensureContains(DATA_MODEL, "`hyper-iterate`");
  ensureContains(
    DATA_MODEL,
    "`hyper-execution-plan-review`",
  );
  ensureContains(DATA_MODEL, "`phase: deferred`");
  ensureContains(DATA_MODEL, "## `05-execution-plan-review.md`");
  ensureContains(DATA_MODEL, "## `retro.md`");
  ensureContains(DATA_MODEL, "**Alternatives considered**");

  ensureContains(HYPER_TECHNICAL_PLAN_TEMPLATE, "## Alternatives considered");
  ensureContains(HYPER_TECHNICAL_PLAN_BUGFIX_TEMPLATE, "## Alternatives considered");
}

function validateHyperIterate() {
  const requiredTemplateSections = [
    "## Goal",
    "## Definition of done",
    "## Task understanding",
    "## Existing code and findings",
    "## Authority",
    "## Loop plan",
    "## Current route",
    "## Current focus",
    "## Current bar",
    "## Parts",
    "## Part alignment",
    "## Evidence digest",
    "## Relevant artifacts",
    "## Bar history",
    "## Route shifts",
    "## Decisions",
    "## Starting point",
    "## Cycles",
    "## Handoff cues",
    "## Outcome",
  ];

  const requiredTemplateFrontmatter = [
    "id: L<N>",
    "title: <title>",
    "status: active",
    "created: <YYYY-MM-DDTHH:MM:SS>",
    "updated: <YYYY-MM-DDTHH:MM:SS>",
  ];

  for (const needle of requiredTemplateSections) {
    ensureContains(HYPER_ITERATE_TEMPLATE, needle);
  }
  for (const needle of requiredTemplateFrontmatter) {
    ensureContains(HYPER_ITERATE_TEMPLATE, needle);
  }

  ensureContains(HYPER_ITERATE_TEMPLATE, "Status: awaiting approval");
  ensureContains(HYPER_ITERATE_TEMPLATE, "Mode: interactive");
  ensureContains(HYPER_ITERATE_TEMPLATE, "Delegated authority: none");
  ensureContains(HYPER_ITERATE_TEMPLATE, "Decision proxies: none");
  ensureContains(HYPER_ITERATE_TEMPLATE, "Approval source: Not yet.");
  ensureContains(HYPER_ITERATE_TEMPLATE, "Approved at: Not yet.");
  ensureContains(HYPER_ITERATE_TEMPLATE, "### P1 — Whole goal");
  ensureContains(HYPER_ITERATE_TEMPLATE, "#### Understanding");
  ensureContains(HYPER_ITERATE_TEMPLATE, "#### Existing code and findings");
  ensureContains(HYPER_ITERATE_TEMPLATE, "#### Part plan");
  ensureContains(HYPER_ITERATE_TEMPLATE, "**Intent:** <probe | implement | validate | reroute | reframe | stop>");
  ensureContains(HYPER_ITERATE_TEMPLATE, "**Prior belief:** <What I expected before this cycle.");
  ensureContains(HYPER_ITERATE_TEMPLATE, "**Route impact:** <How this changes the route or parts.");
  ensureContains(HYPER_ITERATE_TEMPLATE, "- P1 — Whole goal — aligning");
  ensureContains(HYPER_ITERATE_TEMPLATE, "- Next atomic move: Not filled yet.");
  ensureContains(HYPER_ITERATE_TEMPLATE, "- Dirty or unvalidated state: none");

  ensureContains(HYPER_ITERATE_SKILL, "**Alignment gate.**");
  ensureContains(HYPER_ITERATE_SKILL, "**On resume:**");
  ensureContains(HYPER_ITERATE_SKILL, "**Hot** (always):");
  ensureContains(HYPER_ITERATE_SKILL, "**Warm** (when the next move needs more):");
  ensureContains(HYPER_ITERATE_SKILL, "**Cold** (on demand only):");
  ensureContains(HYPER_ITERATE_SKILL, ".hyper/loops/L<N>-<slug>/");
  ensureContains(HYPER_ITERATE_SKILL, "No cycle starts before both gates are cleared.");
  ensureContains(HYPER_ITERATE_SKILL, "Before work on `P<N>` starts, the part block must meet the current-part-block gate above");
  ensureContains(HYPER_ITERATE_SKILL, "## Delegation");
  ensureContains(HYPER_ITERATE_SKILL, "## Authority Modes");
  ensureContains(HYPER_ITERATE_SKILL, "YOLO mode");
  ensureContains(HYPER_ITERATE_SKILL, "Approval source: delegated authority");
  ensureContains(HYPER_ITERATE_SKILL, "Part statuses: `todo | aligning | doing | done`.");

  ensureContains(README, "/hyper-iterate L3");
  ensureContains(README, "user or delegated approval");
  ensureContains(README, "YOLO/delegated authority");
  ensureContains(README, ".hyper/loops/");

  ensureContains(DATA_MODEL, "## `.hyper/loops/`");
  ensureContains(DATA_MODEL, "authority mode");
  ensureContains(DATA_MODEL, "Approval source");
  ensureContains(DATA_MODEL, "loop plan");
  ensureContains(DATA_MODEL, "part alignment");
  ensureContains(DATA_MODEL, "evidence digest");
  ensureContains(DATA_MODEL, "relevant artifacts");
}

function validatePlanConflictRedirect() {
  // Gates contract — redirect rows and remediation redirects section.
  ensureContains(HYPER_GATES, "`implement` | `redirect target: technical-plan`");
  ensureContains(HYPER_GATES, "`phase: technical-plan`, `awaiting: null`");
  ensureContains(HYPER_GATES, "`technical-plan` | `redirect target: implement`");
  ensureContains(HYPER_GATES, "## Remediation redirects");
  ensureContains(HYPER_GATES, "For blocked implement results from plan conflicts:");
  ensureContains(HYPER_GATES, "For plan-conflict subtasks:");
  ensureNotContains(HYPER_GATES, "Continue to verify?");
  ensureNotContains(HYPER_GATES, "Continue to docs?");
  ensureNotContains(HYPER_GATES, "Post-transition checkpoint");

  // Data model — new artifact, new subtask enum value.
  ensureContains(DATA_MODEL, "## `plan-conflict.md`");
  ensureContains(DATA_MODEL, "`null` · `user-input` · `plan-conflict`");

  // hyper-implement — extended return contract and re-entry section.
  ensureContains(HYPER_IMPLEMENT_SKILL, "`redirect target: technical-plan`");
  ensureContains(HYPER_IMPLEMENT_SKILL, "## Re-entry behavior");

  // hyper-worker — plan-conflict awaiting value and revival_signal field.
  ensureContains(HYPER_WORKER_SKILL, "`awaiting: plan-conflict`");
  ensureContains(HYPER_WORKER_SKILL, "`revival_signal:");

  // hyper-technical-plan — plan-conflict.md input and invalidated subtasks.
  ensureContains(HYPER_TECHNICAL_PLAN_SKILL, "`plan-conflict.md`");
  ensureContains(HYPER_TECHNICAL_PLAN_SKILL, "## Invalidated subtasks");

  // hyper — redirect mention of the new transition.
  ensureContains(HYPER_SKILL, "implement -> technical-plan");
  ensureContains(HYPER_SKILL, "Continue deterministic transitions");
  ensureNotContains(HYPER_SKILL, "Verify checkpoint");
}

function validateGateMessaging() {
  ensureContains(HYPER_GATES, "## User-facing gate messages");
  ensureContains(HYPER_GATES, "Do not finish with only status, file links, or a gate label.");
  ensureContains(HYPER_SKILL, "### Announce open gates");
  ensureContains(HYPER_SKILL, "Do not rely on file attachment cards or state-probe facts as the approval ask.");
  ensureContains(HYPER_RESEARCH_SKILL, "Reply approve or continue to accept it");
  ensureContains(HYPER_RESEARCH_SKILL, "archive the research task");
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`${filePath}: missing required file`);
    return false;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    fail(`${filePath}: expected a regular file`);
    return false;
  }
  return true;
}

function assertField(record, key, predicate, descriptor, location) {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    fail(`${location}: missing key ${JSON.stringify(key)}`);
    return false;
  }
  const value = record[key];
  if (!predicate(value)) {
    fail(
      `${location}: key ${JSON.stringify(key)} expected ${descriptor}, got ${JSON.stringify(value)}`,
    );
    return false;
  }
  return true;
}

function runProbe(fromPath, label) {
  const result = spawnSync("node", [STATE_PROBE, "--from", fromPath], {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (result.error) {
    fail(`${label}: spawn failed: ${result.error.message}`);
    return null;
  }
  if (result.status !== 0) {
    fail(
      `${label}: probe exited non-zero (status=${result.status}); stderr: ${JSON.stringify(result.stderr?.trim() ?? "")}`,
    );
    return null;
  }
  // A successful probe call must emit nothing to stderr — otherwise the
  // install-hyper portability check breaks and the validator should catch
  // it first.
  const stderrText = (result.stderr ?? "").trim();
  if (stderrText.length > 0) {
    fail(
      `${label}: probe wrote to stderr on a successful run (this breaks install-hyper portability check): ${JSON.stringify(stderrText.split("\n", 1)[0])}`,
    );
    return null;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(result.stdout);
  } catch (err) {
    fail(`${label}: stdout is not valid JSON: ${err.message}`);
    return null;
  }
  return snapshot;
}

// Build a synthetic .hyper fixture under a tempdir so schema assertions are
// not gated on the current repo's task state. Catches schema drift even on
// a fresh checkout where active_tasks would otherwise be empty.
function setupProbeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hyper-validator-"));
  const writeTaskMd = (relPath, frontmatter) => {
    const abs = path.join(root, ".hyper", relPath, "task.md");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const fm = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    fs.writeFileSync(abs, `---\n${fm}\n---\n\n# fixture\n`, "utf8");
  };
  const writeLoopMd = (relPath, frontmatter) => {
    const abs = path.join(root, ".hyper", relPath, "loop.md");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const fm = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    fs.writeFileSync(abs, `---\n${fm}\n---\n\n# fixture\n`, "utf8");
  };

  fs.mkdirSync(path.join(root, ".hyper", "tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, ".hyper", "archive"), { recursive: true });
  fs.mkdirSync(path.join(root, ".hyper", "loops"), { recursive: true });

  writeTaskMd("tasks/T3-active", {
    id: "T3",
    title: "Active fixture",
    phase: "intake",
    scope: "feature",
    awaiting: "null",
    created: "2026-05-25T00:00:00",
    bugfix: "false",
  });
  writeTaskMd("tasks/T5-gated", {
    id: "T5",
    title: "Gated fixture",
    phase: "spec",
    scope: "feature",
    awaiting: "user-approval",
    created: "2026-05-25T00:00:00",
    bugfix: "false",
  });
  writeTaskMd("archive/T1-archived", {
    id: "T1",
    title: "Done fixture",
    phase: "done",
    scope: "feature",
    awaiting: "null",
    created: "2026-05-20T00:00:00",
    bugfix: "false",
  });
  writeTaskMd("archive/T2-cancelled", {
    id: "T2",
    title: "Cancelled fixture",
    phase: "cancelled",
    scope: "feature",
    awaiting: "null",
    created: "2026-05-21T00:00:00",
    bugfix: "false",
    cancelled_at: "2026-05-22T00:00:00",
    cancelled_reason: "fixture cancellation",
  });
  writeLoopMd("loops/L1-active", {
    id: "L1",
    title: "Active loop fixture",
    status: "active",
    created: "2026-05-25T00:00:00",
    updated: "2026-05-25T00:00:00",
  });
  writeLoopMd("loops/L2-done", {
    id: "L2",
    title: "Done loop fixture",
    status: "done",
    created: "2026-05-20T00:00:00",
    updated: "2026-05-22T00:00:00",
  });
  fs.writeFileSync(
    path.join(root, ".hyper", "backlog.md"),
    "# Hyper Backlog\n\n## B1 — em-dash entry\n\n## B2 - hyphen entry\n\n## B3 – en-dash entry\n",
    "utf8",
  );
  fs.mkdirSync(path.join(root, ".hyper", "memory"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".hyper", "memory", "index.md"),
    [
      "# Memory Index",
      "",
      "## Section",
      "- [first learning](first.md) — a one-line hook",
      "- [second learning](second.md) — another hook",
      "not an entry line",
      "- plain bullet without a link",
      "",
    ].join("\n"),
    "utf8",
  );

  return root;
}

function teardownProbeFixture(root) {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

function validateStateProbeSchema(snapshot, where) {
  const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;
  const isBool = (v) => typeof v === "boolean";
  const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
  const isArray = (v) => Array.isArray(v);
  const isString = (v) => typeof v === "string";
  const isInt = (v) => Number.isInteger(v);

  assertField(snapshot, "state_root", isNonEmptyString, "non-empty string", where);
  assertField(snapshot, "bootstrapped", isBool, "boolean", where);
  assertField(snapshot, "next_task_id", isPositiveInt, "integer >= 1", where);
  assertField(snapshot, "next_loop_id", isPositiveInt, "integer >= 1", where);
  assertField(snapshot, "next_backlog_id", isPositiveInt, "integer >= 1", where);
  assertField(snapshot, "active_tasks", isArray, "array", where);
  assertField(snapshot, "archived_tasks", isArray, "array", where);
  assertField(snapshot, "active_loops", isArray, "array", where);
  assertField(snapshot, "backlog_entries", isArray, "array", where);
  assertField(snapshot, "parse_errors", isArray, "array", where);
  assertField(snapshot, "warnings", isArray, "array", where);

  // learnings pointer (T70.3). Object with a fixed index_path string, an
  // exists boolean, and a non-negative entry_count integer. The probe must
  // never embed the index body.
  const isObject = (v) => v != null && typeof v === "object" && !Array.isArray(v);
  const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;
  if (assertField(snapshot, "learnings", isObject, "object", where)) {
    const at = `${where} learnings`;
    assertField(snapshot.learnings, "index_path", isNonEmptyString, "non-empty string", at);
    assertField(snapshot.learnings, "exists", isBool, "boolean", at);
    assertField(snapshot.learnings, "entry_count", isNonNegativeInt, "integer >= 0", at);
  }

  if (Array.isArray(snapshot.active_tasks) && snapshot.active_tasks.length > 0) {
    const first = snapshot.active_tasks[0];
    const at = `${where} active_tasks[0]`;
    for (const key of [
      "id",
      "title",
      "phase",
      "scope",
      "awaiting",
      "created",
      "path",
      "has_handoff",
      "phase_known",
      "category",
    ]) {
      if (!Object.prototype.hasOwnProperty.call(first, key)) {
        fail(`${at}: missing key ${JSON.stringify(key)}`);
      }
    }

    // awaiting must be JSON null or a string per item — never the string "null".
    for (const t of snapshot.active_tasks) {
      if (t.awaiting === null) continue;
      if (typeof t.awaiting === "string" && t.awaiting !== "null") continue;
      fail(
        `${where} active_tasks: item ${JSON.stringify(t.id)} has invalid awaiting value ${JSON.stringify(t.awaiting)} (expected JSON null or a non-"null" string)`,
      );
    }
  }

  if (Array.isArray(snapshot.backlog_entries) && snapshot.backlog_entries.length > 0) {
    const first = snapshot.backlog_entries[0];
    const at = `${where} backlog_entries[0]`;
    assertField(first, "id", isInt, "integer", at);
    assertField(first, "title", isString, "string", at);
  }

  if (Array.isArray(snapshot.archived_tasks) && snapshot.archived_tasks.length > 0) {
    const first = snapshot.archived_tasks[0];
    const at = `${where} archived_tasks[0]`;
    for (const key of ["id", "title", "phase", "path"]) {
      if (!Object.prototype.hasOwnProperty.call(first, key)) {
        fail(`${at}: missing key ${JSON.stringify(key)}`);
      }
    }
    if (Object.prototype.hasOwnProperty.call(first, "cancelled_at")) {
      assertField(first, "cancelled_at", isString, "string when present", at);
    }
    if (Object.prototype.hasOwnProperty.call(first, "cancelled_reason")) {
      assertField(first, "cancelled_reason", isString, "string when present", at);
    }
  }
}

function validateStateProbeAgainstFixture() {
  const fixtureRoot = setupProbeFixture();
  try {
    const snapshot = runProbe(fixtureRoot, `${STATE_PROBE} (fixture ${fixtureRoot})`);
    if (!snapshot) return;

    const where = `${STATE_PROBE} fixture stdout`;
    validateStateProbeSchema(snapshot, where);

    // Exact-value assertions against known inputs. These catch schema drift
    // that the populated-repo check would miss when the repo happens not
    // to exercise a particular branch.
    const expect = (cond, msg) => { if (!cond) fail(`${where}: ${msg}`); };

    expect(snapshot.bootstrapped === true, `expected bootstrapped: true, got ${snapshot.bootstrapped}`);
    expect(snapshot.next_task_id === 6, `expected next_task_id: 6 (max folder T5 + 1), got ${snapshot.next_task_id}`);
    expect(snapshot.next_loop_id === 3, `expected next_loop_id: 3 (max folder L2 + 1), got ${snapshot.next_loop_id}`);
    expect(snapshot.next_backlog_id === 4, `expected next_backlog_id: 4 (max heading B3 + 1), got ${snapshot.next_backlog_id}`);
    expect(snapshot.active_tasks.length === 2, `expected active_tasks.length: 2, got ${snapshot.active_tasks.length}`);
    expect(snapshot.archived_tasks.length === 2, `expected archived_tasks.length: 2, got ${snapshot.archived_tasks.length}`);
    expect(snapshot.active_loops.length === 1, `expected active_loops.length: 1 (only L1 is active), got ${snapshot.active_loops.length}`);
    expect(snapshot.backlog_entries.length === 3, `expected backlog_entries.length: 3 (em-dash + en-dash + hyphen), got ${snapshot.backlog_entries.length}`);

    const t3 = snapshot.active_tasks.find((t) => t.id === "T3");
    expect(t3 != null, `expected T3 in active_tasks`);
    if (t3) {
      expect(t3.awaiting === null, `expected T3.awaiting === null (JSON null), got ${JSON.stringify(t3.awaiting)}`);
      expect(t3.category === "active", `expected T3.category: active, got ${JSON.stringify(t3.category)}`);
      expect(t3.phase_known === true, `expected T3.phase_known: true, got ${t3.phase_known}`);
    }
    const t5 = snapshot.active_tasks.find((t) => t.id === "T5");
    expect(t5 != null, `expected T5 in active_tasks`);
    if (t5) {
      expect(t5.awaiting === "user-approval", `expected T5.awaiting: "user-approval", got ${JSON.stringify(t5.awaiting)}`);
    }
    const t2 = snapshot.archived_tasks.find((t) => t.id === "T2");
    expect(t2 != null, `expected T2 in archived_tasks`);
    if (t2) {
      expect(t2.cancelled_at === "2026-05-22T00:00:00", `expected T2.cancelled_at to round-trip, got ${JSON.stringify(t2.cancelled_at)}`);
      expect(t2.category === "terminal", `expected T2.category: terminal, got ${JSON.stringify(t2.category)}`);
    }
    const l1 = snapshot.active_loops.find((l) => l.id === "L1");
    expect(l1 != null, `expected L1 in active_loops`);
    const l2 = snapshot.active_loops.find((l) => l.id === "L2");
    expect(l2 == null, `expected L2 NOT in active_loops (status: done)`);

    expect(snapshot.learnings.index_path === ".hyper/memory/index.md", `expected learnings.index_path: ".hyper/memory/index.md", got ${JSON.stringify(snapshot.learnings.index_path)}`);
    expect(snapshot.learnings.exists === true, `expected learnings.exists: true (fixture wrote the index), got ${snapshot.learnings.exists}`);
    expect(snapshot.learnings.entry_count === 2, `expected learnings.entry_count: 2 (two link entries, non-link bullets excluded), got ${snapshot.learnings.entry_count}`);
  } finally {
    teardownProbeFixture(fixtureRoot);
  }
}

function validateStateProbe() {
  if (!ensureFile(STATE_PROBE)) {
    return;
  }

  const firstLine = read(STATE_PROBE).split("\n", 1)[0];
  if (firstLine !== "#!/usr/bin/env node") {
    fail(
      `${STATE_PROBE}: expected first line "#!/usr/bin/env node", got ${JSON.stringify(firstLine)}`,
    );
  }

  // Run twice: once against a controlled synthetic fixture (catches schema
  // drift on any developer's machine, regardless of local .hyper state),
  // once against the repo itself (catches breakage in the deployed
  // state). The fixture pass is the load-bearing schema gate.
  validateStateProbeAgainstFixture();

  const snapshot = runProbe(ROOT, `${STATE_PROBE} (repo)`);
  if (!snapshot) return;
  validateStateProbeSchema(snapshot, `${STATE_PROBE} repo stdout`);
}

function main() {
  validateSkillFiles();
  validateReadmeAndDataModel();
  validateHyperIterate();
  validatePlanConflictRedirect();
  validateGateMessaging();
  validateStateProbe();

  if (ERRORS.length > 0) {
    process.stdout.write("Hyper validation failed:\n\n");
    for (const error of ERRORS) {
      process.stdout.write(`- ${error}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("Hyper validation passed.\n");
}

main();
