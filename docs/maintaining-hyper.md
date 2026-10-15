# Maintaining Hyper

Edit `skills/` as the portable source. Install the whole suite together so sibling references remain usable. Human explanations, upstream attribution, test infrastructure and local wrappers belong to maintainer surfaces.

For a new or renamed job, update the router's named invocation and README inventory. Keep model invocation enabled, mark jobs `user-invocable: false`, and use a bounded job result. Contract ownership is documented in the [authoring invariants](../.claude/skills/review-hyper-skills/reference/authoring-invariants.md); structural inventory checks live in `scripts/validate-hyper.mjs`.

Local install/review wrappers under `.claude/skills/` and `.agents/skills/` mirror byte for byte. Update both. These wrappers are not included in global installation. Use `scripts/install-hyper.sh` directly or through the install wrapper; no second installer implementation exists.

## Verification

```bash
node scripts/validate-hyper.mjs
node --test scripts/*.test.mjs
bash -n scripts/install-hyper.sh
shellcheck scripts/install-hyper.sh skills/hyper-wizard/templates/wizard.sh skills/hyper-diagnose/templates/hitl-repro.sh
```

Run the installed instruction-authoring validator on changed instruction files when available. Structural tests mutate disposable copies to show that real packaging errors are rejected; installer tests exercise public operations against temporary targets with `HYPER_INSTALL_TARGETS`.

Use [behavior scenarios](../evals/README.md) for representative instruction cases. Save the actual trace, artifacts and scoring under the selected session's `evidence/`. A source walkthrough is useful evidence of contract coverage, but it cannot establish that an agent followed those instructions in a new context.

## Installation boundaries

`status` is read-only; missing links are reported but are not errors. `install` preflights all current suite destinations, then creates missing links and the `hyper-LICENSE` notice link. Conflicting files, folders and foreign/dangling links stop installation before writes. Matching links are left intact. Filesystem or permission errors may still leave a partial install; rerunning fills only missing links.

The default destinations are the user Agents, Claude and Codex skill directories. Override with newline-separated absolute paths for an isolated test or a different host. The script does not alter host settings, run workflows, remove retired names or support a global uninstall. Precise installed-link cleanup needs separate authorization. A host must honor `user-invocable` for the intended slash-menu presentation; verify discovery there if claiming live menu behavior.

## Provenance

Read [source mapping](source-mapping.md) for the pinned upstream inputs and policy adaptations. Preserve supplied Learnings/Transcripts, Git history and unrelated `.hyper/` records. Fresh-build validation concerns the newly authored source; do not resurrect discarded implementations to audit them.
