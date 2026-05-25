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

# Resolve a path to its canonical absolute form. Uses `realpath` when
# available (macOS 10.13+, GNU coreutils); falls back to python3.
canonical_path() {
  local p="$1"
  if command -v realpath >/dev/null 2>&1; then
    realpath "$p" 2>/dev/null
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "$p" 2>/dev/null
  else
    return 1
  fi
}

# Verify the Hyper state probe is reachable from each target. Prints one
# `    probe   <status>` line per target. Returns 0 only when every target
# is either ok or skipped (target not installed); returns 1 if any target
# fails the reachability assertions.
verify_probe_reachable() {
  local repo_root probe_src probe_src_real
  repo_root="$(dirname "$source_dir")"
  probe_src="$source_dir/hyper/scripts/state.mjs"
  if [ ! -e "$probe_src" ]; then
    echo "    probe   fail: source probe missing at $probe_src" >&2
    return 1
  fi
  probe_src_real="$(canonical_path "$probe_src")"
  if [ -z "$probe_src_real" ]; then
    echo "    probe   fail: cannot canonicalize $probe_src (need realpath or python3)" >&2
    return 1
  fi

  local any_fail=0
  for t in "${targets[@]}"; do
    echo "? $t"
    if [ ! -d "$t" ]; then
      echo "    probe   skip (target not installed)"
      continue
    fi
    local probe_dst="$t/hyper/scripts/state.mjs"
    if [ ! -e "$probe_dst" ]; then
      echo "    probe   fail: $probe_dst not present (hyper skill not linked?)"
      any_fail=1
      continue
    fi
    if [ ! -r "$probe_dst" ]; then
      echo "    probe   fail: $probe_dst not readable"
      any_fail=1
      continue
    fi
    local probe_dst_real
    probe_dst_real="$(canonical_path "$probe_dst")"
    if [ -z "$probe_dst_real" ]; then
      echo "    probe   fail: cannot canonicalize $probe_dst"
      any_fail=1
      continue
    fi
    if [ "$probe_dst_real" != "$probe_src_real" ]; then
      echo "    probe   fail: resolves to $probe_dst_real, expected $probe_src_real"
      any_fail=1
      continue
    fi
    if ! command -v node >/dev/null 2>&1; then
      echo "    probe   fail: node not installed (required to run probe)"
      any_fail=1
      continue
    fi
    # Keep stdout and stderr separate so warnings from node (deprecation
    # notices, nvm hooks, libc warnings) do not get parsed as JSON.
    local probe_stdout probe_stderr_file probe_status
    probe_stderr_file="$(mktemp -t hyper-probe-err.XXXXXX)"
    probe_stdout="$(node "$probe_dst" --from "$repo_root" 2>"$probe_stderr_file")"
    probe_status=$?
    if [ "$probe_status" -ne 0 ]; then
      local first_line
      first_line="$(head -n 1 "$probe_stderr_file" 2>/dev/null)"
      if [ -z "$first_line" ]; then
        first_line="$(printf '%s' "$probe_stdout" | head -n 1)"
      fi
      echo "    probe   fail: node exited $probe_status: $first_line"
      rm -f "$probe_stderr_file"
      any_fail=1
      continue
    fi
    if [ -s "$probe_stderr_file" ]; then
      local stderr_first
      stderr_first="$(head -n 1 "$probe_stderr_file")"
      echo "    probe   fail: probe wrote to stderr on success: $stderr_first"
      rm -f "$probe_stderr_file"
      any_fail=1
      continue
    fi
    rm -f "$probe_stderr_file"
    # Validate that stdout parses as a JSON object with a non-empty
    # state_root field. node -e returns 0 only when both hold.
    if ! printf '%s' "$probe_stdout" | node -e '
      let buf = "";
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", () => {
        try {
          const o = JSON.parse(buf);
          if (o && typeof o === "object" && !Array.isArray(o) && typeof o.state_root === "string" && o.state_root.length > 0) {
            process.exit(0);
          }
          process.exit(2);
        } catch (e) {
          process.exit(3);
        }
      });
    ' >/dev/null 2>&1; then
      echo "    probe   fail: output is not a JSON object with non-empty state_root"
      any_fail=1
      continue
    fi
    echo "    probe   ok"
  done

  if [ "$any_fail" -ne 0 ]; then
    return 1
  fi
  return 0
}

case "$action" in
  install)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do install_one "$t"; done
    echo "portability check:"
    if ! verify_probe_reachable; then
      echo "error: probe reachability check failed for one or more targets" >&2
      exit 1
    fi
    ;;

  uninstall)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do uninstall_one "$t"; done
    ;;

  status)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do status_one "$t"; done
    echo "portability check:"
    verify_probe_reachable || true
    ;;

  *)
    echo "usage: $(basename "$0") [install|uninstall|status]" >&2
    exit 1
    ;;
esac
