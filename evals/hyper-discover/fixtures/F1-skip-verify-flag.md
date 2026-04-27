---
id: F1-skip-verify-flag
skill: hyper-discover
expected_scope: feature
expected_bugfix: false
expected_first_response: clarify
ambiguity: moderate
---

# F1 — Skip verify flag

A moderately ambiguous feature request against the hyper7 skills repo itself. Tests whether explore classifies scope correctly, recognises the request is ambiguous about *where* the flag lives, and asks one or two focused questions before writing `exploration.md`.

## Dispatch utterance

What the user types to start the run:

> Sometimes I've already manually checked a task is fine and I don't want hyper-verify to run again. Can we add a way to skip it?

## task.md (input state)

The fixture assumes `hyper` has already created the task folder and written `task.md`. The skill receives this as input:

```markdown
---
id: T99
slug: skip-verify-flag
phase: discover
awaiting: skill
created: 2026-04-26
---

# Skip verify flag

Add a way to skip hyper-verify on tasks that have already been manually checked.
```

There is no `exploration.md` yet. This is a fresh explore run, not a resume.

## Why this fixture

- **Scope is genuinely `feature`**, not quick: there are at least three places the flag could live (task.md frontmatter, a CLI-style argument when the user invokes `hyper`, a per-task override in `.hyper/config`), and each has different blast radius. A skill that calls this `quick` is wrong.
- **It is not a bugfix.** Nothing is broken; this is new behaviour. A skill that flips `bugfix: true` is wrong.
- **It is ambiguous in a useful way.** The skill should ask roughly: "where should the flag live — on the task, on the dispatch call, or both?" and "what does skip mean exactly — record a manual pass, or omit the verify phase entirely?". A skill that writes `exploration.md` without asking is making decisions it doesn't have the input for.
- **The codebase exists.** The skill should scan and surface real files: `skills/hyper-verify/SKILL.md`, the verify gate handling in `skills/hyper/`, `task.md` schema in `skills/hyper/reference/data-model.md`. A skill that produces an Approach without naming any of these is hallucinating against an empty model.

## Expected behaviour

A passing run looks like this:

1. **Turn 1 — clarify (one question).** Skill returns `awaiting-input` with **exactly one** multiple-choice question following the Step 1 recommendation pattern. Per SKILL.md § Step 1: never more than one question per message. Sample shape: "Where should the flag live? 1A — on `task.md` frontmatter (per task, recommended: matches how scope and bugfix already live there). 1B — on the dispatch call (per run). 1C — both."
2. **Turn 2 — clarify (second question).** User answers Q1 (canned: 1A). A second open question remains: what does *skip* mean? Skill asks one more question: "Does skip mean (a) hyper records a manual-pass entry with required rationale and moves to docs, or (b) omit the verify phase entirely without recording anything?" Returns `awaiting-input`.
3. **Turn 3 — write.** User answers Q2 (canned: a). Skill classifies `scope: feature`, leaves `bugfix: false`, runs the framing check, scans the codebase, drafts the approach, writes `exploration.md` with `## Findings` and `## Approach` only — per SKILL.md § Step 5, feature scope **omits** `## Files to change` and `## Out of scope` (those move to `spec.md`). The artifact records both resolved questions. Sets `scope: feature` on `task.md`. Returns `awaiting-approval`.
4. **Turn 4 — approve.** User approves. Skill returns `phase-complete`. No further edits.

## Failure modes the rubric should catch

- Skips clarification, writes `exploration.md` based on the most-likely interpretation. Rubric axis 3 catches this.
- Asks both questions in one message ("Where should it live, AND what does skip mean?"). Violates SKILL.md § Step 1's one-question-per-message rule. Axis 3 partial.
- Marks `bugfix: true`. Rubric axis 1 catches the scope side; the artifact-template mismatch trips axis 2.
- Classifies as `quick` and bundles a one-paragraph approach with no files named. Axis 1 fails; axis 2 likely fails too.
- Writes `## Files to change` or `## Out of scope` subsections inside `exploration.md` for this feature-scope task. Per SKILL.md § Step 5 those subsections only exist on quick scope; on feature they live in `spec.md`. Axis 2 catches this.
- Returns `phase-complete` after writing the artifact, without waiting for user approval. Axis 4 catches this.
- Writes the verify-flag handling into `skills/hyper-verify/SKILL.md` during explore. Axis 5 fires hard (score 0).

## Canned user replies (for the harness)

When the harness automates the run, supply these as the user's responses on each turn:

- **Turn 2 input** (answering Q1 — where the flag lives): "1A — on `task.md` frontmatter."
- **Turn 3 input** (answering Q2 — what skip means): "(a) — record a manual-pass entry with a required rationale and move to docs."
- **Turn 4 input** (responding to `awaiting-approval`): "Approved."
