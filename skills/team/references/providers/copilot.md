# Provider Contract: Copilot

## 1. Identity

| Field | Value |
|-------|-------|
| Provider name | GitHub Copilot CLI |
| Binary | `copilot` |
| last_verified | 2026-04-03 (v1.0.17) |

## 2. Prerequisites

**Check if installed:**
```bash
copilot --version
```

**Install:**
```bash
brew install copilot-cli
# or: npm install -g @github/copilot
# or: curl -fsSL https://gh.io/copilot-install | bash
```

**Check if authenticated:**
```bash
copilot login --status
```

**Set up auth:**
```bash
copilot login
# Or set GH_TOKEN/GITHUB_TOKEN with a fine-grained PAT
```

Requires an active GitHub Copilot subscription.

## 3. Hyper-Awareness Check

```bash
ls ~/.copilot/skills/hyper/ 2>/dev/null || echo "Not configured"
```

If not configured: warn the user ("teammate won't have Hyper awareness") but do not block execution. The lead builds rich prompts that compensate.

## 4. Non-Interactive Invocation

**Read-only mode:**
```bash
copilot -p "<prompt>" --deny-tool='write' --deny-tool='shell' --silent > <output> 2> <stderr-log>
```

No `--permission-mode` or `--sandbox` flag. Use `--deny-tool` for read-only behavior.
`--deny-tool` takes precedence over `--allow-tool`.

Tool syntax: `'shell(git:*)'` allows all git subcommands, `'write'` covers file writes,
`'MCP_SERVER(tool_name)'` for MCP tools.

**Writable mode (v2 — not used in v1):**
```bash
copilot -p "<prompt>" --yolo --silent > <output> 2> <stderr-log>
```

`--yolo` is equivalent to `--allow-all-tools --allow-all-paths --allow-all-urls`.

## 5. Prompt Delivery

| Method | Command pattern |
|--------|----------------|
| Inline | `copilot -p "<prompt>"` |

Custom instructions: `.github/copilot-instructions.md` (project) or `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` env var.

## 6. Output Capture

**Text mode (recommended for team skill):**
```bash
copilot -p "<prompt>" --deny-tool='write' --deny-tool='shell' --silent > /path/to/output.md 2> /path/to/stderr.log
```

`--silent` suppresses stats and prints only the agent's response. Output is clean text.

**JSON mode:**
```bash
copilot -p "<prompt>" --deny-tool='write' --output-format json > /path/to/output.jsonl 2> /path/to/stderr.log
```

JSON mode produces JSONL (one object per line). The response is in `assistant.message` events:
```bash
grep '"type":"assistant.message"' output.jsonl | jq -r '.data.content'
```

Session ID is in the final `result` event:
```bash
grep '"type":"result"' output.jsonl | jq -r '.sessionId'
```

## 7. Structured Output

| Feature | Supported | Flag |
|---------|-----------|------|
| JSON output | Yes (JSONL) | `--output-format json` |
| JSON schema | No | — |

Use XML output contract in the prompt for structured responses.

## 8. Clarification Command

```bash
copilot --continue -p "<follow-up prompt>" --silent
# Or resume specific session:
copilot --resume=<SESSION_ID> -p "<follow-up prompt>" --silent
```

## 9. Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `copilot: command not found` | Not installed | `brew install copilot-cli` |
| Authentication failed | No GitHub token | `copilot login` or set GH_TOKEN |
| Subscription required | No Copilot plan | Activate on GitHub account |
| Quota exceeded | Monthly requests depleted | Wait for reset |

## 10. Known Limitations

- No `--sandbox` or `--permission-mode` — read-only requires `--deny-tool` rules
- `--autopilot` does NOT auto-approve tools — combine with `--yolo` for full autonomy
- JSON output is JSONL, not a single JSON object — use `grep` + `jq` to extract response
- Each prompt costs one premium request from monthly quota
- Default model is claude-sonnet-4.6; override with `--model`
