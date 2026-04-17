# Prompt Blocks

Reusable XML blocks that prompt templates compose. Each block defines a structural
boundary for the teammate model. Use blocks selectively — not every template needs
every block.

## How to Use

Prompt templates reference blocks by XML tag name. The lead agent fills placeholders
when building the prompt (Step 6 of the team workflow).

---

## `<context>`

**When to use:** Every prompt. Provides the teammate with project and task awareness.

```xml
<context>
<project>{PROJECT_NAME} — {PROJECT_DESCRIPTION}</project>
<branch>{CURRENT_BRANCH} (base: {BASE_BRANCH})</branch>
<git_state>
{GIT_DIFF_STAT}
</git_state>
<files>
{FILE_CONTENTS}
</files>
<task_context>{TASK_ID}: {TASK_TITLE} — {TASK_DESCRIPTION}</task_context>
</context>
```

Only include `<task_context>` when running inside a Hyper task. Only include `<files>`
when the task type requires full file contents (research, verify). For reviews, the
diff in `<git_state>` is usually sufficient.

---

## `<target>`

**When to use:** Every prompt. Defines exactly what the teammate should focus on.

```xml
<target>
{TARGET_DESCRIPTION}

Scope: {SCOPE_BOUNDARIES}
</target>
```

Examples:
- Code review: "Review the changes on branch `feat/auth` against `main`. Focus on the 3 changed files."
- Research: "How does the caching layer invalidate entries when a task is completed?"
- Verify: "Confirm that all REST endpoints validate nonces before processing."

---

## `<constraints>`

**When to use:** Every prompt. Grounds the teammate in project conventions.

```xml
<constraints>
<coding_standards>
{STANDARDS_SUMMARY}
</coding_standards>
<project_conventions>
{CONVENTIONS}
</project_conventions>
<additional>
{CUSTOM_INSTRUCTIONS}
</additional>
</constraints>
```

Fill `<coding_standards>` from the project's linter config, AGENTS.md, or CLAUDE.md.
Fill `<project_conventions>` from observed patterns (naming, structure, testing).
Fill `<additional>` with any user-provided instructions for this specific run.
Omit `<additional>` if there are no custom instructions.

---

## `<output_contract>`

**When to use:** Every prompt. Ensures consistent, parseable output across providers.

### Code Review

```xml
<output_contract>
Structure your response exactly as follows:

## Critical Issues
For each: file path with line number, current behavior, problem (exact mechanism),
suggested fix. Zero is valid — do not fabricate issues.

## Major Issues
Same format as critical. Significant problems that should be fixed before merge.

## Minor Issues
Brief description with file:line references.

## Strengths
Patterns, decisions, or implementations done well.

## Overall Assessment
2-3 sentences. Would you approve this change? Single most important thing to address.
</output_contract>
```

### Design Review

```xml
<output_contract>
Structure your response exactly as follows:

## Architectural Concerns
For each: what is wrong, why it matters, evidence from the codebase.

## Alternative Approaches
For each: description, tradeoffs vs current approach, effort estimate.

## Failure Modes
Scenarios where the current design breaks. Include trigger conditions.

## Recommendation
Approve, rethink, or conditional approval with specific changes.
</output_contract>
```

### Research

```xml
<output_contract>
Structure your response exactly as follows:

## Summary
1-3 sentence answer to the research question.

## Findings
For each finding: description, evidence (file:line), confidence level.

## Patterns
Recurring patterns or conventions discovered.

## Gaps
Areas where information is missing or unclear.

## Recommendations
Actionable next steps based on findings.
</output_contract>
```

### Verify

```xml
<output_contract>
Structure your response exactly as follows:

## Verdict
One of: CONFIRMED | PARTIALLY TRUE | INCORRECT | CANNOT VERIFY

## Evidence
For each piece of evidence: file:line, what it shows, how it supports the verdict.

## Explanation
How the evidence leads to the verdict. Address nuances.

## Caveats
Limitations of the verification. What could change the verdict.
</output_contract>
```

---

## `<review_focus>`

**When to use:** Code review. Defines the 7 areas the reviewer must examine.

```xml
<review_focus>
Examine the changes across these 7 areas:

1. **Correctness** — Does the code do what it claims? Logic errors, off-by-one
   mistakes, race conditions, incorrect assumptions.
2. **Architecture** — Is the design sound? Are responsibilities well-separated?
   Are there better structural approaches?
3. **Security** — Authentication, authorization, input validation, injection
   vectors, data exposure, CSRF, XSS.
4. **Performance** — N+1 queries, missing caching, unnecessary computation,
   unbounded loops, scaling bottlenecks.
5. **Standards** — Does the code follow the project's coding standards and
   conventions?
6. **Risks** — What could go wrong in production? Edge cases, failure modes,
   data loss scenarios.
7. **Completeness** — Gaps, missing error handling, untested paths, TODO items
   left unaddressed.
</review_focus>
```

---

## `<design_focus>`

**When to use:** Design review. Defines the 7 dimensions the reviewer must evaluate.

```xml
<design_focus>
Evaluate the design across these dimensions:

1. **Structural soundness** — Are responsibilities clearly separated? Does the
   design follow SOLID principles? Are abstractions at the right level?
2. **Assumptions** — What does the design take for granted? Which assumptions
   break under scale, concurrency, or changed requirements?
3. **Tradeoffs** — What was traded away for the current approach? Was the
   tradeoff conscious and justified, or accidental?
4. **Failure modes** — How does the system behave when things go wrong? Partial
   failures, cascading errors, data corruption paths, recovery procedures.
5. **Alternatives** — What other approaches could solve this problem? For each,
   describe the approach, its tradeoffs versus the current design, and the
   migration effort.
6. **Extensibility** — How hard is it to add the next feature? Does the design
   paint itself into a corner or leave room for growth?
7. **Operational cost** — Deployment complexity, monitoring requirements,
   debugging difficulty, on-call burden.
</design_focus>
```

---

## `<review_method>`

**When to use:** Code review and design review. Instructs the reviewer how to
approach the analysis — actively adversarial, evidence-based.

### Code Review variant

```xml
<review_method>
Actively try to disprove the change.
Look for violated invariants, missing guards, unhandled failure paths, and
assumptions that stop being true under stress.
Trace how bad inputs, retries, concurrent actions, or partially completed
operations move through the code.
Report only material findings — no style feedback, naming nitpicks, or
speculative concerns without evidence.
</review_method>
```

### Design Review variant

```xml
<review_method>
Challenge every design decision. For each choice, ask: what was the alternative,
and why was it rejected? If the answer is not evident from the codebase, flag it.
Trace data flow end-to-end. Identify where state is shared, where consistency
is assumed, and where the design relies on ordering guarantees.
Think about what happens in year two: new team members, changed requirements,
10x data volume. Which parts of the design survive?
</review_method>
```

---

## `<grounding_rules>`

**When to use:** Every prompt. Prevents hallucination and speculation.

```xml
<grounding_rules>
Every claim must reference a specific file and line number from the codebase.
Do not present inferences as facts — label hypotheses explicitly.
If required context is missing, state what is unknown rather than guessing.
Do not fabricate file paths, function names, or line numbers.
When uncertain, say so — a verified "I don't know" is better than a plausible lie.
</grounding_rules>
```

---

## `<verification_loop>`

**When to use:** Every prompt. Forces self-check before finalizing.

```xml
<verification_loop>
Before finalizing your response:
1. Re-read the target and confirm every finding addresses it.
2. Verify each file:line reference is accurate (re-check the source).
3. Remove any finding you cannot back with concrete evidence.
4. Check that the output matches the output_contract structure exactly.
5. If any check fails, revise — do not submit the first draft.
</verification_loop>
```

---

## `<operating_stance>`

**When to use:** Code review, design review. Sets the adversarial tone.

```xml
<operating_stance>
You are a skeptical senior engineer reviewing work you did not write.
Assume bugs exist until proven otherwise. Challenge design decisions.
After finding the first issue, look for second-order failures: empty-state
behavior, retry storms, stale state, rollback paths, and error propagation.
Do not soften findings. A missed critical bug costs more than hurt feelings.
</operating_stance>
```

---

## `<attack_surface>`

**When to use:** Code review. Directs attention to high-risk areas.

```xml
<attack_surface>
Prioritize these areas when reviewing:
1. Input boundaries — user input, API parameters, file uploads, environment variables
2. State transitions — database writes, cache invalidation, status changes
3. Error paths — catch blocks, fallback logic, timeout handling, partial failures
4. Auth and access — permission checks, token validation, role boundaries
5. Data flow — what crosses trust boundaries, what gets serialized/deserialized
6. Concurrency — shared state, race conditions, lock ordering
</attack_surface>
```

---

## `<action_safety>`

**When to use:** Reserved for future writable tasks (implement, refactor). Not used in v1.

```xml
<action_safety>
Keep changes tightly scoped to the stated task.
Do not touch files outside the target scope.
No unrelated refactors, renames, or cleanup unless required for correctness.
Flag any risky or irreversible action before taking it.
If unsure whether a change is in scope, stop and state the ambiguity.
</action_safety>
```
