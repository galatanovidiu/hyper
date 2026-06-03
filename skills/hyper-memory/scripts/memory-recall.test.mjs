// Tests for the SessionStart memory-recall script.
// Run with: node --test skills/hyper/scripts/memory-recall.test.mjs
//
// Built-ins only (node:test, node:assert). Integration cases run the script as
// a child process with cwd set to throwaway fixture directories under the OS
// temp dir, never the real ~/ or this repo's .hyper.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { buildContext } from "./memory-recall.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "memory-recall.mjs");
const MAX_CHARS = 4000;

// ---------- helpers ----------

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hyper-recall-"));
}

// Run the recall script with cwd set to `cwd`. Fixture dirs are not git repos,
// so the resolver falls back to cwd (rule 4). Returns { status, stdout }.
function runRecall(cwd) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: "utf8",
  });
  return result;
}

function writeIndex(stateRoot, text) {
  const memoryDir = path.join(stateRoot, ".hyper", "memory");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(path.join(memoryDir, "index.md"), text);
}

// ---------- buildContext unit tests (deterministic) ----------

test("buildContext: short index is returned verbatim", () => {
  const text = "# Memory Index\n\n- [a](a.md) — note\n- [b](b.md) — note\n";
  assert.equal(buildContext(text), text);
});

test("buildContext: over-cap index truncates on whole lines with a pointer", () => {
  const header = "# Memory Index\n\n";
  const entry = (i) => `- [entry ${i}](e${i}.md) — a gotcha worth remembering here\n`;
  let body = header;
  let count = 0;
  while (body.length < MAX_CHARS * 2) {
    body += entry(count);
    count += 1;
  }

  const out = buildContext(body);

  assert.ok(out.length <= MAX_CHARS, `output ${out.length} must be <= ${MAX_CHARS}`);
  // Pointer line present and well-formed.
  const m = out.match(/… (\d+) more entries — read \.hyper\/memory\/index\.md$/);
  assert.ok(m, `expected a trailing pointer line, got:\n${out}`);
  // Truncation is on whole-line boundaries: every body line is an original line.
  const lines = out.split("\n");
  const pointerLine = lines[lines.length - 1];
  assert.match(pointerLine, /^… \d+ more entries/);
  for (const line of lines.slice(0, -1)) {
    if (line === "" || line === "# Memory Index") continue;
    assert.match(line, /^- \[entry \d+\]/);
  }
  // Dropped count equals total entries minus kept entries.
  const keptEntries = lines.filter((l) => /^- \[entry /.test(l)).length;
  const dropped = Number(m[1]);
  assert.equal(dropped, count - keptEntries);
});

// ---------- integration: no .hyper/ ----------

test("recall: no .hyper present prints nothing and exits 0", () => {
  const dir = mkdtemp();
  try {
    const res = runRecall(dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("recall: .hyper present but no memory/index.md prints nothing and exits 0", () => {
  const dir = mkdtemp();
  try {
    fs.mkdirSync(path.join(dir, ".hyper"), { recursive: true });
    const res = runRecall(dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- integration: index present ----------

test("recall: index present prints additionalContext JSON containing the index", () => {
  const dir = mkdtemp();
  try {
    const index = "# Memory Index\n\n- [gotcha one](one.md) — watch the cache\n";
    writeIndex(dir, index);
    const res = runRecall(dir);
    assert.equal(res.status, 0);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(parsed.hookSpecificOutput.additionalContext, index);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- integration: over-cap index ----------

test("recall: over-cap index is truncated with a pointer, total output under 4000 chars", () => {
  const dir = mkdtemp();
  try {
    let index = "# Memory Index\n\n";
    let count = 0;
    while (index.length < MAX_CHARS * 2) {
      index += `- [entry ${count}](e${count}.md) — a gotcha worth remembering here\n`;
      count += 1;
    }
    writeIndex(dir, index);
    const res = runRecall(dir);
    assert.equal(res.status, 0);
    const parsed = JSON.parse(res.stdout);
    const ctx = parsed.hookSpecificOutput.additionalContext;
    assert.ok(ctx.length < MAX_CHARS, `additionalContext ${ctx.length} must be < ${MAX_CHARS}`);
    assert.match(ctx, /… \d+ more entries — read \.hyper\/memory\/index\.md$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- integration: subdirectory resolves to the same root ----------

test("recall: from a subdirectory of a git repo resolves to the repo root index", { skip: !hasGit() }, () => {
  const dir = mkdtemp();
  try {
    initRepo(dir);
    const index = "# Memory Index\n\n- [root gotcha](r.md) — from the repo root\n";
    writeIndex(dir, index);
    const sub = path.join(dir, "pkg", "deep");
    fs.mkdirSync(sub, { recursive: true });

    const fromRoot = runRecall(dir);
    const fromSub = runRecall(sub);

    assert.equal(fromSub.status, 0);
    assert.equal(fromSub.stdout, fromRoot.stdout);
    const parsed = JSON.parse(fromSub.stdout);
    assert.equal(parsed.hookSpecificOutput.additionalContext, index);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- integration: forced read error fails open ----------

test("recall: an unreadable index.md fails open (exit 0, no output)", { skip: !canChmodBlock() }, () => {
  const dir = mkdtemp();
  try {
    writeIndex(dir, "# Memory Index\n\n- [x](x.md) — note\n");
    const indexPath = path.join(dir, ".hyper", "memory", "index.md");
    // Make the file exist (so isFile() passes) but be unreadable, forcing
    // readFileSync to throw. The script must catch and exit 0 with no output.
    fs.chmodSync(indexPath, 0o000);
    const res = runRecall(dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
  } finally {
    // Restore perms so cleanup can remove the file.
    try {
      fs.chmodSync(path.join(dir, ".hyper", "memory", "index.md"), 0o644);
    } catch {
      // ignore
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- git helpers ----------

function hasGit() {
  const r = spawnSync("git", ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
}

function initRepo(dir) {
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
}

// chmod 000 does not block reads when running as root. Skip the forced-error
// case in that environment; the catch path is covered by code review.
function canChmodBlock() {
  if (process.platform === "win32") return false;
  if (typeof process.getuid === "function" && process.getuid() === 0) return false;
  return true;
}
