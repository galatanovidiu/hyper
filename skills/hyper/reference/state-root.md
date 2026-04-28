# Resolving the Hyper State Root

Before reading or writing any `.hyper/` path, resolve the **Hyper state root** once for the invocation. All task, backlog, memory, recipe, retro, team, and archive paths are relative to that root.

## Rule

Use the main project directory as the Hyper state root, not a linked Git worktree.

1. If the invocation gives an absolute path inside `.hyper/tasks/` or `.hyper/archive/`, derive the Hyper state root from that path first.
2. Otherwise, if the current directory is not inside a Git repository, use the current project root.
3. If it is inside a Git repository, run `git worktree list --porcelain`.
4. Use the first non-bare `worktree <path>` entry as the Hyper state root. Git lists the main worktree before linked worktrees.
5. If worktree discovery fails or only bare entries exist, fall back to `git rev-parse --show-toplevel`; if that fails too, use the current project root.

When the Hyper state root differs from the current working tree, keep code, tests, and diff commands in the current working tree unless the operation is explicitly about Hyper state. Use absolute paths for `.hyper/` artifacts so state reads and writes still land in the main project directory.

## Quick Check

```bash
git worktree list --porcelain
```

Pick the first stanza whose `worktree` path is not marked `bare`. Then read and write:

```text
<hyper-state-root>/.hyper/...
```
