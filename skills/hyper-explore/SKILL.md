---
name: hyper-explore
description: >
  Runs the explore phase of a Hyper task. Clarifies the user's goal, scans the codebase for relevant files and patterns, classifies scope (quick, feature, or research), and writes an approved exploration.md with findings and a proposed approach. Use when a Hyper task is in the 'explore' phase (check task.md frontmatter), or when the user wants to investigate a problem before implementing. Invoked by the `hyper` skill — not user-facing. Keywords: hyper, explore, investigate, clarify, approach, scope, exploration.md.
user-invocable: false
---

# hyper-explore

You are in the **explore** phase of a Hyper task. The goal: understand what the user actually wants, figure out what already exists, and agree on an approach — in one interactive session.

This phase runs first on every task. No code gets written until the user approves the approach.

## Inputs

- Task folder at `.hyper/tasks/T<N>-<slug>/` with `task.md` already created
- Any existing `exploration.md` (if resuming after revision requests)

## Outputs

- `exploration.md` with **Findings** + **Approach** when `bugfix: false`, or the bugfix structure (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list) when `bugfix: true`. One artifact filename in either case.
- `task.md` frontmatter updated: `scope: quick | feature | research` (and `bugfix: true` when detected). You **do not** write `phase:` or `awaiting:` — `hyper` owns those. You return a verdict instead.
- A verdict to `hyper` per `../hyper/reference/gates.md`: `awaiting-input` while open questions remain, `awaiting-approval` once the artifact is ready for user approval, `phase-complete` on approval.

## Flow

```
read task.md
  │
  ├── surface / elicit end goal if needed (optional Why, not a gate)
  │
  ├── clarify the goal (if needed)
  │
  ├── detect bugfix intent (keywords + attached artifacts); set bugfix flag
  │
  ├── classify scope (quick / feature / research)
  │
  ├── scan the codebase — facts, not opinions
  │
  ├── framing check
  │
  ├── if bugfix ─► bugfix sub-flow (symptom evidence → repro classification →
  │                 recent changes (regressions) → hypothesis with acceptance
  │                 proof → disproven ledger → N=3 distinct-falsifications
  │                 hard stop with escalation bundle)
  │
  ├── draft approach (or Recommendation for research)
  │
  ├── write exploration.md (bugfix structure when flag set, otherwise Findings/Approach)
  │
  ├── serialize any open questions (return `awaiting-input` while pending)
  │
  └── return `awaiting-approval` to `hyper`
```

## Step 1 — Surface the end goal, then clarify the goal

If `task.md` already has a `## Why` section, leave it alone and use it as context. If it does not, treat that as missing context, not malformed state.

Before settling the approach, make sure you understand the end goal behind the requested change — what problem the user is trying to solve, what outcome they want, or what they are optimizing for.

- **If the end goal is already clear from `task.md`**, carry that understanding into exploration. You may optionally persist it under `## Why` if that would help future readers, but do not reshape the file just to satisfy structure.
- **If the end goal is not clear enough to reason well about alternatives,** ask one question focused on outcome, not implementation: *"What's the end goal here — what problem are we solving or what are we optimizing for?"* Stop and wait for the answer.
- **If the user answers with useful end-goal context,** carry it into `exploration.md` and optionally persist it under `## Why` on `task.md` if that would help future readers.
- **If the user declines, is unsure, or gives no additional context,** continue anyway. Missing Why is not a gate.

Then read the task body. Classify it into exactly one of the four branches below. Each branch has an explicit test for fit and a worked example so the classification is checklist-driven, not feel-driven.

- **Clear** — the task body names all three of: a **surface** (file path, function name, endpoint, behavior), the **change** ("rename X to Y", "return 401 instead of 403", "add a `--dry-run` flag"), and at least one **success signal** (an observable outcome that says the change worked).
  - *Worked example:* "Rename `validateUser` to `assertUser` in `src/auth/guards.ts` so the name reflects that it throws on failure." Surface (`src/auth/guards.ts:validateUser`), change (rename to `assertUser`), success signal (function name in source matches the new identifier).
  - *Action:* skip clarification, continue to scope classification.

- **One likely interpretation** — surface and goal are present, but exactly one detail is ambiguous, and a single reading dominates the alternatives by code, convention, or the user's stated goal.
  - *Worked example:* "Add rate limiting to the login endpoint." Surface (login endpoint), goal (rate limiting) are clear; ambiguous detail is the limit shape (per-IP vs per-user, fixed window vs sliding), but per-IP fixed-window is the dominant first-pass choice for a login endpoint.
  - *Action:* state the reading and ask one confirmation question: *"I read this as X. Sound right?"*

- **Multiple plausible interpretations** — two or more readings would lead to materially different file-level changes, and the body does not pick one. No reading clearly dominates.
  - *Worked example:* "Make the dashboard faster." Could mean caching, query optimization, lazy-loading, pagination, or memoization — no shared file set across the alternatives.
  - *Action:* ask *one* multiple-choice question that recommends the option with the strongest evidence (e.g. the slow query named in the body) and gives a one-line reason. Use numbered + lettered shorthand (1A, 1B, …).

- **Vague / no goal** — the body states a problem, a wish, or a feeling without naming a surface, a specific change, or a success signal.
  - *Worked example:* "The login flow is confusing." No surface (which step?), no specific change (UI? copy? error messages?), no success signal (less drop-off? fewer support tickets?).
  - *Action:* summarize your understanding in four bullets — your read of the surface, the change shape, the success signal, and what's missing — and ask the user to correct.

When a branch action requires a question, never ask more than one clarification question per message. Stop and wait for the answer. When you get it, continue.

### Step 1b — Detect bugfix intent

Bugfix intent is *orthogonal to scope*: a one-line bugfix is still `quick`, a structural bugfix is still `feature`. The `bugfix` flag on `task.md` frontmatter (default `false`) selects a root-cause-first sub-flow later in this skill.

Scan the task body for bugfix keywords: *bug, fix, regression, broken, error, crash, failing, repro, stack trace, exception*.

Also check for attached-artifact signals that imply a defect even without the keywords:

- Pasted stack traces.
- Failing-test output blocks (assertion failures, test-runner summaries).
- Issue-tracker links (GitHub, Linear, Jira).
- Phrases like "used to work", "worked before X", "regressed after Y".

**Tiered rule.** Classify the bugfix signal into one of three strengths and act accordingly. The goal is to keep the routing question off the critical path on strong-signal cases so Step 1's substantive clarification, when needed, owns the first turn.

- **Strong signal — silent flag-set, no routing question.** Set `bugfix: true` on `task.md` silently and continue. Strong signal is any one of:
  - any artifact signal alone (pasted stack trace, failing-test output block, issue-tracker link, or a "used to work / regressed after X" phrase), OR
  - any bugfix keyword combined with at least one corroborating piece of evidence anywhere in the body — a code path, a file name, a stated symptom, or a pasted error message.

  The user can still flip `bugfix: false` later by saying so during the substantive clarification turn or before approval.

- **Borderline signal — ask the routing question.** A single weak keyword in an otherwise unrelated body (for example, a feature request that mentions "bug-tracking"), with no artifact signals and no corroborating evidence. Ask exactly one confirmation question:

  > *"This reads as a bugfix/regression — should I route through the root-cause-first sub-flow? (yes / no)"*

  On **yes**, write `bugfix: true`. On **no** or no reply, leave `bugfix: false`. Two turns is acceptable for the rare borderline + ambiguous combination — Step 1's substantive clarification, if any, follows on the next dispatch.

- **No signal — silent default.** Leave `bugfix: false` and ask nothing.

When Step 1 also wants a clarification question, Step 1's substantive question wins the first turn — strong-signal bugfix flag has already been set silently above, and the borderline routing question, if any, is asked on the next dispatch.

**Mid-explore flip.** If the user later reveals bugfix intent (a clarification turn surfaces it, or new context arrives), flip `bugfix` to `true` and restart at the bugfix sub-flow (Step 3.5). Preserve existing `exploration.md` content via rewrite-over-patch when the template switches — carry forward resolved questions and any evidence already collected.

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

**Framing check (after the scan, before drafting or bugfix sub-flow).** Once the scan is done — or, for bugfix tasks, before any bugfix-specific evidence collection — briefly restate the user's framing of the problem and name one plausible alternate framing the evidence suggests: a different root cause, a different surface to change, a different goal the symptom might be pointing at. If the alternate survives the evidence, raise it as a clarification and wait for the user to pick a direction. If the evidence does not support an alternate, record the framing check in a single sentence ("Framing check: no alternate survives the scan") and continue. The user's ask is a hypothesis, not a directive — this check exists so you do not blindly implement the first framing when the code is telling you to solve a different problem. Running it *before* the bugfix sub-flow means a wrong framing does not burn hypothesis budget.

## Step 3.5 — Bugfix sub-flow (only when `bugfix: true`)

**No-edit rule.** *This sub-flow produces evidence, hypotheses, and a proposed fix — never patches. Code edits belong in implement.*

Skip this entire section when `bugfix: false`.

1. **Collect symptom evidence.** Ask the user for logs, stack trace, or failing-test output. Store raw artifacts in the task folder at `evidence/<slug>.<ext>` (e.g. `evidence/stacktrace-login.txt`, `evidence/failing-test.log`) and link them from `exploration.md` by relative path. **Do not paste long dumps into the prose** — linked artifacts only. This fences against context poisoning from multi-kilobyte log blocks.

2. **Classify repro status** as one of `deterministic | intermittent | no-repro`:

   - `deterministic` — an exact command, test, or step sequence reproduces the failure every time. Record the command.
   - `intermittent` — the failure occurs sometimes. Require a **run matrix** (attempts × outcomes) and a suspected **flake axis** from `timing | state | environment | ordering`. This is the primary fence against retry storms.
   - `no-repro` — the failure cannot yet be reproduced. Require a written **rationale** and the **next evidence source** to collect. Do not block progress; evidence may legitimately be unavailable.

3. **Recent changes / Working reference** (regressions only). Record the last-known-good behavior (commit, release, date, or user report) and the most relevant code/config/env delta since then. Regressions are often diffable in minutes; this is a fast discriminator. Omit the section for fresh defects.

4. **Form a single written root-cause hypothesis.** One active hypothesis at a time. Alongside it, inline the **acceptance proof** artifact: the specific failing test that will turn green, or the repro command whose output must change. The acceptance proof is what "fixed" means, written down before the fix.

5. **Maintain a disproven-hypothesis ledger.** Append-only. Every entry has these five structured fields:

   - `hypothesis` — the statement under test.
   - `minimal_experiment` — the smallest read-only or runtime check that would falsify it.
   - `observed_result` — what actually happened.
   - `artifact_path` — relative path to the evidence that supports the conclusion.
   - `conclusion` — why the hypothesis is disproven.

   When a hypothesis falsifies, move it to the ledger and write the next one under "Root-cause hypothesis".

6. **Hard stop at N=3 *distinct* falsified hypotheses.** State verbatim in the artifact and honor it here:

   > *A rerun with no new hypothesis, no new instrumentation, and no new evidence does not count as a falsification and does not consume the budget.*

   Only distinct falsifications — each backed by a new experiment, new instrumentation, or new evidence — count toward N.

7. **On hard stop, emit an escalation bundle.** Append a `## Pause — reframe required` section to `exploration.md` containing:

   - **Evidence-packet summary** — what artifacts have been collected and what they show.
   - **`repro_status`** — current classification (`deterministic | intermittent | no-repro`).
   - **Disproven-hypothesis ledger reference** — point to the existing ledger section; do not duplicate its contents.
   - **Most-likely-remaining branch** — pick exactly one from `code | environment | data | test-harness | architecture`.
   - **One concrete ask of the user** — the single specific question or action that would unblock.

   Then return verdict `awaiting-input` to `hyper` with the concrete ask as your summary. `hyper` sets `task.md` `awaiting: user-input` and surfaces the ask. The hard stop is a speed bump with full context, not a lockout — the user can inspect the ledger and direct the next move.

After Step 3.5 completes (hypothesis forms, survives, and a proposed fix is ready), continue to Step 4.

## Step 4 — Draft the approach

For **quick** tasks: two or three sentences describing the change and the files involved.

For **feature** tasks: one or two paragraphs covering:
- What you'll change (files, modules)
- Why this approach over alternatives (name at least one alternative even if you immediately rule it out)
- Any new abstractions, dependencies, or test changes
- Trade-offs the user should know about

For **research** tasks: this section becomes **Recommendation**. Structured around the actual research question, with evidence from the code and external sources where relevant. End with a clear recommendation.

**YAGNI applies to speculative feature scope, not to the robustness of the code you are actually building** — validation at boundaries and error-path handling are part of the asked-for change, not scope widening.

## Step 5 — Write `exploration.md`

Use the shape in `templates/exploration.md` (bundled with this skill). It has four H2 sections — **Findings**, **Approach**, **Files to change**, and **Out of scope** — plus an optional **Open questions** H2 section. The bugfix template uses the same H2 standalone shape; both templates are aligned.

**Template routing.** The artifact written to the task folder is always `exploration.md`. When `task.md` has `bugfix: true`, use the body structure from `templates/exploration-bugfix.md` (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list — see `skills/hyper/reference/data-model.md` § exploration.md for the schema); otherwise use `templates/exploration.md` (Findings + Approach). Both templates are source files in this skill, not artifact names; the output filename stays `exploration.md` in either case. Scope rules for the **Files to change** and **Out of scope** sections (same rules apply across both templates):

- **quick scope** — keep both sections. `exploration.md` is the only artifact, so the file list and out-of-scope note live here.
- **feature scope** — omit both sections. They move into `spec.md` (acceptance criteria + subtasks carry the file list; spec owns "Out of scope").
- **research scope** — rename **Approach** to **Recommendation**, omit "Files to change", keep "Out of scope" (existing rule preserved).

If any assumption in the approach could change the design depending on the user's answer, add a `## Open questions` section listing one question per list item. Prefer surfacing the assumption as an explicit question over burying it as a hidden default.

## Step 6 — Serialize open questions

If `exploration.md` has no `## Open questions` section, or the section is empty, skip to Step 7.

Otherwise, work through the questions one at a time, following these rules:

- **One question per message.** Never batch. Ask Q1 as your return summary, return verdict `awaiting-input` to `hyper`, and stop. `hyper` sets `task.md` `awaiting: user-input` and relays the question.
- On the next dispatch (triggered by the user's reply), present the question verbatim from the file. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand ("1A", "1B", …), mark one option as the recommendation, and give a one-line reason grounded in the task, code, or the user's stated goal.
- When the user answers, record the answer under the question in `exploration.md` (indented bullet or a short paragraph beneath the list item — the artifact must stay the durable record of both question and answer).
- If the user requests changes to the approach or asks a meta question instead of answering, treat it like any other "requests changes / asks a question" response: stop the loop, revise, and restart Step 6 with the updated questions.
- Move to the next unanswered question. If any remain, return `awaiting-input` again.

**Rewrite over patch — with preservation.** If an answer or a change request reframes the problem rather than filling in a detail, rewrite `exploration.md` cleanly instead of patching it into coherence. Pivots during explore are normal; a rewrite clarifies the new framing in a way that accretive edits cannot. When you rewrite, carry forward: (a) every resolved question with its answer, (b) a short note explaining why the framing shifted. The artifact must stay the durable record of both the prior direction and the pivot.

Once every question has an answer, rename the section heading from `## Open questions` to `## Resolved questions` (or delete the section entirely if the answers are already captured in the approach). Then proceed to Step 7.

## Step 7 — Request approval

Tell the user, in one tight approval message:

- `Wrote exploration.md. Scope: <quick|feature|research>.`
- A concise chat-readable synopsis of the artifact: the highest-signal findings plus the proposed approach (or the recommendation for research scope), including any notable trade-offs the user should weigh before approving.
- `Approve to continue, or tell me what to change.`

The summary should be enough for the user to approve or push back without opening `exploration.md`. Keep it tight — `exploration.md` remains the durable record.

Return verdict `awaiting-approval` to `hyper`. `hyper` sets `task.md` `awaiting: user-approval` and stops. Do not write `phase:` or `awaiting:` yourself.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. Explore emits:

- `awaiting-input` — open questions remain (normal open-questions loop or bugfix hard-stop).
- `awaiting-approval` — `exploration.md` is ready for user approval.
- `phase-complete` — the user approved on a re-dispatch. `hyper` reads `scope:` and advances per its transition table: `plan` for feature, `implement` for quick, `done` + archive for research. You do not touch `phase:` or run the archive.

On a user reply that requests changes, revise `exploration.md` (rewrite-over-patch for reframes; preserve resolved questions + pivot note) and return `awaiting-approval` again. On a direct question, answer it inline and return `awaiting-approval` with the artifact unchanged.
