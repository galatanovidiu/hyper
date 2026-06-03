// Hyper state-root resolver.
//
// Resolves the Hyper state root from an optional `--from` hint or the
// current working directory, following the chain locked in
// skills/hyper/reference/state-root.md:
//
//   1. Explicit `.hyper/` hint: strip the `.hyper/` segment, the prefix wins.
//   2. `git worktree list --porcelain`: first non-bare worktree (the main
//      worktree, even when started from a linked one).
//   3. `git rev-parse --show-toplevel` fallback.
//   4. No git: the `--from` hint when supplied, else `process.cwd()`.
//
// Shared by the state probe (state.mjs) and the SessionStart recall script.
// The resolver is reentrant: it holds no module-level mutable state, so two
// calls in one process produce independent results. `git` availability is
// reported per call via the returned `gitUnavailable` flag, not a shared flag.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

// Validate a --from hint. Returns the cleaned starting path, or calls `onError`
// with a single-line message (the caller decides how to fail). A null hint is
// passed through (caller uses process.cwd()).
export function cleanFromHint(fromArg, onError) {
  if (fromArg === null) return null;
  if (fromArg === "") {
    onError("hyper state probe: --from requires a non-empty absolute path");
    return null;
  }
  if (!path.isAbsolute(fromArg)) {
    onError(`hyper state probe: --from requires an absolute path, got ${JSON.stringify(fromArg)}`);
    return null;
  }

  // If the path points at an existing file, use its directory.
  let stat = null;
  try {
    stat = fs.statSync(fromArg);
  } catch {
    stat = null;
  }
  if (stat && stat.isFile()) {
    return path.dirname(fromArg);
  }

  // Existing directory: use as-is.
  if (stat) return fromArg;

  // Non-existent path: only accept if it carries a `.hyper/` marker we can
  // still strip downstream. Otherwise it points nowhere useful.
  const hyperMarker = `${path.sep}.hyper${path.sep}`;
  const hyperTrailing = `${path.sep}.hyper`;
  if (fromArg.includes(hyperMarker) || fromArg.endsWith(hyperTrailing)) {
    return fromArg;
  }
  onError(`hyper state probe: --from path does not exist: ${fromArg}`);
  return null;
}

// Runs git in `cwd`. On ENOENT (git not on PATH) sets `state.gitUnavailable`
// so the caller can surface a warning; the two failure cases (git missing vs.
// git ran but returned non-zero) warrant different routing. `state` is a
// per-call object, keeping the resolver reentrant.
export function runGit(cwd, gitArgs, state) {
  const result = spawnSync("git", gitArgs, {
    cwd,
    encoding: "utf8",
  });
  if (result.error) {
    if (result.error.code === "ENOENT" && state) state.gitUnavailable = true;
    return null;
  }
  if (result.status !== 0) return null;
  return result.stdout;
}

export function firstNonBareWorktree(porcelainOutput) {
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

// Resolves the state root from a cleaned `--from` hint (or null for cwd).
// Returns `{ stateRoot, gitUnavailable }`. `gitUnavailable` is per call, so
// the function is safe to call more than once in one process.
export function resolveStateRoot(fromArg) {
  const state = { gitUnavailable: false };

  // Rule 1: explicit .hyper/ hint wins outright.
  if (fromArg) {
    const idx = fromArg.indexOf(`${path.sep}.hyper${path.sep}`);
    if (idx >= 0) {
      return { stateRoot: fromArg.slice(0, idx), gitUnavailable: state.gitUnavailable };
    }
    // Hint that is exactly ".../.hyper" with no trailing component.
    const trailing = `${path.sep}.hyper`;
    if (fromArg.endsWith(trailing)) {
      return {
        stateRoot: fromArg.slice(0, fromArg.length - trailing.length),
        gitUnavailable: state.gitUnavailable,
      };
    }
  }

  const startDir = fromArg && fs.existsSync(fromArg) ? fromArg : process.cwd();

  // Rule 2: ask git for the worktree list.
  const porcelain = runGit(startDir, ["worktree", "list", "--porcelain"], state);
  const mainWorktree = firstNonBareWorktree(porcelain);
  if (mainWorktree) {
    return { stateRoot: mainWorktree, gitUnavailable: state.gitUnavailable };
  }

  // Rule 3: fall back to the toplevel of the containing Git repo.
  const toplevel = runGit(startDir, ["rev-parse", "--show-toplevel"], state);
  if (toplevel) {
    const trimmed = toplevel.trim();
    if (trimmed) return { stateRoot: trimmed, gitUnavailable: state.gitUnavailable };
  }

  // Rule 4: no Git in sight — use the explicit hint or cwd.
  if (fromArg) return { stateRoot: fromArg, gitUnavailable: state.gitUnavailable };
  return { stateRoot: process.cwd(), gitUnavailable: state.gitUnavailable };
}
