---
name: hyper-code-review
description: >
  Reviews a diff through three ordered sub-passes — spec compliance, bug-finding, and standards compliance — followed by a validation step that drops unconfirmed findings. Produces a single `## review` markdown block with a `pass | needs-changes | blocked` verdict. Works in two modes: embedded (invoked by `hyper-verify` against the current task's diff, output inlined into `checks.md`) and standalone (user-invoked, creates and archives a `code-review`-scoped task as the durable record for an arbitrary diff — any branch, PR, staged change, or set of files — and can later promote critical findings into a bugfix task when warranted). Cross-agent: parallelism is opportunistic, not required. Keywords: hyper, code review, review, bugs, security, standards, spec compliance, validation, diff, PR review.
user-invocable: true
---

# hyper-code-review

You run a structured code review of a diff. Three ordered passes plus a validation step, one markdown block out. Embedded mode returns a verdict to its caller; standalone mode archives the review record and reports the outcome. The review has no opinions on style or speculative concerns — only spec drift, real bugs, and documented-rule violations.

## Before you start

Read `../hyper/reference/worker-guardrails.md` before any pass runs. Its four rules (G1–G4) are normative for this dispatch in both embedded and standalone mode — treat them as rules of the session, not background reading.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before reading or writing `.hyper/` paths. Review diff, code, and test commands still run in the current working tree; durable review records, `.hyper/rules.md`, and promoted bugfix tasks use the Hyper state root.

## Two modes

This skill runs in one of two modes. Pick the mode from how you were invoked, not from a flag on disk.

- **Embedded.** Invoked by `hyper-verify` as part of the verify phase of an existing Hyper task. A caller hands you the task folder path and the diff scope; you write the `## review` block directly into that task's `checks.md` (overwriting any prior `## review` section) and return a short summary plus the rolled-up verdict. You never create a task, never talk to the user, never write `task.md`. The verify skill owns the opt-out gate, the rollup across tests/review/QA, and the verdict returned to `hyper`.
- **Standalone.** A user invoked this skill directly to review some piece of code. You create a new task with `scope: code-review` and `phase: review`, run the review against whatever the user pointed at (current diff, PR, branch comparison, staged files, specific paths), write `checks.md` in the task folder, and archive that task as the durable review record. If the user later wants a follow-up bugfix task, this skill can seed one from the critical findings (see **Promotion to bugfix** below).

Mode selection:

- If the user's current turn is the direct invocation (`/hyper-code-review …` or equivalent) and there is no active Hyper task context being handed to you, you are in **standalone** mode.
- If `hyper-verify` dispatched you with a task folder and a diff command, you are in **embedded** mode.

The three review passes and the validation step are identical in both modes. Only the surrounding wrapper differs.

## Inputs

### Embedded mode

The caller (`hyper-verify`) provides:

- Absolute task folder path (`.hyper/tasks/T<N>-*/`).
- A diff command scoped to the change under review (typically `git diff HEAD`; may be a range like `git diff <base>...<head>` on feature branches).
- The current scope of the parent task (`quick` or `feature`) — determines whether `spec.md` exists.

Read `exploration.md` and, for feature scope, `spec.md` from the task folder before any pass runs. For feature scope, the per-subtask `## Completion` sections in `T<N>.<M>-<slug>.md` files are a useful review companion. Read `.hyper/rules.md`, `AGENTS.md` (project and user levels, plus any language/platform addenda they point to), and the project's `CLAUDE.md` before running 2c.

### Standalone mode

Ask the user what to review if it is not clear from the initial message. One round-trip. Accept any of these diff shapes:

- `git diff HEAD` — the working copy vs. last commit (uncommitted work, including untracked files listed by `git status --short`).
- `git diff --cached` — staged changes.
- `git diff <base>...<head>` — a branch or feature compared to its base.
- `gh pr diff <N>` — a specific GitHub PR.
- File paths — review a specific set of files as-if-new (the "diff" is the full contents).
- A commit range — `git show <sha>` or `git diff <sha1>..<sha2>`.

If the user's message is ambiguous (e.g. "review my code"), ask once: *"What should I review? Options: current uncommitted diff, staged changes, a branch vs main, a PR number, or specific files."* Otherwise default to `git diff HEAD` and name that default in the task body so the user can correct.

There is no `spec.md` in standalone mode — 2a collapses to: *is there an explicit contract to check the diff against?* If the user provided acceptance criteria in their invocation message, use those. Otherwise skip 2a and run only 2b and 2c.

Always read `.hyper/rules.md` (if present), project `AGENTS.md`, `~/AGENTS.md` and its addenda, and the project's `CLAUDE.md` before 2c.

## Outputs

### Embedded mode

- A single `## review` block in the caller's `checks.md`, written per the shape in `../hyper-verify/templates/checks.md`. Overwrite any prior `## review` section on the same `checks.md` — the file represents current state, not history.
- A return summary to the caller including the combined review verdict (`pass | needs-changes | blocked`), the count of findings per severity, and the one-line rationale for blocked criticals if present.
- See `../hyper/reference/worker-guardrails.md` (G1) for the `task.md` orchestration boundary. You do **not** return a `redirect target:` verdict. That is the caller's job.

### Standalone mode

- An archived task folder at `.hyper/archive/T<N>-<slug>/` containing `task.md` (with `scope: code-review`, `phase: done`, `bugfix: false`) and `checks.md` with only a `## review` section. No `exploration.md`, no `spec.md`, no subtask files, no `## tests` or `## qa`.
- No verdict is returned to `hyper` in standalone mode. This skill owns the archive step for the review record it created.

## Before any pass — look at the diff

Look at the actual diff before you start any pass. Know what changed, in which files, and what the shape of the change is.

```bash
<diff command>
git status --short    # embedded mode only — untracked files are part of the change
```

Include untracked files in your mental model whenever they are in the diff scope. Do not re-read all of the pre-existing project code — review the diff, not the file.

## False-positive blocklist

The reviewer must not flag any of the following as findings in 2a, 2b, or 2c:

- Pre-existing issues not touched by this diff (reinforces the "Review the diff, not the file" rule).
- Issues the project's linter, type-checker, or formatter would catch. The reviewer has no reason to re-verify what the tooling covers.
- Subjective style suggestions (naming preferences, formatting variations).
- Issues already silenced in code via documented suppressions (e.g. `// eslint-disable-line`, `@phpstan-ignore` with a reason).
- Speculative input-dependent concerns ("could break if someone passes X") without concrete evidence in the diff.
- General coverage or testing concerns not called out as an acceptance criterion in `spec.md` (embedded mode) or the user's stated contract (standalone mode).
- In standalone mode with no explicit contract, any 2a finding at all — without a contract there is no spec to drift from.

The blocklist targets noise, not genuine context. A reviewer may still mention a blocklisted item as `note` severity when there is a specific, stated reason to surface it — but never as `warning` or `critical`.

## Parallelism

2a always runs first. 2b and 2c are independent: they read the same diff but write to different sub-sections of the `## review` block, so they may be dispatched concurrently on harnesses that reliably support parallel subagent dispatch (Claude Code, and any agent SDK exposing a comparable primitive). Harnesses without reliable parallel dispatch — Codex CLI, Gemini CLI, PI, Aider, Continue, and any inline-only mode — run 2b and 2c sequentially in the same session.

Mirrors the Claude `code-review` plugin's four-agents-in-parallel pattern (agents 1+2 for standards, agents 3+4 for bugs), but without a hard dependency on model tiers (Haiku/Sonnet/Opus) that do not exist off Claude. Use whichever model or subagent primitive the host harness offers; if none, run inline.

Whenever a 2b or 2c sub-agent is dispatched, include a pointer to `skills/hyper/reference/worker-guardrails.md` in the dispatch prompt so the sub-agent inherits the same G1–G4 rules. Inline runs do not need a separate pointer — this session already read the reference at start.

On a harness with a Task-tool primitive (Claude Code and equivalents), the concrete dispatch shape is one Task-tool call per pass with `subagent_type: general-purpose`. Use this prompt template — the portable "invoke the skill" wording stays the baseline; this is the concrete form for harnesses that have it:

```
Load the `hyper-code-review` skill and run pass <2b | 2c> against this diff:

  <diff command, e.g. git diff HEAD or git diff <base>...<head>>

Parent task folder (embedded mode only; omit for standalone):

  <absolute path to .hyper/tasks/T<N>-*/>

Read `skills/hyper/reference/worker-guardrails.md` first — its G1–G4 rules
apply to this dispatch.

Run only the named pass (do not run 2a, the other sub-pass, or validation).
Return the findings list for your pass in the exact markdown shape shown
under `## Pass <2b | 2c>` in the skill file. Do not write to `checks.md` —
the caller merges the sub-pass outputs and runs validation.
```

Send one Task call per selected pass in the same message so they run concurrently. Wait for both to return before running validation. On harnesses without the Task primitive, run 2b and 2c inline in sequence and skip this template.

The validation step (below) always runs after 2b and 2c finish, regardless of how they were dispatched.

## Pass 2a — Spec compliance (runs first, gates 2b and 2c)

Read the diff against `spec.md` (feature scope) or, for quick-scope tasks with no `spec.md`, the implicit acceptance criteria from `exploration.md`'s Approach section. In standalone mode, use the user-supplied contract if any; otherwise skip this pass (no contract to drift from).

One question: **does the diff implement the contract?**

Look for:

- Missing acceptance criterion — listed in the contract but not visible in the diff.
- Partially implemented criterion — present but doesn't satisfy the contract (wrong shape, wrong behavior, missing edge case the contract called out).
- Scope creep — code in the diff that isn't covered by any acceptance criterion or `## Done when` line.
- For feature scope, also cross-check each subtask file's `## Done when` against the diff.

This pass does **not** cover whether the code is sound — that's 2b. It does **not** cover whether the code follows project standards — that's 2c. It does **not** cover whether the running behavior matches the contract — that belongs to QA (the caller's responsibility in embedded mode; out of scope in standalone mode). Only the static read of the diff against the contract.

Severities here collapse to two values:

- **blocker** — any real spec mismatch. Per the principle that ordering matters, every spec drift blocks 2b and 2c and bounces the task back to implement (embedded mode) or surfaces as a blocker to the user (standalone mode).
- **note** — observation worth flagging that stays inside the contract.

Record as:

```markdown
### Spec compliance

**Verdict:** pass | blocked

- **[blocker]** `<criterion or path:line>` — <which acceptance criterion is unmet, how>. **Fix:** <how>.
- **[note]** `<...>`

<If no findings: "Diff matches spec.md acceptance criteria." In standalone mode without a contract: "Skipped — no explicit contract provided.">
```

**If 2a verdict is `blocked`:** write the spec compliance section, write the bug-finding and standards compliance sub-section bodies as `**Verdict:** skipped — spec compliance blocked.` with no findings list, set the combined review verdict to `blocked`, and stop the review. Do not run 2b, 2c, or validation. In embedded mode the caller will return `redirect target: implement` to `hyper`; in standalone mode you still return the review to the user and the user decides what to do.

## Pass 2b — Bug-finding (runs only when 2a passes or is skipped)

Read the diff again, this time for soundness. Scope: correctness, robustness, security, data-loss risk, crash paths. Architecture and hygiene belong in 2c, not here.

**Correctness**
- Error paths handled? `JSON.parse` in a try/catch? External call with no timeout?
- Off-by-one, null/undefined cases, race conditions?
- Logic that will produce wrong results on real inputs?

**Robustness**
- External input validated at the boundary (not trusted three layers in)?
- Errors surfaced loudly — thrown, returned, or logged — never silently swallowed or turned into empty defaults?
- Failure paths complete? No stub returns, no `// TODO handle this`, no early return that leaves the system in a half-written state?
- Boundary and edge-case behavior present: empty input, max size, unexpected shape, unreachable-on-happy-path branch?

**Security** (any code touching external input or output)
- Input sanitized / validated at the boundary?
- SQL parameterized, never interpolated?
- Output escaped in the correct context?
- Secrets absent from code and logs?
- File paths validated against traversal?

**High-signal criteria for `critical`.** A finding in 2b may be recorded at `critical` severity only if it meets at least one of:

- (a) the code fails to compile, parse, or type-check;
- (b) the code definitely produces wrong results regardless of inputs;
- (c) the code is exploitable via a named attack path (e.g. SQL injection through unparameterized input, path traversal via an unvalidated file name, command injection via unescaped shell arguments).

A suspected bug that does not meet (a), (b), or (c) must be recorded as `warning` or `note`, not `critical`. Warnings and notes stay speculative — the reviewer may flag probable issues at those severities without meeting the high-signal bar.

This pass does **not** cover whether the diff matches the contract — that's 2a. It does **not** cover architecture, hygiene, or project-rule compliance — that's 2c. It does **not** cover whether the running behavior matches the contract — that belongs to QA (not owned here). Only correctness, robustness, security, and crash/data-loss risk in the code as written.

Each finding has a severity:

- **critical** — exploitable vulnerability, data-loss risk, crash path, or correctness bug that will break behavior. Blocks completion.
- **warning** — real problem worth fixing before merging. Does not block.
- **note** — observation, suggestion, small improvement.

Record as:

```markdown
### Bug-finding

**Verdict:** pass | needs-changes | blocked

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff shows no correctness, robustness, or security issues.">
```

A `blocked` verdict in 2b does not short-circuit 2c — the two passes are independent and both write their findings before the combined verdict is rolled up.

## Pass 2c — Standards compliance (runs only when 2a passes or is skipped)

Read the diff a third time, this time for conformance to project standards. Scope: architecture (layer boundaries, speculative abstractions, duplication/extraction), hygiene (debug code, commented-out blocks, dead code), and project-rule compliance against the rule sources loaded above.

Rule sources:

- `.hyper/rules.md` — project-local Hyper rules.
- `AGENTS.md` at project root and at user level (`~/AGENTS.md`), plus any language/platform addenda each points to (for PHP, JS/TS, WordPress, etc.).
- The project's `CLAUDE.md` if present.

Look for:

**Architecture**
- Layer boundaries respected? No HTTP helpers in core logic, no DB access from presentation?
- New abstractions actually needed, or speculative?
- Duplication that should have been extracted? Extraction that should have been duplication?

**Hygiene**
- Debug code, commented-out blocks, `console.log`, `var_dump`, dead branches, stray `TODO`s left behind?
- Provenance leaks in new or changed lines? Any file in the diff — code, comments, docs, config, generated content — must not carry absolute local paths (`/Users/...`, `/home/...`, `~/Projects/...`), external or predecessor repo names, or concrete historical task ids from an internal workflow (e.g. `T39`, `T40.2` as real references, not as format examples). Placeholder ids and paths taught as format (`T<N>`, `T1`, `T1.3`, `/path/to/thing`) are not findings. Severity `warning` by default; `critical` when the change is explicitly user-facing distribution content (public README, published doc) or an absolute filesystem path that would fail on any other machine.

**Project rules**
- Conventions from the rule sources that the diff breaks — naming, structure, forbidden patterns, workflow rules, etc.

**Every finding in 2c must cite a specific rule by file path and quoted text.** The format is `<file path>: "<quoted rule text>"`. If you cannot cite a rule, it is not a standards violation — either it belongs in 2b (if it is a real bug) or it is out of scope for review. An architectural observation with no cite-able rule is not a 2c finding.

This pass does **not** cover whether the diff matches the contract — that's 2a. It does **not** cover correctness, robustness, or security — that's 2b. It does **not** cover whether the running behavior matches the contract — that belongs to QA. Only conformance to documented project standards.

Each finding has a severity:

- **critical** — a standards violation severe enough to block (e.g. a hard "never do X" rule broken, a forbidden pattern shipped). Blocks completion.
- **warning** — a standards violation worth fixing before merging. Does not block.
- **note** — observation, minor drift, small improvement.

Record as:

```markdown
### Standards compliance

**Verdict:** pass | needs-changes | blocked

- **[critical]** `<path>:<line>` — <what's wrong>. Rule: `<rule file>`: "<quoted rule text>". **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>. Rule: `<rule file>`: "<...>".
- **[note]** `<path>` — <...>. Rule: `<rule file>`: "<...>".

<If no findings: "No findings. Diff follows project standards and documented rules.">
```

## Validation (runs after 2b and 2c finish)

Before the combined review verdict is computed, validate every finding collected by 2b and 2c. This is the accuracy pass: its job is to cut false positives before the user sees them. Mirrors step 5 of the Claude `code-review` plugin — "validate that the stated issue is truly an issue with high confidence".

**Scope.** Validation applies to every finding from 2b and 2c regardless of severity (`critical`, `warning`, or `note`). 2a findings are not validated — spec compliance is a direct comparison against the contract and a second read would be redundant.

**Mechanism.** For each finding, re-examine the diff plus the surrounding context and answer one question: *"Is this claim true with high confidence?"* "High confidence" means you can point to the specific lines or behavior that make the finding true — not just a plausible concern. Apply the same filters the sub-passes did: the false-positive blocklist above, and (for 2b `critical` findings) the high-signal criteria. A finding that now looks blocklisted, or a `critical` that no longer meets (a)/(b)/(c), does not hold up.

**Drop, don't demote.** Findings that do not hold up under the second read are dropped entirely. Do not demote a non-confirmed `critical` to `warning` or `note` — if the claim is not true with high confidence, it is out.

**On parallel-capable harnesses**, validation runs as a single pass over the combined 2b + 2c findings list after both sub-passes finish. Do not attempt to run validation concurrently with 2b or 2c — validation reads the findings they produce. If the harness supports it, validation of independent findings may be dispatched as parallel subagents (one per finding), matching the Claude plugin's "parallel subagents to validate" pattern in its step 5. Whenever a per-finding validation sub-agent is dispatched, include a pointer to `skills/hyper/reference/worker-guardrails.md` in the dispatch prompt so it inherits the same G1–G4 rules.

**Effect on sub-pass verdicts.** The combined review verdict is computed on the post-validation findings set: whatever survives validation is what counts toward each sub-pass verdict. If validation drops every `critical` from 2b, 2b's verdict becomes `pass`. Likewise for 2c.

**No trace of dropped findings.** Dropped findings are not recorded in `checks.md`. They are not logged, listed, or counted anywhere in the written output. The whole point of validation is a clean report; the rationale for a drop exists only in your reasoning during the pass. If the user asks why something was dropped, the conversation can discuss it — the durable artifact stays clean.

**User override.** If the user reads `checks.md` and believes a validated finding is wrong (because they know context the agent does not), they can push back on the next turn. In embedded mode the existing `redirect target: implement` path handles the override. In standalone mode the user can say so directly.

## Combined review verdict

Write the top-level `**Verdict:**` on the `## review` block as the worst of 2a, 2b, and 2c, ranked `blocked` > `needs-changes` > `pass`. The 2b and 2c verdicts used here are the post-validation verdicts — computed on the findings set that survived validation. 2a is not validated, so its verdict enters the rollup as-written.

- `blocked` if any sub-pass is `blocked`.
- `needs-changes` if at least one sub-pass is `needs-changes` and no sub-pass is `blocked`.
- `pass` if all sub-passes are `pass` (or skipped without blocking).

## Writing the `## review` block

Use the exact shape from `../hyper-verify/templates/checks.md`. The skill and the template agree on the layout so embedded-mode output drops into `checks.md` cleanly.

In **embedded mode**, the block is one section of a larger `checks.md` that also carries `## tests`, `## qa`, and (on feature tasks) `## docs`. You write only the `## review` section; the caller owns the rest and the top-level `**Overall:**` rollup.

In **standalone mode**, the `checks.md` you write has no other sections. Write a top-level header that mirrors the feature-task shape but with only the review block:

```markdown
# Checks — T<N>: <title>

**Overall:** pass | needs-changes | blocked
**Date:** <YYYY-MM-DD>
**Mode:** standalone code review

## review

<the review block per the template>
```

`**Overall:**` in standalone mode equals the review verdict — there is no tests/QA/docs to roll up against.

## Standalone mode — step by step

Fresh dispatch (`/hyper-code-review …` with no existing task in play):

1. **Capture what to review.** Ask the user if the diff target is unclear; otherwise use the default (`git diff HEAD`) and say so in the task body. Acceptable inputs listed under **Inputs → Standalone mode**.
2. **Derive a title.** Short human-readable description of the review target. Examples: *"Review PR #412"*, *"Review uncommitted diff"*, *"Review feat/payments branch vs main"*, *"Review src/auth/ files"*.
3. **Allocate a task id.** Scan `.hyper/tasks/` and `.hyper/archive/` for the highest `T<N>` across both and use `T<N+1>`. Never reuse ids.
4. **Create the task folder.** `.hyper/tasks/T<N>-<slug>/` with a kebab slug derived from the title (lowercase, hyphens, ~40 chars).
5. **Write `task.md`.** Frontmatter: `id`, `title`, `phase: review`, `scope: code-review`, `created` (current local datetime in `YYYY-MM-DDTHH:MM:SS` form, e.g. `2026-04-21T14:35:00`), `bugfix: false`, `awaiting: null`. Body: one paragraph naming the review target (the exact diff command or PR number) and, if the user provided explicit acceptance criteria, a short `## Contract` section capturing them verbatim.
6. **Run the review.** Follow passes 2a → 2b → 2c → validation above. 2a is skipped (or uses the `## Contract`) since there is no `spec.md`.
7. **Write `checks.md`.** Top-level header plus the single `## review` block as shown under **Writing the `## review` block**.
8. **Archive the review task and report the outcome.** See **Standalone completion** below.

### Standalone completion

After the review is written, archive the standalone review task immediately. It is a durable review record, not an in-progress workflow task.

- Set `task.md` `phase: done`.
- Run the archive move so the folder lives under `.hyper/archive/`.
- Then surface the outcome to the user:
  - **Review verdict `pass`** — *"T<N> review complete. No findings. Review archived."*
  - **Review verdict `needs-changes` or `blocked`** — *"T<N> review complete. <one-line summary>. Review archived. If you want, I can promote the critical findings into a bugfix task."*

### Promotion to bugfix

When the user explicitly asks to promote a standalone review's critical findings, create a new bugfix task seeded from the archived code-review record.

1. Allocate the next task id (`T<M>`) by the same scan rule used in step 3 above.
2. Create `.hyper/tasks/T<M>-<slug>/task.md` with frontmatter:
   - `id: T<M>`
   - `title: Fix findings from T<N>` (or a more specific title if the critical findings cluster around one symptom)
   - `phase: discover`
   - `scope: unknown` (discover will classify)
   - `created: <current local datetime in YYYY-MM-DDTHH:MM:SS form, e.g. 2026-04-21T14:35:00>`
   - `bugfix: true`
   - `awaiting: null`
3. Body: one paragraph naming the source review (`Seeded from code review T<N>. See .hyper/archive/T<N>-<slug>/checks.md for the full review.`) plus a copy of the critical findings (not warnings or notes) as the symptom evidence. If the findings already cite file:line references, preserve them.
4. Announce: *"Promoted T<N> review findings to T<M> — <title>. Starting discover phase."*
5. Leave the archived code-review task in place as the source record. Do not reopen it.

The code-review task stays archived on promotion — it has served its purpose. The bugfix task is independent work with its own full phase flow (`discover → …`).

## Embedded mode — step by step

Called by `hyper-verify` during the verify phase:

1. Load the task folder path and diff command handed to you.
2. Read `exploration.md` and (if feature scope) `spec.md`, plus the subtask files.
3. Run the diff command; look at `git status --short` too.
4. Read the rule sources (`.hyper/rules.md`, `AGENTS.md` at project and user level and their addenda, `CLAUDE.md`).
5. Run pass 2a. If blocked, write the `## review` block per the stop rule and return to the caller with verdict `blocked`.
6. Otherwise run passes 2b and 2c (parallel-capable or sequential per harness).
7. Run validation over the combined 2b + 2c findings.
8. Compute the combined review verdict. Write the `## review` block into the caller's `checks.md`, overwriting any prior `## review` section.
9. Return to the caller: verdict (`pass | needs-changes | blocked`), a one-line summary, and the finding counts per severity. The caller (`hyper-verify`) rolls this up against tests and QA and returns the overall verdict to `hyper`.

You do not prompt the user in embedded mode. You do not create tasks. You do not write `task.md`. You do not return `redirect target: implement` — that is the caller's decision.
