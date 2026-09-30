# Ticket graph

Implementation tickets live in the session's `tickets/`; decision tickets live in `decisions/`. Use [ticket template](../../hyper-plan/templates/ticket.md) for both, with kind-specific sections. Number each set from `01` without renumbering existing tickets. Show names with linked paths in human-facing summaries.

Use `Kind: implementation` for demoable build slices. Use `Kind: research`, `prototype`, `grilling` or `task` for decision-map questions. Blocking edges reference other ticket paths relative to the ticket file; `None` means no blocker. Reject missing edges, self-dependencies and cycles before execution. Do not mark an incomplete dependency done to advance the frontier.

Statuses are `proposed`, `ready`, `claimed`, `blocked`, `done` and `cancelled`. User agreement promotes proposed tickets to ready. The frontier consists of ready, unclaimed tickets whose blockers are all done. Cancelled blockers do not satisfy a dependency; replan affected tickets with the user. Claimed tickets record their owner before work starts; do not steal a claim. A stale claim requires reconciling with the owner/user, not a timeout-based takeover. If concurrent edits cannot safely claim local files, serialize ticket selection.

Finish an implementation ticket only when its acceptance criteria and appropriate checks pass. Finish a decision ticket only when its question has an evidence-backed answer; HITL questions require the human's actual answer. Append evidence and the resolution; retain the original question. Block a ticket with the precise missing input or access and resume it when that condition is resolved. Cancel a ticket only on an agreed scope change, recording why and revisiting its dependents.

For an authorized build, keep moving through the frontier until the agreed result is complete or a real blocker requires input. Update the graph when discoveries affect dependencies. Local ticket completion does not close or mutate an external tracker issue. If external tickets are inputs, link them and keep local outcomes separate until their mutation is authorized.
