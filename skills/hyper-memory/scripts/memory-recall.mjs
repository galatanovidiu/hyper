// Hyper SessionStart memory-recall script.
//
// A Claude Code `SessionStart` hook invokes this script to inject the
// project's learnings index into the session context. It:
//
//   1. Resolves the Hyper state root from the process cwd, reusing the shared
//      resolver (worktree- and subdirectory-correct by reuse).
//   2. Fast-exits 0 with no output when there is no `.hyper/` on the resolved
//      path, or no `.hyper/memory/index.md`.
//   3. Reads `.hyper/memory/index.md` and emits it as Claude Code SessionStart
//      additional context, using the JSON form:
//      {"hookSpecificOutput": {"hookEventName": "SessionStart",
//       "additionalContext": "<index>"}}.
//   4. Caps the injected text at MAX_CHARS. An over-cap index is truncated on
//      whole-line boundaries, with a final pointer line counting the entries
//      that were dropped.
//
// The script fails open: any thrown error results in exit 0 with no stdout
// output. The registered hook command is a second backstop, but the script is
// self-safe so it cannot degrade session start on its own.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { resolveStateRoot } from "./lib/state-root.mjs";

// Maximum number of characters injected as additional context. The index is
// made of short lines (`- [title](file) — note`), so this holds tens of
// entries. Tunable from this single constant.
const MAX_CHARS = 4000;

// Builds the additional-context payload from the raw index text. If the text
// fits within MAX_CHARS it is returned verbatim. Otherwise it is truncated on
// whole-line boundaries and a pointer line is appended naming how many index
// entries were dropped. The returned string is always within MAX_CHARS.
export function buildContext(indexText) {
  if (indexText.length <= MAX_CHARS) {
    return indexText;
  }

  const lines = indexText.split("\n");

  // An index "entry" is a list item line. Count them so the pointer can report
  // how many entries were dropped rather than how many raw lines.
  const isEntry = (line) => /^\s*[-*]\s/.test(line);
  const totalEntries = lines.filter(isEntry).length;

  const kept = [];
  let length = 0;
  let keptEntries = 0;

  for (const line of lines) {
    // +1 accounts for the newline that rejoins this line to the previous ones.
    const added = kept.length === 0 ? line.length : line.length + 1;
    if (length + added > MAX_CHARS) break;
    kept.push(line);
    length += added;
    if (isEntry(line)) keptEntries += 1;
  }

  const pointerFor = (dropped) =>
    `… ${dropped} more entries — read .hyper/memory/index.md`;

  // Drop trailing whole lines until the body plus the pointer fits within
  // MAX_CHARS. Dropping an entry line raises the dropped count, so the pointer
  // is recomputed each pass to stay accurate.
  while (kept.length > 0) {
    const dropped = totalEntries - keptEntries;
    const candidate = `${kept.join("\n")}\n${pointerFor(dropped)}`;
    if (candidate.length <= MAX_CHARS) {
      return candidate;
    }
    const removed = kept.pop();
    if (isEntry(removed)) keptEntries -= 1;
  }

  // Even the pointer alone is over the cap (MAX_CHARS pathologically tiny):
  // emit the pointer truncated to the cap.
  return pointerFor(totalEntries).slice(0, MAX_CHARS);
}

// The whole body runs inside a try/catch so any failure (resolution, stat,
// read) results in exit 0 with no stdout output.
function main() {
  const { stateRoot } = resolveStateRoot(null);
  if (!stateRoot) return;

  const hyperDir = path.join(stateRoot, ".hyper");
  if (!isDirectory(hyperDir)) return;

  const indexPath = path.join(hyperDir, "memory", "index.md");
  if (!isFile(indexPath)) return;

  const indexText = fs.readFileSync(indexPath, "utf8");
  const trimmed = indexText.trim();
  if (trimmed === "") return;

  const additionalContext = buildContext(indexText);
  const payload = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  };
  process.stdout.write(JSON.stringify(payload));
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Run only when executed directly (the hook path), not when imported by tests.
// Importing the module must have no side effects so it can be unit-tested.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    main();
  } catch {
    // Fail open: never let a recall error degrade session start.
  }
  process.exit(0);
}
