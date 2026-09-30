# Working on Hyper

Read `~/AGENTS.md` and applicable `AGENTS.local.md`. Hyper ships portable engineering skills; `README.md` is the human overview.

## Surfaces and contracts

`skills/**` installs as a whole suite in other projects. Use suite-relative references, neutral skill-name invocation and project-relative artifacts. Keep maintainer tools, machine paths and repository instructions out of shipped operational source. Legal notices accompany the installed suite.

`README.md`, `docs/`, `scripts/`, `evals/`, `.claude/skills/` and `.agents/skills/` are maintainer surfaces. Preserve supplied Learnings/Transcripts, Git metadata and unrelated `.hyper/` history. Rebuild work uses its named session; discarded implementations are not design inputs.

The router is the single slash-menu entry; jobs remain model-callable. `skills/hyper/reference/session.md` owns root/session selection, artifact paths, authority and job returns. Its linked template owns work-record shape. `skills/hyper/reference/tickets.md` owns dependencies and lifecycle; the linked ticket template owns shape. Update affected producers and consumers together.

Keep jobs composable and artifacts useful to the requested result. Invoke by skill name with explicit session and authority. Provide sequential fallbacks for subagents and use the current checkout unless another setup is authorized. Do not introduce fixed phases, aliases, active-session pointers, runtime probes, plugin manifests or an executable Hyper command.

## Authoring and verification

Read [.claude/skills/review-hyper-skills/reference/authoring-invariants.md](.claude/skills/review-hyper-skills/reference/authoring-invariants.md) when writing or reviewing suite instructions. Keep this ownership distinct from structural inventory checks. For maintenance and isolated installer verification, read [docs/maintaining-hyper.md](docs/maintaining-hyper.md).

```bash
node scripts/validate-hyper.mjs
node --test scripts/*.test.mjs
```

Use the instruction-authoring validator when available, and exercise representative `evals/scenarios/` cases for behavior changes. Save actual evidence in the current `.hyper/sessions/` work directory; report unexecuted or unavailable checks. Adding or renaming a job includes router invocation, README inventory and required installed links.

`scripts/install-hyper.sh` is the canonical installer. Test public operations using `HYPER_INSTALL_TARGETS` and temporary destinations. It preserves foreign entries and does not change settings or run Hyper. Do not remove global installed entries without exact cleanup authorization.

Repo-local install/review skills under `.agents/skills/` mirror `.claude/skills/` byte for byte; update both. Commits, pushes, publication and cleanup remain separate authorized operations.
