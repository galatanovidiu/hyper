#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
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

function validateReadmeAndDataModel() {
  ensureContains(README, "Internal skills such as");
  for (const skill of [...USER_FACING_HYPER, ...INTERNAL_HYPER].sort()) {
    ensureContains(README, `\`${skill}\``);
  }

  ensureContains(README, "Workflow 1 — `hyper` (phased)");
  ensureContains(README, "Workflow 2 — `hyper-iterate` (adaptive)");

  ensureContains(DATA_MODEL, "Users invoke ten Hyper skills directly");
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
  // Gates contract — new redirect row and remediation gates section.
  ensureContains(HYPER_GATES, "`implement` | `redirect target: technical-plan`");
  ensureContains(HYPER_GATES, "`phase: technical-plan`, `awaiting: user-input`");
  ensureContains(HYPER_GATES, "`technical-plan` | `redirect target: implement`");
  ensureContains(HYPER_GATES, "For blocked implement results from plan conflicts:");
  ensureContains(HYPER_GATES, "For plan-conflict subtasks:");

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
}

function main() {
  validateSkillFiles();
  validateReadmeAndDataModel();
  validateHyperIterate();
  validatePlanConflictRedirect();

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
