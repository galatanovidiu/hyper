# Hyper State Probe — Contract

## Purpose

The Hyper state probe is the canonical implementation of the state-root rule
and the bootstrap snapshot. It is a read-only Node script that returns, in
one call, every piece of routing state a Hyper skill needs at session entry:
the resolved state root, whether `.hyper/` is bootstrapped, the next free
ids for tasks, loops, and backlog entries, and the lists of active tasks,
archived tasks, active loops, and backlog entries. Skills consume this
output and do not re-implement the resolution rule, the id-allocation walk,
or the per-file frontmatter read on their own.

The probe does not write. It does not mutate Git state. It does not enumerate
subtask files or surface dashboard content; those reads stay in the skills
that own them.

## Invocation

From the `hyper` skill itself:

```bash
node "<skill-base-dir>/scripts/state.mjs" [--from <abs-path>]
```

From any sibling Hyper skill (`hyper-task`, `hyper-backlog`, `hyper-iterate`, etc.):

```bash
node "<skill-base-dir>/../hyper/scripts/state.mjs" [--from <abs-path>]
```

- `<skill-base-dir>` is announced by the runtime as "Base directory for this
  skill" when the skill is loaded. Use that path verbatim; never hard-code
  `~/.claude/`, `~/.codex/`, or any other runtime-specific prefix.
- The probe lives only in the `hyper` skill folder. Sibling skills reach it via
  `../hyper/scripts/state.mjs` because `install-hyper` symlinks every Hyper
  skill as a sibling under each runtime's skills root.
- `--from <abs-path>` is the only optional flag. It supplies an absolute path
  hint when the agent already knows it is operating against a specific
  `.hyper/` location (for example, a path passed in from another tool). The
  probe also accepts `--from=<abs-path>`.
- Without `--from`, the probe uses `process.cwd()` as the starting point for
  resolution.
- Output is a single JSON object written to stdout. Errors are a single line
  on stderr with a non-zero exit.

## State-root resolution

The probe resolves the state root by the following chain. Each rule is the
probe's behavior, not an instruction for the agent to walk.

1. If `--from` is supplied and the path contains a `.hyper/` segment, the
   probe strips the `.hyper/` component and everything after it; the prefix
   is the state root.
2. Otherwise the probe runs `git worktree list --porcelain` from the
   starting directory and uses the first non-bare `worktree <path>` entry.
   Git lists the main worktree before any linked worktrees, so this returns
   the main project directory even when the agent is sitting in a linked
   worktree.
3. If `git worktree list` is unavailable or produces no non-bare entry, the
   probe falls back to `git rev-parse --show-toplevel`.
4. If neither Git call succeeds, the probe returns `--from` (when supplied)
   or `process.cwd()`.

## Output schema

The probe writes one JSON object to stdout with these top-level keys:

| Key | Type | Meaning |
|-----|------|---------|
| `state_root` | string | Absolute path to the resolved Hyper state root. |
| `bootstrapped` | boolean | `true` only when `.hyper/`, `.hyper/tasks/`, and `.hyper/archive/` all exist; `false` triggers the calling skill's bootstrap path. |
| `next_task_id` | number | Next free integer for `T<N>` ids across `tasks/` and `archive/`; seeded to `1` when no tasks exist. |
| `next_loop_id` | number | Next free integer for `L<N>` ids across all loop folders; seeded to `1` when no loops exist. |
| `next_backlog_id` | number | Next free integer for `B<N>` headings in `.hyper/backlog.md`; seeded to `1` when the file is missing or empty. |
| `active_tasks` | array | One entry per task folder under `.hyper/tasks/` (see per-item shape below). |
| `archived_tasks` | array | One entry per task folder under `.hyper/archive/` (see per-item shape below). |
| `active_loops` | array | One entry per loop folder whose `loop.md` carries `status: active`. |
| `backlog_entries` | array | One entry per `## B<N> — <title>` heading in `.hyper/backlog.md`, in heading order. |
| `parse_errors` | array | One entry per file the probe could not read or parse (see per-item shape below). |

### `active_tasks[*]`

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string \| null | Task id from `task.md` frontmatter. |
| `title` | string \| null | Human-readable title. |
| `phase` | string \| null | Phase value as written in frontmatter. |
| `scope` | string \| null | Scope value as written in frontmatter. |
| `awaiting` | string \| null | Top-level gate label; `null` round-trips as JSON `null`, not the string `"null"`. |
| `created` | string \| null | Creation timestamp. |
| `path` | string | Repo-relative folder path, e.g. `.hyper/tasks/T20-add-backlog-archive/`. |
| `has_handoff` | boolean | `true` when `handoff.md` exists in the task folder. |
| `phase_known` | boolean | `false` when `phase` is not in the enum from [data-model.md](data-model.md). |
| `category` | string | `active` · `deferred` · `terminal` · `unknown`. See "Category mapping" below. |

### `archived_tasks[*]`

Same shape as `active_tasks[*]`, plus optional `cancelled_at` (string) and
`cancelled_reason` (string) when those frontmatter fields are present.
Archived tasks usually carry `category: terminal`.

### `active_loops[*]`

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string \| null | Loop id from `loop.md` frontmatter. |
| `title` | string \| null | Human-readable title. |
| `status` | string | Always `active` for entries in this list. |
| `updated` | string \| null | Last cycle or metadata update timestamp. |
| `path` | string | Repo-relative folder path, e.g. `.hyper/loops/L5-hyper-iterate-tuneup/`. |

### `backlog_entries[*]`

| Field | Type | Meaning |
|-------|------|---------|
| `id` | number | Integer parsed from the `## B<N>` heading. |
| `title` | string | Title text after the em-dash. |

### `parse_errors[*]`

| Field | Type | Meaning |
|-------|------|---------|
| `path` | string | Repo-relative path to the file that failed. |
| `reason` | string | Short reason: `read failed: <message>`, `no opening --- delimiter`, `no closing --- delimiter`, etc. |

A per-file parse failure is recorded here; the probe still emits the rest of
the output and exits zero. Only an unrecoverable state-root resolution
failure or an unknown flag causes a non-zero exit.

## Category mapping

`active_tasks[*].category` and `archived_tasks[*].category` derive from
`phase` against the [data-model.md](data-model.md) phase enum:

| `category` | Source `phase` values |
|------------|-----------------------|
| `active` | `intake`, `spec`, `technical-plan`, `execution-plan`, `implement`, `verify`, `docs`, `research`, `review` |
| `deferred` | `deferred` |
| `terminal` | `done`, `cancelled` |
| `unknown` | anything not in the enum, or missing |

`unknown` items also carry `phase_known: false`. Calling skills route those
to [state-recovery.md](state-recovery.md). A `cancelled` task left under
`.hyper/tasks/` (folder not yet moved to archive) appears in `active_tasks`
with `category: terminal`; the calling skill decides whether to surface it,
archive it, or ignore it.

## Errors

The probe exits non-zero in these cases:

- **Unknown flag.** Any argv entry other than `--from`, `--from=<path>`, or
  `--from <path>`. Stderr: `hyper state probe: unknown argument "<arg>"`.
- **Missing `--from` value.** `--from` with no following path. Stderr:
  `hyper state probe: --from requires an absolute path argument`.
- **State-root resolution failure.** No fallback produced a usable path.
  Stderr: `hyper state probe: failed to resolve state root[: <message>]`.

Per-file read or parse failures are not exit-level errors. They go into
`parse_errors` and the probe continues.

## Environment coverage

- **Fresh clone with no `.hyper/`** — `bootstrapped: false`, all
  `next_*_id` counters return `1`, every list is empty. The calling skill
  uses this as its bootstrap signal.
- **Populated project** — `bootstrapped: true`, every list and counter
  reflects the on-disk state at the moment of the call.
- **Linked Git worktree** — `state_root` is the main worktree path, not the
  linked worktree the agent is sitting in. Reads and writes target the
  main project's `.hyper/`.
- **No Git** — outside a Git repository, `state_root` is the current
  working directory (or the `--from` hint when supplied).
- **Partial bootstrap** — `.hyper/` exists but `.hyper/tasks/` or
  `.hyper/archive/` is missing. `bootstrapped: false`; whichever lists can
  be read are surfaced, the rest are empty.

## Quick check

From any project, run:

```bash
node "<skill-base-dir>/scripts/state.mjs"
```

The first three keys of the output (`state_root`, `bootstrapped`,
`next_task_id`) are enough to confirm the probe resolved the right project
and the next id space lines up with the folder listing.
