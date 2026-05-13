---
name: hyper-sync
description: >
  Syncs the .hyper/ folder with a shared team repository. Manages pull, push,
  init, clone, and status for team-shared Hyper state. Use when setting up team
  sync for a project, pulling the latest task state before starting work, or
  pushing after completing or adding a task. Activated by the presence of
  .hyper/repo.md — all operations are no-ops when that file is absent.
  Keywords: hyper, sync, team, pull, push, init, clone, repo.md, shared state.
---

# hyper-sync

Sync `.hyper/` with a shared team repository. Before anything else, resolve
the Hyper state root per `../hyper/reference/state-root.md`. All `.hyper/`
paths are relative to that root.

Read the user's request and pick exactly one operation: `init`, `clone`,
`pull`, `push`, or `status`.

**No-op rule:** `pull`, `push`, `status`, and `clone` check for `.hyper/repo.md`
first. When absent, print:
`"No repo.md found. Team sync not configured for this project."` and stop
(exit 0). Do not run any git commands.

## init

`hyper-sync init <remote> --branch <name>`

1. If `.hyper/.git/` already exists, skip the `git init` step.
2. Otherwise run `git init` inside `.hyper/`.
3. Run `git -C .hyper remote add origin <remote>`. If the remote already
   exists, update it with `git remote set-url`.
4. Create or check out the project branch:
   `git -C .hyper checkout -b <name>` (use `git checkout <name>` if it
   already exists on the remote after a fetch).
5. Write `.hyper/repo.md` from `templates/repo.md`, filling `remote` and
   `branch`.
6. Ensure `.hyper/recipes/` exists. Write `.hyper/recipes/hyper-sync.md`
   from `templates/recipe.md`.
7. Stage and commit: `git -C .hyper add -A && git -C .hyper commit -m "init <name> hyper state"`.
8. Push: `git -C .hyper push -u origin <name>`.
9. Report: `Team sync initialized. Branch: <name>. Remote: <remote>. Recipe written to .hyper/recipes/hyper-sync.md.`

## clone

`hyper-sync clone <remote> --branch <name>`

1. Check for `.hyper/repo.md`. If present, report already configured and stop.
2. Check for `.hyper/.git/`. If present, report already a git repo; suggest
   running `pull` instead, and stop.
3. Run `git clone <remote> .hyper --branch <name> --single-branch`.
4. Verify `.hyper/repo.md` is present after clone. If not, write it from
   `templates/repo.md` using the provided remote and branch values.
5. Report: `Cloned <name> from <remote>. Team sync ready.`

## pull

1. Check for `.hyper/repo.md`. If absent, print no-op message and stop.
2. Read `remote` and `branch` from frontmatter.
3. Run `git -C .hyper pull --rebase origin <branch>`.
4. Report: `Pulled latest state from <branch>.` Surface any git error clearly.

## push

1. Check for `.hyper/repo.md`. If absent, print no-op message and stop.
2. Read `remote` and `branch` from frontmatter.
3. Stage: `git -C .hyper add -A`.
4. Check for staged changes: `git -C .hyper diff --staged --quiet`. If
   nothing staged, report `Nothing to push — .hyper/ is up to date.` and stop.
5. Commit: `git -C .hyper commit -m "hyper state update"`.
6. Push: `git -C .hyper push origin <branch>`.
7. Report: `Pushed .hyper/ state to <branch>.`

## status

1. Check for `.hyper/repo.md`. If absent, print no-op message and stop.
2. Read `remote` and `branch` from frontmatter.
3. Run `git -C .hyper fetch origin <branch> --quiet`.
4. Report: branch name, last commit hash and message, ahead/behind count
   vs origin.
