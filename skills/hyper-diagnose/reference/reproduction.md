# Tight reproduction

Try a behavior test, HTTP/CLI invocation, browser flow, captured trace replay, minimal harness, property/fuzz loop, bisection or differential run, in roughly that order. Prefer a real path over a mock that removes the failure. Pin inputs, time, randomness and local state where needed; narrow the assertion to the user's symptom. Save captures under the session's `evidence/` after redacting secrets.

For nondeterministic failures, raise the reproduction rate with repeat triggers, bounded concurrency or controlled timing; record frequency rather than calling a single green run proof. For performance, record comparable before/after timing and conditions. For bisection, isolate checkout mutations and obtain authority for branch/worktree operations; use captured inputs without changing history when that suffices.

When only the human can trigger it, use [human repro template](../templates/hitl-repro.sh). Capture observations, not credentials. Record the command actually run and its verdict. If no loop can exercise the symptom, report the missing environment or artifact precisely and stop diagnosis at that limit.
