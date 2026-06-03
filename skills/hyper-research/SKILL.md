---
name: hyper-research
description: >
  Runs the research phase of a Hyper task. Investigates the question raised by 01-intake.md, writes research.md with findings and a recommendation, and ends the task without implementation work. Use when a Hyper task is in the 'research' phase. Keywords: hyper, research, recommendation, research.md.
user-invocable: false
---

# hyper-research

You are in the **research** phase. Investigate the question and produce a
recommendation, not an implementation plan.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper-build/reference/data-model.md`. The gate contract is in
`../hyper-build/reference/gates.md`.

## Inputs

- `task.md`
- `01-intake.md`
- Any existing `research.md`

## Outputs

- `research.md`
- A verdict to `hyper`

## Flow

1. If an existing `research.md` is present and the user approved it, return
   `phase-complete`.
2. If an existing `research.md` is present and the user requested changes,
   revise the artifact and return `awaiting-approval`.
3. Re-read `01-intake.md`.
4. Research the codebase and any relevant external sources the request needs.
   Exhaust code exploration and online research first.
5. Capture findings, alternatives, recommendation, and follow-ups in
   `research.md` from `templates/research.md`.
6. Interview the user on anything only they can answer — intent, preference,
   constraint, business context. Walk down each branch of the decision tree,
   resolving dependencies between decisions one-by-one. One question per
   message, wait for the answer, then ask the next. Return `awaiting-input`
   while questions remain. If a question can be answered by reading the
   codebase or public docs, answer it that way instead of asking.
7. Return `awaiting-approval`.

When returning `awaiting-approval`, make the approval gate explicit:
`research.md is ready. [RECOMMENDED — approve because <one-line reason from
the recommendation and evidence>.] Reply approve or continue to accept it and
archive the research task, or tell me what to change in research.md.`

## Rules

- When the recommendation is settled, append a `## Decisions` entry
  to `dashboard.md` per `../hyper-build/reference/dashboard.md` §Decisions
  log contract, authoring as `research`.
- When a durable cross-task learning surfaces, record it in
  `.hyper/memory/` per the contract in
  `../hyper-memory/reference/memory.md`, writing the entry inline rather
  than invoking the `hyper-memory` skill.

## Return contract

- `awaiting-input` — unresolved research question remains
- `awaiting-approval` — `research.md` is ready for approval
- `phase-complete` — approved research artifact is ready to archive
