---
name: pstack-herdr
description: Control Herdr workspaces, tabs, panes, commands, and live coding agents when the user explicitly invokes this skill.
disable-model-invocation: true
---

# Control Herdr

Read [the Pi runtime contract](../../PI.md).

This skill supplies operating instructions only. It does not install, start, update, or bundle Herdr.

## Check the caller first

Before any Herdr discovery or control command, run:

```bash
test "${HERDR_ENV:-}" = 1
```

If this fails, say that this process is not in a Herdr-managed pane and stop. Do not run `command -v herdr`, inspect the focused session, or control another session. Do not claim Herdr is available merely because this skill loaded.

## Discover syntax safely

The installed CLI is authoritative. After the environment check, inspect only the needed command groups:

```bash
herdr --help
herdr workspace
herdr tab
herdr pane
herdr agent
```

A group without a subcommand prints its command list and may exit with status 2. Never run bare `herdr` for discovery; it launches or attaches the TUI. Never probe a mutating nested command by omitting arguments: commands such as `herdr workspace create` can execute with defaults. Re-check help instead of assuming this document matches another Herdr version.

Most control responses are JSON. Parse returned IDs and state; do not predict them from examples or sidebar position.

## Use caller context and explicit targets

Herdr-managed panes receive:

```bash
printf '%s\n' "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
```

Workspace, tab, and pane IDs are opaque handles, commonly shaped like `w1`, `w1:t1`, and `w1:p1`. Closed tab and pane IDs are not reused. Prefer `--current` for the calling pane and explicit IDs or unique agent names everywhere else. An omitted target can resolve to UI focus owned by the user or another client.

Discover the current layout without changing focus:

```bash
herdr workspace list
herdr tab list --workspace "$HERDR_WORKSPACE_ID"
herdr pane current --current
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

Creation responses provide the next targets:

- `workspace create`: `.result.workspace`, `.result.tab`, and `.result.root_pane`.
- `tab create`: `.result.tab` and `.result.root_pane`.
- `pane split`: `.result.pane`.

A pane moved to another workspace receives a new workspace-qualified ID. Continue with `.result.move_result.pane.pane_id` or its live agent name, not `.result.move_result.previous_pane_id`.

## Choose the right command group

- Workspace and tab commands organize terminal locations.
- Pane commands control raw shells, commands, input, layout, and output.
- Agent commands control a recognized coding agent and expose its lifecycle state.

A pane need not contain an agent. `agent start` requires an existing available shell pane and does not create or rearrange layout.

Create a workspace or tab only when the user requested one. Set `TARGET_CWD`, `TARGET_WORKSPACE_ID`, and `LABEL` from the request, falling back to the caller context only when the user gave no different value. Preserve background focus explicitly:

```bash
herdr workspace create --cwd "$TARGET_CWD" --label "$LABEL" --no-focus
herdr tab create --workspace "$TARGET_WORKSPACE_ID" --cwd "$TARGET_CWD" --label "$LABEL" --no-focus
```

Use `workspace get|rename|focus|close` and `tab get|rename|focus|close` only after resolving an explicit ID. Do not close locations you did not create unless the user explicitly requests it. Never add `workspace close --group` merely to bypass a group-close error.

## Shape and control panes

Inspect geometry before splitting:

```bash
herdr pane layout --current
```

Honor a requested direction. Otherwise split a wide pane right and a narrow or tall pane down. Avoid repeated same-direction splits that leave unusable panes. Keep focus with the caller and preserve its working directory:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

Read the new pane ID from `.result.pane.pane_id`. Use `pane neighbor`, `edges`, `resize`, `zoom`, `swap`, or `move` only with the explicit source and direction or destination established. Use `--no-focus` on background moves. Use `pane focus` or a creation command with `--focus` only when the user asks to switch context.

For an ordinary process, target the pane directly:

```bash
herdr pane run "$PANE_ID" "$COMMAND"
herdr pane wait-output "$PANE_ID" --match "$LITERAL" --timeout 120000
herdr pane read "$PANE_ID" --source recent-unwrapped --lines 120
```

`pane run` submits command text and Enter atomically. `pane send-text` writes text without implying Enter; `pane send-keys` sends validated logical keys. Use these lower-level commands only when intentional. `wait-output` checks existing output immediately; use `--match` for a literal or `--regex` for a Rust regular expression. Omitting its timeout can wait indefinitely.

## Start and coordinate agents

Use this workflow for agent lifecycle control, inspection, and tasks that will not edit files. If a requested task may write or commit, stop and load [`pstack-herdr-swarm`](../pstack-herdr-swarm/SKILL.md); its checkout, worktree, verification, and integration rules are mandatory. Do not dispatch file-writing work into the caller's or another shared checkout through this direct-control workflow.

Agent targets are unique live names or pane IDs currently hosting agents, not terminal IDs or agent-kind labels. Names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.

Before `agent start`, verify that the target pane is at an interactive shell prompt with no foreground command, editor, or agent. Use the agent kind the user requested and inspect `herdr agent` for the installed kind list. Do not assume a provider, model, kind, or native argument. Pass requested native arguments only after `--`:

```bash
herdr agent start "$AGENT_NAME" --kind "$AGENT_KIND" --pane "$PANE_ID"
```

When native arguments were explicitly requested, append them after `--` without passing them through another shell.

A successful start waits until Herdr recognizes the expected agent as ready. If startup returns `agent_not_ready` because the agent is blocked, the name remains usable for inspection. Wait for `idle` before prompting.

Submit work through agent commands:

```bash
herdr agent prompt "$TARGET" "$TASK" --wait --timeout 120000
herdr agent get "$TARGET"
herdr agent read "$TARGET" --source recent-unwrapped --lines 120
```

For normal work, `--wait` settles on the first `idle`, `done`, or `blocked` state. Use `--until` only for a state-specific workflow:

```bash
herdr agent wait "$TARGET" --until blocked --timeout 120000
```

Interpret states conservatively:

- `idle` and `done`: ready for input; seen-state differences distinguish them.
- `working`: active, not ready for a new turn.
- `blocked`: an approval or question UI was recognized.
- `unknown`: an agent exists, but Herdr cannot classify it; this is not completion.

Focus marks a target seen; reads do not. If a wait times out, stalls, or returns `blocked`, inspect `agent get` and `agent read` first. A timeout or `agent_prompt_stalled` does not prove the prompt was never delivered, so do not blindly resend it. For `blocked`, show the relevant UI to the user and ask before answering an approval or question. Use `agent send-keys <target> <logical-key>` only for an intentional UI action.

## Read output accurately

Choose the narrowest useful source:

- `visible`: rendered viewport.
- `recent`: recent rendered rows including soft wraps.
- `recent-unwrapped`: soft wraps joined; prefer for logs and transcripts.
- `detection`: agent detection snapshot; available through `agent read`, not `pane read`.

Use text output unless ANSI styling is evidence, then request `--format ansi`. Increasing `--lines` can retrieve available screen and host scrollback, but alternate-screen content may be unavailable. If a larger read still cannot recover a completed response, ask the agent for numbered chunks and read each chunk before requesting the next. Do not create a file as an output-recovery shortcut; any file-writing assignment belongs in the swarm workflow.

## Preserve safety and focus

- Default background creation and movement to `--no-focus`.
- Never rely on UI focus when `--current`, an ID, or an agent name can identify the target.
- Re-read state after an ambiguous failure before retrying a mutation.
- Do not close sessions, workspaces, tabs, or panes without explicit ownership or user direction.
- Do not install, update, or reload Herdr. Run `herdr server stop` only when the user explicitly intends to stop the server and its pane processes; never kill the main Herdr process.
- Treat server errors as JSON on stderr with exit status 1 and syntax/help errors as exit status 2.
