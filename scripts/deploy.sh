#!/usr/bin/env bash
# Deploy all Hyper skills from this repo to every supported agent skill directory.
#
# For each skill folder found in skills/ (those containing SKILL.md):
#   1. Remove any existing symlink with that name from each target directory.
#   2. Create a new absolute symlink pointing to this repo's skills/ folder.
#
# This unlink-then-relink approach guarantees a clean, fully-synced state on
# every run. New skills are picked up automatically; removed skills are cleaned up.
#
# Targets:
#   ~/.claude/skills    — Claude Code
#   ~/.codex/skills     — Codex
#   ~/.agents/skills    — agent-common location
#   ~/.pi/agent/skills  — PI
#
# A target is used only if its parent directory already exists on this machine.
# Override with HYPER_INSTALL_TARGETS (colon-separated absolute paths):
#   HYPER_INSTALL_TARGETS=/path/one:/path/two bash deploy.sh

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$(cd "$script_dir/../skills" && pwd)"

if [ ! -d "$source_dir" ]; then
  echo "error: skills directory not found at $source_dir" >&2
  echo "hint: run this script from inside the hyper7e repo" >&2
  exit 1
fi

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

skills=()
while IFS= read -r skill_dir; do
  skills+=("$(basename "$skill_dir")")
done < <(
  find "$source_dir" -mindepth 1 -maxdepth 1 -type d \
    -exec test -f '{}/SKILL.md' ';' -print | LC_ALL=C sort
)

if [ "${#skills[@]}" -eq 0 ]; then
  echo "error: no skills found under $source_dir" >&2
  exit 1
fi

echo "source: $source_dir"
echo "skills: ${#skills[@]}"
echo ""

for target in "${targets[@]}"; do
  mkdir -p "$target"
  echo "→ $target"

  for s in "${skills[@]}"; do
    dst="$target/$s"
    if [ -L "$dst" ]; then
      rm "$dst"
      echo "    unlink  $s"
    elif [ -e "$dst" ]; then
      echo "    skip    $s (exists and is not a symlink — remove manually)"
      continue
    fi
    ln -s "$source_dir/$s" "$dst"
    echo "    link    $s"
  done

  echo ""
done

echo "done."
