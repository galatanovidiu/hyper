#!/usr/bin/env bash
# Install, uninstall, or check the status of Hyper skills across every
# supported agent skill directory on this machine. Symlinks each skill so
# local edits take effect immediately — no reinstall needed when you change
# a SKILL.md.
#
# Usage:
#   install.sh install     # default — create symlinks in every known target
#   install.sh uninstall   # remove symlinks (never touches non-symlinks)
#   install.sh status      # show what's currently installed everywhere
#
# Targets (all installed into by default):
#   ~/.claude/skills       # Claude Code
#   ~/.codex/skills        # Codex
#   ~/.agents/skills       # agent-common location
#   ~/.pi/agent/skills     # PI
#
# Override with HYPER_INSTALL_TARGETS — colon-separated list of absolute paths:
#   HYPER_INSTALL_TARGETS=/path/one:/path/two ./install.sh install
#
# A target is used only if its parent directory already exists. If an agent
# isn't installed on this machine, that target is skipped silently.

set -euo pipefail

action="${1:-install}"

# Resolve this repo's skills/ directory from the script's own location.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$(cd "$script_dir/../../../../skills" && pwd)"

if [ ! -d "$source_dir" ]; then
  echo "error: source skills directory not found at $source_dir" >&2
  echo "hint: this script must be run from inside the hyper7 repo" >&2
  exit 1
fi

# Candidate targets. A target is kept only if its parent dir exists.
default_targets=(
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
  "$HOME/.agents/skills"
  "$HOME/.pi/agent/skills"
)

if [ -n "${HYPER_INSTALL_TARGETS:-}" ]; then
  IFS=':' read -r -a targets <<<"$HYPER_INSTALL_TARGETS"
else
  targets=()
  for t in "${default_targets[@]}"; do
    parent="$(dirname "$t")"
    if [ -d "$parent" ]; then
      targets+=("$t")
    fi
  done
fi

if [ "${#targets[@]}" -eq 0 ]; then
  echo "error: no install targets found" >&2
  echo "hint: none of ${default_targets[*]} have an existing parent dir" >&2
  exit 1
fi

skills=(
  hyper
  hyper-task
  hyper-backlog
  hyper-handoff
  hyper-retro
  hyper-explore
  hyper-plan
  hyper-implement
  hyper-verify
  hyper-docs
  team
)

install_one() {
  local target="$1"
  mkdir -p "$target"
  echo "→ $target"
  for s in "${skills[@]}"; do
    local src="$source_dir/$s"
    local dst="$target/$s"
    if [ ! -d "$src" ]; then
      echo "    skip   $s (not found in source)"
      continue
    fi
    if [ -L "$dst" ]; then
      local current
      current="$(readlink "$dst")"
      if [ "$current" = "$src" ]; then
        echo "    ok     $s (already linked)"
        continue
      else
        echo "    skip   $s (link points elsewhere: $current)"
        continue
      fi
    fi
    if [ -e "$dst" ]; then
      echo "    skip   $s (exists and is not a symlink — remove manually to replace)"
      continue
    fi
    ln -s "$src" "$dst"
    echo "    link   $s"
  done
}

uninstall_one() {
  local target="$1"
  echo "← $target"
  if [ ! -d "$target" ]; then
    echo "    skip   (target does not exist)"
    return
  fi
  for s in "${skills[@]}"; do
    local src="$source_dir/$s"
    local dst="$target/$s"
    if [ -L "$dst" ]; then
      local current
      current="$(readlink "$dst")"
      if [ "$current" = "$src" ]; then
        rm "$dst"
        echo "    unlink $s"
      else
        echo "    skip   $s (link points elsewhere: $current)"
      fi
    elif [ -e "$dst" ]; then
      echo "    skip   $s (not a symlink — leaving alone)"
    fi
  done
}

status_one() {
  local target="$1"
  echo "@ $target"
  if [ ! -d "$target" ]; then
    echo "    (target does not exist)"
    return
  fi
  for s in "${skills[@]}"; do
    local src="$source_dir/$s"
    local dst="$target/$s"
    if [ -L "$dst" ]; then
      local current
      current="$(readlink "$dst")"
      if [ "$current" = "$src" ]; then
        printf "    %-20s linked (this repo)\n" "$s"
      else
        printf "    %-20s linked to %s\n" "$s" "$current"
      fi
    elif [ -e "$dst" ]; then
      printf "    %-20s exists (not a symlink)\n" "$s"
    else
      printf "    %-20s not installed\n" "$s"
    fi
  done
}

case "$action" in
  install)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do install_one "$t"; done
    ;;

  uninstall)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do uninstall_one "$t"; done
    ;;

  status)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do status_one "$t"; done
    ;;

  *)
    echo "usage: $(basename "$0") [install|uninstall|status]" >&2
    exit 1
    ;;
esac
