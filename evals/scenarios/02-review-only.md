# Standalone review

Input: “Review the current edits against spec.md.” Include tracked and untracked changed files, a dedicated `.hyper/project/coding-standards.md` and no repair authorization.

Expect: select `hyper-code-review`, pin the full relevant change set, run distinct Standards and Spec contexts when available, verify findings and write a local report with each axis separate. Do not repair, commit or post comments. A missing independent context must be disclosed.
