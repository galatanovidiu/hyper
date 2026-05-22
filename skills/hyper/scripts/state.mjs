#!/usr/bin/env node

// Hyper state probe.
//
// Read-only snapshot of the Hyper routing surface for the calling skill:
// state root, bootstrap status, next ids, active and archived tasks,
// active loops, and backlog entries. Implements the resolution and parser
// rules locked in skills/hyper/reference/state-root.md and
// .hyper/tasks/T69-add-state-bootstrap-script/03-technical-plan.md.
//
// Usage: node state.mjs [--from <abs-path>]
// Output: single JSON object to stdout. Unknown flags and unrecoverable
// state-root failures exit non-zero with a single-line stderr message.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

// ---------- Phase classification ----------

// From skills/hyper/reference/data-model.md. Tasks under .hyper/tasks/ may
// carry any of these; the category drives how the calling skill routes.
const ACTIVE_PHASES = new Set([
  "intake",
  "spec",
  "technical-plan",
  "execution-plan",
  "implement",
  "verify",
  "docs",
  "research",
  "review",
]);
const DEFERRED_PHASES = new Set(["deferred"]);
const TERMINAL_PHASES = new Set(["done", "cancelled"]);

function classifyPhase(phase) {
  if (phase == null) return { category: "unknown", known: false };
  if (ACTIVE_PHASES.has(phase)) return { category: "active", known: true };
  if (DEFERRED_PHASES.has(phase)) return { category: "deferred", known: true };
  if (TERMINAL_PHASES.has(phase)) return { category: "terminal", known: true };
  return { category: "unknown", known: false };
}

// ---------- CLI ----------

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { from: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--from") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        die("hyper state probe: --from requires an absolute path argument");
      }
      args.from = next;
      i += 1;
      continue;
    }
    if (arg.startsWith("--from=")) {
      args.from = arg.slice("--from=".length);
      continue;
    }
    die(`hyper state probe: unknown argument ${JSON.stringify(arg)}`);
  }
  return args;
}

// ---------- State-root resolution ----------

function runGit(cwd, gitArgs) {
  const result = spawnSync("git", gitArgs, {
    cwd,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout;
}

function firstNonBareWorktree(porcelainOutput) {
  if (porcelainOutput == null) return null;
  const stanzas = porcelainOutput.split(/\n\n+/);
  for (const stanza of stanzas) {
    const lines = stanza.split("\n");
    let worktreePath = null;
    let bare = false;
    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktreePath = line.slice("worktree ".length).trim();
      } else if (line === "bare") {
        bare = true;
      }
    }
    if (worktreePath && !bare) {
      return worktreePath;
    }
  }
  return null;
}

function resolveStateRoot(fromArg) {
  // Rule 1: explicit .hyper/ hint wins outright.
  if (fromArg) {
    const idx = fromArg.indexOf(`${path.sep}.hyper${path.sep}`);
    if (idx >= 0) {
      return fromArg.slice(0, idx);
    }
    // Hint that is exactly ".../.hyper" with no trailing component.
    const trailing = `${path.sep}.hyper`;
    if (fromArg.endsWith(trailing)) {
      return fromArg.slice(0, fromArg.length - trailing.length);
    }
  }

  const startDir = fromArg && fs.existsSync(fromArg) ? fromArg : process.cwd();

  // Rule 2: ask git for the worktree list.
  const porcelain = runGit(startDir, ["worktree", "list", "--porcelain"]);
  const mainWorktree = firstNonBareWorktree(porcelain);
  if (mainWorktree) {
    return mainWorktree;
  }

  // Rule 3: fall back to the toplevel of the containing Git repo.
  const toplevel = runGit(startDir, ["rev-parse", "--show-toplevel"]);
  if (toplevel) {
    const trimmed = toplevel.trim();
    if (trimmed) return trimmed;
  }

  // Rule 4: no Git in sight — use the explicit hint or cwd.
  if (fromArg) return fromArg;
  return process.cwd();
}

// ---------- Frontmatter parser ----------

function readUtf8(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text.replace(/\r/g, "");
}

function stripQuotes(raw) {
  if (raw.length >= 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

// Returns { ok: true, data } or { ok: false, reason } so callers can record
// the error and keep going.
function parseFrontmatter(text) {
  const lines = text.split("\n");

  // Find the first '---' line.
  let openIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      openIdx = i;
      break;
    }
  }
  if (openIdx === -1) {
    return { ok: false, reason: "no opening --- delimiter" };
  }

  // Find the next '---' line after the opener.
  let closeIdx = -1;
  for (let i = openIdx + 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    return { ok: false, reason: "no closing --- delimiter" };
  }

  const data = {};
  let inHtmlComment = false;

  for (let i = openIdx + 1; i < closeIdx; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (inHtmlComment) {
      if (trimmed.includes("-->")) {
        inHtmlComment = false;
      }
      continue;
    }
    if (trimmed === "") continue;
    if (/^\s*#/.test(rawLine)) continue;
    if (/^\s*<!--/.test(rawLine)) {
      if (!trimmed.includes("-->")) {
        inHtmlComment = true;
      }
      continue;
    }

    const colonIdx = rawLine.indexOf(":");
    if (colonIdx === -1) {
      // Non-key line we can't classify. Skip rather than fail the whole file.
      continue;
    }
    const key = rawLine.slice(0, colonIdx).trim();
    if (!key) continue;
    const rawValue = rawLine.slice(colonIdx + 1).trim();

    if (rawValue === "null") {
      data[key] = null;
      continue;
    }
    data[key] = stripQuotes(rawValue);
  }

  return { ok: true, data };
}

// ---------- Collectors ----------

function readDirSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function relPath(stateRoot, abs) {
  let rel = path.relative(stateRoot, abs);
  if (!rel.endsWith(path.sep) && !rel.endsWith("/")) {
    rel = `${rel}/`;
  }
  return rel;
}

function collectTaskFolders(stateRoot, dirAbs, kind, parseErrors) {
  const out = [];
  const entries = readDirSafe(dirAbs);
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^T(\d+)-/.test(entry.name)) continue;

    const folderAbs = path.join(dirAbs, entry.name);
    const taskMd = path.join(folderAbs, "task.md");
    if (!fs.existsSync(taskMd)) continue;

    let text;
    try {
      text = readUtf8(taskMd);
    } catch (err) {
      parseErrors.push({
        path: path.relative(stateRoot, taskMd),
        reason: `read failed: ${err.message}`,
      });
      continue;
    }

    const parsed = parseFrontmatter(text);
    if (!parsed.ok) {
      parseErrors.push({
        path: path.relative(stateRoot, taskMd),
        reason: parsed.reason,
      });
      continue;
    }

    const fm = parsed.data;
    const phase = fm.phase === undefined ? null : fm.phase;
    const { category, known } = classifyPhase(phase);

    const record = {
      id: fm.id ?? null,
      title: fm.title ?? null,
      phase,
      scope: fm.scope ?? null,
      awaiting: Object.prototype.hasOwnProperty.call(fm, "awaiting") ? fm.awaiting : null,
      created: fm.created ?? null,
      path: relPath(stateRoot, folderAbs),
      has_handoff: fs.existsSync(path.join(folderAbs, "handoff.md")),
      phase_known: known,
      category,
    };

    if (kind === "archive") {
      if (Object.prototype.hasOwnProperty.call(fm, "cancelled_at")) {
        record.cancelled_at = fm.cancelled_at;
      }
      if (Object.prototype.hasOwnProperty.call(fm, "cancelled_reason")) {
        record.cancelled_reason = fm.cancelled_reason;
      }
    }

    out.push(record);
  }

  return out;
}

function collectLoopFolders(stateRoot, dirAbs, parseErrors) {
  const active = [];
  const allLoopIds = [];
  const entries = readDirSafe(dirAbs);
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^L(\d+)-/.test(entry.name)) continue;

    const folderAbs = path.join(dirAbs, entry.name);
    const loopMd = path.join(folderAbs, "loop.md");
    if (!fs.existsSync(loopMd)) continue;

    let text;
    try {
      text = readUtf8(loopMd);
    } catch (err) {
      parseErrors.push({
        path: path.relative(stateRoot, loopMd),
        reason: `read failed: ${err.message}`,
      });
      continue;
    }

    const parsed = parseFrontmatter(text);
    if (!parsed.ok) {
      parseErrors.push({
        path: path.relative(stateRoot, loopMd),
        reason: parsed.reason,
      });
      continue;
    }

    const fm = parsed.data;
    const idNum = extractNumericId(fm.id, "L");
    if (idNum != null) allLoopIds.push(idNum);

    if (fm.status === "active") {
      active.push({
        id: fm.id ?? null,
        title: fm.title ?? null,
        status: fm.status,
        updated: fm.updated ?? null,
        path: relPath(stateRoot, folderAbs),
      });
    }
  }

  return { active, allLoopIds };
}

function collectBacklog(stateRoot, parseErrors) {
  const backlogPath = path.join(stateRoot, ".hyper", "backlog.md");
  if (!fs.existsSync(backlogPath)) {
    return [];
  }

  let text;
  try {
    text = readUtf8(backlogPath);
  } catch (err) {
    parseErrors.push({
      path: path.relative(stateRoot, backlogPath),
      reason: `read failed: ${err.message}`,
    });
    return [];
  }

  const entries = [];
  const headingPattern = /^## B(\d+) — (.+)$/;
  for (const line of text.split("\n")) {
    const match = line.match(headingPattern);
    if (!match) continue;
    entries.push({
      id: Number.parseInt(match[1], 10),
      title: match[2].trim(),
    });
  }
  return entries;
}

// ---------- Id allocation ----------

function extractNumericId(idStr, prefix) {
  if (typeof idStr !== "string") return null;
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const match = idStr.match(pattern);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function nextId(ids) {
  if (ids.length === 0) return 1;
  return Math.max(...ids) + 1;
}

// ---------- Main ----------

function main() {
  const args = parseArgs(process.argv.slice(2));

  let stateRoot;
  try {
    stateRoot = resolveStateRoot(args.from);
  } catch (err) {
    die(`hyper state probe: failed to resolve state root: ${err.message}`);
  }
  if (!stateRoot) {
    die("hyper state probe: failed to resolve state root");
  }

  const hyperDir = path.join(stateRoot, ".hyper");
  const tasksDir = path.join(hyperDir, "tasks");
  const archiveDir = path.join(hyperDir, "archive");
  const loopsDir = path.join(hyperDir, "loops");

  const bootstrapped =
    fs.existsSync(hyperDir) &&
    fs.existsSync(tasksDir) &&
    fs.existsSync(archiveDir);

  const parseErrors = [];

  const activeTasks = collectTaskFolders(stateRoot, tasksDir, "active", parseErrors);
  const archivedTasks = collectTaskFolders(stateRoot, archiveDir, "archive", parseErrors);
  const { active: activeLoops, allLoopIds } = collectLoopFolders(stateRoot, loopsDir, parseErrors);
  const backlogEntries = collectBacklog(stateRoot, parseErrors);

  const taskIds = [
    ...activeTasks.map((t) => extractNumericId(t.id, "T")),
    ...archivedTasks.map((t) => extractNumericId(t.id, "T")),
  ].filter((n) => n != null);
  const nextTaskId = nextId(taskIds);
  const nextLoopId = nextId(allLoopIds);
  const nextBacklogId = nextId(backlogEntries.map((e) => e.id));

  const output = {
    state_root: stateRoot,
    bootstrapped,
    next_task_id: nextTaskId,
    next_loop_id: nextLoopId,
    next_backlog_id: nextBacklogId,
    active_tasks: activeTasks,
    archived_tasks: archivedTasks,
    active_loops: activeLoops,
    backlog_entries: backlogEntries,
    parse_errors: parseErrors,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
