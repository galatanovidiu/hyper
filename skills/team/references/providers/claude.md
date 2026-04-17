# Provider Contract: Claude

## 1. Identity

| Field | Value |
|-------|-------|
| Provider name | Anthropic Claude Code |
| Binary | `claude` |
| last_verified | 2026-04-03 (v2.1.91) |

## 2. Prerequisites

**Check if installed:**
```bash
claude --version
```

**Install:**
```bash
npm install -g @anthropic-ai/claude-code
```

**Check if authenticated:**
```bash
claude auth status --text
```

**Set up auth:**
```bash
claude auth login
# Or set ANTHROPIC_API_KEY environment variable
```

## 3. Hyper-Awareness Check

```bash
ls .claude-plugin/plugin.json 2>/dev/null || echo "Not configured"
```

If not configured: warn the user ("teammate won't have Hyper awareness") but do not block execution. The lead builds rich prompts that compensate.

## 4. Non-Interactive Invocation

**Read-only mode:**
```bash
claude -p "<prompt>" --permission-mode plan --output-format json > <output>
```

`--permission-mode plan` blocks all tool execution except reading.

When the agent needs to run specific read-only commands (e.g., git), use tool control instead:
```bash
claude -p "<prompt>" --allowedTools "Bash(git *),Read,Grep,Glob" --output-format json > <output>
```

> **Note on `--bare`:** Do NOT use `--bare` — it skips auth discovery and fails with "Not logged in" on Claude Max accounts. The flags above already scope behavior sufficiently without it.

**Writable mode (v2 — not used in v1):**
```bash
claude -p "<prompt>" --allowedTools "Bash,Read,Grep,Glob,Edit,Write" --output-format json > <output>
```

## 5. Prompt Delivery

| Method | Command pattern |
|--------|----------------|
| Inline | `claude -p "<prompt>"` |
| File | `claude -p "$(cat <prompt-file>)"` |
| Stdin | `cat <prompt-file> \| claude -p -` |

**Recommended:** File-based for long prompts. Stdin also works natively.

To add instructions without replacing the system prompt: `--append-system-prompt "<text>"`.

## 6. Output Capture

```bash
claude -p "<prompt>" --permission-mode plan --output-format json > /path/to/output.json
jq -r '.result' /path/to/output.json > /path/to/response.md
```

Both `text` and `json` output modes are clean — no thinking lines or noise.

JSON structure:
```json
{
  "type": "result",
  "result": "the model response text",
  "session_id": "uuid",
  "total_cost_usd": 0.26,
  "usage": { ... }
}
```

Extract the response with `jq -r '.result'`.

## 7. Structured Output

| Feature | Supported | Flag |
|---------|-----------|------|
| JSON schema | Yes | `--json-schema '<inline JSON>'` |

`--json-schema` takes an INLINE JSON string (not a file path — opposite of Codex).
Structured data appears in `.structured_output` field; text result still in `.result`.

```bash
claude -p "<prompt>" --permission-mode plan --output-format json \
  --json-schema '{"type":"object","properties":{"findings":{"type":"array"}},"required":["findings"]}' > <output>
```

## 8. Clarification Command

```bash
# Continue most recent conversation
claude -p "<follow-up>" --continue --output-format json > <output>

# Resume a specific session by ID
claude -p "<follow-up>" --resume "<session_id>" --output-format json > <output>
```

Capture session IDs from JSON output: `jq -r '.session_id' output.json`.

Named sessions: `claude -p "<prompt>" --name "team-review"`, then `--resume "team-review"`.

## 9. Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `Error: not authenticated` | No API key | Run `claude auth login` or set ANTHROPIC_API_KEY |
| `Not logged in` with `--bare` | `--bare` skips auth discovery | Remove `--bare` flag, use standard invocation |
| `Error: rate limited` | Too many requests | Wait and retry |
| Exit code 1 with empty output | Prompt rejected | Rephrase prompt, retry |

Safety flags: `--max-budget-usd <amount>` caps API spend, `--max-turns <N>` limits agent turns.

## 10. Known Limitations

- Self-delegation: if the lead is Claude, delegating to Claude reviews your own work
- `--permission-mode plan` blocks ALL tools including Bash — use `--allowedTools` when git access is needed
- `--bare` breaks auth on Claude Max accounts — do not use it (see Section 4 note)
- `--continue` scopes to current directory only; use `--resume <id>` for specific sessions
- Model inherits from lead config; override with `--model <alias-or-name>`
- Without `--bare`, Claude will load CLAUDE.md and plugins — project instructions in the prompt may overlap. This is acceptable; the prompt takes precedence.
