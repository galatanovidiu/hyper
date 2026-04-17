#!/usr/bin/env bash
# Install, uninstall, or check the status of Hyper skills in Claude Code's
# personal skills directory. Symlinks each skill so local edits take effect
# immediately — no reinstall needed when you change a SKILL.md.
#
# Usage:
#   install.sh install     # default — create symlinks
#   install.sh uninstall   # remove symlinks (never touches non-symlinks)
#   install.sh status      # show what's currently installed
#
# Target can be overridden with HYPER_INSTALL_TARGET env var. Default is
# ~/.claude/skills/ (personal install, available in all projects).

set -euo pipefail

action="${1:-install}"
target="${HYPER_INSTALL_TARGET:-$HOME/.claude/skills}"

# Resolve this repo's skills/ directory from the script's own location.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$(cd "$script_dir/../../../../skills" && pwd)"

skills=(
  hyper
  hyper-task
  hyper-handoff
  hyper-retro
  hyper-explore
  hyper-plan
  hyper-implement
  hyper-verify
  hyper-docs
)

if [ ! -d "$source_dir" ]; then
  echo "error: source skills directory not found at $source_dir" >&2
  echo "hint: this script must be run from inside the hyper7 repo" >&2
  exit 1
fi

case "$action" in
  install)
    mkdir -p "$target"
    echo "installing Hyper skills → $target"
    for s in "${skills[@]}"; do
      src="$source_dir/$s"
      dst="$target/$s"
      if [ ! -d "$src" ]; then
        echo "  skip   $s (not found in source)"
        continue
      fi
      if [ -L "$dst" ]; then
        current="$(readlink "$dst")"
        if [ "$current" = "$src" ]; then
          echo "  ok     $s (already linked)"
          continue
        else
          echo "  skip   $s (link points elsewhere: $current)"
          continue
        fi
      fi
      if [ -e "$dst" ]; then
        echo "  skip   $s (exists and is not a symlink — remove manually to replace)"
        continue
      fi
      ln -s "$src" "$dst"
      echo "  link   $s"
    done
    ;;

  uninstall)
    echo "uninstalling Hyper skills from $target"
    for s in "${skills[@]}"; do
      dst="$target/$s"
      src="$source_dir/$s"
      if [ -L "$dst" ]; then
        current="$(readlink "$dst")"
        if [ "$current" = "$src" ]; then
          rm "$dst"
          echo "  unlink $s"
        else
          echo "  skip   $s (link points elsewhere: $current)"
        fi
      elif [ -e "$dst" ]; then
        echo "  skip   $s (not a symlink — leaving alone)"
      fi
    done
    ;;

  status)
    echo "source: $source_dir"
    echo "target: $target"
    echo
    for s in "${skills[@]}"; do
      src="$source_dir/$s"
      dst="$target/$s"
      if [ -L "$dst" ]; then
        current="$(readlink "$dst")"
        if [ "$current" = "$src" ]; then
          printf "  %-20s linked (this repo)\n" "$s"
        else
          printf "  %-20s linked to %s\n" "$s" "$current"
        fi
      elif [ -e "$dst" ]; then
        printf "  %-20s exists (not a symlink)\n" "$s"
      else
        printf "  %-20s not installed\n" "$s"
      fi
    done
    ;;

  *)
    echo "usage: $(basename "$0") [install|uninstall|status]" >&2
    exit 1
    ;;
esac
