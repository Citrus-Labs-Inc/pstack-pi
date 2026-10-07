# Pi runtime contract

This is a scoped, independent pstack port for Pi 1.0.4 (`@earendil-works/pi-coding-agent`). It is not a Codex compatibility layer. See [coverage](PARITY.md) before assuming an upstream capability exists.

## Paths and invocation

A loaded skill lives at `<package>/skills/<name>/SKILL.md`. Resolve supporting files relative to that skill, not the project. Invoke `/skill:<name>`. Skills are explicit-only to avoid changing unrelated tasks just by installing the package. Once loaded, a workflow may read another bundled skill directly.

`/pstack on` enables the poteto routing instructions on every subsequent turn. `/pstack off` removes that extension-provided instruction section on the next turn; it cannot erase prior conversation or override another instruction. Mode follows the active session branch through resume, reload, compaction, and tree navigation. New sessions start off unless explicitly launched with `--pstack`. Installation does not edit AGENTS.md or enable a global mode.

## Delegation

`pstack_review` runs bounded read-only Pi subprocesses. It accepts `tasks`, each with `task`, optional `role` (`explorer`, `reviewer`, `designer`), `model`, `thinking`, and `persona` (`default` or `comment-sicko`). Supply absolute source paths, a bounded question, the intended behavior, and any required evidence. Children have no parent transcript. Collect diffs and history in the parent and include them in the brief, or write a scoped artifact and give its absolute path.

Children have only `read`, `grep`, `find`, and `ls`. They cannot run tests, execute git, browse, write files, or spawn more agents. The parent implements changes and runs verification. Do not ask children to do those tasks. Existing unrelated subagent extensions are not used implicitly.

The tool awaits completion. It starts at most four subprocesses per batch, supports up to eight tasks, and serializes batches. Preserve larger panels by submitting additional batches. Every child has a five-minute timeout and a 16 MiB stdout limit. Cancellation and session shutdown terminate children, with forced termination after one second if necessary. A failed or incomplete child makes the tool result an error, while preserving other results. Report incomplete coverage rather than treating a partial panel as agreement.

Results include actual model IDs, token/cost usage, and private temporary report paths. Model-visible text is limited to 12,000 characters per result. Read the saved report when more context is needed. Reports remain under the operating system's temporary directory until manually removed or cleaned by the OS. They can contain proprietary code. Do not commit or publish them without review.

The executable is `pi` on PATH, or the executable path in `PSTACK_PI_COMMAND`. No shell parses tasks. The child uses JSON mode and receives the task on stdin. Install the same Pi version on that PATH. Parent-only provider extensions and one-shot `--api-key` overrides do not transfer; use built-in providers or `models.json` and normal Pi authentication. An unavailable child provider is a reported failure, not silent model substitution.

## Model preferences

`/pstack models` lists authenticated parent models. Use exact `provider/model-id` values. Model IDs may contain slashes. Never invent model names. Defaults inherit the parent's provider, model, and thinking level. An explicit different model defaults to `medium`; Pi clamps thinking to supported levels.

Optional role preferences live at `<agent-dir>/pstack-models.json`. The default agent directory is `~/.pi/agent`; Pi's `PI_CODING_AGENT_DIR` override is respected. No project-controlled role config is loaded.

```json
{
  "roles": {
    "explorer": { "model": "inherit-parent" },
    "reviewer": { "model": "inherit-parent", "thinking": "high" },
    "designer": { "model": "inherit-parent" }
  }
}
```

Task-level fields override role fields. `auto` and `inherit-parent` select the parent model. An explicit `thinking` preference still applies. Invalid config or unavailable explicit models stop the whole batch before spawning. To run a multi-model panel, set a different verified model on each task. Same-model independent runs are useful but are not model diversity. Delegation incurs ordinary provider costs; timeouts and concurrency limits are not dollar budgets.

## Permissions and external effects

This package is not an OS sandbox. Children inherit normal user credentials and environment. Disabling extensions, MCP, project configuration, context-file discovery, and write tools reduces capabilities but does not restrict which files the remaining read tools can read. User-level `models.json` credential commands may execute during authentication. Use an isolated OS environment for untrusted repositories or sensitive reviews.

A workflow is not permission to publish, merge, deploy, send messages, delete data, or broaden a task. Follow the user's scope and existing approval requirements. Ask before external writes unless the user has explicitly authorized them. Preserve uncertain constraint comments and safety suppressions until their purpose is understood.

## Unsupported runtime features

No cloud workers, write-enabled subagents, scheduled wakeups, heartbeat service, bot bridge, or Benny integration are included. No MCP server or browser is installed. Use available host tools only when present and authorized. Never emulate durable scheduling with detached sleepers or promise future execution. For a pause, save a user-approved resume note with objective, evidence, changes, remaining work, and commands to rerun. Resume explicitly with Pi's session tools.
