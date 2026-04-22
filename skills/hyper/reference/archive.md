# Archiving task folders

When a task reaches a terminal state (`phase: done` or `phase: cancelled`), move its folder from `.hyper/tasks/` to `.hyper/archive/`. Active-task listings then stay focused on live work, while by-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `.hyper/archive/` automatically.

Archiving is a **move, not a delete** — the folder and every artifact inside it are preserved as historical record.

## Canonical snippet

Run from the project root, substituting the real task folder name for `T<N>-<slug>`:

```bash
mkdir -p .hyper/archive
# refuse to overwrite an existing archive destination
if [ -d ".hyper/archive/T<N>-<slug>" ]; then
  echo "ERROR: archive destination exists, aborting move"
  exit 1
fi
mv ".hyper/tasks/T<N>-<slug>" ".hyper/archive/T<N>-<slug>"
```

The destination guard exists to catch id collisions or partial previous archives — never overwrite or merge.

## Who archives, and when

| Skill | Trigger |
|-------|---------|
| `hyper` | Any phase-driven terminal transition — research-scope explore approved, quick-scope verify passes, feature-scope docs finishes — any time `hyper` advances a task to `phase: done`. |
| `hyper-task` | User-initiated cancellation; `phase: cancelled`. Out-of-band from the phase flow. |
| `hyper-code-review` | Standalone `scope: code-review` task it created directly, on terminal `phase: done` transition. Out-of-band from the normal `hyper` dispatch loop. |

Phase skills (`hyper-explore`, `hyper-verify`, `hyper-docs`, etc.) never run the archive move themselves. They return `phase-complete`; `hyper` applies the transition table, sets `phase: done`, and runs the snippet above.

`archive/` is created lazily by `mkdir -p` on first use — no pre-creation needed during bootstrap.

Archived folders are read-only in practice. Do not edit artifacts inside `.hyper/archive/` as part of normal workflow.
