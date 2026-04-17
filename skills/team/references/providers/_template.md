# Provider Contract: {PROVIDER_NAME}

> Copy this template to create a new provider file. Fill every section.
> Name the file `{provider}.md` (lowercase, matching the provider identifier).

## 1. Identity

| Field | Value |
|-------|-------|
| Provider name | {display name, e.g. "OpenAI Codex"} |
| Binary | `{binary}` |
| last_verified | TBD |

## 2. Prerequisites

**Check if installed:**
```bash
{binary} --version
```

**Install:**
```bash
{install command}
```

**Check if authenticated:**
```bash
{auth check command, or "Run the binary — it errors if not authenticated"}
```

**Set up auth:**
```bash
{auth setup command}
```

## 3. Hyper-Awareness Check

How to verify Hyper skills/plugin are configured for this provider:

```bash
{command or file check}
```

If not configured: warn the user ("teammate won't have Hyper awareness") but do not block execution. The lead builds rich prompts that compensate.

## 4. Non-Interactive Invocation

**Read-only mode:**
```bash
{command template for read-only execution}
```

**Writable mode (v2 — not used in v1):**
```bash
{command template for writable execution, or "Not supported"}
```

Placeholders:
- `<prompt>` — the full prompt string or path to prompt file
- `<output>` — path to output file

## 5. Prompt Delivery

How to pass the prompt to the provider CLI:

| Method | Command pattern |
|--------|----------------|
| Inline | `{binary} -p "<prompt>"` |
| File | `{binary} -p "$(cat <prompt-file>)"` |
| Stdin | `cat <prompt-file> \| {binary}` |

**Recommended method:** {which method and why}

**Escaping notes:** {any special characters that need escaping}

## 6. Output Capture

How to capture the provider's output to a file:

```bash
{command showing output capture}
```

**Output format flag:** `{flag to control output format, e.g. --output-format text}`

**Default output location:** {stdout, file flag, or other}

## 7. Structured Output

Does the provider support JSON schema output?

| Feature | Supported | Flag |
|---------|-----------|------|
| JSON schema | {yes/no/TBD} | `{flag}` |

**Usage:**
```bash
{command example with structured output, or "Not supported"}
```

## 8. Clarification Command

How to send a follow-up prompt to an existing session:

```bash
{command for follow-up, or "Not supported — start a new invocation"}
```

**Max clarification rounds:** {number or "unlimited"}

## 9. Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| {error message or exit code} | {what causes it} | {how to recover} |
| {error message or exit code} | {what causes it} | {how to recover} |

## 10. Known Limitations

- {limitation 1}
- {limitation 2}
