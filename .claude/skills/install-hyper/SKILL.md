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

- **`install`** — how many targets were touched, how many skills newly linked vs already linked, and any skips (with the reason).
- **`uninstall`** — how many symlinks were removed per target.
- **`status`** — pass through the table; it's already readable.

For Claude Code specifically: newly installed skills show up without a restart (Claude Code watches `~/.claude/skills/` for changes), but the slash-menu may take a moment to refresh. Verify with `/hyper` autocomplete. Other agents may need a reload — check their docs.

## Rules

- **Symlinks only.** The script never copies files. If a target path already exists but isn't our symlink, the script skips it — it won't overwrite real files.
- **Uninstall is safe.** Only removes symlinks that point back into this repo. Non-symlinks at the target are left alone.
- **One source of truth.** All targets symlink to the same folders under `skills/` in this repo. Edit once, every agent picks it up.
