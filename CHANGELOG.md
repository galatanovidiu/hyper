# Changelog

All notable changes to Hyper are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and Hyper follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While Hyper is pre-1.0, the skill contract may change between minor versions.

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
