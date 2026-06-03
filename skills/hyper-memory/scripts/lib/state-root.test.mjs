// Tests for the shared state-root resolver.
// Run with: node --test skills/hyper-memory/scripts/lib/state-root.test.mjs
//
// Built-ins only (node:test, node:assert). Git-dependent cases build real
// throwaway repos under the OS temp dir and skip cleanly if `git` is missing.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  cleanFromHint,
  resolveStateRoot,
  firstNonBareWorktree,
} from "./state-root.mjs";

const SEP = path.sep;

// ---------- helpers ----------

function gitOnPath() {
  const result = spawnSync("git", ["--version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hyper-state-root-"));
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function initRepo(dir) {
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  fs.writeFileSync(path.join(dir, "README.md"), "x\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-q", "-m", "init"]);
}

// realpath the temp root: macOS /var/folders symlinks to /private/var, and
// git reports the realpath. Compare resolved values to avoid false diffs.
function real(p) {
  return fs.realpathSync(p);
}

const HAS_GIT = gitOnPath();

// ---------- cleanFromHint ----------

test("cleanFromHint: null hint passes through", () => {
  let called = false;
  const out = cleanFromHint(null, () => {
    called = true;
  });
  assert.equal(out, null);
  assert.equal(called, false);
});

test("cleanFromHint: --from pointing at a file returns the parent directory", () => {
  const dir = mkdtemp();
  try {
    const file = path.join(dir, "note.txt");
    fs.writeFileSync(file, "hi\n");
    let errMsg = null;
    const out = cleanFromHint(file, (m) => {
      errMsg = m;
    });
    assert.equal(errMsg, null);
    assert.equal(out, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("cleanFromHint: relative path triggers onError", () => {
  let errMsg = null;
  const out = cleanFromHint("relative/path", (m) => {
    errMsg = m;
  });
  assert.equal(out, null);
  assert.match(errMsg, /requires an absolute path/);
});

test("cleanFromHint: non-existent path without .hyper marker triggers onError", () => {
  let errMsg = null;
  const out = cleanFromHint(`${SEP}no${SEP}such${SEP}dir`, (m) => {
    errMsg = m;
  });
  assert.equal(out, null);
  assert.match(errMsg, /does not exist/);
});

test("cleanFromHint: non-existent path carrying a .hyper marker is accepted", () => {
  const hint = `${SEP}some${SEP}proj${SEP}.hyper${SEP}tasks`;
  let errMsg = null;
  const out = cleanFromHint(hint, (m) => {
    errMsg = m;
  });
  assert.equal(errMsg, null);
  assert.equal(out, hint);
});

// ---------- firstNonBareWorktree ----------

test("firstNonBareWorktree: returns first non-bare worktree, skipping bare", () => {
  const porcelain = [
    "worktree /repos/bare.git",
    "bare",
    "",
    "worktree /repos/main",
    "HEAD abc",
    "branch refs/heads/main",
  ].join("\n");
  assert.equal(firstNonBareWorktree(porcelain), "/repos/main");
});

test("firstNonBareWorktree: null input returns null", () => {
  assert.equal(firstNonBareWorktree(null), null);
});

// ---------- resolveStateRoot: explicit .hyper/ hint stripping ----------

test("resolveStateRoot: strips an embedded .hyper/ segment", () => {
  const hint = `${SEP}home${SEP}me${SEP}proj${SEP}.hyper${SEP}tasks${SEP}T1`;
  const { stateRoot, gitUnavailable } = resolveStateRoot(hint);
  assert.equal(stateRoot, `${SEP}home${SEP}me${SEP}proj`);
  assert.equal(gitUnavailable, false);
});

test("resolveStateRoot: strips a trailing .hyper hint", () => {
  const hint = `${SEP}home${SEP}me${SEP}proj${SEP}.hyper`;
  const { stateRoot } = resolveStateRoot(hint);
  assert.equal(stateRoot, `${SEP}home${SEP}me${SEP}proj`);
});

// ---------- resolveStateRoot: git-backed cases ----------

test("resolveStateRoot: subdirectory inside a repo resolves to the repo root", { skip: !HAS_GIT }, () => {
  const dir = mkdtemp();
  try {
    initRepo(dir);
    const sub = path.join(dir, "a", "b");
    fs.mkdirSync(sub, { recursive: true });
    const { stateRoot, gitUnavailable } = resolveStateRoot(sub);
    assert.equal(real(stateRoot), real(dir));
    assert.equal(gitUnavailable, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveStateRoot: linked worktree resolves to the main worktree", { skip: !HAS_GIT }, () => {
  const dir = mkdtemp();
  try {
    initRepo(dir);
    const linked = path.join(dir, "..", `${path.basename(dir)}-wt`);
    git(dir, ["worktree", "add", "-q", linked, "-b", "feature"]);
    try {
      const { stateRoot } = resolveStateRoot(linked);
      // First non-bare worktree is the main one, even when starting in the link.
      assert.equal(real(stateRoot), real(dir));
    } finally {
      fs.rmSync(linked, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- resolveStateRoot: non-git fallback ----------

test("resolveStateRoot: outside any repo falls back to the from hint", { skip: !HAS_GIT }, () => {
  const dir = mkdtemp();
  try {
    // A temp dir that is not a git repo. git rev-parse fails; rule 4 uses hint.
    const { stateRoot, gitUnavailable } = resolveStateRoot(dir);
    assert.equal(real(stateRoot), real(dir));
    assert.equal(gitUnavailable, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- gitUnavailable warning path ----------

test("resolveStateRoot: git missing from PATH sets gitUnavailable and falls back", () => {
  const dir = mkdtemp();
  const emptyBin = mkdtemp();
  const savedPath = process.env.PATH;
  try {
    // Point PATH at a directory with no `git`, so spawnSync errors ENOENT.
    process.env.PATH = emptyBin;
    const { stateRoot, gitUnavailable } = resolveStateRoot(dir);
    assert.equal(gitUnavailable, true);
    assert.equal(real(stateRoot), real(dir));
  } finally {
    process.env.PATH = savedPath;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(emptyBin, { recursive: true, force: true });
  }
});

// ---------- reentrancy ----------

test("resolveStateRoot: two calls in one process are independent", () => {
  const dir = mkdtemp();
  const emptyBin = mkdtemp();
  const savedPath = process.env.PATH;
  try {
    // First call with git missing: gitUnavailable must be true.
    process.env.PATH = emptyBin;
    const first = resolveStateRoot(dir);
    assert.equal(first.gitUnavailable, true);

    // Second call with a pure .hyper hint must NOT inherit the prior flag.
    process.env.PATH = savedPath;
    const second = resolveStateRoot(`${SEP}x${SEP}y${SEP}.hyper${SEP}z`);
    assert.equal(second.gitUnavailable, false);
    assert.equal(second.stateRoot, `${SEP}x${SEP}y`);
  } finally {
    process.env.PATH = savedPath;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(emptyBin, { recursive: true, force: true });
  }
});
