# Detect the installed Herdr commands

Herdr command forms can differ between installations. Detect capabilities on every swarm run. Do not select commands from a remembered version number.

## Print safe help

Run top-level and command-group help only after the skill's `HERDR_ENV=1` check. Select only groups needed by the chosen topology: `workspace`, `pane`, and `agent` for reviews; add `worktree` for writing or integration lanes.

```bash
herdr --version
herdr --help
agent_help=$(herdr agent 2>&1 || true)
pane_help=$(herdr pane 2>&1 || true)
workspace_help=$(herdr workspace 2>&1 || true)
if [[ $swarm_type != review ]]; then
  worktree_help=$(herdr worktree 2>&1 || true)
  worktree_create_help=$(herdr worktree create --help 2>&1) || exit 1
fi

agent_start_help=$(herdr agent start --help 2>&1) || exit 1
agent_prompt_help=$(herdr agent prompt --help 2>&1 || true)
agent_get_help=$(herdr agent get --help 2>&1) || exit 1
agent_read_help=$(herdr agent read --help 2>&1) || exit 1
agent_wait_help=$(herdr agent wait --help 2>&1) || exit 1
pane_run_help=$(herdr pane run --help 2>&1 || true)

pi_discovery_args=(
  --no-extensions --no-mcp --no-skills --no-prompt-templates
  --no-themes --no-context-files --no-approve
)
pi_help=$(pi "${pi_discovery_args[@]}" --help 2>&1) || exit 1
```

`--help` is the only allowed way to inspect a nested mutating command. Never run bare `herdr`, and never probe `workspace create`, `worktree create`, or another mutating command by omitting its arguments.

Before each operation, inspect its full nested help and confirm the target type, argument separator, and flags. Use only advertised options. In particular, do not assume that `--json`, `--kind`, `--pane`, `--cwd`, `--workspace`, `--no-focus`, `--wait`, `--until`, and `--status` exist.

## Build optional Pi arguments

If the user gives `provider/model-id`, split only at the first slash. Model IDs may contain more slashes. Run model discovery with the same resource-disabled arguments used for help.

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

if ! pi "${pi_discovery_args[@]}" --list-models 2>/dev/null \
  | awk -v provider="$provider" -v model="$model" \
    '$1 == provider && $2 == model { found=1 } END { exit !found }'; then
  printf 'Pi model is unavailable: %s\n' "$selection" >&2
  exit 1
fi

pi_args=(--no-approve --provider "$provider" --model "$model")
```

Append `--thinking "$requested_thinking"` only when the user specifies a thinking level and `pi_help` advertises the argument. When the user does not specify a provider or model, set `pi_args=(--no-approve)` and omit provider, model, and thinking flags so each Pi uses its normal model configuration. `--no-approve` is mandatory for every worker: it prevents a worktree's project-local resources from loading before the lane prompt while preserving the user's Herdr integration. Never add a package-preferred model or silently replace an unavailable request.

For review workers, append the complete restricted arguments in [Restrict review workers](#restrict-review-workers) to `pi_args`. Pass the final array unchanged after the Herdr-to-Pi separator. If the detected launch form cannot forward it, stop before creating resources.

## Detect and use the installed agent launch form

Classify from full nested help, not a remembered version or a terse group listing:

```bash
if grep -q -- '--kind' <<<"$agent_start_help" \
  && grep -q -- '--pane' <<<"$agent_start_help" \
  && grep -Eiq -- '\[--[[:space:]]+[^]]*(arg|argv|command)' <<<"$agent_start_help" \
  && grep -q 'Usage: herdr agent prompt' <<<"$agent_prompt_help"; then
  agent_form=managed-pane
elif grep -Eiq -- '--[[:space:]]+<(argv|command)|\[--[[:space:]]+[^]]*(argv|command)' <<<"$agent_start_help" \
  && grep -Eq -- '--cwd|--workspace' <<<"$agent_start_help"; then
  agent_form=raw-launch
else
  printf 'Unsupported Herdr agent start form:\n%s\n' "$agent_start_help" >&2
  exit 1
fi
```

Treat these labels as local control-flow names. Adapt metavariable spellings only after reading the complete usage. Define a readiness check that never prompts into startup, approval, or unknown UI:

```bash
require_ready() {
  agent_info=$(herdr agent get "$agent_name") || return 1
  agent_status=$(jq -er '.result.agent.agent_status | strings' <<<"$agent_info") || return 1
  case "$agent_status" in
    idle|done) return 0 ;;
    blocked|unknown|working)
      herdr agent read "$agent_name" --source recent-unwrapped --lines 120 || true
      return 1 ;;
    *) return 1 ;;
  esac
}
```

For `managed-pane`, first verify with `pane process-info` that the assigned pane is at an interactive shell prompt with no foreground command. Then:

```bash
start=(herdr agent start "$agent_name" --kind pi --pane "$pane_id")
((${#pi_args[@]} == 0)) || start+=(-- "${pi_args[@]}")
if ! start_result=$("${start[@]}"); then
  herdr agent get "$agent_name" || true
  herdr agent read "$agent_name" --source recent-unwrapped --lines 120 || true
  exit 1
fi
require_ready || exit 1
herdr agent prompt "$agent_name" "$worker_prompt" || exit 1
```

For `raw-launch`, require `--no-focus` and the `--` separator. Prefer `--cwd "$checkout_path"` when advertised. Otherwise use `--workspace "$workspace_id"` only after verifying that workspace's cwd. Do not pass both selectors unless full help explicitly permits both.

```bash
start=(herdr agent start "$agent_name" --no-focus)
if grep -q -- '--cwd' <<<"$agent_start_help"; then
  start+=(--cwd "$checkout_path")
elif grep -q -- '--workspace' <<<"$agent_start_help"; then
  start+=(--workspace "$workspace_id")
else
  exit 1
fi
start+=(-- pi "${pi_args[@]}")
if ! start_result=$("${start[@]}"); then
  herdr agent get "$agent_name" || true
  exit 1
fi
require_ready || exit 1
agent_pane=$(jq -er '.result.agent.pane_id | strings | select(length > 0)' <<<"$agent_info") || exit 1
herdr pane run "$agent_pane" "$worker_prompt" || exit 1
```

Use raw launch only when full help confirms that `pane run` atomically sends text plus Enter. If any required launch, argument-forwarding, prompt, status, read, or wait capability is absent or ambiguous, stop with the captured help. Submit every initial prompt before beginning any long wait.

## Parse every creation response

Ask for JSON only when the command advertises a JSON flag. Some installations return JSON from mutating commands without that flag. Capture standard output and the exit status for every creation.

A common writing-lane creation form is shown below. Use it only when `worktree_create_help` advertises every flag, including `--no-focus`; otherwise stop before creation. Omit `--json` unless help explicitly advertises it:

```bash
create=(herdr worktree create --cwd "$repo" --branch "$requested_branch" --base "$base_sha" --label "$label" --no-focus)
created=$("${create[@]}") || exit 1
```

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
git -C "$repo" worktree list --porcelain
```

## Preserve focus

Before creating any topology, require the relevant nested help to advertise `--no-focus`; otherwise stop. Use `--no-focus` on every creation command. Use startup and prompt commands only when their documented behavior keeps focus unchanged. If a required command can change focus and has no non-focusing form, stop before creating resources. Target every later command with a parsed workspace ID, pane ID, or unique agent name. Never omit a target when omission means the currently focused pane.

Agent reads and status queries do not require focus. Prefer them over focus commands while monitoring.

## Restrict review workers

Inspect `pi_help` before launching reviewers. Require the installed equivalents of:

```bash
review_pi_args=(
  --tools read,grep,find,ls
  --no-extensions --no-mcp --no-skills --no-prompt-templates
  --no-themes --no-context-files
)
```

Append `review_pi_args` to any verified model arguments for review workers only. These flags remove shell and write tools, configured extension and MCP tools, and project-controlled instruction resources. Use the same resource-disabled flags for `pi --help` and model discovery so preflight cannot load project extensions. If the installed Pi cannot enforce those restrictions, do not place a reviewer in a shared checkout. A prompt that says "do not edit" is not an access control.

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
