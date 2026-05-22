#!/usr/bin/env bash
set -euo pipefail

case "${PWD}" in
  /tmp/hyper-iterate-eval-*) ;;
  *) exit 0 ;;
esac

loop_file=$(find .hyper/loops -maxdepth 2 \( -path '.hyper/loops/L*/loop.md' -o -name 'L*.md' \) -type f | sort | head -1)
[[ -n "${loop_file}" ]] || { echo "no loop file created" >&2; exit 2; }

grep -q '^status:' "${loop_file}" || { echo "missing status frontmatter" >&2; exit 2; }
grep -q '^## Goal$' "${loop_file}" || { echo "missing Goal" >&2; exit 2; }
grep -q '^## Task understanding$' "${loop_file}" || { echo "missing Task understanding" >&2; exit 2; }
grep -q '^## Existing code and findings$' "${loop_file}" || { echo "missing Existing code and findings" >&2; exit 2; }
grep -q '^## Authority$' "${loop_file}" || { echo "missing Authority" >&2; exit 2; }
grep -Eq '^Mode: (interactive|delegated)$' "${loop_file}" || { echo "missing authority mode" >&2; exit 2; }
grep -q '^## Loop plan$' "${loop_file}" || { echo "missing Loop plan" >&2; exit 2; }
grep -Eq '^Status: (awaiting approval|approved|needs rework)$' "${loop_file}" || { echo "missing plan status" >&2; exit 2; }
grep -q '^Approval source:' "${loop_file}" || { echo "missing approval source line" >&2; exit 2; }
grep -q '^Approved at:' "${loop_file}" || { echo "missing approved-at line" >&2; exit 2; }
grep -q '^## Current route$' "${loop_file}" || { echo "missing Current route" >&2; exit 2; }
grep -q '^## Current focus$' "${loop_file}" || { echo "missing Current focus" >&2; exit 2; }
grep -q '^## Current bar$' "${loop_file}" || { echo "missing Current bar" >&2; exit 2; }
grep -q '^## Parts$' "${loop_file}" || { echo "missing Parts" >&2; exit 2; }
grep -q '^## Part alignment$' "${loop_file}" || { echo "missing Part alignment" >&2; exit 2; }
grep -q '^## Evidence digest$' "${loop_file}" || { echo "missing Evidence digest" >&2; exit 2; }
grep -q '^## Handoff cues$' "${loop_file}" || { echo "missing Handoff cues" >&2; exit 2; }

exit 0
