# Provider Contract: Gemini

## 1. Identity

| Field | Value |
|-------|-------|
| Provider name | Google Gemini |
| Binary | `gemini` |
| last_verified | 2026-04-03 (v0.33.1) |

## 2. Prerequisites

**Check if installed:**
```bash
gemini --version
```

**Install:**
```bash
npm install -g @google/gemini-cli
```

**Check if authenticated:**
```bash
gemini --version
```

**Set up auth:**
```bash
gemini
# Or set GOOGLE_API_KEY environment variable
```

## 3. Hyper-Awareness Check

```bash
ls .hyper/project.yaml 2>/dev/null || echo "Not configured"
```

If not configured: warn the user ("teammate won't have Hyper awareness") but do not block execution. The lead builds rich prompts that compensate.

## 4. Non-Interactive Invocation

**Read-only mode:**
```bash
gemini --approval-mode plan -p "<prompt>" --output-format json > <output> 2> <stderr-log>
```

`--sandbox` is a boolean flag (no modes). Use `--approval-mode plan` for read-only.

**Writable mode (v2 — not used in v1):**
```bash
gemini -y -p "<prompt>" --output-format json > <output> 2> <stderr-log>
```

Always redirect stderr separately — Gemini emits MCP warnings and loading messages there.

## 5. Prompt Delivery

| Method | Command pattern |
|--------|----------------|
| Inline | `gemini -p "<prompt>"` |
| File (recommended) | `gemini -p "$(cat <prompt-file>)"` |

**Recommended:** File-based for long prompts to avoid shell escaping issues.

## 6. Output Capture

Always use `--output-format json` — text mode includes thinking/narration noise.

```bash
gemini --approval-mode plan -p "<prompt>" --output-format json > /path/to/output.json 2> /path/to/stderr.log
jq -r '.response' /path/to/output.json > /path/to/response.md
```

JSON structure:
```json
{
  "session_id": "uuid",
  "response": "the model response text",
  "stats": { ... }
}
```

Extract the response with `jq -r '.response'`.

## 7. Structured Output

| Feature | Supported | Flag |
|---------|-----------|------|
| JSON schema | Not verified | — |

Use `--output-format json` + `jq .response` for clean extraction. The XML output contract
in the prompt enforces structure on the response content.

## 8. Clarification Command

```bash
gemini --resume latest -p "<follow-up prompt>" --output-format json > <output> 2> <stderr>
```

Or resume by index: `gemini --resume <INDEX> -p "<follow-up>"`.

## 9. Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `Error: authentication required` | No API key | Run `gemini` interactively or set `GOOGLE_API_KEY` |
| MCP connection errors in stderr | MCP server failure | Non-blocking — agent runs without those tools |
| Timeout (>600s) | Overloaded or prompt too large | Reduce prompt, retry |

## 10. Known Limitations

- `--output-format text` includes thinking lines and MCP warnings — always use `json`
- `--sandbox` is boolean only — no read-only vs writable distinction
- Default headless model is `gemini-2.5-flash-lite` (lighter than interactive); override with `-m`
- No dedicated output file flag — must redirect stdout
