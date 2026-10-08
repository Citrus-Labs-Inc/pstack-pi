---
name: poteto-help
description: Explain pstack's Pi commands, workflow selection, model preferences, and supported runtime boundaries.
disable-model-invocation: true
---

# Pstack help

Read [the runtime contract](../../PI.md) and [coverage](../../PARITY.md). Recommend only implemented features.

- `/pstack on` enables persistent routing for the session branch. `/pstack off` disables it. `/pstack status` reports state.
- `/skill:setup-pstack` configures optional role preferences. `/pstack models` lists authenticated models.
- `/skill:how <question>` explains code. `/skill:why <question>` investigates motivation.
- `/skill:architect <change>` compares structural designs. `/skill:arena <decision>` compares independent proposals.
- `/skill:swarm <scope>` partitions bounded read-only `pstack_review` work. `/skill:interrogate <scope>` challenges a change.
- `/pstack herdr` reports whether Pi is in a Herdr-managed pane and shows its caller IDs without launching a process.
- `/skill:pstack-herdr <operation>` loads [`pstack-herdr`](../pstack-herdr/SKILL.md) for explicit Herdr pane/workspace control. `/skill:pstack-herdr-swarm <task>` loads [`pstack-herdr-swarm`](../pstack-herdr-swarm/SKILL.md) for Herdr writing agents and persistent agent swarms.
- `/skill:blast-radius <change>` follows downstream risks. `/skill:tdd <bug>` establishes failing-before evidence.
- `/skill:no-comments <scope>` audits comments. `/skill:unslop <text>` improves prose. `/skill:technical-writing <doc>` shapes technical documents.
- `/skill:benchmark-checklist` vets measurements. `/skill:typescript-best-practices` reviews TypeScript structure.
- `/skill:reflect` converts demonstrated lessons into proposed structural improvements.

All 24 `principle-*` skills can be invoked directly. Normal installation does not activate any workflow automatically. Native `pstack_review` children cannot write, run git or tests, access MCP, or delegate recursively. Persistent Herdr agents are a separate, explicit path and may write only within the user's authorized scope. Pstack ships instructions for an externally installed Herdr; it does not bundle Herdr, update its integrations, pin its CLI version, provide an unattended scheduler, or make its agents an OS sandbox. The parent owns integration, judgment, and verification.

For an ordinary task, start with `/pstack on`, then ask for the result in plain language. For a one-off review, use the specific skill without enabling standing mode.
