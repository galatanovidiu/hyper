---
name: hyper-wizard
description: "Generates a guided script for credential, setup or cutover steps only a human can perform."
user-invocable: false
---

# hyper-wizard

Follow the [session contract](../hyper/reference/session.md).

1. Inspect the project's actual configuration and the requested target. Identify manual stages, exact URLs/UI journeys, each captured value's source/destination and whether it is secret. Confirm the stage list and effects with the user. Verify unfamiliar UI/commands from current primary docs.
2. Copy [wizard template](templates/wizard.sh) into `procedures/<slug>.sh`. Keep the helper library consistent; author stages below its marker. Use hidden secret entry, progress, confirmation gates and explicit destinations. Include only effects already authorized; leave other writes as clearly described manual steps.
3. Check `bash -n <script>` and run `shellcheck <script>` when available. Trace every value to its destination and each irreversible action to a confirmation. Do not run the interactive procedure on the user's behalf.
4. Return its path, execution command, effects and validation results. A generated procedure is an artifact for the human, not an executable Hyper runtime.
