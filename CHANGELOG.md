# Changelog

All notable changes to Hyper are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and Hyper follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While Hyper is pre-1.0, the skill contract may change between minor versions.

## [0.2.1] - 2026-06-04

### Fixed

- **Memory entries stay self-contained and session-scoped.** The `hyper-memory`
  contract no longer lets entries leak session-ephemeral identifiers (loop IDs
  like `L6`, run modes like `YOLO`). Entries must be written as instructions,
  not prose, and `See:` is an optional durable file path. The audience is
  reframed from "a different future task" to "any future agent session" across
  the contract, the skill, and the sibling writers in `hyper-build`,
  `hyper-implement`, `hyper-research`, `hyper-retro`, `hyper-verify`,
  `hyper-worker`, and `hyper`.

## [0.2.0] - 2026-06-03

### Changed

- **Entry-point rename (breaking).** The bare `hyper` skill is now the adaptive
  OODA workflow (`observe -> orient -> decide -> act`) and is the default front
  door. The structured phased workflow (`intake -> spec -> technical-plan ->
  execution-plan -> implement -> verify -> docs`) is now `hyper-build`. The old
  `hyper-iterate` name is removed; use `hyper`. There is no auto-routing — the
  two entry points are co-equal. The shared platform (state probe, `scripts/`,
  `reference/`, `templates/`) moves to `hyper-build`, and all consumer skills
  now import from `../hyper-build/`.
- **Recall is now agent-driven.** The installer no longer registers a
  Claude-Code `SessionStart` hook to inject `.hyper/memory/index.md`. `install`
  and `uninstall` now strip any previously-registered hook (current and legacy
  command strings) from `~/.claude/settings.json`. Cross-session recall stays
  available through the agent-driven path: the state probe emits a `learnings`
  pointer and the entry-point skills read `.hyper/memory/index.md` when it
  exists. This path is portable across all agents and lets the agent decide
  when memory is relevant.

### Removed

- Dead register/normalize machinery from the installer's embedded settings-merge
  program (`isNormalized`, `normalize`, the `register` verb). The JSON-cleanup
  engine and the `unregister`/`status` verbs are kept so the hook can still be
  stripped from machines that installed v0.1.0.

### Fixed

- README install instructions pointed at a non-existent clone URL and path.
  They now reference `github.com/galatanovidiu/hyper` cloned to `~/hyper`.

[0.2.0]: https://github.com/galatanovidiu/hyper/releases/tag/v0.2.0

## [0.1.0] - 2026-06-03

First public release. Hyper is a lightweight workflow for AI coding agents,
delivered as [Agent Skills](https://agentskills.io) — plain markdown files an
agent can load. There is no CLI, plugin, server, or database. Workflow state
lives in `.hyper/` inside your project.

### Added

- **Two top-level workflows:**
  - `hyper` — phased workflow:
    `intake -> spec -> technical-plan -> execution-plan -> implement -> verify -> docs -> done`,
    with approval gates where direction matters.
  - `hyper-iterate` — adaptive workflow: `observe -> orient -> decide -> act`
    cycles, with interactive gates or delegated YOLO authority.
- **Phase skills:** `hyper-intake`, `hyper-spec`, `hyper-technical-plan`,
  `hyper-execution-plan`, `hyper-execution-plan-review`, `hyper-research`,
  `hyper-implement`, `hyper-worker`, `hyper-verify`, `hyper-docs`,
  `hyper-code-review`.
- **Management skills:** `hyper-task` (task lifecycle), `hyper-backlog`
  (idea-triage inbox), `hyper-recipe` (project-local playbooks),
  `hyper-memory` (project-local learnings with cross-session recall).
- **Support skills:** `hyper-team` (second-opinion delegation to other agent
  CLIs), `hyper-handoff` (session handoff documents), `hyper-retro`
  (retrospectives), `hyper-digest` and `hyper-short-story` (response
  formatting).
- **Read-only state probe** (`skills/hyper/scripts/state.mjs`) for
  deterministic task/loop id allocation and state recovery.
- **Installer** (`install-hyper`) that symlinks the skill folders into every
  supported agent skill directory (Claude Code, Codex, `~/.agents`, PI) so
  local edits take effect immediately. For Claude Code it also registers a
  `SessionStart` hook that injects a repo's `.hyper/memory/index.md` for
  cross-session recall.
- **Maintainer tooling:** `validate-hyper.mjs` structural validator,
  `review-hyper-skills` and `eval-hyper-skills` for drift and quality checks,
  and an evaluation harness under `evals/`.
- **Human documentation:** README and `docs/maintaining-hyper.md`.

[0.1.0]: https://github.com/galatanovidiu/hyper/releases/tag/v0.1.0
