---
name: hyper-iterate
description: >
  Adaptive OODA-style loop for goal-led work where the destination is known but the route should evolve through contact with reality. Each loop lives in `.hyper/loops/L<N>-<slug>/loop.md` so a fresh session can resume without re-deriving the task. Use when the user wants to work iteratively, course-correct mid-flight, probe before committing, or split a goal into adaptive slices. Keywords: hyper, iterate, loop, ooda, adaptive, probe, course correct.
argument-hint: "[L<N>|new]"
allowed-tools: Read Write Edit Glob Grep Bash(ls *) Bash(find *) Bash(mkdir *) Bash(date *) Bash(git log *) Bash(git status *)
---

# hyper-iterate

Run tracked adaptive work: observe, orient, decide, act, repeat. Use it when the goal is clear but the path is not, and the path should stay flexible while the work unfolds.

Bad fits: tiny obvious edits, pure research with no system contact, or work that already needs formal approval gates.

## Now

!`date -u +%Y-%m-%dT%H:%M:%S`

## Existing loops

!`ls -1 .hyper/loops/ 2>/dev/null || echo "no loops yet"`

## Loop artifact

Each loop is a folder at `.hyper/loops/L<N>-<slug>/` containing:

- `loop.md` — the canonical state file (template below).
- optional evidence files (logs, diffs, screenshots) referenced from `## Relevant artifacts`. Use kebab-case names like `cycle3-build-log.txt`.

The project root is the directory containing `.hyper/`, or the current working directory if `.hyper/` does not exist yet. Create `.hyper/loops/` if missing. Use absolute paths in tool calls when the working directory differs from the project root.

Two kinds of content live in `loop.md`:

- **Living state** that you overwrite as reality changes — `## Goal`, `## Why`, `## Constraints`, `## Non-negotiables`, `## Definition of done`, `## Task understanding`, `## Existing code and findings`, `## Agreed big plan`, `## Current route`, `## Current focus`, `## Current bar`, `## Parts`, `## Part alignment`, `## Evidence digest`, `## Relevant artifacts`, `## Handoff cues`, `## Outcome`.
- **History** that you append to, never rewrite — `## Bar history`, `## Route shifts`, `## Decisions`, `## Starting point`, `## Cycles`.

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

`hyper-iterate` starts with an interview-style alignment pass. Before any implementation work, do this in order:

1. **Restate your understanding** of the request from the user or from the Linear issue.
2. **Scan the project briefly** — relevant files, recent commits, README, related loops or tasks. Often the missing piece is already on disk.
3. **Report what already exists** in the codebase and what looks missing or unclear.
4. **Discuss the big plan with the user** and agree how the work will be tackled.

Ask one question per message. Prefer multiple-choice when a structured-question tool is available; fall back to open-ended only when the choice space is genuinely open.

Only ask what changes the loop: goal, destination, hard constraints, non-negotiables, big-plan shape, and the first part boundary. Skip details that the loop itself will discover later.

This is a hard gate. Do not implement anything before the big plan is agreed and recorded in `loop.md`.

## Create

1. Scan `.hyper/loops/` for `L<N>-*` folders, take the highest `N`, allocate the next.
2. Pick a short title and kebab-case slug.
3. Create `loop.md` immediately. Fill the template below from the user's request and any clarifications. When information is missing, use `Not stated yet.` for `## Why`, `- None stated.` for `## Constraints` and `## Non-negotiables`, `Unknown.` for `## Starting point`, `Not filled yet.` for alignment sections, and `Not agreed yet.` for plan bodies.
4. Initial bar: the next approval gate. If the user did not name one, default to reaching an approved big plan for the loop.
5. Initial parts: 2–5 meaningful slices when the work decomposes naturally, or `P1 — Whole goal — doing` when it does not.
6. Write `loop.md` and announce: `Created L<N> — <title>. Starting adaptive loop.`
7. Start the interview-style alignment pass in the conversation and in the loop file: fill `## Task understanding`, `## Existing code and findings`, and `## Agreed big plan` before any implementation cycle starts.

## Resume

Read in layers; do not reread the whole file by default.

- **Hot** (always read first): Goal, Definition of done, Task understanding, Existing code and findings, Agreed big plan, Current route, Current focus, Current bar, Parts, Part alignment, Evidence digest, Handoff cues.
- **Warm** (when the next move needs more): latest Decisions, Route shifts, Bar history, Relevant artifacts, last 1–3 cycles, Outcome.
- **Cold** (only on demand): older cycles, raw artifact files.

Promote durable signal upward as work progresses: route-shaping facts become `## Decisions`, still-relevant findings become `## Evidence digest`, restart-critical notes become `## Handoff cues`.

## Alignment gate

Before the first implementation cycle, `loop.md` must show these top-level sections filled:

- `## Task understanding`
- `## Existing code and findings`
- `## Agreed big plan`

`## Agreed big plan` must include:

- `Status: awaiting approval | approved | needs rework`
- `Approved by user: <timestamp or Not yet.>`

This is a hard gate. No implementation, validation, or code mutation starts until the big plan status is `approved`.

Then repeat the same pattern for each part under `## Part alignment`:

- `### P<N> — <part name>`
- `#### Understanding`
- `#### Existing code and findings`
- `#### Plan`
- `Status: awaiting approval | approved | needs rework`
- `Approved by user: <timestamp or Not yet.>`

This is also a hard gate. No work on part `P<N>` starts until that part plan is approved.

## Working cycle

Cycles start only after the big plan is approved and the current part plan is approved.

Run one cycle at a time unless the user asks for a batch. Allocate the next cycle number by scanning existing `### Cycle N —` headings.

For each cycle:

1. **Observe** — read or run only enough to see the next useful move.
2. **Orient** — state what matters now: hypothesis, risk, or why this slice is next.
3. **Prior belief** — name what you expected to be true going into this cycle. `same as cycle N-1` is acceptable when nothing has shifted; the value is in making the belief explicit, not in forcing novelty.
4. **Decide** — one intent: `probe | implement | validate | split | reroute | reframe | stop`.
   - `reframe` — evidence suggests the loop's goal itself was wrong, not just the route. Stop the cycle, update `## Goal` and `## Why`, and re-run the alignment gate (`## Task understanding`, `## Existing code and findings`, `## Agreed big plan`) before any further work. Distinct from `reroute` (same goal, different path) and `stop` (goal reached or abandoned).
5. **Act** — the smallest meaningful move that advances the chosen intent.
6. **Evidence** — capture the exact result. If raw output is large, save it inside the loop folder, keep the decisive excerpt in the cycle, and link the file from `## Relevant artifacts`.
7. **Learning** — what the evidence changed about the prior belief, the route, the parts, or the risks. Then explicitly ask: **is the goal still the right goal?** If no, the next intent must be `reframe`, not `reroute`.
8. **Route impact** — how this cycle changes the route or parts for the next cycle. `no change` is a valid finding and itself a useful signal.
9. **Update living state** — refresh whatever sections the cycle changed.
10. **If the next move opens a new part or changes a part plan, stop and refresh `## Part alignment` first.** Re-enter implementation only after the user approves that part plan.
11. **Refresh handoff cues** — if the loop stays active, leave the next atomic move and current risk visible.
12. **Next** — continue, back up, split, validate, stop, or promote to a planned task.
13. Append the cycle entry and update frontmatter `updated`.

If the bar or route changes, update the living value AND append a one-line entry to `## Bar history` or `## Route shifts` with timestamp and reason. Use `## Decisions` only for load-bearing choices.

Part statuses: `todo | doing | done | blocked | dropped`.

## Skill reuse

When one of these installed skills is a better fit for the current slice, invoke it and fold the result back into `loop.md`.

- Invoke the `grill-me` skill during alignment when the goal, constraints, route, or part boundary is unclear, contradictory, or high-risk. Use it to pressure-test the big plan or a part plan before approval.
- Invoke the `diagnose` skill when a cycle is mainly bug reproduction, debugging, or performance investigation.
- Invoke the `prototype` skill when the next useful move is a throwaway prototype that answers a design, state, or UI question before committing to the route.
- Invoke the `tdd` skill when a part plan is approved and the implementation is best driven by behavior-first tests in vertical slices.
- Invoke the `handoff` skill when the user wants to pause or transfer the work. Copy the condensed result into `## Handoff cues` and any other living-state sections it changes.

These skills support the loop. `hyper-iterate` still owns route decisions, approvals, `loop.md`, and stop conditions.

## Delegation

If sub-agents are available, the parent may delegate a bounded slice (recon, research, one-part implementation, focused validation, adversarial review). The parent still owns the loop and every route decision; the child returns a summary, the parent integrates it.

Do not delegate the whole loop. Do not let children mutate `loop.md` directly. Prefer fresh-context children for recon and review, one writer at a time for implementation.

## Stop conditions

Mark `status: done` and fill `## Outcome` when the definition of done is met, the user closes the scope, or the work should move into a planned task. If the bar is met but the destination is not, raise the bar and continue. If the user stops mid-stream, leave `status: active` and make sure `## Handoff cues` is current.

## Rules

- Start every loop with interview-style alignment: understanding, code scan, findings, agreed plan.
- Smallest meaningful move, not necessarily the smallest possible probe.
- Record evidence verbatim where practical; do not paraphrase away the signal.
- One cycle = one coherent move. Do not batch unrelated work.
- No implementation before big-plan approval.
- No part implementation before that part's approval.
- Do not reopen done loops.
- When the work starts needing approvals or formal coordination beyond the loop-level and part-level gates, recommend switching to a planned workflow.
- Do not create `01-intake.md`, `02-spec.md`, `03-technical-plan.md`, `04-execution-plan.md`, or task folders from this skill. Use `hyper` for tracked work.
- When the user pivots mid-loop ("actually, I'm thinking about X", "what if we tried Y", "I want to investigate something else"), treat it as a goal-reframe signal until proven otherwise. Stop the current cycle, surface the pivot, and re-run the alignment gate if the goal shifted. Do not silently absorb the pivot as a part-plan tweak.

## Template — `loop.md`

Use the template exactly as shipped at [`templates/loop.md`](templates/loop.md). Keep the alignment sections before `## Cycles`. Keep only the current approved view in those sections; write historical changes to `## Route shifts` or `## Decisions`.
