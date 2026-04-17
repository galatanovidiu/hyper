---
name: install-hyper
description: Installs, uninstalls, or checks the status of Hyper skills in Claude Code's personal skills directory (~/.claude/skills/). Symlinks the skill folders from this repo so local edits take effect immediately. Use when the user asks to install Hyper, set up Hyper for testing, refresh the installed skills, uninstall Hyper, or check whether Hyper is installed. Only meaningful when Claude Code is running inside the hyper7 development repo. Keywords: install, hyper, setup, symlink, refresh, uninstall, status.
---

# install-hyper

Dev-loop helper for working on Hyper itself. Install the nine skills under `skills/` into `~/.claude/skills/` as symlinks, so Claude Code picks up edits live without reinstalling.

This skill is not part of the distributed Hyper package — it lives in `.claude/skills/install-hyper/` inside this repo and only shows up when Claude Code is running in the hyper7 directory.

## Routing

Pick the operation from the user's request:

| Intent | Operation | Example prompts |
|--------|-----------|-----------------|
| Install / refresh | `install` (default) | "install hyper", "set up hyper", "refresh the skills" |
| Uninstall | `uninstall` | "uninstall hyper", "remove the symlinks" |
| Check what's there | `status` | "is hyper installed", "hyper install status" |

If the user's intent isn't one of these, ask.

## Running

All three operations are handled by `scripts/install.sh` bundled with this skill. Run it from this skill's directory:

```bash
bash scripts/install.sh install
bash scripts/install.sh uninstall
bash scripts/install.sh status
```

The script self-resolves its paths — it finds the `skills/` source directory relative to its own location, so the caller's CWD doesn't matter.

### Reporting back

The script prints one line per skill with the action taken (`link`, `unlink`, `ok`, `skip`, etc.). After it finishes, summarize to the user:

- For `install`: report how many skills were newly linked vs already linked, and any that were skipped (with the reason).
- For `uninstall`: report how many symlinks were removed.
- For `status`: pass through the table; it's already readable.

If Claude Code is running, remind the user: newly installed skills show up without a restart (Claude Code watches `~/.claude/skills/` for changes), but the slash-menu may take a moment to refresh. Verify with `/hyper` autocomplete.

## Custom install target

For project-scoped installs, set `HYPER_INSTALL_TARGET` before invoking:

```bash
HYPER_INSTALL_TARGET=/path/to/other-project/.claude/skills bash scripts/install.sh install
```

Default is `~/.claude/skills/`.

## Rules

- **Symlinks only.** The script never copies files. If a target path exists but isn't our symlink, the script skips it — it won't overwrite real files.
- **Uninstall is safe.** Only removes symlinks that point back into this repo. Non-symlinks at the target are left alone.
- **This script is not the production install method.** It's for developing Hyper itself. End users follow the README's `cp -r` or symlink-the-installed-repo flow.

## Key principles

- Dev loop wins. Install once, edit freely, refresh is a no-op because symlinks.
- Idempotent. Running `install` twice is safe and says so.
- Transparent. The script output is plain and auditable; the agent just interprets and summarizes.

## Additional resources

- `scripts/install.sh` — the actual install/uninstall/status logic. Read it if you need to understand what the skill will do.
