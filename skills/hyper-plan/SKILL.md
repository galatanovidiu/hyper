---
name: hyper-plan
description: Runs the plan phase of a feature-scope Hyper task. Turns the approved exploration.md into a spec.md with independently-testable acceptance criteria, a vertical-slice subtask checklist, out-of-scope list, and known edge cases. Sets an approval gate for the user to review before implementation starts. Use when a Hyper task is in the 'plan' phase. Runs only for feature-scope tasks (quick and research tasks skip planning). Keywords: hyper, plan, spec, acceptance criteria, subtasks, checklist, spec.md.
user-invocable: false
---

# hyper-plan

You are in the **plan** phase. The explore phase produced an approved approach. Your job is to translate it into a spec the implement phase can follow without further interpretation.

This phase runs only for `scope: feature` tasks. Quick tasks skip to implement. Research tasks end at explore.

## Inputs

- `task.md` (phase=plan)
- `exploration.md` (approved)

## Outputs

- `spec.md` with acceptance criteria + subtask checklist
- `task.md` frontmatter: `awaiting: user-approval`
- Phase stays at `plan` until the user approves

## Flow

```
re-read exploration.md
  │
  ├── write acceptance criteria (testable)
  │
  ├── break work into subtasks (vertical slices, each independently verifiable)
  │
  ├── list out-of-scope + edge cases
  │
  ├── write spec.md
  │
  ├── serialize any open questions (one per message, record answers in the file)
  │
  └── set awaiting: user-approval and stop
```

## Step 1 — Re-read `exploration.md`

Start fresh from the approved approach. Do not rely on memory from when you drafted it. Read it from disk and treat it as the source of truth.

If the exploration approach is vague about implementation details, that's fine — the spec is where details get nailed down. Do not go back and rewrite exploration.

## Step 2 — Acceptance criteria

Write testable statements that define "done". Each criterion must be independently verifiable — either by running a command, clicking something, or checking an output.

**Good:** *"POST /auth/login with valid credentials returns 200 and a JSON body containing a JWT."*

**Bad:** *"User can log in."* — not testable. What does "can" mean? What's the success signal?

Aim for 3–7 criteria. If you have more, you probably have multiple tasks bundled together; consider splitting.

## Step 3 — Subtasks

Break the work into a checklist. Each item is a vertical slice — a chunk of work that can be verified on its own and implemented in roughly one sitting.

**Vertical (good):**
```
- [ ] T<N>.1 — Add bcrypt dependency + password hashing to User model (write unit test)
- [ ] T<N>.2 — Add POST /auth/login endpoint with credential check (integration test)
- [ ] T<N>.3 — Add login form component + wire to endpoint (manual verify)
```

**Horizontal (bad):**
```
- [ ] Write all models
- [ ] Write all routes
- [ ] Write all UI
```

Horizontal decomposition leaves subtasks that cannot be independently verified — the first slice doesn't actually work until the last slice lands.

Number subtasks as `T<N>.1`, `T<N>.2`, … where `T<N>` is the parent task id. If a subtask depends on another being done first, note it:

```
- [ ] T5.3 — Wire login endpoint (depends on T5.1, T5.2)
```

**Minimum: one subtask.** If the work is genuinely one atomic change, fine — one subtask. But never zero.

**Maximum: match the approach's complexity.** If you end up with 12 subtasks for a "feature" that exploration described in two paragraphs, something is wrong. Push back on the decomposition or revisit exploration with the user.

## Step 4 — Out-of-scope + edge cases

Write two more sections:

- **Out of scope** — things this task explicitly will not do. Anything you noticed during exploration that's tempting to fix inline but shouldn't be.
- **Edge cases** — known tricky scenarios the implementer needs to handle (empty input, concurrency, timezones, etc.). Not exhaustive — just the ones you already spotted.

Both sections prevent scope creep and missed cases during implement.

## Step 5 — Write `spec.md`

Use the shape in `templates/spec.md` (bundled with this skill): acceptance criteria, subtask checklist, out-of-scope, edge cases.

For each subtask, the `hyper-implement` skill will read back to `spec.md` to get details. If a subtask needs more than a one-liner to describe, write a short paragraph under the checklist item rather than expanding the one-liner.

## Step 6 — Self-review before presenting

Re-read `spec.md` from disk. Check:

- Every criterion is independently testable.
- Every subtask is a vertical slice with a verifiable outcome.
- Scope matches what the user approved in `exploration.md`. If the spec is significantly bigger than the approach described, something drifted — fix before presenting.
- No implementation code in the spec. The spec says *what* and *done when*, not *how in detail*.

If you find problems, fix them. Then continue.

## Step 7 — Serialize open questions

If `spec.md` has no `## Open questions` section, or the section is empty, skip to Step 8.

Otherwise, set `task.md` frontmatter `awaiting: user-input` and work through the questions one at a time, following these rules:

- **One question per message.** Never batch. Ask Q1, stop, wait for the answer.
- Present the question verbatim from the file. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand ("1A", "1B", …) so the user can reply quickly.
- When the user answers, record the answer under the question in `spec.md` (indented bullet or a short paragraph beneath the list item — the artifact must stay the durable record of both question and answer).
- If the user requests changes to the spec or asks a meta question instead of answering, treat it like any other "requests changes / asks a question" response: stop the loop, revise, and restart Step 7 with the updated questions.
- Move to the next unanswered question. Repeat until none remain.

Once every question has an answer, rename the section heading from `## Open questions` to `## Resolved questions` (or delete the section entirely if the answers are already captured elsewhere in the spec). Then proceed to Step 8.

## Step 8 — Set approval gate and stop

Update `task.md` frontmatter: `awaiting: user-approval` (replacing `user-input` if it was set during Step 7).

Tell the user: *"Wrote `spec.md`. <N> subtasks. Please review the acceptance criteria and subtasks. Approve to start implementation, or tell me what to change."*

**Stop.**

## When the user responds

- **Approves** → clear `awaiting`, update `phase:` to `implement`, return to the `hyper` skill.
- **Requests changes** → clear `awaiting`, stay in `plan`, revise `spec.md`, re-set `awaiting: user-approval` and stop.
- **Wants to rethink the approach** → set `phase: explore` and return to the `hyper` skill. Explore will pick it up from there.

## Rules

- **Every criterion independently testable.** "User can log in" is not a criterion; it's a wish.
- **Vertical slices only.** Each subtask ships a thin working piece of the feature.
- **At least one subtask.** Zero is a failure. If the task truly has nothing to decompose, it probably was `scope: quick` — revisit the scope classification with the user.
- **Spec effort proportional to implementation effort.** A 30-line change does not need 8 subtasks.
- **No creative decisions here.** If exploration didn't answer a question, send the task back to explore rather than inventing an answer now.

## Key principles

- The spec is a contract between you (the planner now) and you (the implementer later). Write it so future-you cannot misread it.
- A human should be able to read `spec.md` and predict the size and shape of the PR that lands.
- "Done when" for each subtask is the single most valuable line in the spec. If a subtask has no clear "done when", it's not ready to implement.

## Additional resources

- `templates/spec.md` — ready-to-fill template for the artifact this skill produces.
