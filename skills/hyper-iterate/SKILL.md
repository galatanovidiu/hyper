---
name: hyper-iterate
description: >
  Runs adaptive loops for work where the route must evolve through contact with reality, and the goal may need probing before it is ready to commit. Each loop persists so sessions can resume without losing context. Use when the user wants to iterate, course-correct mid-flight, probe before committing, or break a goal into adaptive slices. Keywords: hyper, iterate, loop, ooda, adaptive, probe, course correct.
argument-hint: "[L<N>|new|<title>|.hyper/loops/... ]"
---

# Hyper Iterate

Run tracked adaptive work: observe, orient, decide, act, repeat. Use it for iterative or exploratory work — when the path should stay flexible, when the goal is known enough to start but still needs probing before commitment, or when contact with reality is likely to shift the route.

## When to Use

Reach for hyper-iterate when any of these match:

- The goal is known enough to start, but the path is not, and the path should stay flexible.
- The goal itself is still forming and needs probing before it can be committed.
- Reality is likely to reshape the plan once work starts.
- The work needs a throwaway probe or prototype before committing to a route.
- A big goal needs to be split into adaptive parts, not a rigid plan.
- The work will span multiple sessions and context must survive interrupts.
- The user uses verbs like "iterate", "explore", "probe", "experiment", "investigate", "prototype", "figure out", "pivot", or "course-correct".
- The user signals uncertainty about the path: "I'm not sure yet", "depends on what we find", "let me think through this", "this might change".

Use the phase gates below to decide whether the loop still fits.

## The Process

The workflow is four phases in order: Load and Route → Align → Cycle → Verify and Close. The phase sections below are the authority.

## Terminology

- **Loop** — the whole tracked unit of work, persisted in `.hyper/loops/L<N>-<slug>/`.
- **Loop plan** — the agreed top-level approach for the loop. Always written "loop plan" as a noun, "loop-plan" only as a noun modifier (e.g., "loop-plan summary").
- **Part** — one bounded scope inside the loop. Numbered `P<N>`, append-only.
- **Part plan** — the agreed approach for one part.
- **Cycle** — one coherent observe-orient-decide-act move inside a part. Numbered `Cycle N`, append-only.
- **Slice** — informal: any bounded unit of work that fits inside one cycle or one delegated child call. Not a separate persisted concept.
- **Verify entry** — one record of running the verify gate. Numbered `Verify N`, append-only.

## The Loop Artifact

Each loop is a folder at `.hyper/loops/L<N>-<slug>/` containing:

- `loop.md` — the canonical state file. See `templates/loop.md` for the full structure.
- Optional evidence files (logs, diffs, screenshots, console output) referenced from `## Relevant artifacts`. Use kebab-case names: `cycle3-build-log.txt`, `verify2-2026-05-13.txt`.

The project root is the directory containing `.hyper/`, or the current working directory if `.hyper/` does not exist yet. Create `.hyper/loops/` if missing. Use absolute paths only for transient tool execution when the working directory differs from the project root; keep paths written into `loop.md` and user-facing summaries repo-relative.

Use the exact section layout shipped in `templates/loop.md`.

Behavior rules for that artifact:

- Overwrite the current working view as reality changes.
- Append to the chronological logs; do not rewrite them.
- Set `created` and `updated` when the loop is created. After that, every mutation of `loop.md` refreshes `updated`.
- Treat `## Starting point` as a single snapshot set when the loop is created. If a new loop continues learning from an earlier done loop, reference it there.
- When `## Cycles` grows beyond 50 entries, move all but the most recent 30 to `cycles-archive.md` in the loop folder, leaving a one-line stub `### Cycle K — moved to cycles-archive.md` in `loop.md`. Hot/warm reads ignore the archive; cold reads may open it on demand.

Timestamps use `YYYY-MM-DDTHH:MM:SS`.

## Phase 1 — Load and Route

Get the current UTC timestamp in `YYYY-MM-DDTHH:MM:SS` format.

List `.hyper/loops/` if it exists; otherwise treat the project as having no loops yet.

**Project rules.** Read `.hyper/rules.md` if it exists; treat as normative for the session. If absent, no project rules are in force. On every resume, re-read this file: if its content differs from when the loop was last touched (any prior cycle, decision, or rule reference in `loop.md` is now in tension with the current rules), surface the conflict to the user and append a `## Decisions` entry recording the new ruling before continuing the current cycle.

When the loop needs a required capability from the registry below and no suitable skill is installed, tell the user which capability is missing and offer: install one, swap to a substitute for this loop, or stop. Never silently skip a required skill call. Suggested capabilities do not block the loop. **Conditional capabilities** (those marked `conditional` in the registry) are not checked at loop start; they are evaluated only at the phase that needs them. For example, `code-review` is evaluated only at Phase 4, and only after research-only detection has decided whether code changes exist.

**Route.** Pick one:

1. **Resume by id or path** — user named `L<N>` or gave a path inside `.hyper/loops/`.
2. **Resume by title** — user named an existing loop clearly.
3. **Resume the only active loop** — exactly one loop has frontmatter `status: active`.
4. **Ask** — multiple active loops and the target is unclear.
5. **Create** — otherwise.

Multiple loops may exist in `status: active` at the same time (parallel work, paused loops, blocked loops). A session works on one loop at a time, chosen by the Route step. Switching loops mid-session means re-entering Phase 1.

A loop with last-cycle `Next: pause` is treated as paused but still `status: active`. Frontmatter does not carry a separate `paused` value; the last cycle's `Next` is the only paused marker.

Done loops are not reopened. If the user wants to keep going from a done loop, create a new one and reference it in `## Starting point`.

**On create:**

1. Scan `.hyper/loops/` for `L<N>-*` folders, take the highest `N`, allocate the next.
2. Pick a short title and kebab-case slug.
3. Create `loop.md` from the template. Fill `id`, `title`, `status`, `created`, and `updated` immediately from the allocated loop metadata, replace the H1 with the allocated loop id and title, and write a one-time starting snapshot in `## Starting point` (replacing the shipped `- None yet.`). For anything still unknown, keep the placeholder already shipped for that section in `templates/loop.md`; do not invent new placeholder strings.
4. Initial bar: the next approval gate. Default to "clear alignment by approving the loop plan and current part plan" if not stated.
5. Write that bar into `## Current bar`, and append the first real entry to `## Bar history` as `- <creation timestamp> — Initial bar: <verbatim text of Current bar>`, replacing the shipped `- None yet.`.
6. Initial parts: 2–5 meaningful parts when the work decomposes naturally, or use the single-part fallback `P1 — Whole goal — aligning`.
7. Exactly one initial part is current (`aligning`). Any remaining initial parts start `todo`.
8. For every part written under `## Parts`, clone the matching `P<N>` block under `## Part alignment`, and make each cloned `### P<N> — ...` heading mirror the part number and title from its corresponding part entry.
9. Announce: `Created L<N> — <title>. Starting adaptive loop.`

**Before entering Phase 2**, verify the two creation-time obligations above are honored: `## Starting point` no longer contains `- None yet.`, and the first `## Bar history` entry begins with the creation timestamp, then ` — Initial bar: `, then the exact text now in `## Current bar`. Fix any miss before continuing.

**On resume:** read `loop.md` in layers; do not reread the whole file by default.

- **Hot** (always): the pre-cycle alignment surface listed under the Phase 2 alignment gate below, plus `## Evidence digest` and the full `## Handoff cues` block (`Next atomic move`, `Current risk or uncertainty`, and `Dirty or unvalidated state`).
- **Warm** (when the next move needs more): `## Starting point`, the decision log, the route-shift log, the bar-history log, `## Relevant artifacts`, the last 3 cycles (or fewer if the loop has fewer), the latest verify entry, and `## Outcome`.
- **Cold** (on demand only): older cycles, `cycles-archive.md` if it exists, raw artifact files.

**Mid-cycle interrupt recovery.** If the last entry under `## Cycles` is missing any of the canonical cycle fields after `Action` (`Evidence`, `Learning`, `Route impact`, `Next`), the previous session died mid-cycle. This is the one documented exception to the cycle-append-only rule: complete the partial cycle entry in place by appending the missing fields. If the work itself was not completed, set `Evidence: Interrupted before evidence captured`, `Learning: none — interrupted`, `Route impact: no change`, and `Next: back up`. Never start a new cycle while a prior cycle entry is incomplete.

Promote durable signal upward as work progresses: timestamped route changes go to `## Route shifts`, load-bearing choices go to `## Decisions`, still-relevant findings go to `## Evidence digest`, and restart-critical notes go to `## Handoff cues`. In any section seeded with `- None yet.` or another empty-state sentinel, replace that sentinel with the first real entry.

## Capability registry

Resolve each capability call in this order: exact preferred skill name, then any installed skill whose description matches the fallback description. If multiple fallback matches exist, choose the closest match and record the choice in `## Decisions`.

| Role | Required? | Preferred skill | Fallback description |
|---|---|---|---|
| pressure-test | required | `grill-me` | stress-tests a plan or decision tree |
| code-review | conditional (verify, if code changes) | `hyper-code-review` | reviews code changes and returns a verdict with findings |
| docs | conditional (verify, if user-facing surface changed) | `hyper-docs` | updates user-facing documentation for the changed surface |
| cross-model-review | suggested | `hyper-team` | gets critique from another model |
| TDD | suggested | `tdd` | drives red-green-refactor for a behavior slice |

Required values: `required` (block at loop start if missing) · `conditional (<phase>, if <trigger>)` (evaluated only at that phase) · `suggested` (never blocks).

**Sub-agent invocation.** Required capabilities that interact with the user (notably `pressure-test`) are invoked through a sub-agent when one is available, not by interrupting the parent agent's session. The sub-agent walks the decision tree, returns the digest, and the parent folds the answers into `loop.md`. The sub-agent runs the interview only; the explicit yes/no approval question (loop plan or part plan) is always asked by the parent, never by the sub-agent. When no sub-agent is available, fall back to direct user interview by the parent.

## Phase 2 — Align

Alignment is an interview pass before any implementation. Walk these steps in order:

1. **Restate your understanding** of the request from the user (or from the Linear issue, GitHub issue, etc.). Write that restatement into `## Task understanding`.
2. **Scan the project briefly** — relevant files, recent commits, README, related loops or tasks. Often the missing piece is already on disk.
3. **Report what already exists** in the codebase and what looks missing or unclear. Write that into `## Existing code and findings`.
4. **Capture the non-code alignment fields** — fill `## Why`, `## Constraints`, `## Non-negotiables`, and `## Definition of done` from what is already known or from the clarifications you gather here.
5. **Discuss the loop plan with the user** and agree how the work will be tackled.

Ask one question per message. Prefer multiple-choice when a structured-question tool is available; fall back to open-ended only when the choice space is genuinely open. When the question has two or more variants, mark exactly one as `[RECOMMENDED — <one-line reason>]`. The reason cites concrete signal (file on disk, existing decision, constraint, observed risk). If no variant is defensibly better, say so and ask the user to pick — do not invent a reason.

Only ask what changes the loop: goal, destination, hard constraints, non-negotiables, loop-plan shape, and the first part boundary. Skip details the loop will discover later.

**Pressure-test the loop plan.** Before asking for approval, invoke the pressure-test capability from the registry above to walk the loop plan decision tree. Prefer a sub-agent invocation when one is available; the sub-agent runs the interview and returns the digest. Fold answers into `## Loop plan` and `## Decisions`, then set `Pressure-tested at` to the timestamp the pressure-test concluded. This is mandatory; "continue without it" is **not** a valid choice when no suitable pressure-test skill is installed. Offer only: install one, swap to a substitute pressure-test skill for this loop, or stop.

When the loop plan is non-trivial, also suggest invoking the cross-model-review capability from the registry above to get an external model critique of the loop plan before approval. Suggested, not required. Resolve `External review` using these rules:

- Trivial plan → `n/a — trivial loop plan`. Other branches are not reachable from a trivial plan.
- Non-trivial plan and no installed skill matches the capability → `n/a — no cross-model-review skill installed`. Continue without blocking alignment.
- Non-trivial plan, a matching skill exists, user accepts → invoke it, then set `completed by a cross-model-review skill`. Fold the result into `## Loop plan` or `## Decisions`. If the external review changes the loop plan, re-run the pressure test on the changed plan before approval.
- Non-trivial plan, a matching skill exists, user declines → `skipped by user`.

A loop plan is **non-trivial** when any of the following holds: it touches more than one part, it introduces a new external dependency, it changes a public contract, or it makes a decision the user cannot easily reverse. If none of these hold, the plan is trivial.

**Post and ask** — fixed order:

1. Write the agreed loop plan into `## Loop plan`. Status remains `awaiting approval`; `Approved by user: Not yet.`.
2. Write the initial `## Current route` from the agreed route hypothesis, the initial `## Current focus` from the active part plus next concrete move, and `## Handoff cues` `Next atomic move` from the first cycle's intended move.
3. Post a concise loop-plan summary in chat — goal and destination, approach, parts, key decisions, open risks.
4. Ask explicitly for approval. State the recommended action and a one-line reason in the form `[RECOMMENDED — <reason>]`, where the reason cites concrete signal from the loop plan (a tradeoff resolved, a constraint honored, a risk dropped). The same rule applies to every part-plan approval ask.
5. On explicit approval only: set `Status: approved` and `Approved by user: <timestamp>`. Plan status uses `awaiting approval | approved | needs rework`.

The plan only exists in the agent's head until the file is written and the user has seen the chat-rendered summary.

**What counts as approval.** A message from the user that, taken literally, is an unambiguous affirmative directed at the plan just posted — e.g., `approve`, `approved`, `yes`, `go ahead`, `ok do it`, `lgtm`, `ship it`, `proceed`. Anything hedging (`looks fine`, `I guess`, `maybe`, `sounds reasonable`, `interesting`) is not approval; ask again as a yes/no question. Silence is not approval. Approval expires when the plan is materially edited afterward — re-ask. The same definition applies to part-plan approval and to any rework re-approval.

**Alignment gate.** Before the first cycle, `loop.md` must show the pre-cycle alignment surface filled: `## Goal`, `## Why`, `## Constraints`, `## Non-negotiables`, `## Definition of done`, `## Task understanding`, `## Existing code and findings`, `## Loop plan`, `## Current route`, `## Current focus`, `## Current bar`, `## Handoff cues` `Next atomic move`, the current part under `## Parts`, and the current part block under `## Part alignment`.

"Filled" means none of the shipped placeholder strings (`Not stated yet.`, `Not filled yet.`, `- None stated.`, `- None yet.`, `Not agreed yet.`, `Not yet.`) and no unreplaced angle-bracket template prompts (`<...>`) remain in the alignment surface. Instructional HTML comments are exempt.

The loop-level gate is cleared when, and only when: the pre-cycle alignment surface is filled, `Pressure-tested at` is a timestamp, `External review` is resolved (any value other than `Not yet.`), `Status: approved`, and `Approved by user` is a timestamp.

The current-part block is cleared when, and only when: the part-block fields (`#### Understanding`, `#### Existing code and findings`, the `- Goal:` / `- Approach:` / `- Dependencies and risks:` bullets) are filled with no placeholders; `Part pressure test` is resolved (any value other than `Not yet.`); `Status: approved`; and `Approved by user` is a timestamp. When the part block is cleared, flip the part's status under `## Parts` from `aligning` to `doing` together with the write that records the approval, following the multi-section transition rule in Operating rules — both writes complete in the same agent turn so the file never crosses a session boundary half-flipped.

No cycle starts before both gates are cleared.

**On `needs rework`:**

1. Set loop-plan `Status: needs rework` and reset `Approved by user: Not yet.`.
2. Return to step 5 of the outer Phase 2 steps ("Discuss the loop plan with the user") and re-run it for the disputed area.
3. Update the loop-plan block with the user's feedback. Append the reason and decision to `## Decisions`.
4. Rerun the pressure test on the branches the rework touched.
5. If the rework changes a contract or dependency, re-run the non-triviality check and resolve `External review` again.
6. Refresh the loop-plan metadata and re-post the plan summary.
7. Switch `Status` back to `approved` only after a fresh explicit approval.

**Per-part alignment.** Reuse the loop-level alignment flow for each part, with these adjustments:

1. Write the part-level restatement into `#### Understanding` and the part-level scan and findings into `#### Existing code and findings`.
2. Part blocks have no `External review` field; that bookkeeping does not carry over.
3. Run the part pressure test only when the part introduces a new external dependency, a new data shape, a new user-visible surface, or any decision not resolved by the loop-level pressure test. Otherwise set `Part pressure test: covered by loop pressure test <timestamp of loop pressure test>`.
4. Dependencies recorded under `- Dependencies and risks:` must form a DAG over `P<N>` ids. If adding a part would create a cycle in the dependency graph, surface it to the user and ask which dependency to break before approving the part plan.
5. Part-plan `Status` uses the same values as loop-plan status (`awaiting approval | approved | needs rework`).
6. Before work on `P<N>` starts, the part block must meet the current-part-block gate above: no placeholders, `Part pressure test` resolved, `Status: approved`, and `Approved by user` set to a timestamp.
7. On rework: set `Status: needs rework`, reset `Approved by user: Not yet.`, and only switch back to `approved` after a fresh explicit approval.

## Phase 3 — Cycle

Cycles start only after the loop plan is approved and the current part plan is approved. One cycle = one coherent move. Run one cycle at a time unless the user asks for a batch. A loop may close after a single cycle if that cycle ends `Intent: stop` + `Next: close` and the verify gate clears; there is no minimum cycle count.

Allocate the next cycle number by scanning existing `### Cycle N —` headings under `## Cycles` and taking max + 1. Cycle numbers are append-only.

Use the canonical cycle-entry shape in `templates/loop.md`. Write fields in the exact order shown; do not reorder, rename, or omit.

For each cycle:

1. Read or run only enough to see the next useful move.
2. Record what matters now and what you expected before the move.
3. Choose one Intent: `probe | implement | validate | reroute | reframe | stop`.
   - `probe` — answer a design or reality question before commitment.
   - `implement` — production change on an approved part. Requires the current part `Status: approved` (and part status `doing`).
   - `validate` — check current work or route without closing.
   - `reroute` — same goal, different route. Also update `## Current route` and append to `## Route shifts`.
   - `reframe` — goal changed. Also update `## Goal` and `## Why`, set `Next: reframe`, and re-run the Phase 2 alignment gate before any further cycle. On reframe re-entry to Phase 2, always reset the loop plan: set `Status: needs rework`, reset `Approved by user: Not yet.`, and reset `Pressure-tested at: Not yet.` (the prior pressure test was against the old goal). Reset every part whose `## Parts` status is `aligning` or `doing` and whose part-plan `Status` is `approved`: set part-plan `Status: needs rework`, reset `Approved by user: Not yet.`, and reset `Part pressure test: Not yet.`. Parts whose `## Parts` status is `done` are left as-is by default (their completed work stays recorded). If the new goal invalidates a `done` part's completed work, the user can explicitly request that part be reopened — that follows the verify-remediation path (`done → doing` transition) and must be recorded in `## Decisions`. If the agent judges that a still-active part's scope still fits the new goal, the re-approval can be brief, but it must happen — the prior approval was against the old goal and cannot be inherited.
   - `stop` — pause, block, or close. The loop stays `status: active` when pausing or blocked. A close handoff uses the pair `Intent: stop` + `Next: close`.
4. Take the smallest meaningful move that advances that intent — smallest meaningful, not smallest possible.
5. Capture the exact result. If raw output is large, save it inside the loop folder, keep the decisive excerpt in the cycle, and link the file from `## Relevant artifacts`. Record evidence verbatim where practical; do not paraphrase away the signal. For non-TDD `implement` cycles, capture Evidence as the diff range as `file:line-line` plus one of: a passing existing test that covers the change, a manual verification command and its output, or a screenshot/log; and state the rationale for not using TDD in `Orient`.
6. Record what the evidence changed about the prior belief, the route, the parts, or the risks. Then explicitly ask: is the goal still the right goal? If no, the next intent must be `reframe`, not `reroute`.
7. Refresh the living state. `## Current focus` holds the active part and the next concrete move. Update it every cycle, and whenever the active part or immediate next move changes.
8. Set `Next` based on the immediate next move: `continue | back up | split | validate | pause | close | reframe`. Meanings:
   - `continue` — another cycle on the current route.
   - `back up` — return to an earlier phase or assumption.
   - `split` — this cycle stopped to open a new part; the part block has been written and is awaiting approval. The next cycle will run on that new part once its part-block gate clears.
   - `validate` — next cycle uses the `validate` intent.
   - `pause` — stop with the loop still `status: active`.
   - `close` — hand off into Phase 4.
   - `reframe` — goal changed and Phase 2 alignment must re-run before any further cycle.

   **Intent × Next compatibility:**
   - `Intent: reframe` forces `Next: reframe`.
   - `Intent: stop` forces `Next: pause | close`.
   - `Next: split` is allowed only when `Intent` is `probe | implement | validate | reroute` (the cycle did real work and the result was "we need a new part written before the next cycle"). The part-opening procedure in step 10 always uses `Next: split`; there is no separate `Intent: split` shortcut, so approval of the new part plan is never bypassed.
9. Keep `## Parts` and `## Part alignment` in sync. See Operating rules for the single-current-part invariant. Transitions:
   - `todo → aligning` — a `todo` part becomes current and its part-plan `Status` is `awaiting approval` (the plan needs interview/approval before implementation).
   - `todo → doing` — a `todo` part becomes current and its part-plan `Status` is already `approved` (typical for split-created parts: the plan was approved in the split cycle, and the part stayed `todo` until promoted to current). The promotion is a single atomic write inside `## Parts` (no `## Part alignment` change happens at this moment — approval was recorded earlier), bundled with the prior current part's flip to `done` per the rule below.
   - `aligning → doing` — the part-block gate clears (part-plan `Status` flips to `approved`).
   - `doing → done` — the part is finished.
   - `done → doing` — permitted only when (a) Phase 4 verify-triggered remediation needs the part reopened, or (b) the user explicitly requests reopening a `done` part during a reframe (per the Phase 3 reframe rules). In both cases, append a `## Decisions` entry naming the trigger, and apply the same single-atomic-write rule (touching `## Parts` and the `## Decisions` entry) so an interrupted session never observes a half-flipped state.

   When one part finishes and another becomes current, flip the previous part to `done` and the next part to either `aligning` or `doing` (per the rules above) in the same agent turn, following the multi-section transition rule in Operating rules — do not leave the loop file at a session boundary with zero current parts. If a part finishes and no `todo` part exists, the loop either opens a new part via step 10 or closes via `Next: close`; do not leave the loop with zero current parts.
10. **Opening a new part.** If the next move opens a new part, set `Next: split` (with `Intent` set to whatever this cycle actually did per the compatibility matrix in step 8), stop, and write the new part. Allocate the new part number as max(existing `P<N>`) + 1; never reuse numbers. Insert the new part entry in `## Parts` at the position the user requests; the default is the end of `## Parts` (so consecutive splits append in numeric order — surface this to the user if a different position is wanted). The current part keeps its status during the split cycle; the new part's `## Parts` status starts at `todo`. Clone a part-alignment block for the new part with `Status: awaiting approval`. Open exactly one new part per split cycle — if the user wants to add multiple parts, run consecutive split cycles and get explicit approval on each part plan before opening the next. Re-enter Phase 3 only after the user approves the new part plan. When that part later becomes current, the appropriate `## Parts` transition is `todo → doing` (the part-plan `Status` is already `approved` from the split cycle).
11. **Revising an existing part plan.** If the next move revises an existing part plan, set `Next: back up`, stop, set that part's `Status: needs rework`, reset `Approved by user: Not yet.`, refresh the part block, and re-enter the per-part alignment flow. Re-enter Phase 3 only after the user approves the revised plan.
12. **When `Next: pause`.** Write `## Handoff cues` `Next atomic move` as the move the *next* session should take, not the move that just happened. Include any state-restoration prerequisites (branch, uncommitted files, env). Update `Dirty or unvalidated state` accurately.
13. Refresh handoff cues whenever the next atomic move or current risk changes.
14. On the first real cycle entry, replace `_No cycles yet._`. Then append the cycle entry and refresh frontmatter `updated`.

**Zoom-out checkpoints.** A loop can drift even when each cycle looks productive. The pull to finish the next cycle is strong; the point of zoom-out is precisely that pull is strong even when the route is wrong. Pause and surface the bigger picture whenever any of these triggers fires:

- Three cycles have completed inside the current part since the last checkpoint (cadence — catches slow drift).
- The cycle just written has `Route impact` not equal to `no change`.
- Two consecutive cycles ended `Next: back up`.
- The next planned move is `Next: split` — opening a new part deserves a pause before adding scope.
- A user message hints at pivot: hedging language, "what about", "wait", "I'm not sure", or naming a different goal in passing.

At a checkpoint, the agent must:

1. Stop further cycle work.
2. Post a chat message using the Chat output shape, with the body containing: where the loop is now, what was believed when the current part started, what the evidence has actually shown since, and three possible next directions (continue on the current route, reroute, reframe).
3. Ask the user which direction to take, marking one as `[RECOMMENDED — <one-line reason>]` per the Phase 2 question rule.
4. Record the user's answer in `## Decisions` with a timestamp before resuming cycle work. If the answer is `reroute`, also append to `## Route shifts`. If `reframe`, follow the Phase 3 reframe path in step 3 of the cycle list.

Checkpoints are not optional. "The next cycle is almost done" is not a reason to skip one.

**TDD as a suggested implementation mode.** When an `implement` cycle's work is testable behavior (not pure refactoring, pure tooling, or pure prose), suggest the TDD capability from the registry above to drive the slice red-green-refactor. Suggested, not required — the user can decline. When used, the failing test becomes the cycle's `Evidence`, the passing implementation becomes the next cycle's `Action` and `Evidence`, and the refactor (if any) becomes a third cycle. When the work is testable but no TDD skill matches the capability, proceed with manual test-first authoring and record in the cycle's `Orient`: `No TDD capability installed; tests authored manually.`

If the bar or route changes, update the living value **and** append a one-line entry to `## Bar history` or `## Route shifts` with timestamp and reason. Use `## Decisions` only for load-bearing choices.

Part statuses: `todo | aligning | doing | done`.

## Phase 4 — Verify and Close

Phase 4 starts on one of two triggers: **(a)** Phase 3 ends with the closing handoff pair `Intent: stop` + `Next: close` (because the destination is reached or because the user explicitly wants to close the loop after at least one cycle ran), or **(b)** the user explicitly abandons the loop before any cycle has run — see "Pre-cycle abandonment" below. A paused or blocked loop stays `status: active` and does not enter Phase 4. Phase 4 runs a single hard gate: the verify gate. The loop cannot flip to `status: done` without a passing entry in `## Verified outcomes`, unless the user explicitly chooses to close without verify.

**Pre-cycle abandonment** (trigger b). If the user explicitly abandons the loop before any cycle has run (alignment never cleared, or the user gives up mid-Phase-2), run the "On user-explicit close without verify" branch below in full. No `Intent: stop` + `Next: close` cycle is required because no cycles exist; the abandonment itself replaces the closing handoff pair. When that branch's step 5 writes the close-without-verify-only lines, use `Close-without-verify reason: abandoned before alignment cleared` (or the user's exact reason) and `Unfinished items: <what was being aligned at the moment of abandonment>`. The branch's step 1 dirty-state check still runs — the default `Dirty or unvalidated state: none` is a real value, not a placeholder, and is the expected reading on a loop that ran no cycles.

**Detect research-only loops.** Before running the checks, run `git diff` against the loop's starting commit (or `git status` if no starting commit is tracked) inside the project. If no code changes are present, the loop is research-only for verify purposes: skip the code-review capability call and treat the Tests check accordingly (see below).

**Run all four checks:**

1. **Tests.** Re-run the project's test suite. Capture the exact command, exit code, and a decisive excerpt. Link the full log under `## Relevant artifacts` if large. Legal alternates when no test run applies: `n/a — no test suite in project` or `n/a — research-only loop, no code changes`.
2. **Code review.** Invoke the code-review capability from the registry above on the loop's full diff. Record the verdict (`pass | needs-changes | blocked`) and top findings. On a research-only loop (empty diff), record `n/a — research-only loop, no code changes` and skip the capability call.
3. **Docs.** If the loop changed user-facing surface (CLI, UI, API, public functions, behavior advertised to users), invoke the docs capability from the registry above. Otherwise record `n/a — no user-facing surface change`.
4. **Definition of done.** Walk every line in `## Definition of done`. Record each line as `met | not met | n/a`, backed by concrete evidence. Evidence cites a source the file already contains, in one of these shapes: `file:line` (or `file:line-line`), `test: <test name>`, `artifact: <relative path under Relevant artifacts>`, `Decisions: <verbatim first 8 words of the decision title>`, `Evidence digest: <verbatim digest bullet>`, or `Cycle N <field>: <verbatim excerpt>`. The cited entry must already exist in `loop.md` at verify time; do not invent evidence inline.

Missing-skill handling matches Phase 2: if required code review is missing on a loop with code changes, or required docs support is missing when the loop changed user-facing surface, "continue without it" is **not** a valid choice. Offer install, swap for this loop, or stop.

**Record verification** using the `## Verified outcomes` entry shape in `templates/loop.md`. Allocate `Verify N` as max(existing `Verify N`) + 1; verify entries are append-only and never rewritten, even after remediation. The overall verify `Result` is `pass | partial | fail`. The verify entry's `Follow-up` field (legal values: `stop and close | remediation cycle to fix <what>`) is the verify-level analogue of the cycle's `Next` — it is a separate field with separate values, so cycle and verify logs stay grep-distinguishable. On the first real verify entry, replace `_No verify runs yet._`. Whenever verification runs, set `Verify link` in `## Outcome` to `Verify N` for the latest verify entry. Leave `Close summary: Not finished yet.` until the loop actually closes.

**On `Result: pass`:**

1. Set frontmatter `status: done`.
2. Put the achieved result and any material tradeoffs into `Close summary`.
3. Set `Verify link: Verify N` for the passing entry.
4. Post a short closing summary in chat (result, what was verified, handoffs the next session needs).
5. Stop.

**On `Result: partial` or `Result: fail`:**

1. Leave frontmatter `status: active`.
2. Return to Phase 3 and run a remediation cycle that fixes the specific failures named in this verify entry. If the failing scope lives in a part whose `## Parts` status is `done`, flip that part to `doing` for the remediation (one of the two permitted `done → doing` triggers; see step 9) and append a `## Decisions` entry recording the verify-triggered reopen. The part must already have an approved part plan; remediation does not require a new part-block approval. Flip it back to `done` when the remediation cycle finishes.
3. If the remediation reveals the fix requires a new part (not just changes inside the reopened part), the remediation cycle may end `Next: split` and open a new part via step 10. The reopened part stays `doing` until either the remediation completes inside it, or all the work moves into the new part — at which point flip the reopened part back to `done` and let the new part take over as current.
4. Re-enter the verify gate (this produces a new `Verify N+1` entry; do not rewrite the failing one).
5. Do not edit `## Definition of done` to make a failure go away unless the user explicitly approves changing the scope.
6. **User abandons remediation.** If the user explicitly chooses to give up on the loop rather than remediate ("drop it", "abandon", "good enough"), open one more cycle with `Intent: stop` + `Next: close`, then re-enter Phase 4 and take the close-without-verify branch below. The failed verify entry stays in place; do not delete or rewrite it.

**On user-explicit close without verify** — the user can close the loop before the verify gate passes ("I'm dropping this", "good enough", "abandon this loop"):

1. Read `## Handoff cues` `Dirty or unvalidated state`. If anything other than `none`, surface it to the user and ask: commit, stash, discard, or leave for the next loop. Record the user's choice in `Close summary`.
2. Set frontmatter `status: done`.
3. Write a real `Close summary`.
4. Set `Verify link: n/a`.
5. Add the close-without-verify-only lines from `templates/loop.md`: `Close-without-verify reason: <reason>` and `Unfinished items: <what still matters>`.
6. Skip the verify gate. This is a deliberate user choice, not a verify-gate pass.

## Delegation to Sub-Agents

When sub-agents are available, the parent may delegate a bounded slice within a cycle (recon, research, focused validation, adversarial review, pressure-test interviews, one-part implementation). The parent still owns the loop and every route decision; the child returns a summary, the parent integrates it into the cycle's evidence and updates `loop.md`.

**Delegate when:**

- The task has a clear input, output, and stop condition.
- Fresh context will find different things than the parent's accumulated context (recon, second-opinion review).
- Multiple bounded slices can run in parallel without touching the same code path.
- A required capability that interviews the user (e.g., `pressure-test`) needs to run without interrupting the parent's session.

**Do not delegate:**

- The whole loop. Phase decisions, alignment, gate passes, and route changes stay with the parent.
- Anything that needs the loop's accumulated context.
- User approval moments — the user's explicit approval of a loop plan or part plan reaches the parent, not a child.

**Rules:**

- Children never mutate `loop.md` directly. They return text; the parent writes the cycle entry and refreshes living state.
- One writer at a time for implementation on the same code path. Two children racing on the same files produces incoherent diffs.
- Each delegation has a clear input, output, and stop condition. "Look at the codebase and figure things out" is too open; "find every call site of `Foo.bar` and report each as file:line with context" is bounded.
- If a child returns nothing useful (empty, off-topic, or below the stop condition), record the cycle's `Evidence` as `Delegation returned no usable output: <one-line reason>`, set `Next: validate` or `Next: back up`, and decide whether to redelegate with tighter inputs or take the move directly.

## Chat output shape

Every chat reply the agent posts during a loop opens with this five-line block, then the detail below. The block is the headline a project-owner reader gets at a glance; file paths, diffs, and tool output belong beneath it for anyone who wants to dig.

```
**Done:** <one line — concrete action and outcome>
**Why:** <one line — how this advances the loop's goal, not just the cycle's intent>
**Where we are:** <part + phase + status: running | paused | awaiting approval | blocked | done>
**Risk or surprise:** <one line, or `none`>
**Needs from you:** <decision | approval | info | nothing — continuing>
```

Rules:

- One line per field. No bullet lists inside the block.
- If a field has nothing to report, state that explicitly (`none`, `nothing — continuing`). Do not omit the line.
- `Why` links to the loop goal, not the cycle intent. "Probing whether option A holds" is the cycle intent. "Option A is the cheapest path to the destination, so the loop hinges on it" is the loop-goal why.
- `Where we are` cites the active part id and the phase, e.g. `P2 — Phase 3, mid-cycle 4` or `P1 — Phase 2 alignment, awaiting plan approval`.
- `Needs from you` is the only field that may resolve to `nothing — continuing`. If anything else is true — a decision is open, an approval is pending, a zoom-out checkpoint is firing — name it.
- The block applies to every chat message during a loop: cycle reports, approval asks, zoom-out checkpoint asks, route-shift surfacing, verify summary, close summary. The only exception is the bare creation announcement at Phase 1 step 9, which keeps its existing one-line form.

## Operating rules

Cross-cutting invariants. Phase-specific behavior lives in the phase sections above; this list is the short reference.

- Resolve capability bindings at loop start. Required missing capabilities block; conditional capabilities are evaluated only at the phase that needs them; suggested missing capabilities do not block. Never silently skip a required call.
- One writer at a time per code path. Append-only logs (`## Bar history`, `## Route shifts`, `## Decisions`, `## Cycles`, `## Verified outcomes`) are never rewritten — except for the documented mid-cycle interrupt recovery in Phase 1, which completes one partial cycle entry in place. Living-state sections (`## Goal`, `## Why`, `## Constraints`, `## Non-negotiables`, `## Definition of done`, `## Loop plan`, `## Current route`, `## Current focus`, `## Current bar`, `## Parts`, `## Part alignment`, `## Evidence digest`, `## Handoff cues`, `## Outcome`) are overwritten in place.
- **Multi-section transition rule.** Some transitions in this skill say "single atomic write" or "same write" when they touch two sections of `loop.md` (e.g., flipping a part `aligning → doing` updates both `## Part alignment` and `## Parts`). The safety the rule guarantees is: the file never crosses a session boundary or a user interrupt in a half-flipped state. Implementation: complete both writes within a single agent turn. Either use Write to rewrite the whole file in one call, or use two consecutive Edit calls in the same turn — the file may be transiently inconsistent between those two tool calls, but it must never be left inconsistent when the turn ends or the agent yields control. Do not split a multi-section transition across turns.
- **Single-current-part invariant.** Exactly one part is `aligning` or `doing` while the loop is between Phase 2 alignment and Phase 4 close. The other parts are `todo` or `done`. The invariant may transiently hold "all parts done" only between the moment a part flips to `done` and the next atomic write that either (a) flips a `todo` to `aligning` or (b) writes `Next: close`. Two parts in `aligning` simultaneously is never allowed; multi-part planning happens sequentially.
- When the user pivots mid-loop ("actually, I'm thinking about X", "what if we tried Y"), treat it as a goal-reframe signal until proven otherwise. Stop the current cycle, surface the pivot, and re-run the alignment gate if the goal shifted. Do not silently absorb the pivot as a part-plan tweak.
- **User-claim verification.** When the user states something is broken, wrong, missing, or different from what the agent believes, test the claim before disagreeing. Run the command, read the file, inspect the state. If the test result contradicts the user, do not dismiss. Report: the exact command run, the files read with paths and line ranges, what the agent observed. Then ask: "Is the test you wanted me to do different from what I did?" Never tell the user their claim is wrong without showing the test work and inviting correction. This rule overrides any anchoring from a prior pressure-test or grilling pass — surviving a grilling does not make a plan or belief immune to evidence the user can see now.
- Done loops are never reopened. If continued work is needed, create a new loop and reference the closed one in `## Starting point`.
- No `status: done` without a passing verify entry, unless the user explicitly closes scope without verify.
- Legal values inlined throughout this skill mirror `templates/loop.md`. If either changes, update the other.
