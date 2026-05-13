---
name: hyper-loops
description: Runs adaptive loops for work where the route must evolve through contact with reality, and the goal may need probing before it is ready to commit. Each loop persists so sessions can resume without losing context. Use when the user wants to iterate, course-correct mid-flight, probe before committing, or break a goal into adaptive slices. Keywords: hyper, iterate, loop, ooda, adaptive, probe, course correct.
argument-hint: "[L<N>|new|<title>|.hyper/loops/... ]"
---

# Hyper Loops

Run tracked adaptive work: observe, orient, decide, act, repeat. Use it for iterative or exploratory work — when the path should stay flexible, when the goal is known enough to start but still needs probing before commitment, or when contact with reality is likely to shift the route.

## When to Use

Reach for hyper-loops when any of these match:

- The goal is known enough to start, but the path is not, and the path should stay flexible.
- The goal itself is still forming and needs probing before it can be committed.
- Reality is likely to reshape the plan once work starts.
- The work needs a throwaway probe or prototype before committing to a route.
- A big goal needs to be split into adaptive slices, not a rigid plan.
- The work will span multiple sessions and context must survive interrupts.
- The user uses verbs like "iterate", "explore", "probe", "experiment", "investigate", "prototype", "figure out", "pivot", or "course-correct".
- The user signals uncertainty about the path: "I'm not sure yet", "depends on what we find", "let me think through this", "this might change".

Use the phase gates below to decide whether the loop still fits.

## The Process

The workflow is four phases in order: Load and Route → Align → Cycle → Verify and Close. The phase sections below are the authority.

## The Loop Artifact

Each loop is a folder at `.hyper/loops/L<N>-<slug>/` containing:

- `loop.md` — the canonical state file. See `templates/loop.md` for the full structure.
- Optional evidence files (logs, diffs, screenshots, console output) referenced from `## Relevant artifacts`. Use kebab-case names: `cycle3-build-log.txt`, `verify-2026-05-13.txt`.

The project root is the directory containing `.hyper/`, or the current working directory if `.hyper/` does not exist yet. Create `.hyper/loops/` if missing. Use absolute paths only for transient tool execution when the working directory differs from the project root; keep paths written into `loop.md` and user-facing summaries repo-relative.

Use the exact section layout shipped in `templates/loop.md`.

Behavior rules for that artifact:

- Overwrite the current working view as reality changes.
- Append to the chronological logs; do not rewrite them.
- Set `created` and `updated` when the loop is created. After that, every mutation of `loop.md` refreshes `updated`.
- Treat `## Starting point` as a single snapshot set when the loop is created. If a new loop continues learning from an earlier done loop, reference it there.

Timestamps use `YYYY-MM-DDTHH:MM:SS`.

## Phase 1 — Load and Route

Get the current UTC timestamp in `YYYY-MM-DDTHH:MM:SS` format.

List `.hyper/loops/` if it exists; otherwise treat the project as having no loops yet.

**Project rules.** Read `.hyper/rules.md` if it exists; treat as normative for the session. If absent, no project rules are in force.

When the loop needs a required capability from the registry below and no suitable skill is installed, tell the user which capability is missing and offer: install one, swap to a substitute for this loop, or stop. Never silently skip a required skill call. Suggested capabilities do not block the loop.

**Route.** Pick one:

1. **Resume by id or path** — user named `L<N>` or gave a path inside `.hyper/loops/`.
2. **Resume by title** — user named an existing loop clearly.
3. **Resume the only active loop** — exactly one loop has frontmatter `status: active`.
4. **Ask** — multiple active loops and the target is unclear.
5. **Create** — otherwise.

Done loops are not reopened. If the user wants to keep going from a done loop, create a new one and reference it in `## Starting point`.

**On create:**

1. Scan `.hyper/loops/` for `L<N>-*` folders, take the highest `N`, allocate the next.
2. Pick a short title and kebab-case slug.
3. Create `loop.md` from the template. Fill `id`, `title`, `status`, `created`, and `updated` immediately from the allocated loop metadata, replace the H1 with the allocated loop id and title, and write a one-time starting snapshot in `## Starting point`. For anything still unknown, keep the placeholder already shipped for that section in `templates/loop.md`; do not invent new placeholder strings.
4. Initial bar: the next approval gate. Default to "clear alignment by approving the loop plan and current part plan" if not stated.
5. Write that bar into `## Current bar`, and replace the initial `## Bar history` placeholder with the same timestamped bar.
6. Initial parts: 2–5 meaningful slices when the work decomposes naturally, or use the single-part fallback `P1 — Whole goal — doing`.
7. Exactly one initial part is current (`doing`). Any remaining initial parts start `todo`.
8. For every part written under `## Parts`, clone the matching `P<N>` block under `## Part alignment`, and make each cloned `### P<N> — ...` heading mirror the part number and title from its corresponding part entry.
9. Announce: `Created L<N> — <title>. Starting adaptive loop.`

**On resume:** read `loop.md` in layers; do not reread the whole file by default.

- **Hot** (always): the pre-cycle alignment surface listed under the Phase 2 alignment gate below, plus `## Evidence digest` and `## Handoff cues`, including `Dirty or unvalidated state`.
- **Warm** (when the next move needs more): `## Starting point`, the decision log, the route-shift log, the bar-history log, `## Relevant artifacts`, the last 1–3 cycles, the latest verify entry, and `## Outcome`.
- **Cold** (on demand only): older cycles, raw artifact files.

Promote durable signal upward as work progresses: timestamped route changes go to `## Route shifts`, load-bearing choices go to `## Decisions`, still-relevant findings go to `## Evidence digest`, and restart-critical notes go to `## Handoff cues`. In any section seeded with `None yet.` or another empty-state sentinel, replace that sentinel with the first real entry.

## Capability registry

Resolve each capability call in this order: exact preferred skill name, then any installed skill whose description matches the fallback description. If multiple fallback matches exist, choose the closest match and record the choice in `## Decisions`.

| Role | Required? | Preferred skill | Fallback description |
|---|---|---|---|
| pressure-test | yes | `grill-me` | stress-tests a plan or decision tree |
| code-review | yes in verify | `hyper-code-review` | reviews code changes and returns a verdict with findings |
| docs | yes when user-facing surface changed | `hyper-docs` | updates user-facing documentation for the changed surface |
| cross-model-review | suggested | `hyper-team` | gets critique from another model |
| TDD | suggested | `tdd` | drives red-green-refactor for a behavior slice |

## Phase 2 — Align

Alignment is an interview pass before any implementation. Walk these steps in order:

1. **Restate your understanding** of the request from the user (or from the Linear issue, GitHub issue, etc.). Write that restatement into `## Task understanding`.
2. **Scan the project briefly** — relevant files, recent commits, README, related loops or tasks. Often the missing piece is already on disk.
3. **Report what already exists** in the codebase and what looks missing or unclear. Write that into `## Existing code and findings`.
4. **Capture the non-code alignment fields** — fill `## Why`, `## Constraints`, `## Non-negotiables`, and `## Definition of done` from what is already known or from the clarifications you gather here.
5. **Discuss the loop plan with the user** and agree how the work will be tackled.

Ask one question per message. Prefer multiple-choice when a structured-question tool is available; fall back to open-ended only when the choice space is genuinely open.

Only ask what changes the loop: goal, destination, hard constraints, non-negotiables, loop-plan shape, and the first part boundary. Skip details the loop will discover later.

**Pressure-test the loop plan.** Before asking for approval, invoke the pressure-test capability from the registry above to walk the loop plan decision tree with the user. Fold answers into `## Loop plan` and `## Decisions`. This is mandatory; "continue without it" is **not** a valid choice when no suitable pressure-test skill is installed. Offer the user only: install one, swap to a substitute pressure-test skill for this loop, or stop.

When the loop plan is non-trivial, also suggest invoking the cross-model-review capability from the registry above to get an external model critique of the loop plan before approval. Suggested, not required. If no installed skill matches that capability, set `External review` to `n/a — no cross-model-review skill installed` and continue without blocking alignment. Otherwise set `External review` to the matching value for the branch taken: `completed by a cross-model-review skill` or `skipped by user`. Fold the result into `## Loop plan` or `## Decisions`. If the external review changes the loop plan, re-run the pressure test on the changed plan before approval.

A loop plan is **non-trivial** when any of the following holds: it touches more than one part, it introduces a new external dependency, it changes a public contract, or it makes a decision the user cannot easily reverse. If none of these hold, set `External review` to `n/a — trivial loop plan`.

**Post and ask.** Once the loop plan is filled and pressure-tested (and re-tested if external review changed it), write the initial `## Current route` from the agreed route hypothesis and the initial `## Current focus` from the active part plus next concrete move. Then post a concise loop-plan summary in chat — goal and destination, approach, parts, key decisions, open risks. Then ask explicitly for approval. Do not set `Approved by user` unless the user replies with an explicit approval. Plan status uses `awaiting approval | approved | needs rework`. The plan only exists in the agent's head until the user has seen it rendered.

**Alignment gate.** Before the first cycle, `loop.md` must show the pre-cycle alignment surface filled: `## Goal`, `## Why`, `## Constraints`, `## Non-negotiables`, `## Definition of done`, `## Task understanding`, `## Existing code and findings`, `## Loop plan`, `## Current route`, `## Current focus`, `## Current bar`, the current `doing` entry under `## Parts`, and the current part block under `## Part alignment`.

"Filled" means none of the shipped placeholder strings (`Not stated yet.`, `Not filled yet.`, `- None stated.`, `Not agreed yet.`, `Not yet.`) and no unreplaced angle-bracket template prompts (`<...>`) remain in the alignment surface. Instructional HTML comments are exempt.

The gate is cleared when, and only when: the pre-cycle alignment surface is filled, `Pressure-tested at` is a timestamp, `External review` is resolved (any value other than `Not yet.`), `Status: approved`, `Approved by user` is a timestamp, and the current part block satisfies the same four conditions. No cycle starts before this.

**On `needs rework`:**

1. Set loop-plan `Status: needs rework` and reset `Approved by user: Not yet.`.
2. Return to step 5 (discuss the loop plan) for the disputed area.
3. Update the loop-plan block with the user's feedback. Append the reason and decision to `## Decisions`.
4. Rerun the pressure test on the branches the rework touched.
5. If the rework changes a contract or dependency, re-run the non-triviality check and resolve `External review` again.
6. Refresh the loop-plan metadata and re-post the plan summary.
7. Switch `Status` back to `approved` only after a fresh explicit approval.

**Per-part alignment.** Reuse the loop-level alignment flow for each part, with these adjustments:

1. Write the part-level restatement into `#### Understanding` and the part-level scan and findings into `#### Existing code and findings`.
2. Part blocks have no `External review` field; that bookkeeping does not carry over.
3. Run the part pressure test only when the part introduces a new external dependency, a new data shape, a new user-visible surface, or any decision not resolved by the loop-level pressure test. Otherwise set `Part pressure test: covered by loop pressure test <timestamp of loop pressure test>`.
4. Part-plan `Status` uses the same values as loop-plan status (`awaiting approval | approved | needs rework`).
5. Before work on `P<N>` starts, that part block must be filled with no shipped placeholders, pressure-test handling resolved, and `Approved by user` set to a timestamp.
6. On rework: set `Status: needs rework`, reset `Approved by user: Not yet.`, and only switch back to `approved` after a fresh explicit approval.

## Phase 3 — Cycle

Cycles start only after the loop plan is approved and the current part plan is approved. One cycle = one coherent move. Run one cycle at a time unless the user asks for a batch.

Allocate the next cycle number by scanning existing `### Cycle N —` headings under `## Cycles`.

Use the canonical cycle-entry shape in `templates/loop.md`.

For each cycle:

1. Read or run only enough to see the next useful move.
2. Record what matters now and what you expected before the move.
3. Choose one Intent: `probe | implement | validate | split | reroute | reframe | stop`.
   - `probe` — answer a design or reality question before commitment.
   - `implement` — production change on an approved part. Requires the current part `Status: approved`.
   - `validate` — check current work or route without closing.
   - `split` — create new parts and re-enter alignment.
   - `reroute` — same goal, different route. Also update `## Current route` and append to `## Route shifts`.
   - `reframe` — goal changed. Also update `## Goal` and `## Why`, then re-run the Phase 2 alignment gate before any further work.
   - `stop` — pause, block, or close. The loop stays `status: active` when pausing or blocked. A close handoff uses the pair `Intent: stop` + `Next: close`.
4. Take the smallest meaningful move that advances that intent.
5. Capture the exact result. If raw output is large, save it inside the loop folder, keep the decisive excerpt in the cycle, and link the file from `## Relevant artifacts`.
6. Record what the evidence changed about the prior belief, the route, the parts, or the risks. Then explicitly ask: is the goal still the right goal? If no, the next intent must be `reframe`, not `reroute`.
7. Refresh the living state. `## Current focus` holds the active part and the next concrete move. Update it every cycle, and whenever the active part or immediate next move changes.
8. Set `Next` based on the immediate next move: `continue | back up | split | validate | pause | close`. Meanings: `continue` — another cycle on the current route; `back up` — return to an earlier phase or assumption; `split` — create new parts; `validate` — next cycle uses the `validate` intent; `pause` — stop with the loop still `status: active`; `close` — hand off into Phase 4.
9. Keep `## Parts` and `## Part alignment` in sync. Exactly one part is `doing` at a time. When a part finishes, mark it `done`; when a later part becomes current, move that part to `doing` and keep unopened parts `todo`.
10. If the next move opens a new part, set `Next` to `split`, stop, and refresh `## Part alignment` first. If the next move revises an existing part plan, set `Next` to `back up`, stop, and refresh `## Part alignment` first. Re-enter Phase 3 only after the user approves that part plan.
11. Refresh handoff cues. Leave the next atomic move, the current risk, and `Dirty or unvalidated state` visible in `## Handoff cues`.
12. On the first real cycle entry, replace `_No cycles yet._`. Then append the cycle entry and refresh frontmatter `updated`.

**TDD as a suggested implementation mode.** When an `implement` cycle's work is testable behavior (not pure refactoring, pure tooling, or pure prose), suggest the TDD capability from the registry above to drive the slice red-green-refactor. Suggested, not required — the user can decline. When used, the failing test becomes the cycle's `Evidence`, the passing implementation becomes the next cycle's `Action` and `Evidence`, and the refactor (if any) becomes a third cycle.

If the bar or route changes, update the living value **and** append a one-line entry to `## Bar history` or `## Route shifts` with timestamp and reason. Use `## Decisions` only for load-bearing choices.

Part statuses: `todo | doing | done`.

## Phase 4 — Verify and Close

Phase 4 starts when Phase 3 ends with the closing handoff pair `Intent: stop` + `Next: close` — because the destination is reached or because the user explicitly wants to close the loop. A paused or blocked loop stays `status: active` and does not enter Phase 4. Phase 4 runs a single hard gate: the verify gate. The loop cannot flip to `status: done` without a passing entry in `## Verified outcomes`, unless the user explicitly chooses to close without verify.

**Run all four checks:**

1. **Tests.** Re-run the project's test suite. Capture the exact command, exit code, and a decisive excerpt. Link the full log under `## Relevant artifacts` if large.
2. **Code review.** Invoke the code-review capability from the registry above on the loop's full diff. Record the verdict (`pass | needs-changes | blocked`) and top findings.
3. **Docs.** If the loop changed user-facing surface (CLI, UI, API, public functions, behavior advertised to users), invoke the docs capability from the registry above. Otherwise record `n/a — no user-facing surface change`.
4. **Definition of done.** Walk every line in `## Definition of done`. Record each line as `met | not met | n/a`, backed by concrete evidence (file:line, test name, screenshot, etc.).

Missing-skill handling matches Phase 2: if required code review is missing, or required docs support is missing when the loop changed user-facing surface, "continue without it" is **not** a valid choice. Offer install, swap for this loop, or stop.

**Record verification** using the `## Verified outcomes` entry shape in `templates/loop.md`. The overall verify `Result` is `pass | partial | fail`. On the first real verify entry, replace `_No verify runs yet._`. Whenever verification runs, set `Verify link` in `## Outcome` to `Verify N` for the latest verify entry. Leave `Close summary: Not finished yet.` until the loop actually closes.

**On `Result: pass`:**

1. Set frontmatter `status: done`.
2. Put the achieved result and any material tradeoffs into `Close summary`.
3. Set `Verify link: Verify N` for the passing entry.
4. Post a short closing summary in chat (result, what was verified, handoffs the next session needs).
5. Stop.

**On `Result: partial` or `Result: fail`:**

1. Leave frontmatter `status: active`.
2. Return to Phase 3 and run a remediation cycle that fixes the specific failures named in this verify entry.
3. Re-enter the verify gate.
4. Do not edit `## Definition of done` to make a failure go away unless the user explicitly approves changing the scope.

**On user-explicit close without verify** — the user can close the loop before the verify gate passes ("I'm dropping this", "good enough", "abandon this loop"):

1. Set frontmatter `status: done`.
2. Write a real `Close summary`.
3. Set `Verify link: n/a`.
4. Add the close-without-verify-only lines from `templates/loop.md`: `Close-without-verify reason: <reason>` and `Unfinished items: <what still matters>`.
5. Skip the verify gate. This is a deliberate user choice, not a verify-gate pass.

## Delegation to Sub-Agents

When sub-agents are available, the parent may delegate a bounded slice within a cycle (recon, research, focused validation, adversarial review, one-part implementation). The parent still owns the loop and every route decision; the child returns a summary, the parent integrates it into the cycle's evidence and updates `loop.md`.

**Delegate when:**

- The task has a clear input, output, and stop condition.
- Fresh context will find different things than the parent's accumulated context (recon, second-opinion review).
- Multiple bounded slices can run in parallel without touching the same code path.

**Do not delegate:**

- The whole loop. Phase decisions, alignment, gate passes, and route changes stay with the parent.
- Anything that needs the loop's accumulated context.
- Approval moments — the user talks to the parent, not to children.

**Rules:**

- Children never mutate `loop.md` directly. They return text; the parent writes the cycle entry and refreshes living state.
- One writer at a time for implementation on the same code path. Two children racing on the same files produces incoherent diffs.
- Each delegation has a clear input, output, and stop condition. "Look at the codebase and figure things out" is too open; "find every call site of `Foo.bar` and report each as file:line with context" is bounded.

## Operating rules

- Read `.hyper/rules.md` once at loop start when it exists. Treat it as normative for the session.
- Resolve capability bindings at loop start. Required missing capabilities block; suggested missing capabilities do not. Never silently skip a required call.
- No implementation before the loop plan is `approved`.
- No part implementation before that part's plan is `approved`.
- One cycle, one coherent move. Run cycles one at a time unless the user asks for a batch.
- Smallest meaningful move, not necessarily the smallest possible probe.
- Record evidence verbatim where practical. Do not paraphrase away the signal.
- Append to chronological logs (`## Bar history`, `## Route shifts`, `## Decisions`, `## Cycles`, `## Verified outcomes`); never rewrite them.
- Overwrite the living-state sections in place as reality changes.
- Refresh `## Handoff cues` whenever the next atomic move or current risk changes.
- Exactly one part is `doing` at a time.
- When the user pivots mid-loop ("actually, I'm thinking about X", "what if we tried Y"), treat it as a goal-reframe signal until proven otherwise. Stop the current cycle, surface the pivot, and re-run the alignment gate if the goal shifted. Do not silently absorb the pivot as a part-plan tweak.
- No `status: done` without a passing verify entry, unless the user explicitly closes scope without verify.
- Do not reopen done loops. If continued work is needed, create a new loop and reference the closed one in `## Starting point`.
- Legal values inlined throughout this skill mirror `templates/loop.md`. If either changes, update the other.
