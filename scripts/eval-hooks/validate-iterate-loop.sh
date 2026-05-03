#!/usr/bin/env bash
set -euo pipefail

case "${PWD}" in
  /tmp/hyper-iterate-eval-*) ;;
  *) exit 0 ;;
esac

loop_file=$(find .hyper/loops -maxdepth 1 -name 'L*.md' -type f | sort | head -1)
[[ -n "${loop_file}" ]] || { echo "no loop file created" >&2; exit 2; }

grep -q '^status:' "${loop_file}" || { echo "missing status frontmatter" >&2; exit 2; }
grep -q '^## Goal$' "${loop_file}" || { echo "missing Goal" >&2; exit 2; }
grep -q '^## Current route$' "${loop_file}" || { echo "missing Current route" >&2; exit 2; }
grep -q '^## Current focus$' "${loop_file}" || { echo "missing Current focus" >&2; exit 2; }
grep -q '^## Current bar$' "${loop_file}" || { echo "missing Current bar" >&2; exit 2; }
grep -q '^## Parts$' "${loop_file}" || { echo "missing Parts" >&2; exit 2; }
grep -q '^## Evidence digest$' "${loop_file}" || { echo "missing Evidence digest" >&2; exit 2; }
grep -q '^## Handoff cues$' "${loop_file}" || { echo "missing Handoff cues" >&2; exit 2; }

exit 0
