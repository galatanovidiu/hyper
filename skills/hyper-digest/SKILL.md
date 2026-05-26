---
name: hyper-digest
description: >
  Formats longer assistant responses as a digest: one-sentence BLUF (bottom line up front), optional claim bullets, sectioned body, and collapsible `<details>` blocks for bulky supporting material. Preserves necessary detail while making dense responses easier to scan. Toggle on with `/hyper-digest` or `/hyper-digest on`; turn off with `/hyper-digest off`. Use when responses are long, dense, or hard to scan. Keywords: hyper, digest, scannable, BLUF, progressive disclosure, layered, easier to read.
---

# hyper-digest

Best-effort session output reshaper. Once on, longer assistant responses use the digest format below until the user turns it off or the mode is lost.

Standalone utility. Does not read or write Hyper task state. Applies to chat-side responses, not only Hyper narration.

## Activation

| User says | Action |
|-----------|--------|
| `/hyper-digest`, `/hyper-digest on`, "turn on digest format" | Set mode to ON. Confirm with one line: `Digest format: ON.` Then apply the format starting with the next response. |
| `/hyper-digest off`, "turn off digest format", "stop digest" | Set mode to OFF. Confirm with one line: `Digest format: OFF.` Revert to normal output style. |
| `/hyper-digest status` | Report current mode in one line. |

Default at session start: OFF. The skill must be invoked to enable.

Carry the mode across turns in conversation context. This skill does not persist state to disk; if the conversation gets compacted or the host loses the mode, default back to OFF and let the user re-enable.

## The format (when mode is ON)

Apply this shape to responses likely to exceed roughly 15 lines of prose. Short responses, pure tool calls, and single code blocks skip the format. For borderline responses around 8-15 lines, use only a BLUF and compact body section.

### 1. BLUF — one sentence

When no higher-priority output contract applies, the first line is the answer, conclusion, or recommendation in a single sentence. Do not restate the question.

Examples:

- "The bug is in `parseDate` — it rounds to UTC midnight before applying the timezone offset."
- "I changed three files; the test suite passes; ready to commit."
- "Two viable options; I recommend Option B because it avoids the migration."

### 2. Picture — optional claim bullets

For longer responses, follow the BLUF with 2 to 4 short bullets. Bullets are claims, not topics. Each carries information on its own.

Bad bullet (topic only): "Performance considerations"
Good bullet (claim): "Performance: the new query is 4x slower on rows with > 1k tags"

Skip this block for borderline responses. If you need more than 4 bullets, the body needs headings instead.

### 3. Body — sections with informative headings

Use one heading per major topic. Make headings informative: "Database schema" is better than "Considerations."

Keep paragraphs short. One idea per paragraph. Lead each paragraph with its information-carrying words.

Use emphasis, bulleted lists, or tables only when they improve scanning.

### 4. Collapsible detail — `<details>` blocks

Wrap the following in `<details><summary>...</summary>...</details>`:

- Full code blocks longer than ~20 lines
- Raw command output, logs, stack traces
- Concise reasoning summaries, derivations, calculations, or validation notes
- Lists of "alternatives considered" or "rejected approaches"
- Reference data, table dumps, JSON payloads
- Tool-call transcripts the user does not need to re-read

The `<summary>` must be descriptive — a real preview of what is inside. "Full migration SQL (47 lines, creates 3 tables)" not "Click for SQL".

Hard limit: never nest `<details>` more than one level. Past one level usability collapses.

Do not expose private chain-of-thought. Provide concise rationale or evidence summaries instead.

### 5. Tail — caveats and sources

Caveats, edge cases, follow-up suggestions, and sources go at the bottom. The reader can stop above this and still have the answer.

## What this skill does NOT do

- It does not hide necessary detail. Bulky supporting material moves into a collapsible block when it is not headline information.
- It does not strip code, paths, errors, or identifiers needed for the answer. Keep them exactly as they appear.
- It does not change the agent's reasoning or work. Only the presentation layer.
- It does not apply to tool-call-only turns (no prose to format).
- It does not override higher-priority instructions, safety requirements, citation requirements, review formats, or the user's explicit formatting requests. If the user asks for a single code block, give them a single code block.

## Length threshold

The full format kicks in above roughly 15 lines of prose. Below 8 lines, plain prose wins — a 4-line answer with a fake BLUF and an empty picture is worse than a 4-line answer.

For borderline cases around 8-15 lines, use the BLUF line and one short body section, no collapsibles, no picture bullets. Scale the format to the content.

## Interaction with other skills

Hyper phase skills (`hyper-technical-plan`, `hyper-execution-plan`, `hyper-verify`, `hyper-implement`, etc.) own the content and structure of their artifacts. When those skills write files to `.hyper/tasks/...`, the file format is fixed by the skill — do not reshape the file contents.

The chat-side narration about what those skills did, however, is in scope. Apply the digest format to the conversational responses, not to the artifact files on disk.

## Example shape

```
The bug is in `parseDate` — it rounds to UTC midnight before applying the timezone offset.

- Affects all dates entered between 00:00 and 03:00 local time for users east of UTC
- Single-file fix in `lib/dates.ts`; existing tests cover the regression
- Root cause: line 47 calls `toUTC()` before `applyOffset()` instead of after

## Root cause

The `parseDate` function in `lib/dates.ts` normalises to UTC before applying the user's timezone. For users east of UTC, this pushes early-morning dates back one day.

**The two operations are not commutative.** Swapping them fixes the bug.

<details><summary>Full call trace (8 frames, from input to corrupted output)</summary>

[full trace here]

</details>

## Fix

Swap the order of the two calls on line 47. One-line change.

<details><summary>The patch (diff against main)</summary>

[diff here]

</details>

## Caveats

- The fix changes behaviour for users with timezone overrides set manually. Verify the manual-override test still passes.
```

## If `<details>` does not render

The skill assumes the renderer supports HTML `<details>` (Claude.ai web, VSCode extension, GitHub, most markdown viewers). If the user is in a pure-terminal renderer where `<details>` shows as raw tags, they can turn the format off with `/hyper-digest off` and ask for a different shape.

## Session mode vs one-shot

This skill is best-effort session mode once enabled. For a one-time restructure of the previous response only, use `/hyper-short-story` (narrative rewrite, drops detail) — different goal, different skill.
