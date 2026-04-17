# Provider Contract: Codex

## 1. Identity

| Field | Value |
|-------|-------|
| Provider name | OpenAI Codex |
| Binary | `codex` |
| last_verified | 2026-04-03 (v0.95.0) |

## 2. Prerequisites

**Check if installed:**
```bash
codex --version
```

**Install:**
```bash
npm install -g @openai/codex
```

**Check if authenticated:**
```bash
codex --version
```

**Set up auth:**
```bash
codex login
```

## 3. Hyper-Awareness Check

```bash
ls .hyper/project.yaml 2>/dev/null || echo "Not configured"
```

If not configured: warn the user ("teammate won't have Hyper awareness") but do not block execution. The lead builds rich prompts that compensate.

## 4. Non-Interactive Invocation

**Read-only mode:**
```bash
codex exec -s read-only -o <output> "<prompt>"
```

Do NOT add `--full-auto` — it overrides `-s read-only` to `workspace-write`.

**Branch review:**
```bash
codex exec review --base <branch> > <output>
```

Other review scopes: `--uncommitted`, `--commit <SHA>`.

**Writable mode (v2 — not used in v1):**
```bash
codex exec --full-auto -o <output> "<prompt>"
```

## 5. Prompt Delivery

| Method | Command pattern |
|--------|----------------|
| Inline | `codex exec "<prompt>"` |
| Stdin | `echo "<prompt>" \| codex exec` or `codex exec -` |
| File | `codex exec "$(cat <prompt-file>)"` |

**Recommended:** Stdin for long prompts. Inline for short ones.

## 6. Output Capture

```bash
codex exec -s read-only -o /path/to/output.md "<prompt>"
```

`-o <path>` writes the agent's final response to a file. Stdout receives event logs.

## 7. Structured Output

| Feature | Supported | Flag |
|---------|-----------|------|
| JSON schema | Yes | `--output-schema <FILE>` |

`--output-schema` takes a FILE PATH, not inline JSON. Write the schema to a temp file first:

```bash
echo '{"type":"object","properties":{"findings":{"type":"array"}}}' > /tmp/schema.json
codex exec -s read-only --output-schema /tmp/schema.json -o <output> "<prompt>"
```

## 8. Clarification Command

```bash
codex exec resume --last "<follow-up prompt>"
```

Or resume a specific session: `codex exec resume <SESSION_ID> "<follow-up>"`.

## 9. Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `Error: not authenticated` | No API key | Run `codex login` |
| Exit code 1 with timeout | Prompt too large or overloaded | Reduce prompt, retry |
| `Error: sandbox violation` | Write attempted in read-only | Check sandbox flag |

## 10. Known Limitations

- `--full-auto` silently overrides `-s read-only` to `workspace-write` — never combine
- `--output-schema` requires a file path, not inline JSON
- `codex exec review` has no `-o` flag — redirect stdout
- Model defaults to config value (gpt-5.4 on this machine); override with `-m <model>`
