# Dashboard — Rollup Contract

`dashboard.md` is the PM-facing rollup view of a Hyper task. This file owns the algorithm that produces it. The schema lives in `data-model.md` § `dashboard.md`.

## Purpose

Give a human reader the goal, plan shape, progress, verification verdict, and decision history of a task in a one-file, under-a-minute scan. Engineer-facing artifacts (`exploration.md`, `spec.md`, subtask files, `checks.md`) stay rock-solid for sub-agent dispatch and are unchanged by this contract. `dashboard.md` reads from them; it never modifies them.

The dashboard has two halves with two different write contracts:

- **Rollup** (sections `## Goal`, `## Plan`, `## Progress`, `## Verification`, `## Status`) — *computed* from primary artifacts. Regenerated wholesale on every trigger. Drift between this half and primary artifacts is structurally impossible because the primary artifacts are read each time.
- **Decisions log** (section `## Decisions`) — *append-only*. Phase skills and the user both append entries as load-bearing choices are settled. The rollup never overwrites this section.

## Output schema

The literal file shape, in order:

```markdown
# Dashboard — T<N>: <title>

## Goal

<one paragraph + optional Why context>

## Plan

<scope-dependent — see § Per-section extraction rules>

## Progress

<scope-dependent>

## Verification

<verify verdicts or "not yet run">

## Status

**Phase:** <phase> · **Awaiting:** <awaiting or "none">

## Decisions

- YYYY-MM-DD — <author> — <decision> (<context>)
- YYYY-MM-DD — <author> — <decision> (<context>)
```

`<title>` mirrors `task.md` `title`. Sections always appear in the order above, and section headings are exactly as shown. Missing data inside a section emits the placeholder `_not yet written_` (italicised, with the underscores) — never a blank section, never an error message.

## Per-section extraction rules

Each rule reads from a primary artifact in the task folder. If the named artifact is absent or unparseable, that section emits the placeholder; other sections still regenerate. One bad source never aborts the rollup.

### `## Goal`

- **Source:** `task.md` body (everything below the frontmatter, before any later sections appended by phase skills).
- **Rule:** copy the body paragraph verbatim. If a `## Why` section is present, include it below the body paragraph as a sub-block prefixed with `**Why:** ` and the Why content on the same paragraph (collapse to one paragraph if short, keep multi-line if longer). Why is part of the goal context for PMs.
- **Placeholder:** `_not yet written_` — only if `task.md` body is empty (should not happen on a properly created task).

### `## Plan`

- **`scope: feature`:** read `spec.md`. Render two sub-blocks:
  - **Acceptance criteria** — bulleted list of each AC, **condensed** to its first clause (everything before the first period or the first 100 characters, whichever is shorter, with an ellipsis if truncated). The full criteria stay in `spec.md`; this is a scan view.
  - **Subtasks** — bulleted list of `T<N>.<M> — <title>` entries from `spec.md`'s `## Subtasks` ToC. No links, no status (status lives in `## Progress`).
- **`scope: quick`:** read `exploration.md`'s **Approach** section. Render its content verbatim (it's already 2–3 sentences by the discover contract).
- **`scope: research`:** read `exploration.md`'s **Recommendation** section. Render verbatim.
- **`scope: code-review`:** rollup does not run on this scope (see § Regeneration triggers).
- **Placeholder:** `_not yet written_` — when `spec.md` (feature) or `exploration.md` (quick / research) is absent.

### `## Progress`

- **`scope: feature`:** scan every `T<N>.<M>-<slug>.md` subtask file at the task folder root. Render a bulleted list, one entry per subtask, in numeric order. Each entry: `**T<N>.<M>** — <title> — <status>`. When `status: done`, append a single-line digest of the subtask's `## Completion` section (first concrete bullet from Completion, truncated to ~120 chars). When `status: in-progress`, render that label as-is. When `status: todo`, render `pending`.
- **`scope: quick`:** read `exploration.md`'s **Approach** section to surface what the implement step targeted; once `checks.md` exists, append `_implement complete_`. Single bullet, not a list.
- **`scope: research`:** render the literal text `Not applicable for research scope — no implementation step.`
- **Placeholder:** `_not yet written_` — when no subtask files exist on a feature task.

### `## Verification`

- **Source:** `checks.md`.
- **Rule:** read the `**Overall:**` line and each `## tests` / `## review` / `## qa` / `## docs` section's `**Verdict:**` line. Render as `**Overall:** <verdict>` followed by a bulleted list of `**<section>:** <verdict>` entries for each present section.
- **Placeholder:** `_not yet run_` — when `checks.md` is absent.

### `## Status`

- **Source:** `task.md` frontmatter.
- **Rule:** render a single line in the form `**Phase:** <phase> · **Awaiting:** <awaiting>`. When `awaiting: null`, render `**Awaiting:** none`.
- **Placeholder:** never. `task.md` always has these fields on a properly created task; absence is a state-recovery problem, not a rollup problem.

### `## Decisions`

- **Source:** the existing `dashboard.md` itself, from the `## Decisions` heading to EOF.
- **Rule:** **preserve unchanged.** The rollup reads the existing file, copies everything from `## Decisions` to EOF byte-for-byte, and writes it back as the tail of the new file. No reformatting, no normalization, no validation. If the file does not yet exist (task creation), seed the section with the heading and an explanatory HTML comment from `templates/dashboard.md`.
- **Placeholder:** never overwrite — this section's contents are append-only, written by phase skills and the user.

## Regeneration triggers

`hyper` regenerates `dashboard.md` at exactly two trigger points:

1. **Task creation** — after writing `task.md` for a new task, copy `templates/dashboard.md` to `dashboard.md`, fill `## Goal` from the new task's body paragraph, and leave the other rollup sections at the placeholder. The Decisions section starts empty (just the heading and the explanatory comment from the template).
2. **After phase return** — inside `hyper`'s "After the phase returns" block, after the phase-transition table is applied and before announcing or stopping, regenerate sections 1–5 from current primary-artifact state and preserve section 6 unchanged.

`scope: code-review` tasks bypass both triggers entirely. They have a different lifecycle (`review → done` via `hyper-code-review`) and do not produce `dashboard.md`.

Phase skills, sub-agents, and workers never regenerate `dashboard.md`. They may append to `## Decisions` (see § Decisions log contract) but they do not touch the rollup half.

## Failure handling

The rollup is per-section degradable. The algorithm:

1. For each rollup section (1–5), attempt the extraction rule.
2. If the source artifact is absent, unreadable, or the parse fails (malformed YAML, missing expected heading, etc.), emit the placeholder for that section and continue with the next.
3. Never raise or propagate an exception that would abort `hyper`'s phase advance.
4. After all five rollup sections are produced, preserve section 6 from the existing file (or seed it from the template on first regeneration).
5. Write the assembled output to `dashboard.md`, overwriting any prior file.

A regeneration that emits five placeholders is still a successful regeneration. The file always exists after task creation; it is always re-written on phase return; one bad section never blocks the others.

If the rollup itself crashes (the algorithm has a bug, not a malformed source), `hyper` logs the failure inline in its return summary but does not retry, does not block phase advance, and does not propagate the error. The dashboard is a courtesy artifact for the user; the workflow does not stall on it.

## Decisions log contract

The `## Decisions` section is the durable record of load-bearing choices made during the task. It exists outside the rollup so that phase skills and the user can both write to it without coordination.

### Format

Each entry is a single bullet line:

```
- YYYY-MM-DD — <author> — <decision> (<context>)
```

- **`YYYY-MM-DD`** — the local date the decision was settled.
- **`<author>`** — one of `discover`, `plan`, `implement`, `verify`, `docs`, or `user`. Phase skills write their own phase name; the user writes `user`.
- **`<decision>`** — one short sentence stating what was decided.
- **`<context>`** — one short clause naming the alternatives considered or the trigger for the decision. Optional but recommended.

### Append-only

Entries are never edited or deleted by the rollup. A user may edit or remove entries manually if a mistake was recorded; phase skills must only append.

### Who writes

- **Phase skills** append when a load-bearing choice is settled — an approach picked over alternatives, an opt-out chosen, a fallback selected, a multi-choice question answered, a slice split or merged. Routine "yes continue" gate replies, approval at an approval gate without a meaningful choice attached, and ordinary phase progression are **not** decisions and are not logged.
- **The user** may append manually at any time to record a choice they made outside a phase skill's view (e.g. a chat exchange that settled a direction without going through a gate).

The contract is opt-in. Silence is correct for non-decisions. A phase that runs to completion without appending anything is fine.

## Worked example

After a feature task has finished discover, plan, and the first two of three subtasks, `dashboard.md` looks like:

```markdown
# Dashboard — T59: Reshape task.md into PM-facing dashboard

## Goal

Reshape `task.md` into a PM-facing dashboard that lives alongside the existing
engineer-facing artifacts. Two views, one task.

**Why:** In the agentic era I'm both engineer and project manager on the same
work. I need a one-file, under-a-minute view of where each task is.

## Plan

**Acceptance criteria**
- data-model.md documents `dashboard.md`'s artifact shape...
- `skills/hyper/reference/dashboard.md` defines the rollup contract...
- After hyper applies the phase-transition table on every phase return...
- Phase skills append a dated one-line entry to `dashboard.md` § Decisions...
- The rollup gracefully handles missing or malformed primary artifacts...
- The shape of all pre-existing artifacts is unchanged...

**Subtasks**
- T59.1 — Define the dashboard contract
- T59.2 — Wire hyper to regenerate dashboard.md
- T59.3 — Phase skills append to Decisions log

## Progress

- **T59.1** — Define the dashboard contract — done — Added dashboard.md schema to data-model; created reference/dashboard.md and templates/dashboard.md.
- **T59.2** — Wire hyper to regenerate dashboard.md — done — Wired Create-task seeding and after-phase-return regeneration into hyper SKILL.md.
- **T59.3** — Phase skills append to Decisions log — pending

## Verification

_not yet run_

## Status

**Phase:** implement · **Awaiting:** none

## Decisions

- 2026-04-27 — discover — Picked Option D (computed rollup file + append-only Decisions log) over A/B/C (Resolved Q1).
- 2026-04-27 — discover — Trigger is phase-return only, not lazy or on-demand (Resolved Q2).
- 2026-04-27 — discover — Phase skills + user can both append to Decisions log; phase skills only on load-bearing choices (Resolved Q3).
```

## Out of scope for this contract

- No CLI, no slash command for "show dashboard" — the file is the interface.
- No backfill for archived tasks — the rollup applies prospectively.
- No localization or multi-language sections.
- No format negotiation with primary artifacts — if their schema changes, this contract is updated; the contract is not auto-derived.
