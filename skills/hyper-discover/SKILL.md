---
name: hyper-discover
description: >
  Turn an unclear request into an approved approach. Clarifies the user's intent, scans the code for facts, challenges the framing, classifies scope, triages bugfixes through a falsification-budgeted root-cause sub-flow, and writes an exploration.md the user must approve before any code is written. First phase of a Hyper task.
user-invocable: false
---

# hyper-discover

Turn an unclear request into an approved approach — in one interactive session.

> **No code edits in this phase. The user is the approval gate.**

This is the first phase of every Hyper task. The skill clarifies what the user actually wants, scans the codebase for facts, challenges the framing when evidence suggests a different problem, classifies scope, and — for bugfix intent — runs a root-cause-first sub-flow with a falsification budget. The output is an `exploration.md` the user must approve before any implementation begins.

## Inputs

- Task folder at `.hyper/tasks/T<N>-<slug>/` with `task.md` already created
- Any existing `exploration.md` (if resuming after revision requests)

## Outputs

- `exploration.md` with **Findings** + **Approach** when `bugfix: false`, or the bugfix structure (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list) when `bugfix: true`. One artifact filename in either case.
- `task.md` frontmatter updated: `scope: quick | feature | research` (and `bugfix: true` when detected). You **do not** write `phase:` or `awaiting:` — `hyper` owns those. You return a verdict instead.
- A verdict to `hyper` per `../hyper/reference/gates.md`: `awaiting-input` while open questions remain, `awaiting-approval` once the artifact is ready for user approval, `phase-complete` on approval.

## Flow

```
read task.md → surface end goal → clarify goal (if needed) →
detect bugfix intent → classify scope → scan codebase → framing check →
[if bugfix: Step 3.5 sub-flow] → draft approach → write exploration.md →
Step 5.5 self-review → serialize open questions (awaiting-input loop) →
return awaiting-approval
```

## Step 1 — Surface the end goal, then clarify the goal

Before settling the approach, make sure you understand the end goal — what problem the user is solving, what outcome they want, what they are optimizing for. If `task.md` already has a `## Why`, use it. If not, and the end goal is not clear enough to reason well about alternatives, ask one outcome-focused question (*"What's the end goal here — what problem are we solving or what are we optimizing for?"*) and wait. Carry the answer into `exploration.md` and optionally persist it under `## Why` on `task.md`. If the user declines or has no additional context, continue — missing Why is not a gate.

Then read the task body and classify it into exactly one of the four branches below. Each branch has an explicit test for fit and a one-line action; worked examples live in the reference file linked at the end.

- **Clear** — the task body names a **surface** (file path, function name, endpoint, behavior), the **change**, and at least one **success signal**. *Action:* skip clarification, continue to scope classification.

- **One likely interpretation** — surface and goal are present, but exactly one detail is ambiguous and a single reading dominates by code, convention, or stated goal. *Action:* state the reading and ask one confirmation question (*"I read this as X. Sound right?"*).

- **Multiple plausible interpretations** — two or more readings would lead to materially different file-level changes; no reading clearly dominates. *Action:* ask *one* multiple-choice question with a recommended option and a one-line reason, using numbered + lettered shorthand (1A, 1B, …).

- **Vague / no goal** — the body states a problem, wish, or feeling without naming a surface, specific change, or success signal. *Action:* summarize your understanding in four bullets (surface, change shape, success signal, what's missing) and ask the user to correct.

When a branch action requires a question, never ask more than one clarification question per message. Stop and wait for the answer. When you get it, continue.

→ see `reference/clarification-branches.md` for one worked example per branch.

### Step 1b — Detect bugfix intent

Bugfix intent is orthogonal to scope. The `bugfix` flag on `task.md` frontmatter (default `false`) selects the root-cause-first sub-flow in Step 3.5. Apply the tiered detection rule: **strong signal** (any artifact signal alone — pasted stack trace, failing-test output, issue-tracker link, "used to work / regressed after X" — or a bugfix keyword corroborated by a code path, file name, symptom, or error message) silently sets `bugfix: true`; **borderline signal** (a single weak keyword in an otherwise unrelated body) asks one routing confirmation; **no signal** leaves `bugfix: false` silently. Step 1's substantive clarification always wins the first turn.

If the user later reveals bugfix intent during clarification, flip `bugfix` to `true` and restart at Step 3.5, preserving prior `exploration.md` content via rewrite-over-patch.

→ see `reference/bugfix-flow.md` § "Detecting bugfix intent" for keyword and artifact lists, the full tiered rule, and the mid-discover flip details.

## Step 2 — Classify scope

Pick one:

- **quick** — one file (or a few related lines), easily reversible, clear single change, no new abstractions. Examples: rename, typo fix, config tweak, one-line bug fix, small refactor inside one function.
- **feature** — anything else that produces code changes. Multiple files, new abstractions, test changes, non-trivial behavior.
- **research** — investigation, audit, comparison, feasibility study. No code changes expected. Terminates at `exploration.md` with findings + recommendation.

**Size is not the criterion.** A one-line change to auth, payments, or migrations is *not* quick. Quick means *impact is small enough that the plan phase adds no value*.

When in doubt, choose `feature`.

Write the scope into `task.md` frontmatter (`scope: quick | feature | research`).

## Step 3 — Scan the codebase

For non-bugfix tasks, use your search/read tools to find what matters:

- Files the change will touch
- Existing patterns to follow (how similar things are done elsewhere)
- Conventions (naming, structure, where tests live)
- Related code that might break

Go as deep as the scope demands. For `quick`, a few targeted searches are enough. For `feature`, read the relevant modules end-to-end. For `research`, be thorough — this is the work.

**Facts only here.** No design decisions yet. If you find something surprising or undocumented, note it.

For bugfix tasks (`bugfix: true`), the generic scan is replaced by Step 3.5 — the sub-flow internally covers file/pattern discovery as needed for root-cause investigation. Run the framing check below first, then jump to Step 3.5.

**Framing check (after the scan, before drafting or the bugfix sub-flow).** Briefly restate the user's framing and name one plausible alternate framing the evidence suggests — a different root cause, a different surface, a different goal the symptom might be pointing at. If the alternate survives the evidence, raise it as a clarification and wait. Otherwise record one sentence ("Framing check: no alternate survives the scan") and continue. The user's ask is a hypothesis, not a directive; running this *before* the bugfix sub-flow means a wrong framing does not burn hypothesis budget.

## Step 3.5 — Bugfix sub-flow (only when `bugfix: true`)

Triggered when `task.md` has `bugfix: true`. **No code edits in this sub-flow** — it produces evidence, hypotheses, and a proposed fix; patches belong in implement. The hard stop is at **N=3 *distinct* falsified hypotheses**: a rerun with no new hypothesis, instrumentation, or evidence does not count and does not consume the budget.

→ see `reference/bugfix-flow.md` for the full sub-flow (steps 1–7, the no-edit rule, the N=3 hard-stop quote, and the escalation-bundle shape).

After Step 3.5 completes (hypothesis forms, survives, and a proposed fix is ready), continue to Step 4.

## Step 4 — Draft the approach

For **quick** tasks: two or three sentences describing the change and the files involved.

For **feature** tasks: one or two paragraphs covering:
- What you'll change (files, modules)
- Why this approach over alternatives — propose 2–3 approaches with trade-offs and an explicit recommendation explaining why the chosen approach wins. Strawmen don't count — every alternative must be one a competent reviewer would consider.
- Any new abstractions, dependencies, or test changes
- Trade-offs the user should know about

For **research** tasks: this section becomes **Recommendation**. Structured around the actual research question, with evidence from the code and external sources where relevant. End with a clear recommendation.

**YAGNI applies to speculative feature scope, not to the robustness of the code you are actually building** — validation at boundaries and error-path handling are part of the asked-for change, not scope widening.

## Step 5 — Write `exploration.md`

The output filename is always `exploration.md`. Body structure depends on `bugfix`: use `templates/exploration-bugfix.md` (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list — schema in `skills/hyper/reference/data-model.md` § exploration.md) when `bugfix: true`, otherwise `templates/exploration.md` (Findings, Approach, Files to change, Out of scope, optional Open questions).

Scope rules for the **Files to change** and **Out of scope** sections apply to both templates:

- **quick** — keep both. `exploration.md` is the only artifact.
- **feature** — omit both. They move into `spec.md`.
- **research** — rename **Approach** to **Recommendation**, omit "Files to change", keep "Out of scope".

If any assumption in the approach could change the design depending on the user's answer, add a `## Open questions` section, one question per list item. Surface the assumption as an explicit question rather than burying it as a hidden default.

## Step 5.5 — Self-review the artifact

Before serializing open questions or requesting approval, re-read `exploration.md` from disk with fresh eyes. Scan for:

- **Placeholders.** Any `TBD`, `TODO`, or "to be determined" left over from drafting? Fill them in or convert to an explicit Open Question.
- **Contradictions.** Do any sections disagree? Does the Approach contradict a Finding?
- **Ambiguity.** Could a stated criterion be read two materially different ways? Pick one reading and make it explicit.
- **Scope drift.** Is the proposed approach significantly larger than the task body asked for? Trim back to what was asked, or surface the drift as an Open Question.

Fix issues inline. No need to re-review — just fix and continue. This step exists because the user is the approval gate, not the proofreader.

## Step 6 — Serialize open questions

If `exploration.md` has no `## Open questions` section, or the section is empty, skip to Step 7.

Otherwise, work through the questions one at a time, following these rules:

- **One question per message.** Never batch. Ask Q1 as your return summary, return verdict `awaiting-input` to `hyper`, and stop. `hyper` sets `task.md` `awaiting: user-input` and relays the question.
- On the next dispatch (triggered by the user's reply), present the question verbatim from the file. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand ("1A", "1B", …), mark one option as the recommendation, and give a one-line reason grounded in the task, code, or the user's stated goal.
- When the user answers, record the answer under the question in `exploration.md` (indented bullet or a short paragraph beneath the list item — the artifact must stay the durable record of both question and answer).
- If the user requests changes to the approach or asks a meta question instead of answering, treat it like any other "requests changes / asks a question" response: stop the loop, revise, and restart Step 6 with the updated questions.
- Move to the next unanswered question. If any remain, return `awaiting-input` again.

**Rewrite over patch — with preservation.** If an answer or a change request reframes the problem rather than filling in a detail, rewrite `exploration.md` cleanly instead of patching it into coherence. Pivots during discovery are normal; a rewrite clarifies the new framing in a way that accretive edits cannot. When you rewrite, carry forward: (a) every resolved question with its answer, (b) a short note explaining why the framing shifted. The artifact must stay the durable record of both the prior direction and the pivot.

Once every question has an answer, rename the section heading from `## Open questions` to `## Resolved questions` (or delete the section entirely if the answers are already captured in the approach). Then proceed to Step 7.

## Step 7 — Request approval

Tell the user, in one tight approval message:

- `Wrote exploration.md. Scope: <quick|feature|research>.`
- A concise chat-readable synopsis of the artifact: the highest-signal findings plus the proposed approach (or the recommendation for research scope), including any notable trade-offs the user should weigh before approving.
- `Approve to continue, or tell me what to change.`

The summary should be enough for the user to approve or push back without opening `exploration.md`. Keep it tight — `exploration.md` remains the durable record.

Return verdict `awaiting-approval` to `hyper`. `hyper` sets `task.md` `awaiting: user-approval` and stops. Do not write `phase:` or `awaiting:` yourself.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. The discover phase emits:

- `awaiting-input` — open questions remain (normal Step 6 loop or bugfix Step 3.5 hard-stop).
- `awaiting-approval` — `exploration.md` is ready for user approval after Step 5.5 self-review and Step 7's approval message.
- `phase-complete` — the user approved on a re-dispatch. `hyper` reads `scope:` and advances per its transition table: `plan` for feature, `implement` for quick, `done` + archive for research. You do not touch `phase:` or run the archive.

On a user reply that requests changes, revise `exploration.md` (rewrite-over-patch for reframes; preserve resolved questions + pivot note) and return `awaiting-approval` again. On a direct question, answer it inline and return `awaiting-approval` with the artifact unchanged.
