#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
operation=${1:-status}
case "$operation" in
  install|status) ;;
  *) printf 'Usage: bash scripts/install-hyper.sh [install|status]\n' >&2; exit 2 ;;
esac
[[ $# -le 1 ]] || { printf 'Unexpected arguments\n' >&2; exit 2; }
[[ -f "$repo_root/skills/hyper/SKILL.md" && -f "$repo_root/skills/LICENSE" ]] || { printf 'Incomplete source suite\n' >&2; exit 1; }
# Override with newline-separated absolute skill directories. Never evaluate input.
if [[ ${HYPER_INSTALL_TARGETS+x} ]]; then
  target_text=$HYPER_INSTALL_TARGETS
else
  target_text=$(printf '%s\n' "$HOME/.agents/skills" "$HOME/.claude/skills" "$HOME/.codex/skills")
fi
targets=()
while IFS= read -r target; do
  [[ -n "$target" ]] && targets+=("$target")
done <<< "$target_text"
[[ ${#targets[@]} -gt 0 ]] || { printf 'No installation targets\n' >&2; exit 2; }
# Preflight every destination before mutations, including dangling links.
conflicts=0
resolved_targets=()
for target in "${targets[@]}"; do
  [[ "$target" == /* ]] || { printf 'Target must be absolute: %s\n' "$target" >&2; exit 2; }
  case "$target/" in */./*|*/../*) printf 'Use a normalized absolute target: %s\n' "$target" >&2; exit 2 ;; esac
  # Resolve the existing ancestor physically, then append the absent suffix.
  # This catches source overlap through symlinked parents and repeated slashes.
  probe=$target
  suffix=""
  while [[ ! -d "$probe" ]]; do
    if [[ -e "$probe" || -L "$probe" ]]; then
      printf 'Target ancestor is not a directory: %s\n' "$probe" >&2; exit 2
    fi
    suffix="/${probe##*/}$suffix"
    probe=$(dirname -- "$probe")
  done
  target="$(cd -- "$probe" && pwd -P)$suffix"
  resolved_targets+=("$target")
  case "$target/" in "$repo_root/"*) printf 'Target overlaps source repository: %s\n' "$target" >&2; exit 2 ;; esac
  if [[ -e "$target" && ! -d "$target" ]] || [[ -L "$target" && ! -d "$target" ]]; then
    printf 'Target is not a directory: %s\n' "$target" >&2; exit 2
  fi
  for source in "$repo_root"/skills/hyper*; do
    [[ -f "$source/SKILL.md" ]] || continue
    dest="$target/${source##*/}"
    if [[ -L "$dest" && "$(readlink "$dest")" == "$source" ]]; then
      printf 'linked %s\n' "$dest"
    elif [[ -e "$dest" || -L "$dest" ]]; then
      printf 'conflict %s\n' "$dest" >&2
      conflicts=1
    else
      printf 'missing %s\n' "$dest"
    fi
  done
  # A suite-local license filename avoids overwriting host-owned LICENSE files.
  dest="$target/hyper-LICENSE"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$repo_root/skills/LICENSE" ]]; then
    printf 'linked %s\n' "$dest"
  elif [[ -e "$dest" || -L "$dest" ]]; then
    printf 'conflict %s\n' "$dest" >&2
    conflicts=1
  else
    printf 'missing %s\n' "$dest"
  fi
done
[[ "$conflicts" == 0 ]] || exit 1
[[ "$operation" == install ]] || exit 0
for target in "${resolved_targets[@]}"; do
  mkdir -p -- "$target"
  for source in "$repo_root"/skills/hyper*; do
    [[ -f "$source/SKILL.md" ]] || continue
    dest="$target/${source##*/}"
    if [[ ! -e "$dest" && ! -L "$dest" ]]; then ln -s -- "$source" "$dest"; fi
  done
  dest="$target/hyper-LICENSE"
  if [[ ! -e "$dest" && ! -L "$dest" ]]; then ln -s -- "$repo_root/skills/LICENSE" "$dest"; fi
done
