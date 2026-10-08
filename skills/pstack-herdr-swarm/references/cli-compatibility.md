# Detect the installed Herdr commands

Herdr command forms can differ between installations. Detect capabilities on every swarm run. Do not select commands from a remembered version number.

## Print the safe command groups

Run the top-level help and each relevant group without a mutating subcommand:

```bash
herdr --version
herdr --help
agent_help=$(herdr agent 2>&1 || true)
pane_help=$(herdr pane 2>&1 || true)
workspace_help=$(herdr workspace 2>&1 || true)
worktree_help=$(herdr worktree 2>&1 || true)
integration_help=$(herdr integration 2>&1 || true)
pi_help=$(pi --help 2>&1 || true)
printf '%s\n' "$agent_help" "$pane_help" "$workspace_help" "$worktree_help" "$integration_help" "$pi_help"
```

Do not run bare `herdr`. Do not probe a nested command that can act with default arguments, such as `workspace create` or `worktree create`.

Before each operation, inspect the full usage line and confirm that its command, target type, argument separator, and flags appear in the captured help. Use only advertised options. In particular, do not assume that `--json`, `--kind`, `--pane`, `--cwd`, `--workspace`, `--no-focus`, `--wait`, `--until`, and `--status` exist. The checks below are helpers, not substitutes for reading the captured usage.

## Detect how this installation starts agents

Classify by syntax, not by Herdr version:

```bash
start_usage=$(grep -E 'herdr agent start ' <<<"$agent_help" || true)
prompt_usage=$(grep -E 'herdr agent prompt ' <<<"$agent_help" || true)

if grep -q -- '--kind' <<<"$start_usage" \
  && grep -q -- '--pane' <<<"$start_usage" \
  && grep -q -- '-- <agent-args' <<<"$start_usage" \
  && test -n "$prompt_usage"; then
  agent_form=managed-pane
elif grep -Eq -- '-- <(argv|command)' <<<"$start_usage" \
  && grep -q -- '--cwd\|--workspace' <<<"$start_usage"; then
  agent_form=raw-launch
else
  printf 'Unsupported Herdr agent commands:\n%s\n' "$agent_help" >&2
  exit 1
fi
```

Treat these labels as local control-flow names. They do not identify a release. Adapt the matching tokens to equivalent metavariable names only after reading the complete usage.

For `managed-pane`, create or obtain a shell pane first. Start Pi through the advertised agent kind and pane flags. Pass all required native Pi arguments after the advertised `--` separator. Submit work with `agent prompt` only when its usage accepts an explicit target and text.

For `raw-launch`, let `agent start` launch `pi` in the advertised workspace or working directory. Require an argument separator and a non-focusing option. Parse the resulting agent record to get its pane ID. Before creating resources, confirm that an advertised input command targets that pane and atomically submits text plus Enter. A literal send command without Enter semantics is insufficient.

If any required launch, argument-forwarding, prompt-submission, status, output-read, or wait capability is absent or ambiguous, stop with the captured help. Do not guess a command.

## Build optional Pi model arguments

If the user gives `provider/model-id`, split only at the first slash. Model IDs may contain more slashes.

```bash
selection=$requested_provider_model
if [[ $selection != */* ]]; then
  printf 'Expected provider/model-id, got: %s\n' "$selection" >&2
  exit 1
fi
provider=${selection%%/*}
model=${selection#*/}
if [[ -z $provider || -z $model ]]; then
  printf 'Expected nonempty provider and model ID: %s\n' "$selection" >&2
  exit 1
fi

if ! pi --list-models 2>/dev/null | awk -v provider="$provider" -v model="$model" \
  'NR > 1 && $1 == provider && $2 == model { found=1 } END { exit !found }'; then
  printf 'Pi model is unavailable: %s\n' "$selection" >&2
  exit 1
fi

pi_args=(--provider "$provider" --model "$model")
```

Append `--thinking "$requested_thinking"` only when the user specifies a thinking level and `pi --help` advertises the argument. Pass `"${pi_args[@]}"` unchanged after the Herdr-to-Pi argument separator. If the detected launch form cannot forward them, stop before creating resources.

When the user does not specify a provider or model, set `pi_args=()` and omit all provider, model, and thinking flags. This lets each Pi use its normal configured default. Never add a package-preferred model or silently replace an unavailable request.

## Parse every creation response

Ask for JSON only when the command advertises a JSON flag. Some installations return JSON from mutating commands without that flag. Capture standard output and the exit status for every creation.

A common worktree response has the fields below. Validate them rather than copying example IDs:

```bash
jq -e '.result | type == "object"' >/dev/null <<<"$created" || exit 1
workspace_id=$(jq -er '.result.workspace.workspace_id | strings | select(length > 0)' <<<"$created") || exit 1
pane_id=$(jq -er '.result.root_pane.pane_id | strings | select(length > 0)' <<<"$created") || exit 1
worktree_path=$(jq -er '.result.worktree.path | strings | select(length > 0)' <<<"$created") || exit 1
worktree_branch=$(jq -er '.result.worktree.branch | strings | select(length > 0)' <<<"$created") || exit 1
```

If the installed command returns human-readable output rather than JSON, stop unless an advertised structured lookup can recover the new resource by a unique requested name. If it returns another JSON shape, inspect that response and update the `jq` paths to its named fields. Never infer IDs from a sidebar position, a label, or an earlier command. Reject missing and null values.

Before dispatch, validate the returned checkout against the request:

```bash
case "$worktree_path" in /*) ;; *) printf 'Worktree path is not absolute\n' >&2; exit 1 ;; esac
test "$worktree_branch" = "$requested_branch" || exit 1
test "$(git -C "$worktree_path" branch --show-current)" = "$requested_branch" || exit 1
test "$(git -C "$worktree_path" rev-parse HEAD)" = "$base_sha" || exit 1
worktree_top=$(git -C "$worktree_path" rev-parse --show-toplevel) || exit 1
test "$(cd "$worktree_top" && pwd -P)" = "$(cd "$worktree_path" && pwd -P)" || exit 1
source_common=$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir) || exit 1
worktree_common=$(git -C "$worktree_path" rev-parse --path-format=absolute --git-common-dir) || exit 1
test "$source_common" = "$worktree_common" || exit 1
```

Re-query Herdr by the parsed workspace and pane IDs, then confirm their relationship from named JSON fields.

Create Git worktrees one at a time. A command failure or timeout can occur after creation. Before retrying, compare the advertised Herdr worktree list with:

```bash
git worktree list --porcelain
```

## Preserve focus

Use `--no-focus` on creation commands when the relevant help advertises it. Use startup and prompt commands only when their documented behavior keeps focus unchanged. If a required command can change focus and has no non-focusing form, stop before creating resources. Target every later command with a parsed workspace ID, pane ID, or unique agent name. Never omit a target when omission means the currently focused pane.

Agent reads and status queries do not require focus. Prefer them over focus commands while monitoring.

## Restrict review workers

Inspect `pi_help` before launching reviewers. Require the installed equivalents of:

```bash
review_pi_args=(--tools read,grep,find,ls --no-extensions --no-mcp)
```

These flags remove shell and write tools, configured extension tools, and MCP tools. If the installed Pi cannot enforce those restrictions, do not place a reviewer in a shared checkout. A prompt that says "do not edit" is not an access control.

## Dispatch before waiting

For each detected command form:

1. create all required worktrees sequentially;
2. start every agent;
3. inspect any startup timeout before retrying;
4. submit every initial prompt; and
5. only then begin long lifecycle waits.

When parallelizing starts or waits, capture each command's standard output, standard error, and exit status separately. Do not use one final shell `wait` result as proof that every command succeeded.

Use the wait options printed by the installed `agent` group. A command may wait for one exact status or for any of several settled statuses. In either case, inspect the live agent record and recent unwrapped output after the wait. A timeout may leave the agent running.

## Handle lifecycle states as observations

- `working` means Herdr observed work in progress. It does not identify which prompt caused that work.
- `blocked` means Herdr detected a question or approval UI. Read it and ask the user when the answer has side effects or crosses permissions.
- `unknown` means Herdr cannot classify the agent. Inspect the pane, output, process state, and Git state.
- `idle` and `done` mean the agent appears settled. Verify its output, Git state, and checks.

Do not resend a prompt only because a wait timed out or a transition was too fast to observe.
