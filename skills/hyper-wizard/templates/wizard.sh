#!/usr/bin/env bash
# Human procedure template. Author stages below the marker.
set -euo pipefail
TOTAL_STAGES=0
HYPER_STAGE_INDEX=0
stage() { HYPER_STAGE_INDEX=$((HYPER_STAGE_INDEX + 1)); printf '\nStage %s/%s: %s\n' "$HYPER_STAGE_INDEX" "$TOTAL_STAGES" "$1"; }
say() { printf '%s\n' "$1"; }
open_url() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
  elif command -v wslview >/dev/null 2>&1; then wslview "$1"
  else printf 'Open manually: %s\n' "$1"; fi
}
confirm() { local answer; read -r -p "$1 [y/N] " answer; [[ "$answer" == y || "$answer" == Y ]]; }
ask() { local answer; read -r -p "$2 " answer; printf -v "$1" '%s' "$answer"; }
ask_secret() { local answer; read -r -s -p "$2 " answer; printf '\n'; printf -v "$1" '%s' "$answer"; }
# STAGES: set TOTAL_STAGES and author one stage per human task.
# Capture only required values. Implement authorized destinations with the
# project's existing tools; keep secrets out of command arguments and logs.
TOTAL_STAGES=1
stage "Describe the manual step"
say "Replace this example with the verified URL, actions and destination."
confirm "Have you completed this step?" || exit 1
say "Procedure complete."
