// Tests for the SessionStart recall-hook merge in install-hyper's install.sh.
// Run with: node --test scripts/install-recall-hook.test.mjs
//
// Built-ins only (node:test, node:assert). The merge program is the embedded
// node source inside install.sh (the `hook_node_source` heredoc). We extract
// that exact source, write it to a temp .mjs, and drive it via the same env
// contract install.sh uses: HYPER_SETTINGS_FILE + HYPER_RECALL_CMD. Each case
// runs against a throwaway settings.json under the OS temp dir, never the real
// ~/.claude/settings.json.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(HERE);
const INSTALL_SH = path.join(
  REPO_ROOT,
  ".agents",
  "skills",
  "install-hyper",
  "scripts",
  "install.sh"
);

// The current recall command (must match install.sh's recall_hook_command).
const NEW_CMD =
  '{ test -f "$HOME/.claude/skills/hyper-memory/scripts/memory-recall.mjs" && node "$HOME/.claude/skills/hyper-memory/scripts/memory-recall.mjs"; } 2>/dev/null || true';
// The T70 legacy command (must match LEGACY_COMMANDS in install.sh).
const LEGACY_CMD =
  '{ test -f "$HOME/.claude/skills/hyper/scripts/memory-recall.mjs" && node "$HOME/.claude/skills/hyper/scripts/memory-recall.mjs"; } 2>/dev/null || true';
const MATCHERS = ["startup", "resume", "clear"];

// ---------- extract the embedded merge program from install.sh ----------

// Pull the node source out of the `cat <<'NODE_EOF' ... NODE_EOF` heredoc so
// the test always runs the exact program install.sh ships. This binds the
// test to the source: a divergent edit to either install.sh copy that breaks
// the merge will fail here.
function extractProgram() {
  const text = fs.readFileSync(INSTALL_SH, "utf8");
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.includes("<<'NODE_EOF'"));
  assert.ok(start !== -1, "could not find NODE_EOF heredoc start in install.sh");
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i] === "NODE_EOF") {
      end = i;
      break;
    }
  }
  assert.ok(end !== -1, "could not find NODE_EOF heredoc end in install.sh");
  return lines.slice(start + 1, end).join("\n") + "\n";
}

const PROGRAM_SOURCE = extractProgram();

// ---------- harness ----------

function mkWorkdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hyper-hook-"));
}

// Write the merge program once per workdir and return its path.
function writeProgram(dir) {
  const p = path.join(dir, "merge.mjs");
  fs.writeFileSync(p, PROGRAM_SOURCE);
  return p;
}

// Run the merge program for a verb against `settingsFile`. `recallCmd` defaults
// to the current command. install.sh's run_hook_merge always passes
// HYPER_RECALL_CMD for every verb (including status), so the default mirrors
// production; pass null only to test the missing-env guard.
function runMerge(program, settingsFile, verb, recallCmd = NEW_CMD) {
  const env = { ...process.env, HYPER_SETTINGS_FILE: settingsFile };
  if (recallCmd !== null) env.HYPER_RECALL_CMD = recallCmd;
  else delete env.HYPER_RECALL_CMD;
  const r = spawnSync(process.execPath, [program, verb], {
    encoding: "utf8",
    env,
  });
  return { status: r.status, stdout: (r.stdout || "").trim(), stderr: r.stderr || "" };
}

function readSettings(settingsFile) {
  return JSON.parse(fs.readFileSync(settingsFile, "utf8"));
}

// Collect the command strings present under a given matcher, aggregated across
// ALL SessionStart groups carrying that matcher (not just the first). A config
// with duplicate matcher groups must be inspected in full or a stray command in
// a second group would go unseen.
function commandsUnder(data, matcher) {
  const groups = data?.hooks?.SessionStart || [];
  const out = [];
  for (const group of groups) {
    if (!group || group.matcher !== matcher || !Array.isArray(group.hooks)) continue;
    for (const h of group.hooks) {
      if (h && h.type === "command") out.push(h.command);
    }
  }
  return out;
}

// Every command string anywhere under SessionStart.
function allCommands(data) {
  const groups = data?.hooks?.SessionStart || [];
  const out = [];
  for (const group of groups) {
    if (!group || !Array.isArray(group.hooks)) continue;
    for (const h of group.hooks) {
      if (h && h.type === "command") out.push(h.command);
    }
  }
  return out;
}

function withWorkdir(fn) {
  const dir = mkWorkdir();
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- unregister: strips new + legacy, leaves unrelated intact ----------

test("unregister removes both new and legacy commands and leaves unrelated hooks intact", () => {
  withWorkdir((dir) => {
    const program = writeProgram(dir);
    const settings = path.join(dir, "settings.json");
    const initial = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              { type: "command", command: "echo keep-me" },
              { type: "command", command: LEGACY_CMD },
              { type: "command", command: NEW_CMD },
            ],
          },
          { matcher: "resume", hooks: [{ type: "command", command: NEW_CMD }] },
          { matcher: "clear", hooks: [{ type: "command", command: LEGACY_CMD }] },
        ],
      },
    };
    fs.writeFileSync(settings, JSON.stringify(initial, null, 2) + "\n");
    const res = runMerge(program, settings, "unregister");
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "removed");
    const data = readSettings(settings);
    const all = allCommands(data);
    assert.ok(!all.includes(NEW_CMD), "new command must be gone");
    assert.ok(!all.includes(LEGACY_CMD), "legacy command must be gone");
    // Unrelated hook survives; its group is kept.
    assert.ok(commandsUnder(data, "startup").includes("echo keep-me"));
    // Empty owned groups (resume, clear) are pruned.
    const matchers = (data.hooks.SessionStart || []).map((g) => g.matcher);
    assert.ok(!matchers.includes("resume"), "empty resume group should be pruned");
    assert.ok(!matchers.includes("clear"), "empty clear group should be pruned");
  });
});

// ---------- status: reports registered / not-registered / absent ----------

test("status reports not-registered on a legacy-only config", () => {
  withWorkdir((dir) => {
    const program = writeProgram(dir);
    const settings = path.join(dir, "settings.json");
    const initial = {
      hooks: {
        SessionStart: MATCHERS.map((matcher) => ({
          matcher,
          hooks: [{ type: "command", command: LEGACY_CMD }],
        })),
      },
    };
    fs.writeFileSync(settings, JSON.stringify(initial, null, 2) + "\n");
    const res = runMerge(program, settings, "status");
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "not-registered");
  });
});

test("status reports registered when the current command is present under all three matchers", () => {
  withWorkdir((dir) => {
    const program = writeProgram(dir);
    const settings = path.join(dir, "settings.json");
    const initial = {
      hooks: {
        SessionStart: MATCHERS.map((matcher) => ({
          matcher,
          hooks: [{ type: "command", command: NEW_CMD }],
        })),
      },
    };
    fs.writeFileSync(settings, JSON.stringify(initial, null, 2) + "\n");
    const res = runMerge(program, settings, "status");
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "registered");
  });
});

test("status reports absent when settings.json is missing", () => {
  withWorkdir((dir) => {
    const program = writeProgram(dir);
    const settings = path.join(dir, "settings.json"); // does not exist
    const res = runMerge(program, settings, "status");
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "absent");
  });
});
