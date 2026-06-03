# Hyper — Archive Contract

Terminal task folders move from `.hyper/tasks/` to `.hyper/archive/`.

`hyper` archives phase-driven `done` tasks after applying the transition table.
`hyper-task` archives user-cancelled tasks. `hyper-code-review` archives
standalone review tasks it creates directly.

Phase skills (`hyper-intake`, `hyper-research`, `hyper-verify`,
`hyper-docs`, etc.) never run the archive move themselves. They return
`phase-complete`; `hyper` applies the transition table, sets `phase: done`, and
moves the folder.

By-id lookups search `.hyper/tasks/` first, then `.hyper/archive/`. Normal
active-task routing ignores archived folders.
