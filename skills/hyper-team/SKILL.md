---
name: hyper-team
description: |
  Delegate any task to another AI agent CLI for a second opinion, adversarial
  review, research, or fact-check. Human-triggered only — invoke directly
  with a goal and a provider (e.g. "use hyper-team with codex to review the diff",
  "ask gemini to research X"). The running agent leads; the called agent is
  the teammate. Every finding from the teammate is verified against the
  source before being shown to the user.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
argument-hint: "[natural language: ask codex to review, get gemini's opinion, etc.]"
---

# hyper-team

Delegate tasks to AI agent teammates via natural language.

Verification is non-negotiable. Every teammate finding is checked against the codebase before it reaches the user. Fixes are never auto-applied from a review — findings are presented, the user decides.

This skill is **human-triggered only**. Invoke it directly with any goal. It does not run as part of any workflow and is not auto-invoked by other skills (including the `hyper` phase skills). If you want structured task work, use the `hyper` skill instead — `hyper-team` is a standalone tool for getting a teammate involved on demand.

## Core concept

The agent running this skill is always the **team lead**. The agent(s) being called are **teammates**. The lead parses intent, builds prompts, executes, verifies output, and presents results. Teammates receive a prompt and return findings — nothing more.

This skill works from any agent platform. Claude can lead Codex. Codex can lead Gemini. Any agent with Hyper can lead any other.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before reading or writing `.hyper/team/` paths. Codebase context, diffs, and teammate CLI commands still run in the current working tree.

## Workflow

### Step 1 — Understand intent

Read the user's natural-language input and infer three things:

1. **Provider(s)** — which teammate(s) to call.
2. **Task type** — what kind of work.
3. **Target/scope** — what to review, research, or verify.

**Intent classification:**

| Task type | Signal words | Purpose |
|-----------|-------------|---------|
| `code-review` | "review", "check", "audit", "look at the code", "find bugs" | Adversarial code review — find bugs, security holes, performance issues |
| `design-review` | "architecture", "design", "tradeoffs", "opinion on approach", "alternatives" | Adversarial design review — challenge architecture, surface alternatives |
| `research` | "how", "why", "investigate", "find out", "explain how X works" | Codebase investigation — read-only, evidence-backed |
| `verify` | "verify", "confirm", "is it true that", "fact-check" | Fact-check a claim against source code |

Reviews are adversarial by default — the point is to find problems. There is no "gentle review" mode. v1 supports read-only task types only; write-capable delegation (implement, refactor) is deferred.

**Provider detection:** explicit in the request ("ask Codex", "give this to Gemini") or multi-provider ("ask Codex and Gemini"). If the provider is unclear, **ask** — never guess. Task type and target are inferred from context. Only ask about provider.

### Step 2 — Confirm plan

Present the inferred plan to the user before proceeding:

> "I'll ask **Codex** to **code-review** your branch against main. Go?"

> "I'll ask **Codex** and **Gemini** to **design-review** the auth module architecture. Go?"

The user can correct any part. **Never proceed without confirmation.**

### Step 3 — Load provider(s) and setup check

For each provider, resolve the provider file in this order:

1. `.hyper/team/providers/{provider}.md` in the Hyper state root (project-local teammates).
2. `references/providers/{provider}.md` bundled with this skill (resolved relative to this `SKILL.md`).

Use the first file that exists. If neither location has `{provider}.md`, stop and tell the user: list every available provider — the union of `.hyper/team/providers/*.md` and bundled `references/providers/*.md`, excluding `_template.md` — and ask which to use. Never guess.

Once the file is loaded, verify readiness:

1. **CLI installed?** — Run the check command from the provider file. If not installed, show the install command and offer to run it (ask first — system-level change). Verify with `--version` after.
2. **Authenticated?** — If installed but not authenticated, show the auth command and offer to run it.
3. **Hyper-aware?** — Run the Hyper-awareness check from the provider file. If not configured, warn: "Teammate won't have Hyper awareness — the prompt will compensate." Do not block.
4. **Self-delegation warning** — If the lead agent and requested teammate are the same provider (Claude asking Claude), warn: *"You're asking me to review my own work — this won't give you an independent perspective. Proceed anyway?"* Only proceed on explicit confirmation.

If a CLI can't be installed or authenticated, stop — do not proceed without a working CLI.

#### Adding a project-local teammate

To add a teammate that only exists in this project (e.g. a sandboxed Claude reached over `docker exec` or SSH):

1. Create `.hyper/team/providers/<name>.md` in the Hyper state root.
2. Start from the bundled template at `references/providers/_template.md` (bundled with this skill) — copy it to the new path and fill in every section. Project-local files use the same contract as bundled ones.
3. Invoke the teammate by name: "ask `<name>` to review …".

A project-local file fully replaces the bundled one when both define the same `<name>` — there is no section-level merge. To tweak a bundled provider locally, copy the whole file and edit the copy.

Note: `.hyper/` is gitignored by default. To share project-local teammates across a team, either add an explicit un-ignore (`!.hyper/team/providers/` in `.gitignore`) or commit individual files.

### Step 4 — Gather context

Gather context based on task type. This is provider-agnostic — the same context feeds all providers.

| Task type | Context to gather |
|-----------|------------------|
| `code-review` | `git diff` against base branch, changed files, recent commits, project conventions (AGENTS.md, CLAUDE.md, linter configs) |
| `design-review` | Spec files, design docs, architecture files, relevant source showing current approach |
| `research` | Project structure overview, entry points, files relevant to the research question |
| `verify` | Files containing or related to the claim |

Always include: repo root conventions (README, AGENTS.md, CLAUDE.md if present), current branch and base branch, any user-provided custom instructions.

**Hyper-artifact convenience:** if the user's request references a Hyper artifact ("review the execution plan", "check the technical plan") and the current directory is inside a Hyper task folder (`.hyper/tasks/T<N>-*/`), read the corresponding artifact (`01-intake.md`, `02-spec.md`, `03-technical-plan.md`, `04-execution-plan.md`, `research.md`, or `checks.md`) and include it. This is a shortcut — for any other target, the user specifies it and the lead gathers context for it.

### Step 5 — Build prompt

1. Read `references/prompts/{task-type}.md` (bundled with this skill) for the prompt template. Each prompt file already inlines its XML blocks verbatim — no separate block library to load.
2. Fill placeholders with context from Step 4: `{CONTEXT}`, `{TARGET}`, `{CONSTRAINTS}`, `{CUSTOM_INSTRUCTIONS}` (omit the block if none).

**Multi-provider:** the same prompt goes to all providers. Do not customize per provider.

**Structured output:** if the provider supports JSON schema output (see `references/capability-matrix.md` bundled with this skill), use it. Otherwise the XML output contract in the prompt enforces structure.

If the prompt is too large, reduce context scope (fewer files, shorter diff) and rebuild.

### Step 6 — Execute

Follow the provider file for CLI invocation.

- **Single provider:** run and wait.
- **Multi-provider:** run all providers in **parallel**. Each invocation is independent.
- **Timeout:** 600 seconds per provider. On timeout, save any partial output, mark coverage partial, offer retry.
- **On error or empty output:** retry once. Second failure → abort that provider and report.
- **All providers fail:** report the failures with details. Never fabricate results.

Save raw output with a metadata header to `.hyper/team/`. Filename: `{YYYY-MM-DD}-{HHmm}-{taskId?}-{provider}-{task-type}.md`. Same timestamp across a multi-provider run ties them together.

Metadata header:
```
---
prompt: |
  {first 200 chars of prompt}...
command: {exact CLI command used}
exit_code: {0 or error code}
duration: {seconds}
provider_version: {output of --version}
sandbox_mode: {read-only|writable}
timestamp: {ISO 8601}
---
```

### Step 7 — Verify output (mandatory)

Never present unverified teammate output to the user.

**Single provider:** read raw output, check each finding against the codebase (file:line refs exist, described behavior is accurate, reasoning sound). Mark as **verified**, **partially correct** (with correction), or **rejected** (with reason). Add findings the teammate missed. Never invent findings — if verification reveals a hallucination, reject it; do not replace it with a made-up alternative.

**Multi-provider:**
1. Merge findings across providers.
2. Deduplicate overlapping issues (same file, same concern).
3. Verify the combined set once — not per provider.
4. Every finding keeps **provenance**: which provider reported it.

**When providers disagree:** present both perspectives. The lead **breaks the tie** with reasoning — lead has conversation context and project knowledge the teammates lack. No majority vote.

**Lead gives full opinion** on all findings, including subjective design calls. The lead is a senior team member, not a neutral aggregator.

**Max 2 clarification rounds** per provider. If output is still unclear, work with what's available and note the gaps.

### Step 8 — Present results and save artifact

**For reviews (code-review, design-review):**

1. **Summary table** — provider(s), task type, scope, coverage (full/partial).
2. **Verified findings** — grouped by severity (critical > major > minor), each with provenance.
3. **Lead's opinion on disagreements.**
4. **New issues from verification** — things the lead found that teammates missed.
5. **Strengths** — what was done well (from teammate output, verified).

**STOP rule:** present findings and ask which to fix. **Never auto-apply fixes.** The user decides.

**For research and verify:** present the verified output directly. Include provenance when multi-provider. Add lead's assessment and corrections.

**Save verified artifact** named `team-{providers}-{task-type}.md`. If running inside a Hyper task dir, save there (e.g., `.hyper/tasks/T22-foo/team-codex-code-review.md`). Otherwise save to `.hyper/team/` alongside the raw output.

## Storage

- **Raw output** (`.hyper/team/`) — unverified teammate responses with metadata headers. Preserved for traceability. `.hyper/` is gitignored.
- **Verified artifacts** — saved to the task directory (inside a Hyper task) or `.hyper/team/` (standalone). Contain provider names, task type, findings with provenance, verification notes, lead's opinions.
