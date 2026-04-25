---
id: T<N>.<M>
parent: T<N>
title: <short title>
status: todo
depends: []
writes: []
awaiting: null
---

# T<N>.<M> — <title>

## What

<One paragraph at execution altitude. The objective, not the procedure. Concrete enough that a worker sub-agent with NO parent-session memory can start without re-deriving the decomposition. Name the patterns or conventions the worker should follow.>

## Why

<≤3 bullets connecting this slice to the spec's `**Goal:**` and to the specific acceptance criterion (or criteria) it satisfies. Keep tight — over-justification displaces technical context.>

- supports AC<n>: <one-line link to the criterion this slice closes>

## Mirror

<Optional. Patterns to anchor on. Each entry is `path:line — what to copy`. Use the same identifiers and vocabulary the agent will see in the code (vocabulary alignment improves long-context retrieval). Delete this section if there is nothing concrete to anchor on.>

- `path/to/example.ext:N` — pattern to copy and what about it
- `path/to/another.ext:N` — pattern to copy and what about it

## Edits

<Exact directives the agent treats as deterministic grep-and-edit ops. One bullet per change. Use LOCATE / FIND / INJECT / REPLACE / PRESERVE verbs. If the change is "create a new file", say CREATE and give the full intended content shape inline or by reference to a Mirror entry.>

- LOCATE in `path/to/file.ext` the <named clause / function / region>.
  FIND: `<exact string to grep>`
  INJECT after / REPLACE with: `<exact replacement or new code>`
  PRESERVE: <what must not change on the same line(s)>

## Avoid

<Optional. Anti-patterns specific to THIS task. Cheap insurance against documented failure modes. Skip the section when there is nothing task-specific to forbid — generic style rules belong in project-level guidance, not here.>

- Don't <specific anti-pattern> — <one-line reason>.

## Done when

<One or more testable end-state criteria. What the worker checks before flipping `status: done`. "Code compiles" is not a criterion; "the new test case asserts the 403 response on the confidential-post path and passes" is. Each item must be answerable yes/no by reading a file or running a command.>

- <criterion 1>
- <criterion 2>

## Verify

<Runnable commands the agent self-runs to confirm `## Done when`. Highest-leverage field empirically — Devin's task-completion rate jumped from 13.86% to 23% when verify commands were in the brief. Each entry is `<command>` followed by the expected outcome.>

- `<command>` — expected: <expected outcome>
- `<command>` — expected: <expected outcome>

## Escalate

<Optional. When to STOP and surface a blocker, not when to retry. Single sentence usually enough. Skip the section when there is no realistic stop-and-ask scenario for this slice.>

- If <condition>, halt and report <what to surface to the orchestrator>.

<!--
Audience: a sub-agent dispatched by hyper-implement with FRESH context and
no parent-session memory. Everything the agent needs must be in this file
or in files it explicitly references.

Token budget: target ~1,500 tokens. Above ~2,000 = context-rot risk for
the sub-agent. If the slice genuinely needs more, split it into two
subtasks rather than write a brief that crosses the rot threshold.

The frontmatter (`status`, `depends`, `writes`, `awaiting`) is the
orchestrator's load-bearing contract. The body sections are the worker's
brief. Do NOT pre-write `## Completion` or `## Open questions` — those
sections are added by the worker during/after execution.

Optional sections (`## Mirror`, `## Avoid`, `## Escalate`) are deleted
when not applicable — never kept as empty headings or filled with "N/A"
or "None". An absent section says "nothing task-specific here"; an empty
section is a smell.
-->
