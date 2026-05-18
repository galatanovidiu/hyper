# jira-config templates

Use the appropriate template based on the mode selected at init.

---

## MCP mode (agent-installed Jira MCP — default)

```
---
base_url: <https://yourorg.atlassian.net>
default_project: <PROJECT-KEY>
done_transition: QA Test
mode: mcp
# Optional git integration — omit or set to false to disable
# auto_branch: true
# branch_from: dev
# auto_commit: true
---
```

Credentials are managed by the agent's MCP server configuration. Nothing
sensitive is stored here. This file is safe to commit to a team repository.

---

## Docker mode (direct REST calls to a Docker-hosted Jira instance)

```
---
base_url: <http://localhost:8080>
default_project: <PROJECT-KEY>
done_transition: QA Test
mode: docker
docker_url: <http://localhost:8090>
# Optional git integration — omit or set to false to disable
# auto_branch: true
# branch_from: dev
# auto_commit: true
---
```

Credentials are read at runtime from env vars `JIRA_USER` and `JIRA_TOKEN`
set per-developer in their shell. Never store credentials in this file.
This file is safe to commit to a team repository.
