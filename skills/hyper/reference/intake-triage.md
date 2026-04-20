# Hyper — Intake Triage

Use this heuristic when deciding whether incoming work should be:

1. handled directly outside Hyper
2. created as a Hyper task
3. parked in the Hyper backlog as an idea

## Strong overrides

Respect explicit user labels first:

- `use Hyper`, `create a task`, `track this` → task
- `just an idea`, `add to backlog`, `note this down for later` → backlog
- `just do it`, `don't track this`, `fastest path` → direct handling

If the user labels it clearly, trust the label unless it would be unsafe.

## Bucket 1 — Handle directly outside Hyper

Lean here when **all or almost all** of these are true:

- tiny, low-risk, easily reversible change
- one file or a few adjacent lines
- no approval artifact would add value
- no need to resume later or hand off
- no likely branching design decision
- not in a sensitive area (auth, payments, migrations, security boundaries, deletes)

Typical examples:

- typo fix
- copy tweak
- one-line config correction
- tiny rename inside one local module
- obvious mechanical edit the user does not need tracked

## Bucket 2 — Create a Hyper task

Lean here when **any** of these are true:

- multiple files or a cross-cutting change
- meaningful user-facing behavior change
- new abstraction, migration, or non-trivial refactor
- likely need for approval, verification, or docs review
- task may span multiple turns or sessions
- user wants visible state on disk
- bug/root cause needs investigation first
- area is sensitive even if the diff may be small

Signals that strengthen the case:

- multiple paragraphs of concrete detail
- file paths and a sketched fix already exist
- committed language: `need to ship`, `must fix`, `do this now`

## Bucket 3 — Park in backlog

Lean here when **most** of these are true:

- rough sketch, future-facing, or speculative
- one-line hunch with little detail
- no investigation done yet
- user is collecting possibilities, not starting work
- the right scope or shape is not clear yet

Signals that strengthen the case:

- `someday`, `maybe`, `future`, `we should`
- unclear problem statement
- no concrete acceptance point

## One-nudge rule

If the user's request looks like it belongs in a different bucket than the words they used, ask **once**:

- direct-handling nudge: `This looks micro-sized and probably faster outside Hyper. I recommend handling it directly because <reason>. If you want it tracked in Hyper anyway, say so.`
- backlog nudge: `This looks more like a future idea than active work. I recommend parking it in backlog because <reason>. If you want the task created now anyway, say so.`
- task nudge: `This has enough concrete detail to be task-shaped. I recommend creating a task because <reason>. If you want to keep it as a backlog idea instead, say so.`

After one nudge, honor the user's choice.

## Safety override

Never classify as direct-handling purely because the diff looks small when the area is sensitive:

- auth / permissions
- payments / billing
- migrations / deletes / data shape changes
- security boundaries
- deployment / infrastructure changes

When in doubt, use a task.
