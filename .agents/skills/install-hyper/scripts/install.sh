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

# --- SessionStart recall hook management (Claude Code only) ---------------
#
# Claude Code is the only target with a settings.json hook mechanism. We
# register a SessionStart hook that runs the Hyper memory-recall script so
# saved project gotchas surface at session start. Codex, ~/.agents, and PI
# have no equivalent and are left untouched.
#
# The hook command is fail-open: it checks the script exists, runs it, and
# swallows any error so a missing or broken script can never degrade session
# start.
recall_hook_command='{ test -f "$HOME/.claude/skills/hyper/scripts/memory-recall.mjs" && node "$HOME/.claude/skills/hyper/scripts/memory-recall.mjs"; } 2>/dev/null || true'

# All JSON reading/mutating happens in node, never bash string-editing, so
# the rest of settings.json (other SessionStart hooks, permissions, env) is
# preserved exactly. The merge is fail-safe: pre-flight JSON validation,
# compare-and-swap on content hash, one-time backup of a validated original,
# and an atomic temp-file rename. On invalid input or a concurrent edit it
# aborts and touches nothing.
#
# The node program is written to a temp file per invocation. It reads the
# settings path from HYPER_SETTINGS_FILE (defaulting to
# $HOME/.claude/settings.json) and the command string from HYPER_RECALL_CMD.
hook_node_source() {
  cat <<'NODE_EOF'
// Manage the Hyper SessionStart recall hook in a Claude Code settings.json.
// Verbs (argv[2]): register | unregister | status.
// Inputs via env: HYPER_SETTINGS_FILE (path), HYPER_RECALL_CMD (command).
// Fail-safe: validate, compare-and-swap on content hash, safe backup, atomic
// rename. Abort (touch nothing) on invalid JSON or concurrent edit.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const verb = process.argv[2];
const file = process.env.HYPER_SETTINGS_FILE;
const command = process.env.HYPER_RECALL_CMD;
const MATCHERS = ["startup", "resume", "clear"];

if (!file) {
  console.error("hook merge: HYPER_SETTINGS_FILE not set");
  process.exit(2);
}
if (verb !== "status" && !command) {
  console.error("hook merge: HYPER_RECALL_CMD not set");
  process.exit(2);
}

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Read + validate. Returns { text, data } or null when the file is absent.
// Throws on invalid JSON so the caller can abort.
function readValidated() {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return null;
    throw e;
  }
  if (text.trim() === "") {
    return { text, data: {} };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const err = new Error(`existing settings.json is not valid JSON: ${e.message}`);
    err.invalidJson = true;
    throw err;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    const err = new Error("existing settings.json is not a JSON object");
    err.invalidJson = true;
    throw err;
  }
  return { text, data };
}

// Does the SessionStart config already carry our command under any matcher?
function isRegistered(data) {
  const groups = data?.hooks?.SessionStart;
  if (!Array.isArray(groups)) return false;
  for (const group of groups) {
    if (!group || !Array.isArray(group.hooks)) continue;
    for (const h of group.hooks) {
      if (h && h.type === "command" && h.command === command) return true;
    }
  }
  return false;
}

// Insert our command under the three matcher groups, reusing an existing
// group with the same matcher when present. Mutates `data` in place.
function addHook(data) {
  if (!data.hooks || typeof data.hooks !== "object" || Array.isArray(data.hooks)) {
    data.hooks = {};
  }
  if (!Array.isArray(data.hooks.SessionStart)) {
    data.hooks.SessionStart = [];
  }
  const groups = data.hooks.SessionStart;
  for (const matcher of MATCHERS) {
    let group = groups.find((g) => g && g.matcher === matcher);
    if (!group) {
      group = { matcher, hooks: [] };
      groups.push(group);
    }
    if (!Array.isArray(group.hooks)) {
      group.hooks = [];
    }
    const present = group.hooks.some(
      (h) => h && h.type === "command" && h.command === command
    );
    if (!present) {
      group.hooks.push({ type: "command", command });
    }
  }
}

// Remove only our command from the three matcher groups. Leaves every other
// hook in place. Drops a matcher group only if it is one of ours AND it
// becomes empty AND we created it (matcher in MATCHERS with no other hooks).
// Mutates `data` in place. Returns true when something changed.
function removeHook(data) {
  const groups = data?.hooks?.SessionStart;
  if (!Array.isArray(groups)) return false;
  let changed = false;
  for (const group of groups) {
    if (!group || !Array.isArray(group.hooks)) continue;
    const before = group.hooks.length;
    group.hooks = group.hooks.filter(
      (h) => !(h && h.type === "command" && h.command === command)
    );
    if (group.hooks.length !== before) changed = true;
  }
  // Prune matcher groups we own that are now empty, so uninstall does not
  // leave behind bare { matcher: "resume", hooks: [] } shells we added.
  data.hooks.SessionStart = groups.filter((group) => {
    if (!group || !Array.isArray(group.hooks)) return true;
    const ours = MATCHERS.includes(group.matcher);
    if (ours && group.hooks.length === 0) {
      changed = true;
      return false;
    }
    return true;
  });
  return changed;
}

// Atomic write with compare-and-swap and one-time safe backup.
// `originalText` is the validated content captured at read (null when the
// file did not exist). Aborts without writing if the file changed since.
function safeWrite(data, originalText) {
  const dir = path.dirname(file);
  const serialized = JSON.stringify(data, null, 2) + "\n";

  // Compare-and-swap: re-read just before writing. If the on-disk content no
  // longer matches what we validated, a concurrent writer touched it — abort.
  let current = null;
  try {
    current = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (!(e && e.code === "ENOENT")) throw e;
  }
  const expected = originalText === null ? null : originalText;
  if ((current === null ? null : current) !== expected) {
    const err = new Error("settings.json changed during the merge; aborted to avoid clobbering a concurrent edit");
    err.concurrentEdit = true;
    throw err;
  }

  // Safe backup: only from a validated original, and never overwrite an
  // existing backup (so a good backup can never be replaced by a bad file).
  if (originalText !== null) {
    const backup = `${file}.hyper-bak`;
    if (!fs.existsSync(backup)) {
      const tmpBak = path.join(dir, `.hyper-bak.${process.pid}.${Date.now()}`);
      fs.writeFileSync(tmpBak, originalText, { mode: 0o600 });
      fs.renameSync(tmpBak, backup);
    }
  }

  // Atomic write: temp file in the same dir + rename.
  const tmp = path.join(dir, `.hyper-settings.${process.pid}.${Date.now()}`);
  fs.writeFileSync(tmp, serialized, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

try {
  if (verb === "status") {
    let parsed;
    try {
      parsed = readValidated();
    } catch (e) {
      // Invalid JSON: report unknown rather than crash.
      console.log("unparseable");
      process.exit(0);
    }
    if (parsed === null) {
      console.log("absent");
    } else {
      console.log(isRegistered(parsed.data) ? "registered" : "not-registered");
    }
    process.exit(0);
  }

  const parsed = readValidated();

  // Test seam: simulate a concurrent writer touching the file after we read
  // and validated it but before we re-check in safeWrite. Only active when
  // the env var points at a file to copy over the target.
  if (process.env.HYPER_TEST_CONCURRENT_EDIT) {
    fs.writeFileSync(file, fs.readFileSync(process.env.HYPER_TEST_CONCURRENT_EDIT, "utf8"));
  }

  if (verb === "register") {
    const data = parsed === null ? {} : parsed.data;
    const originalText = parsed === null ? null : parsed.text;
    if (parsed !== null && isRegistered(data)) {
      console.log("unchanged");
      process.exit(0);
    }
    addHook(data);
    safeWrite(data, originalText);
    console.log("registered");
    process.exit(0);
  }

  if (verb === "unregister") {
    if (parsed === null) {
      console.log("absent");
      process.exit(0);
    }
    if (!isRegistered(parsed.data)) {
      console.log("unchanged");
      process.exit(0);
    }
    removeHook(parsed.data);
    safeWrite(parsed.data, parsed.text);
    console.log("removed");
    process.exit(0);
  }

  console.error(`hook merge: unknown verb "${verb}"`);
  process.exit(2);
} catch (e) {
  if (e && e.invalidJson) {
    console.error(`abort: ${e.message}`);
    process.exit(3);
  }
  if (e && e.concurrentEdit) {
    console.error(`abort: ${e.message}`);
    process.exit(4);
  }
  console.error(`hook merge failed: ${e && e.message ? e.message : e}`);
  process.exit(1);
}
NODE_EOF
}

# Run the node merge program with the given verb. Echoes the program's stdout
# token. Returns the program's exit status. The temp program file is created
# and removed within this call so nothing leaks across invocations.
run_hook_merge() {
  local verb="$1"
  local settings_file="${HYPER_SETTINGS_FILE:-$HOME/.claude/settings.json}"
  if ! command -v node >/dev/null 2>&1; then
    echo "    hook    skip (node not installed)"
    return 0
  fi
  local program rc
  program="$(mktemp -t hyper-hook-merge.XXXXXX.mjs)"
  hook_node_source >"$program"
  set +e
  HYPER_SETTINGS_FILE="$settings_file" HYPER_RECALL_CMD="$recall_hook_command" \
    node "$program" "$verb"
  rc=$?
  set -e
  rm -f "$program"
  return "$rc"
}

# Register the recall hook. Only acts when ~/.claude exists (the Claude Code
# config root). Other targets have no settings.json hook mechanism.
register_recall_hook() {
  echo "recall hook (Claude Code):"
  if [ ! -d "$HOME/.claude" ]; then
    echo "    hook    skip (~/.claude not present)"
    return 0
  fi
  local out status
  set +e
  out="$(run_hook_merge register)"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    echo "    hook    error: $out" >&2
    return 1
  fi
  case "$out" in
    registered)  echo "    hook    registered SessionStart recall hook" ;;
    unchanged)   echo "    hook    already registered (no change)" ;;
    *)           echo "    hook    $out" ;;
  esac
  return 0
}

# Remove the recall hook, leaving all other settings intact.
unregister_recall_hook() {
  echo "recall hook (Claude Code):"
  if [ ! -d "$HOME/.claude" ]; then
    echo "    hook    skip (~/.claude not present)"
    return 0
  fi
  local out status
  set +e
  out="$(run_hook_merge unregister)"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    echo "    hook    error: $out" >&2
    return 1
  fi
  case "$out" in
    removed)    echo "    hook    removed SessionStart recall hook" ;;
    unchanged)  echo "    hook    not registered (no change)" ;;
    absent)     echo "    hook    skip (settings.json not present)" ;;
    *)          echo "    hook    $out" ;;
  esac
  return 0
}

# Report whether the recall hook is registered, in one line.
status_recall_hook() {
  echo "recall hook (Claude Code):"
  if [ ! -d "$HOME/.claude" ]; then
    echo "    hook    not registered (~/.claude not present)"
    return 0
  fi
  local out status
  set +e
  out="$(run_hook_merge status)"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    echo "    hook    status check failed: $out" >&2
    return 0
  fi
  case "$out" in
    registered)     echo "    hook    registered" ;;
    not-registered) echo "    hook    not registered" ;;
    absent)         echo "    hook    not registered (settings.json not present)" ;;
    unparseable)    echo "    hook    unknown (settings.json does not parse)" ;;
    *)              echo "    hook    $out" ;;
  esac
  return 0
}

case "$action" in
  install)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do install_one "$t"; done
    register_recall_hook
    echo "portability check:"
    if ! verify_probe_reachable; then
      echo "error: probe reachability check failed for one or more targets" >&2
      exit 1
    fi
    ;;

  uninstall)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do uninstall_one "$t"; done
    unregister_recall_hook
    ;;

  status)
    echo "source: $source_dir"
    for t in "${targets[@]}"; do status_one "$t"; done
    status_recall_hook
    echo "portability check:"
    verify_probe_reachable || true
    ;;

  *)
    echo "usage: $(basename "$0") [install|uninstall|status]" >&2
    exit 1
    ;;
esac
