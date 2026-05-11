---
name: hyper-iterate
description: >
  Adaptive OODA-style loop for goal-led work where the destination is known but the route should evolve through contact with reality. Each loop lives in `.hyper/loops/L<N>-<slug>/loop.md` so a fresh session can resume without re-deriving the task. Use when the user wants to work iteratively, course-correct mid-flight, probe before committing, or split a goal into adaptive slices. Keywords: hyper, iterate, loop, ooda, adaptive, probe, course correct.
---

# hyper-iterate

Run tracked adaptive work: observe, orient, decide, act, repeat. Use it when the goal is clear but the path is not, and the path should stay flexible while the work unfolds.

Bad fits: tiny obvious edits, pure research with no system contact, or work that already needs formal approval gates.

## Loop artifact

Each loop is a folder at `.hyper/loops/L<N>-<slug>/` containing:

- `loop.md` — the canonical state file (template below).
- optional evidence files (logs, diffs, screenshots) referenced from `## Relevant artifacts`. Use kebab-case names like `cycle3-build-log.txt`.

The project root is the directory containing `.hyper/`, or the current working directory if `.hyper/` does not exist yet. Create `.hyper/loops/` if missing. Use absolute paths in tool calls when the working directory differs from the project root.

Two kinds of content live in `loop.md`:

- **Living state** that you overwrite as reality changes — `## Goal`, `## Why`, `## Constraints`, `## Non-negotiables`, `## Definition of done`, `## Current route`, `## Current focus`, `## Current bar`, `## Parts`, `## Evidence digest`, `## Relevant artifacts`, `## Handoff cues`, `## Memory candidates`, `## Outcome`.
- **History** that you append to, never rewrite — `## Bar history`, `## Route shifts`, `## Decisions`, `## Starting point`, `## Cycles`.

`## Memory candidates` collects possible cross-task lessons worth promoting beyond this loop. Leave it empty until a real one surfaces.

Timestamps use `YYYY-MM-DDTHH:MM:SS`.

## Routing

Pick one:

1. **Resume by id or path** — user named `L<N>` or gave a path inside `.hyper/loops/`.
2. **Resume by title** — user named an existing loop clearly.
3. **Resume the only active loop** — exactly one loop has frontmatter `status: active`.
4. **Ask** — multiple active loops and the target is unclear.
5. **Create** — otherwise.

Done loops are not reopened. If the user wants to keep going from a done loop, create a new one and reference it in `## Starting point`.

## Clarify before creating

Before writing `loop.md`, make sure you can state the goal, the destination, and at least one near-term stop point. If any of these are unclear from the user's prompt:

1. **Scan the project briefly** — relevant files, recent commits, README, related loops or tasks. Often the missing piece is already on disk.
2. **Then ask the user.** One question per message. Prefer multiple-choice when a structured-question tool is available; fall back to open-ended only when the choice space is genuinely open.
3. **Only ask what changes the loop.** Goal, destination, hard constraints, non-negotiables, and the first bar. Skip details that the loop itself will discover through cycles.
4. Stop asking as soon as you have enough to commit to a useful route. If the user signals "just start", commit to the clearest reading and surface remaining unknowns in `## Handoff cues` or as the first cycle's `Orient`.

When the prompt is already clear (concrete goal + obvious destination), skip straight to Create.

## Create

1. Scan `.hyper/loops/` for `L<N>-*` folders, take the highest `N`, allocate the next.
2. Pick a short title and kebab-case slug.
3. Fill the template below from the user's request and any clarifications. When information is missing, use `Not stated yet.` for `## Why`, `- None stated.` for `## Constraints` and `## Non-negotiables`, and `Unknown.` for `## Starting point`. Leave `## Memory candidates` empty.
4. Initial bar: a concrete near-term stop point. If the user did not name one, write the narrowest useful bar that moves the route forward now.
5. Initial parts: 2–5 meaningful slices when the work decomposes naturally, or `P1 — Whole goal — doing` when it does not.
6. Write `loop.md` and announce: `Created L<N> — <title>. Starting adaptive loop.`

## Resume

Read in layers; do not reread the whole file by default.

- **Hot** (always read first): Goal, Definition of done, Current route, Current focus, Current bar, Parts, Evidence digest, Handoff cues.
- **Warm** (when the next move needs more): latest Decisions, Route shifts, Bar history, Relevant artifacts, last 1–3 cycles, Outcome.
- **Cold** (only on demand): older cycles, raw artifact files.

Promote durable signal upward as work progresses: route-shaping facts become `## Decisions`, still-relevant findings become `## Evidence digest`, restart-critical notes become `## Handoff cues`.

## Working cycle

Run one cycle at a time unless the user asks for a batch. Allocate the next cycle number by scanning existing `### Cycle N —` headings.

For each cycle:

1. **Observe** — read or run only enough to see the next useful move.
2. **Orient** — state what matters now: hypothesis, risk, or why this slice is next.
3. **Decide** — one intent: `probe | implement | validate | split | reroute | stop`.
4. **Act** — the smallest meaningful move that advances the chosen intent.
5. **Evidence** — capture the exact result. If raw output is large, save it inside the loop folder, keep the decisive excerpt in the cycle, and link the file from `## Relevant artifacts`.
6. **Learning** — what the evidence changed about the goal, route, parts, or risks.
7. **Update living state** — refresh whatever sections the cycle changed.
8. **Refresh handoff cues** — if the loop stays active, leave the next atomic move and current risk visible.
9. **Next** — continue, back up, split, validate, stop, or promote to a planned task.
10. Append the cycle entry and update frontmatter `updated`.

If the bar or route changes, update the living value AND append a one-line entry to `## Bar history` or `## Route shifts` with timestamp and reason. Use `## Decisions` only for load-bearing choices.

Part statuses: `todo | doing | done | blocked | dropped`.

## Delegation

If sub-agents are available, the parent may delegate a bounded slice (recon, research, one-part implementation, focused validation, adversarial review). The parent still owns the loop and every route decision; the child returns a summary, the parent integrates it.

Do not delegate the whole loop. Do not let children mutate `loop.md` directly. Prefer fresh-context children for recon and review, one writer at a time for implementation.

## Stop conditions

Mark `status: done` and fill `## Outcome` when the definition of done is met, the user closes the scope, or the work should move into a planned task. If the bar is met but the destination is not, raise the bar and continue. If the user stops mid-stream, leave `status: active` and make sure `## Handoff cues` is current.

## Rules

- Smallest meaningful move, not necessarily the smallest possible probe.
- Record evidence verbatim where practical; do not paraphrase away the signal.
- One cycle = one coherent move. Do not batch unrelated work.
- Do not reopen done loops.
- When the work starts needing approvals or formal coordination, recommend switching to a planned workflow.

## Template — `loop.md`

```markdown
---
id: L<N>
title: <title>
status: active
created: <YYYY-MM-DDTHH:MM:SS>
updated: <YYYY-MM-DDTHH:MM:SS>
---

# L<N> — <title>

## Goal

<What the user is trying to achieve overall.>

## Why

<Why this work matters, or `Not stated yet.`>

## Constraints

- None stated.

## Non-negotiables

- None stated.

## Definition of done

<What has to be true for this loop to finish well.>

## Current route

<Current route hypothesis. Short and revisable.>

## Current focus

<The slice, boundary, or question being worked right now.>

## Current bar

<What counts as a useful stop point right now.>

## Parts

- P1 — <first meaningful slice> — doing

## Evidence digest

- None yet.

## Relevant artifacts

- None yet.

## Bar history

- <YYYY-MM-DDTHH:MM:SS> — Initial bar: <same as current bar>

## Route shifts

- None yet.

## Decisions

- None yet.

## Starting point

<What is already known before cycle 1, or `Unknown.`>

## Cycles

_No cycles yet._

<!--
Cycle entry shape:

### Cycle N — <YYYY-MM-DDTHH:MM:SS> — <short title>

**Intent:** <probe | implement | validate | split | reroute | stop>
**Orient:** <What matters now and why this move is next.>
**Action:** <Smallest meaningful move taken.>
**Evidence:** <Exact result.>
**Learning:** <What changed in our understanding.>
**Next:** <continue | back up | split | validate | stop | promote.>
-->

## Handoff cues

- Next atomic move: <what to do first on resume>
- Current risk or uncertainty: <what still matters>
- Dirty or unvalidated state: <none | what has changed but is not yet validated>

## Outcome

<Fill when status becomes `done`.>
```
