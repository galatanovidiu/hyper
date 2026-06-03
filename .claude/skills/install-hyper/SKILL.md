---
name: install-hyper
description: >
  Installs, uninstalls, or checks the status of Hyper skills across every supported agent skill directory on this machine — Claude Code (~/.claude/skills/), Codex (~/.codex/skills/), ~/.agents/skills/, and PI (~/.pi/agent/skills/). Symlinks the skill folders from this repo so local edits take effect immediately. Use when the user asks to install Hyper, set up Hyper for testing, refresh the installed skills, uninstall Hyper, or check whether Hyper is installed. Only meaningful when Claude Code (or another agent) is running inside the hyper7 development repo. Keywords: install, hyper, setup, symlink, refresh, uninstall, status, codex, claude, pi.
---

# install-hyper

Dev-loop helper for working on Hyper itself. Install the skill folders under `skills/` into every supported agent skills directory on this machine as symlinks, so agents pick up edits live without reinstalling.

This skill is not part of the distributed Hyper package — it lives in `.claude/skills/install-hyper/` inside this repo and only surfaces when Claude Code is running in the hyper7 directory.

## Targets

By default, the script installs into every one of the following whose parent directory exists:

| Path | Agent |
|------|-------|
| `~/.claude/skills/` | Claude Code |
| `~/.codex/skills/` | Codex |
| `~/.agents/skills/` | agent-common location (some tools read from here) |
| `~/.pi/agent/skills/` | PI |

Targets whose parent is missing (e.g. no `.codex/` folder on this machine) are skipped silently — Hyper only lands where an agent is actually set up.

Override with `HYPER_INSTALL_TARGETS` (colon-separated absolute paths):

```bash
HYPER_INSTALL_TARGETS=/path/one:/path/two bash scripts/install.sh install
```

## Routing

Pick the operation from the user's request:

| Intent | Operation | Example prompts |
|--------|-----------|-----------------|
| Install / refresh | `install` (default) | "install hyper", "set up hyper", "refresh the skills" |
| Uninstall | `uninstall` | "uninstall hyper", "remove the symlinks" |
| Check what's there | `status` | "is hyper installed", "hyper install status" |

If the user's intent isn't one of these, ask.

## Running

All three operations are handled by `scripts/install.sh` bundled with this skill:

```bash
bash scripts/install.sh install
bash scripts/install.sh uninstall
bash scripts/install.sh status
```

The script self-resolves its paths — it finds the source `skills/` directory relative to its own location, so the caller's CWD doesn't matter.

### Reporting back

The script prints a header per target, then one line per skill with the action taken (`link`, `unlink`, `ok`, `skip`). After it finishes, summarize to the user:

- **`install`** — how many targets were touched, how many skills newly linked vs already linked, any skips (with the reason), and whether a legacy Claude Code recall hook was cleaned up.
- **`uninstall`** — how many symlinks were removed per target, and whether a legacy recall hook was removed.
- **`status`** — pass through the table; it's already readable. Include the recall-hook line.

For Claude Code specifically: newly installed skills show up without a restart (Claude Code watches `~/.claude/skills/` for changes), but the slash-menu may take a moment to refresh. Verify with `/hyper` autocomplete. Other agents may need a reload — check their docs.

### Portability check

Both `install` and `status` run a probe-reachability check after the per-target output. For every target, the script asserts that `<target>/hyper-build/scripts/state.mjs` resolves (via the symlink chain) to this repo's `skills/hyper-build/scripts/state.mjs`, is readable, and can be smoke-called via `node` to emit a JSON object with a non-empty `state_root`. Each target gets one line:

- `    probe   ok` — reachable and the smoke call succeeded.
- `    probe   skip (target not installed)` — the target directory is not present on this machine.
- `    probe   fail: <reason>` — anything else (broken symlink, missing `node`, wrong canonical path, malformed JSON, etc.).

During `install`, any `fail` exits the script non-zero so partial installs are visible. During `status`, the check is informational only — failures are printed but do not change the exit code.

### SessionStart recall hook cleanup (Claude Code only)

Hyper no longer registers a `SessionStart` hook. Cross-session recall is agent-driven: the state probe reports a `learnings` pointer and the entry-point skills read `.hyper/memory/index.md` when it exists. That path is portable across every agent and never mutates `settings.json`.

The script still cleans up the hook from machines that ran an older Hyper version, so no orphaned hook lingers and recall never runs twice. Codex, `~/.agents/`, and PI never had a hook — only `~/.claude/settings.json` is touched, and only when `~/.claude` exists. The managed command it removes (the most recent path plus any known legacy path) looks like this:

```text
{ test -f "$HOME/.claude/skills/hyper-memory/scripts/memory-recall.mjs" && node "$HOME/.claude/skills/hyper-memory/scripts/memory-recall.mjs"; } 2>/dev/null || true
```

Per operation:

- **`install`** and **`uninstall`** strip every command this installer manages (the most recent command plus any known legacy command string from earlier Hyper versions) from all three `SessionStart` matcher groups — `startup`, `resume`, `clear`. Every other `SessionStart` hook (tab color, caffeinate, etc.) and every other settings key is left intact. Re-running on a config with no managed hook makes no change.
- **`status`** prints one line reporting whether a legacy recall hook is still present.

The merge runs in `node` (not bash string-editing) and is fail-safe. It pre-flight-validates the file (if `settings.json` exists but does not parse as JSON, it aborts and touches nothing), uses a content compare-and-swap immediately before the atomic rename (a concurrent edit aborts the write rather than clobbering it), writes a one-time backup only from a validated original (`settings.json.hyper-bak`, never overwritten once present), and writes through a temp file + atomic rename. On invalid input or a concurrent edit it aborts and changes nothing.

Each operation prints one `    hook    <result>` line:

- `install` / `uninstall` — `removed legacy SessionStart recall hook (recall is now agent-driven)`, `none present (recall is agent-driven)`, or `skip (~/.claude not present)`.
- `status` — `legacy recall hook present (run install/uninstall to remove)`, `none (recall is agent-driven)`, or `unknown (settings.json does not parse)`.

## Rules

- **Symlinks only.** The script never copies files. If a target path already exists but isn't our symlink, the script skips it — it won't overwrite real files.
- **Uninstall is safe.** Only removes symlinks that point back into this repo. Non-symlinks at the target are left alone.
- **One source of truth.** All targets symlink to the same folders under `skills/` in this repo. Edit once, every agent picks it up.
