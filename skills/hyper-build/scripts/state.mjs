#!/usr/bin/env node

// Hyper state probe.
//
// Read-only snapshot of the Hyper routing surface for the calling skill:
// state root, bootstrap status, next ids, active and archived tasks,
// active loops, and backlog entries. Implements the resolution and parser
// rules locked in skills/hyper-build/reference/state-root.md and
// .hyper/tasks/T69-add-state-bootstrap-script/03-technical-plan.md.
//
// Usage: node state.mjs [--from <abs-path>]
// Output: single JSON object to stdout. Unknown flags and unrecoverable
// state-root failures exit non-zero with a single-line stderr message.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  cleanFromHint,
  resolveStateRoot,
} from "./lib/state-root.mjs";

// ---------- Phase classification ----------

// From skills/hyper-build/reference/data-model.md. Tasks under .hyper/tasks/ may
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

  // Find the first '---' line. Tolerate trailing whitespace introduced by
  // editors that strip-trim selectively (a common interruption hazard).
  let openIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
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
    if (lines[i].trim() === "---") {
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
  const records = [];
  const folderIds = [];
  const entries = readDirSafe(dirAbs);
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderMatch = /^T(\d+)-/.exec(entry.name);
    if (!folderMatch) continue;

    const folderId = Number.parseInt(folderMatch[1], 10);
    folderIds.push(folderId);

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

    // Folder name is canonical for id allocation. Disagreement with
    // frontmatter is a data-integrity issue worth surfacing.
    const fmIdNum = extractNumericId(fm.id, "T");
    if (fmIdNum != null && fmIdNum !== folderId) {
      parseErrors.push({
        path: path.relative(stateRoot, taskMd),
        reason: `frontmatter id ${fm.id ?? "<missing>"} does not match folder T${folderId}`,
      });
    }

    const record = {
      id: fm.id ?? `T${folderId}`,
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

    records.push(record);
  }

  return { records, folderIds };
}

function collectLoopFolders(stateRoot, dirAbs, parseErrors) {
  const active = [];
  const folderIds = [];
  const entries = readDirSafe(dirAbs);
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderMatch = /^L(\d+)-/.exec(entry.name);
    if (!folderMatch) continue;

    const folderId = Number.parseInt(folderMatch[1], 10);
    folderIds.push(folderId);

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
    // Folder name is canonical for id allocation; surface mismatches.
    const fmIdNum = extractNumericId(fm.id, "L");
    if (fmIdNum != null && fmIdNum !== folderId) {
      parseErrors.push({
        path: path.relative(stateRoot, loopMd),
        reason: `frontmatter id ${fm.id ?? "<missing>"} does not match folder L${folderId}`,
      });
    }

    if (fm.status === "active") {
      active.push({
        id: fm.id ?? `L${folderId}`,
        title: fm.title ?? null,
        status: fm.status,
        updated: fm.updated ?? null,
        path: relPath(stateRoot, folderAbs),
      });
    }
  }

  return { active, folderIds };
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
  // Accept the em-dash, en-dash, and hyphen-minus families. Heading drift
  // (wrong dash glyph) is common enough that strict matching silently
  // drops entries.
  const headingPattern = /^## B(\d+)\s+[—–-]\s+(.+)$/;
  // Loose pattern to detect `## B<N>` lines that fail the strict match —
  // surface them as parse errors instead of dropping silently.
  const looseHeading = /^## B(\d+)\b/;
  for (const line of text.split("\n")) {
    const match = line.match(headingPattern);
    if (match) {
      entries.push({
        id: Number.parseInt(match[1], 10),
        title: match[2].trim(),
      });
      continue;
    }
    if (looseHeading.test(line)) {
      parseErrors.push({
        path: path.relative(stateRoot, backlogPath),
        reason: `backlog heading did not match expected format: ${JSON.stringify(line)}`,
      });
    }
  }
  return entries;
}

// ---------- Learnings index ----------

// Surfaces the project's learnings index as a pointer, not its body. The
// index lives at .hyper/memory/index.md and lists one entry per line in the
// `- [<title>](<entry-file>) — <one-line hook>` shape (see T70.2). Agents
// without a SessionStart hook read this pointer after the probe reports it
// and open individual entry files on demand.
const LEARNINGS_INDEX_REL = ".hyper/memory/index.md";
// Matches a markdown list item whose first token is a `[label](target)` link.
// Mirrors the index entry shape; the trailing hook text is not required.
const LEARNINGS_ENTRY_PATTERN = /^\s*[-*]\s+\[[^\]]+\]\([^)]+\)/;

function collectLearnings(stateRoot, parseErrors) {
  const indexAbs = path.join(stateRoot, ".hyper", "memory", "index.md");
  const learnings = {
    index_path: LEARNINGS_INDEX_REL,
    exists: fs.existsSync(indexAbs),
    entry_count: 0,
  };
  if (!learnings.exists) {
    return learnings;
  }

  let text;
  try {
    text = readUtf8(indexAbs);
  } catch (err) {
    parseErrors.push({
      path: path.relative(stateRoot, indexAbs),
      reason: `read failed: ${err.message}`,
    });
    return learnings;
  }

  for (const line of text.split("\n")) {
    if (LEARNINGS_ENTRY_PATTERN.test(line)) {
      learnings.entry_count += 1;
    }
  }
  return learnings;
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
  const fromHint = cleanFromHint(args.from, die);

  let stateRoot;
  let gitUnavailable = false;
  try {
    ({ stateRoot, gitUnavailable } = resolveStateRoot(fromHint));
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

  const activeResult = collectTaskFolders(stateRoot, tasksDir, "active", parseErrors);
  const archivedResult = collectTaskFolders(stateRoot, archiveDir, "archive", parseErrors);
  const loopResult = collectLoopFolders(stateRoot, loopsDir, parseErrors);
  const backlogEntries = collectBacklog(stateRoot, parseErrors);
  const learnings = collectLearnings(stateRoot, parseErrors);

  // Id allocation uses the folder-name set as canonical. This survives
  // missing or malformed frontmatter and prevents id reissue when a task's
  // task.md fails to parse.
  const nextTaskId = nextId([...activeResult.folderIds, ...archivedResult.folderIds]);
  const nextLoopId = nextId(loopResult.folderIds);
  const nextBacklogId = nextId(backlogEntries.map((e) => e.id));

  // Global, non-per-file environmental notes. Distinct from parse_errors,
  // which is per-file. Consumers can ignore but should not error out on
  // unknown warning kinds.
  const warnings = [];
  if (gitUnavailable) {
    warnings.push({
      kind: "git_unavailable",
      reason:
        "git command not found on PATH; state-root resolution fell back to --from or process.cwd(). Linked worktrees will not resolve to the main worktree.",
    });
  }

  const output = {
    state_root: stateRoot,
    bootstrapped,
    next_task_id: nextTaskId,
    next_loop_id: nextLoopId,
    next_backlog_id: nextBacklogId,
    active_tasks: activeResult.records,
    archived_tasks: archivedResult.records,
    active_loops: loopResult.active,
    backlog_entries: backlogEntries,
    learnings,
    parse_errors: parseErrors,
    warnings,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  // Spec promise: exit non-zero when every candidate record failed to parse.
  // A candidate is a folder under .hyper/tasks/, .hyper/archive/, or
  // .hyper/loops/ that matched the T<N>- or L<N>- prefix. Backlog parse
  // failures alone are not enough to fail the exit code — they're a softer
  // signal (heading drift, not a structural state issue).
  const totalFolderCandidates =
    activeResult.folderIds.length +
    archivedResult.folderIds.length +
    loopResult.folderIds.length;
  const successfulFolderRecords =
    activeResult.records.length +
    archivedResult.records.length +
    loopResult.active.length;
  if (totalFolderCandidates > 0 && successfulFolderRecords === 0) {
    process.stderr.write(
      `hyper state probe: every candidate task/loop folder failed to parse (${totalFolderCandidates} candidates)\n`,
    );
    process.exit(2);
  }
}

main();
