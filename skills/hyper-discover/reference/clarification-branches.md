# Clarification branches — worked examples

Companion to `../SKILL.md` Step 1. The four-branch decision tree (Clear /
One-likely / Multiple / Vague) selects which clarification action to take.
Each branch has a worked example below.

## Clear

The task body names all three of: a **surface** (file path, function name, endpoint, behavior), the **change** ("rename X to Y", "return 401 instead of 403", "add a `--dry-run` flag"), and at least one **success signal** (an observable outcome that says the change worked).

*Worked example:* "Rename `validateUser` to `assertUser` in `src/auth/guards.ts` so the name reflects that it throws on failure." Surface (`src/auth/guards.ts:validateUser`), change (rename to `assertUser`), success signal (function name in source matches the new identifier).

*Action:* skip clarification, continue to scope classification.

## One likely interpretation

Surface and goal are present, but exactly one detail is ambiguous, and a single reading dominates the alternatives by code, convention, or the user's stated goal.

*Worked example:* "Add rate limiting to the login endpoint." Surface (login endpoint), goal (rate limiting) are clear; ambiguous detail is the limit shape (per-IP vs per-user, fixed window vs sliding), but per-IP fixed-window is the dominant first-pass choice for a login endpoint.

*Action:* state the reading and ask one confirmation question: *"I read this as X. Sound right?"*

## Multiple plausible interpretations

Two or more readings would lead to materially different file-level changes, and the body does not pick one. No reading clearly dominates.

*Worked example:* "Make the dashboard faster." Could mean caching, query optimization, lazy-loading, pagination, or memoization — no shared file set across the alternatives.

*Action:* ask *one* multiple-choice question that recommends the option with the strongest evidence (e.g. the slow query named in the body) and gives a one-line reason. Use numbered + lettered shorthand (1A, 1B, …).

## Vague / no goal

The body states a problem, a wish, or a feeling without naming a surface, a specific change, or a success signal.

*Worked example:* "The login flow is confusing." No surface (which step?), no specific change (UI? copy? error messages?), no success signal (less drop-off? fewer support tickets?).

*Action:* summarize your understanding in four bullets — your read of the surface, the change shape, the success signal, and what's missing — and ask the user to correct.
