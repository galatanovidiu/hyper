---
name: install-hyper
description: "Installs this repository's complete Hyper suite using its canonical installer. Use when adding or checking Hyper skill links. Keywords: install, symlink, targets."
user-invocable: false
---

# Install Hyper

Run `bash scripts/install-hyper.sh status` from the Hyper repository to inspect the exact targets. For requested installation, run `bash scripts/install-hyper.sh install`. This wrapper is maintainer-only; it is not part of the shipped suite.

Use `HYPER_INSTALL_TARGETS` with a temporary absolute skill directory for verification. Preserve conflicts and report their paths; the installer does not overwrite them. Adding current source links is distinct from deleting retired or foreign links, which requires precise cleanup authorization.

Finish with the actual target directories, installed/missing/conflicting paths and the installer exit result. Host discovery may require a refresh; do not claim menu verification from filesystem links alone.
