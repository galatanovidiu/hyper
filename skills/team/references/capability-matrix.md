# Provider Capability Matrix

Quick reference. Full details in each provider file under `references/providers/`.

Last updated: 2026-04-03

## Read-Only Invocation

```bash
# Codex
codex exec -s read-only -o output.md "<prompt>"

# Gemini
gemini --approval-mode plan -p "<prompt>" --output-format json > output.json 2> stderr.log

# Claude
claude --bare -p "<prompt>" --permission-mode plan --output-format json > output.json

# Copilot
copilot -p "<prompt>" --deny-tool='write' --deny-tool='shell' --silent > output.md 2> stderr.log
```

## Response Extraction

| Provider | Extract command |
|----------|----------------|
| Codex | Read `-o` file directly |
| Gemini | `jq -r '.response' output.json` |
| Claude | `jq -r '.result' output.json` |
| Copilot | Read `--silent` output directly, or `grep '"type":"assistant.message"' \| jq -r '.data.content'` for JSONL |

## Multi-Turn

| Provider | Follow-up command |
|----------|-------------------|
| Codex | `codex exec resume --last "<follow-up>"` |
| Gemini | `gemini --resume latest -p "<follow-up>" --output-format json` |
| Claude | `claude -p "<follow-up>" --continue --output-format json` |
| Copilot | `copilot --continue -p "<follow-up>" --silent` |

## Gotchas

| Provider | Gotcha |
|----------|--------|
| Codex | `--full-auto` overrides `-s read-only`. Never combine. |
| Codex | `--output-schema` takes a FILE PATH, not inline JSON. |
| Gemini | `--sandbox` is boolean only. Use `--approval-mode` for read-only. |
| Gemini | `--output-format text` includes thinking lines. Always use `json`. |
| Gemini | Default headless model is `gemini-2.5-flash-lite`. Override with `-m`. |
| Claude | `--json-schema` is INLINE JSON, not a file path. |
| Claude | `--permission-mode plan` blocks ALL tools including Bash. |
| Claude | `--bare` skips CLAUDE.md. Put project context in the prompt. |
| Copilot | `--autopilot` does NOT auto-approve tools. Combine with `--yolo`. |
| Copilot | `--autopilot` does NOT auto-approve tools. Combine with `--yolo`. |
