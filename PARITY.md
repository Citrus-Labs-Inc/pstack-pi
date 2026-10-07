# Port coverage

Version 0.1.0 is a scoped Pi release, not a claim of complete Codex or Cursor parity. Its reference is ScriptedAlchemy/pstack-codex at the commit in [UPSTREAM.json](UPSTREAM.json).

| Component | Pi implementation | Boundary |
| --- | --- | --- |
| 24 engineering principles | Retained text with native runtime links and explicit invocation metadata | Loaded only explicitly or through a routing workflow |
| TDD, technical writing, unslop, blast radius, benchmark checklist, TypeScript guidance | Six lightly adapted portable skills | Parent performs execution and evidence collection |
| poteto-mode, setup-pstack, poteto-help | Native routing, setup, and help skills | Compact Pi workflow, not the complete upstream playbook pack |
| how, why, architect, interrogate, swarm, arena, reflect, no-comments | Eight native workflows | Preserve core intent, not every upstream prompt or procedure |
| Standing mode | `/pstack on/off`, CLI flag, custom branch state, structured prompt section | Opt-in, no global AGENTS.md changes |
| Delegation | `pstack_review`, Pi JSON subprocesses, exact model IDs, role preferences, bounded concurrency | Read-only, no parent transcript, no automatic cloud or worktree isolation |
| Persona instructions | Explorer, reviewer, designer, and read-only Comment Sicko | Does not install a writable poteto-agent or named custom-agent registry |
| Model selection | Parent inheritance, exact task overrides, optional per-role JSON configuration | No invented model defaults, automatic model diversity, or spending caps |
| Result evidence | Private temporary full reports, bounded summaries, model IDs, token/cost usage | Temporary artifacts are not a durable orchestration ledger |

Total: **41 skill entry points**, including **24 principles**. Pi's own skill loader checks the count and metadata in `npm test`.

## Deferred

These 12 top-level upstream skills are not shipped: `automate-maintainer`, `automate-me`, `automate-team`, `bro`, `correct`, `create-verification-skill`, `figure-it-out`, `maintain-verification-skill`, `make-bot-ui`, `recall`, `show-me-your-work`, and `teach`.

The 23 upstream playbooks, orchestration and PR-watching helpers, worktree audit, cloud/write workers, persistent schedulers, HTTP bot bridge, and Benny automation pack are also deferred. The installed skills do not invoke their executables. Some retained principles mention general ideas such as scheduling; those mentions do not supply a runtime capability.

The benchmark checklist's upstream playbook references describe its original context; in this port use the parent task's investigation, measurement, and delivery checklist. No upstream Perf issue, Hillclimb, or Opening a PR playbook is bundled.

## Deliberate changes

- Installation is a native Pi package, not a marketplace installer or global file-copy script.
- All skills are explicit-only; installing the package does not silently change the model's style.
- Mode is a real extension setting attached to the active session branch.
- Children use only read tools, with extension, MCP, context-file, and project-resource discovery disabled.
- Reviewer failures, missing providers, truncation, and cancellation are not treated as success.
- Ambiguous safety comments and suppressions are preserved until understood.
- External writes require authorization; autonomy wording is not a permission grant.
- Scheduling is explicitly unsupported rather than renamed from a Codex API.

## Evidence and limits

`npm run validate` exercises package integrity and native runtime behavior with deterministic subprocess fixtures. `npm run smoke` loads the actual extension through Pi's loader and CLI, then runs a real Pi subprocess against a loopback OpenAI-compatible fixture. That test inspects the child tool declarations and completes a real read-tool round trip without credentials or a paid model.

No live provider review-quality evaluation, multi-day run, UI verification, merge, deployment, external messaging, or unattended service delivery is claimed. Current compatibility targets Pi 1.0.4 on Node.js 22+. Windows process termination has not been integration-tested.
