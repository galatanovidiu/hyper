---
name: hyper-plan
description: Runs the plan phase of a feature-scope Hyper task. Turns the approved exploration.md into a spec.md (acceptance criteria + ToC-style subtask index + out-of-scope + edge cases) and one file per vertical slice named T<N>.<M>.md at the task folder root (each with status, depends, and what/why/done-when). Sets an approval gate for the user before implementation starts. Runs only for feature-scope tasks (quick and research skip planning). Keywords hyper, plan, spec, acceptance criteria, subtasks, subtask files, spec.md.
user-invocable: false
---

# hyper-plan

You are in the **plan** phase. The explore phase produced an approved approach. Your job is to translate it into a spec the implement phase can follow without further interpretation.

This phase runs only for `scope: feature` tasks. Quick tasks skip to implement. Research tasks end at explore.

## Inputs

- `task.md` (phase=plan)
- `exploration.md` (approved)

## Outputs

- `spec.md` with acceptance criteria + ToC-style subtask index + out-of-scope + edge cases
- `T<N>.<M>.md` — one file per vertical slice, stored directly in the task folder (alongside `task.md` and `spec.md`), each with frontmatter (`id`, `parent`, `title`, `status: todo`, `depends: [...]`, `awaiting: null`) and body sections (`## What`, `## Why`, `## Done when`)
- `task.md` frontmatter: `awaiting: user-approval`
- Phase stays at `plan` until the user approves

## Flow

```
re-read exploration.md
  │
  ├── write acceptance criteria (testable)
  │
  ├── break work into subtasks (vertical slices, each independently verifiable)
  │    └── write one T<N>.<M>.md file per subtask at the task folder root
  │
  ├── list out-of-scope + edge cases
  │
  ├── write spec.md (acceptance criteria + ToC index of subtask files + out-of-scope + edge cases)
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

**Cover error paths, not only happy paths.** Robust software passes its tests against bad input as well as good. For every criterion that asserts the happy-path behavior, write or fold in at least one that asserts the failure behavior — invalid input rejected with a specific error, partial failure surfaced not swallowed, boundary condition handled. Criteria that only describe the success case leave the implementer free to ship code that crashes or silently no-ops on anything unexpected, and verify cannot catch what the spec never asked for.

## Step 3 — Subtasks

Decompose the work into vertical slices — chunks each verifiable on its own and implementable in roughly one sitting. Create one file per slice directly in the task folder (`.hyper/tasks/T<N>-*/T<N>.<M>.md`), using the `templates/subtask.md` template. The dotted id in the filename keeps subtask files visually distinct from task-level artifacts (`task.md`, `spec.md`, `checks.md`) without needing a subdirectory.

**Vertical (good):**

- `T<N>.1` — Add bcrypt dependency + password hashing to User model (unit test).
- `T<N>.2` — Add POST /auth/login endpoint with credential check (integration test).
- `T<N>.3` — Add login form component + wire to endpoint (manual verify).

**Horizontal (bad):**

- All models.
- All routes.
- All UI.

Horizontal decomposition leaves subtasks that cannot be independently verified — the first slice doesn't actually work until the last slice lands.

### Writing each subtask file

Number subtasks as `T<N>.1`, `T<N>.2`, … where `T<N>` is the parent task id. For each one, write a file with:

- **Frontmatter.**
  - `id: T<N>.<M>`
  - `parent: T<N>`
  - `title: <short title>`
  - `status: todo`
  - `depends: []` — or `[T<N>.1, T<N>.2]` when this slice can only run after others are `done`. Empty list means independently dispatchable.
  - `awaiting: null`
- **Body sections.**
  - `## What` — specific change: files, functions, behavior. Concrete enough that a worker sub-agent can start without re-deriving the decomposition. Include file:line refs from `exploration.md` when helpful.
  - `## Why` — which acceptance criterion from `spec.md` this slice supports, and context from exploration that matters for doing it right.
  - `## Done when` — one or more testable criteria. What the worker checks before flipping `status: done`. "Code compiles" is not a criterion; "the new test case asserts X and passes" is.

Do **not** pre-write `## Completion` or `## Open questions` — those sections are added by the worker during/after execution.

### Dependencies

Express dependencies only in the `depends` frontmatter field — the orchestrator reads them there. Prose dependency notes in `## What` are fine as human context but not load-bearing.

### Counts

**Minimum: one subtask.** If the work is genuinely one atomic change, fine — one subtask. But never zero.

**Maximum: match the approach's complexity.** If you end up with 12 subtasks for a "feature" that exploration described in two paragraphs, something is wrong. Push back on the decomposition or revisit exploration with the user.

## Step 4 — Out-of-scope + edge cases

Write two more sections:

- **Out of scope** — things this task explicitly will not do. Anything you noticed during exploration that's tempting to fix inline but shouldn't be.
- **Edge cases** — known tricky scenarios the implementer needs to handle. Not exhaustive, but actively consider at least these categories and record the ones that apply: invalid or malformed input shapes; unreachable or never-taken code paths that still need defensive behavior; concurrency (races, reentrancy, ordering); partial failures (network drops, half-written state, timeouts); empty / null / boundary values (zero, max, off-by-one); timezones, locales, encodings. Name the ones you already spotted during exploration; the implementer will handle them without the spec having to enumerate every possible input.

Both sections prevent scope creep and missed cases during implement.

## Step 5 — Write `spec.md`

Use the shape in `templates/spec.md` (bundled with this skill): acceptance criteria, ToC-style subtask index, out-of-scope, edge cases.

The `## Subtasks` section is a human-readable table of contents, not a progress tracker. One list item per subtask file, title + link (relative to `spec.md`, so just the filename), no checkboxes:

```markdown
- **T<N>.1** — <short title> → [T<N>.1.md](T<N>.1.md)
- **T<N>.2** — <short title> → [T<N>.2.md](T<N>.2.md)
```

Progress lives in each subtask file's `status` frontmatter. The orchestrator in `hyper-implement` scans those files to decide what to dispatch; it does not re-read `spec.md` for progress. Drift between the ToC and the actual subtask files is cosmetic — correctness lives in the files.

## Step 6 — Self-review before presenting

Re-read `spec.md` and every `T<N>.<M>.md` subtask file from disk. Check:

- Every acceptance criterion is independently testable.
- Every subtask file has a non-empty `## Done when` with at least one testable criterion. An empty or hand-wavy "done when" is not ready to implement.
- Every `depends` list references ids that exist as subtask files in the task folder. No dangling refs.
- No cycles in the `depends` graph.
- `parent` on every subtask matches the task id (`T<N>`), and `id` follows `T<N>.<M>`.
- Each subtask is a vertical slice with a verifiable outcome, not a horizontal layer.
- Scope matches what the user approved in `exploration.md`. If the spec is significantly bigger than the approach described, something drifted — fix before presenting.
- No implementation code in the spec or subtask files. They say *what* and *done when*, not *how in detail*.
- The `## Subtasks` ToC in `spec.md` lists every `T<N>.<M>.md` file in the task folder, and every subtask file appears in the ToC.

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

Tell the user: *"Wrote `spec.md` and <N> subtask files (`T<N>.1.md` … `T<N>.<M>.md`) at the task folder root. Please review the acceptance criteria and subtasks. Approve to start implementation, or tell me what to change."*

**Stop.** `hyper` owns the open gate and will route the later reply back into this skill while `phase: plan` remains in `task.md`.

## When the user responds

On a later turn, `hyper` routes the reply back into this skill because the task is still `phase: plan` with `awaiting` set.

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

- The spec + subtask files are a contract between you (the planner now) and the workers (the implementers later). Write them so a fresh sub-agent reading one subtask file can start without re-deriving the decomposition.
- A human should be able to read `spec.md` and predict the size and shape of the PR that lands. The subtask files show the sequencing.
- "Done when" for each subtask is the single most valuable line in the file. If a subtask has no clear "done when", it's not ready to implement.

## Additional resources

- `../hyper/reference/gates.md` — shared gate protocol for planning questions and approval replies.
- `templates/spec.md` — template for the acceptance-criteria + ToC + out-of-scope + edge-cases artifact.
- `templates/subtask.md` — template for individual subtask files.
