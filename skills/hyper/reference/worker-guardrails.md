# Hyper — Worker Guardrails

This file is the shared dispatch-time rule set for every sub-agent Hyper launches (worker, reviewer, plan-reviewer, validation, and peer Explore). Consumer skills read it at session start and treat its contents as normative for the dispatch. Dispatcher skills mention it in their dispatch prompt so the reference is visible in the dispatch record before the sub-agent loads its own skill file.

Four rules, **G1** through **G4**. Each states the rule, why it exists, and the safe alternative for the "I think I need to violate this" case.

## G1 — `task.md` orchestration boundary

**Rule.** Sub-agents must not write `task.md` `phase:` or `awaiting:`. Those fields belong to `hyper`.

**Why.** `hyper` is the single place that routes phase transitions and propagates gate state; a sub-agent that writes these fields can move a task out from under the orchestrator and desync `awaiting` from the real gate source.

**Safe alternative.** Return a verdict per `gates.md` — `awaiting-input`, `awaiting-approval`, `phase-complete`, or `redirect target: <phase>` as defined by the caller skill's return contract — and let `hyper` propagate it. Sub-agents owning a subtask file (e.g. a worker) may still write that file's own `status:` and `awaiting:` per their skill contract; those are phase-internal, not top-level workflow state.

## G2 — Provenance hygiene in shipped content

**Rule.** Sub-agents must not emit absolute local paths (`/Users/...`, `/home/...`, `~/Projects/...`), internal Hyper task ids as real references (`T<N>`, `T<N>.<M>` filled with concrete numbers that name actual tasks), or predecessor-repo names into code, comments, docs, or git output.

**Why.** Shipped content leaves this machine; user-facing files and git history must not carry local filesystem layout, private task numbering, or historical repo names that only make sense to the author's environment.

**Safe alternative.** Use project-relative paths, placeholder ids, and redact concrete local identifiers from any output a user or downstream system reads. Placeholder syntax taught as format (`T<N>`, `T<N>.<M>`, `/path/to/thing`, `<path>:<line>`) is explicitly allowed — the rule is about real references, not format examples. If an example must be concrete to be useful, write it against the current repo only (never a predecessor).

## G3 — Git state is read-only for sub-agents

**Rule.** Sub-agents must not `stash`, `reset`, `amend`, or `checkout` files to make a test suite pass. Git state is read-only from a sub-agent's perspective.

**Why.** Mutating git state to turn a failing run green hides the real failure from the reviewer and the verify phase, and silently discards work the orchestrator expected to be present on disk.

**Safe alternative.** If tests fail because of the change, fix the change. If they fail for reasons unrelated to the change, escalate to `.hyper/backlog.md` per the pre-existing-problem flow the consumer skill already documents. If a git mutation still looks genuinely needed, stop and surface a blocker via the consumer skill's mid-work-blocker flow (for the worker path, `../../hyper-worker/SKILL.md` lines 59–67) rather than mutating state and hoping.

## G4 — Current file lines for citations

**Rule.** When citing code in a completion record, review finding, open question, or doc edit, line numbers must come from a current on-disk read of the file being cited, not from an earlier context snapshot.

**Why.** Earlier edits in the same session (by you or a parallel worker) shift line numbers; a citation grounded in stale context points a future reader at the wrong line and erodes trust in every other citation next to it.

**Safe alternative.** Re-read the file now and use the current number. If the line is ambiguous or the file has changed in ways that make a number misleading, drop the line-number part and cite by path plus a short quoted excerpt. Do not guess.
