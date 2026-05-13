---
name: hyper-sync
description: Sync .hyper/ with the shared team repository. Pull before starting a task, push after completing or adding one.
---

# Hyper Sync

This recipe mirrors the `hyper-sync` skill for teams who prefer running sync
steps manually via `/hyper-recipe run hyper-sync`.

## Setup (first time)

Run once per project to initialize team sync:

```
hyper-sync init <remote-url> --branch <project-name>
```

For new developers joining an existing project:

```
hyper-sync clone <remote-url> --branch <project-name>
```

## Before starting a task

Pull the latest team state:

```
hyper-sync pull
```

## After completing or adding a task

Push your changes to the shared repo:

```
hyper-sync push
```

## Check sync status

```
hyper-sync status
```

Reports the current branch, last commit, and how far ahead or behind you are
relative to the remote.

## Notes

- All operations are no-ops when `.hyper/repo.md` is absent. That file is the
  activation signal for team sync.
- Use `git -C .hyper log --oneline` to inspect the raw sync history.
- If a `pull` produces merge conflicts, resolve them inside `.hyper/` using
  standard git conflict resolution, then run `push` to share the resolution.
