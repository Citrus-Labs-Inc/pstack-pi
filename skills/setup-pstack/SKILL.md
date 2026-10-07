---
name: setup-pstack
description: Configure and verify pstack for Pi, including explicit role model preferences and review limitations.
disable-model-invocation: true
---

# Set up pstack for Pi

Read [the runtime contract](../../PI.md).

1. Confirm the package loaded. `/pstack help` and the `pstack_review` tool should be available. Reading a skill alone does not load its extension. If absent, explain how to install the package with `pi install /absolute/path/to/pstack-pi`, then restart or reload Pi.
2. Explain that mode is opt-in with `/pstack on`, children are read-only, and reviews incur normal provider costs. No scheduler, global mode, MCP server, or write-enabled worker is installed.
3. Default to the parent's current model and thinking level. No configuration file is necessary. Ask about model preferences only if the user wants them changed. `/pstack models` or `pi --list-models` lists models; never invent IDs.
4. If configuration was requested, inspect `<agent-dir>/pstack-models.json`, where the agent directory is `PI_CODING_AGENT_DIR` if set, otherwise `~/.pi/agent`. Preserve existing role preferences unless the user changes them. Roles are `explorer`, `reviewer`, and `designer`. Follow the exact JSON schema in the runtime contract. Use `inherit-parent` when no concrete model is selected. Explain that five-minute timeouts are not spending caps.
5. Write only the requested configuration. Do not overwrite auth.json, models.json, settings.json, unrelated agents, or AGENTS.md. For repeated setup without changes, leave files untouched.
6. If the user wants a live verification, submit one tiny `pstack_review` task to describe a named harmless source file. Check its status, model, and evidence. A package-load check alone does not prove credentials or a remote model work.

Report the selected roles, configuration path if written, and what was actually tested. Use `/pstack off` to stop persistent routing and `/skill:poteto-help` for workflows.
