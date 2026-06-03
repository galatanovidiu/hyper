---
name: install-hyper
description: >
  Installs, uninstalls, or checks the status of Hyper skills across every supported agent skill directory on this machine — Codex (~/.Codex/skills/), Codex (~/.codex/skills/), ~/.agents/skills/, and PI (~/.pi/agent/skills/). Symlinks the skill folders from this repo so local edits take effect immediately. Use when the user asks to install Hyper, set up Hyper for testing, refresh the installed skills, uninstall Hyper, or check whether Hyper is installed. Only meaningful when Codex (or another agent) is running inside the hyper7 development repo. Keywords: install, hyper, setup, symlink, refresh, uninstall, status, codex, Codex, pi.
---

# install-hyper

Dev-loop helper for working on Hyper itself. Install the skill folders under `skills/` into every supported agent skills directory on this machine as symlinks, so agents pick up edits live without reinstalling.

This skill is not part of the distributed Hyper package — it lives in `.Codex/skills/install-hyper/` inside this repo and only surfaces when Codex is running in the hyper7 directory.

## Targets

By default, the script installs into every one of the following whose parent directory exists:

| Path | Agent |
|------|-------|
| `~/.Codex/skills/` | Codex |
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

- **`install`** — how many targets were touched, how many skills newly linked vs already linked, and any skips (with the reason).
- **`uninstall`** — how many symlinks were removed per target.
- **`status`** — pass through the table; it's already readable.

For Codex specifically: newly installed skills show up without a restart (Codex watches `~/.Codex/skills/` for changes), but the slash-menu may take a moment to refresh. Verify with `/hyper` autocomplete. Other agents may need a reload — check their docs.

### Portability check

Both `install` and `status` run a probe-reachability check after the per-target output. For every target, the script asserts that `<target>/hyper/scripts/state.mjs` resolves (via the symlink chain) to this repo's `skills/hyper/scripts/state.mjs`, is readable, and can be smoke-called via `node` to emit a JSON object with a non-empty `state_root`. Each target gets one line:

- `    probe   ok` — reachable and the smoke call succeeded.
- `    probe   skip (target not installed)` — the target directory is not present on this machine.
- `    probe   fail: <reason>` — anything else (broken symlink, missing `node`, wrong canonical path, malformed JSON, etc.).

During `install`, any `fail` exits the script non-zero so partial installs are visible. During `status`, the check is informational only — failures are printed but do not change the exit code.

## Rules

- **Symlinks only.** The script never copies files. If a target path already exists but isn't our symlink, the script skips it — it won't overwrite real files.
- **Uninstall is safe.** Only removes symlinks that point back into this repo. Non-symlinks at the target are left alone.
- **One source of truth.** All targets symlink to the same folders under `skills/` in this repo. Edit once, every agent picks it up.
