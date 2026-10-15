---
name: hyper-implement
description: "Implements agreed requests, specs or tickets and verifies the resulting behavior."
user-invocable: false
---

# hyper-implement

Follow the [session contract](../hyper/reference/session.md).

Use the OODA loop—observe, orient, decide, act—and feed each result into the next iteration.

Implement the agreed behavior in verifiable slices. For ticket work, follow the [ticket graph](../hyper/reference/tickets.md); a small agreed change needs no spec or tickets.

Use `hyper-tdd` at agreed seams where meaningful. Use `hyper-diagnose` first when a bug's cause is uncertain.

Run targeted checks during work and required project checks at completion. Record actual commands, outcomes and unavailable checks in `checks.md` using the [checks template](templates/checks.md).

Finish with `hyper-code-review`, passing the pinned changes, spec, separate standards sources and repair authority. Repair verified in-scope findings and rerun affected checks before returning the local result.
