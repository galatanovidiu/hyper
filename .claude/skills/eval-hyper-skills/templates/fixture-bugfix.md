---
id: F<N>-<slug>
skill: <skill-name>
expected_scope: feature
expected_bugfix: true
expected_first_response: clarify
ambiguity: low
---

# F<N> — <short title of the bug>

A bug-report fixture. Tests whether the skill detects bugfix intent, flips `bugfix: true`, switches to the bugfix template, and produces the required bugfix sections (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list).

## Dispatch utterance

> <The user's bug report — include enough signal (keywords, "broken", "regression", error excerpt) that the skill should detect bugfix intent. Don't make it too clean; real bug reports include a stated hypothesis and partial repro.>

## task.md (input state)

```markdown
---
id: T<N>
slug: <slug>
phase: <phase>
awaiting: skill
created: <YYYY-MM-DD>
---

# <Bug title>

<Multi-paragraph description of the bug, including a stated hypothesis if the user has one. Include error messages, stack trace excerpts, or steps if available — these are exactly the signals the bugfix sub-flow expects.>
```

## Why this fixture

- **Bugfix signals are <explicit | implicit | mixed>.** <One sentence about which signals the skill should pick up.>
- **<Scope reasoning>** — explain why scope is `feature` (vs `quick`) for this bug. SKILL.md says size is not the criterion; if the bug is non-trivial in surface area, it's `feature`.
- **<Evidence shape>** — what artifacts the skill should store under `evidence/<slug>.<ext>` and link from the artifact rather than inlining.
- **<Hypothesis-handling>** — does the user state a hypothesis? The skill should record it but not assume it's correct.

## Expected behaviour

1. **Turn 1 — clarify.** Skill returns `awaiting-input` with one focused question. <What specifically.>
2. **Turn 2 — write.** User answers. Skill stores any large evidence under `evidence/`, writes `<artifact>.md` using the bugfix template:
   - `## Repro status` — <expected classification: deterministic | intermittent | no-repro> with rationale.
   - `## Root-cause hypothesis` — current hypothesis + acceptance proof artifact (the failing test or repro command that turns green when fixed).
   - `## Disproven-hypothesis ledger` — empty or with whatever was ruled out during the scan.
   - `## Acceptance proof` — what would prove the fix.
   - `## Unchanged-behavior list` — what should keep working.

   Sets `scope: feature` and `bugfix: true` on `task.md`. Returns `awaiting-approval`.
3. **Turn 3 — approve.** User approves. Skill returns `phase-complete`.

## Failure modes the rubric should catch

- Uses the regular template (Findings/Approach) and ignores the bugfix flag entirely. Critical — axis 2 catches.
- Sets `bugfix: true` but is missing one of the five required bugfix sections.
- Inlines a multi-kilobyte error dump or stack trace into the artifact instead of linking to `evidence/<slug>.<ext>`. The SKILL.md flags this as context poisoning. Soft signal.
- Treats the user's stated hypothesis as confirmed without evidence — the methodology says hypothesis, not fact.
- Asks three or more clarifying questions when one would do.

## Canned user replies

- **Turn 2 input** (answering the clarifying question): "<text the harness sends>."
- **Turn 3 input**: "Approved."