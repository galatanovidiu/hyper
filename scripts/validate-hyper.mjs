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

const USER_FACING_HYPER = new Set([
  "hyper",
  "hyper-task",
  "hyper-backlog",
  "hyper-handoff",
  "hyper-retro",
  "hyper-code-review",
  "hyper-recipe",
  "hyper-team",
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
  ensureContains(README, "You normally start with one skill: **`hyper`**.");
  ensureContains(README, "Internal skills such as");
  for (const skill of [...USER_FACING_HYPER, ...INTERNAL_HYPER].sort()) {
    ensureContains(README, `\`${skill}\``);
  }

  ensureContains(DATA_MODEL, "Users invoke eight Hyper skills directly");
  ensureContains(
    DATA_MODEL,
    "`hyper-execution-plan-review`",
  );
  ensureContains(DATA_MODEL, "`phase: deferred`");
  ensureContains(DATA_MODEL, "## `05-execution-plan-review.md`");
  ensureContains(DATA_MODEL, "## `retro.md`");
}

function main() {
  validateSkillFiles();
  validateReadmeAndDataModel();

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
