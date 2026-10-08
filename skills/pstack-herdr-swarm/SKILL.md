---
name: pstack-herdr-swarm
description: Run an explicitly requested Herdr swarm of Pi agents for parallel review or isolated Git worktree implementation, then verify and integrate the results safely.
disable-model-invocation: true
compatibility: Requires a Herdr-managed pane plus herdr, pi, git, and jq on PATH.
---

# Orchestrate a Herdr swarm

Read [the Pi runtime contract](../../PI.md), [the Herdr CLI compatibility guide](references/cli-compatibility.md), and [the worker prompt contract](references/worker-prompt.md) before creating anything.

Use this skill only after the user invokes `/skill:pstack-herdr-swarm`. Do not infer permission to use Herdr or start agents from a request to work in parallel.

## Choose the swarm type

Use one of these types:

- A **review swarm** uses Pi agents with only `read`, `grep`, `find`, and `ls`. Disable extensions and MCP tools. The agents may share one checkout only while its contents remain unchanged. If files may change during the review, give every reviewer the same immutable diff artifact or a review-only worktree at a recorded commit.
- A **writing swarm** gives every writer a separate Git worktree and branch from one base commit. Never run concurrent writers in one checkout. Do not let two worktrees share a branch.

A review agent may inspect a writer's worktree after that writer has stopped editing. Do not turn a shared review checkout into a writing checkout.

## Preflight before creating resources

1. Confirm that the caller is inside Herdr and that the required programs exist:

   ```bash
   test "${HERDR_ENV:-}" = 1 || exit 1
   command -v herdr pi git jq >/dev/null || exit 1
   git rev-parse --show-toplevel >/dev/null || exit 1
   ```

   If `HERDR_ENV` is not `1`, stop. Do not control another Herdr session from outside Herdr.

2. Discover the installed Herdr commands on every run. The installed binary is authoritative. Follow the compatibility guide instead of copying commands from an earlier run. Never run bare `herdr`, because that can open the TUI.

3. Confirm that the installed groups advertise structured workspace and agent lists. Then inspect the current state before choosing names or paths:

   ```bash
   git status --short --branch || exit 1
   git worktree list --porcelain || exit 1
   herdr workspace list || exit 1
   herdr agent list || exit 1
   ```

   Run `herdr worktree list` and `herdr integration status` only in forms advertised by the installed command groups. Stop if a required structured list or lookup is absent. Do not install, enable, or change an integration.

4. Record one immutable base for all writing lanes:

   ```bash
   repo=$(git rev-parse --show-toplevel) || exit 1
   base_sha=$(git rev-parse HEAD) || exit 1
   ```

5. Handle the checkout state explicitly:

   - If writers do not need uncommitted files, branch every worktree from `base_sha` and leave the dirty checkout untouched.
   - If writers need uncommitted files, stop and ask how the user wants to preserve them. A linked worktree does not contain uncommitted changes.
   - Never commit, stash, copy, discard, or reset the user's changes to prepare a swarm.
   - A review swarm may read a dirty checkout only if the checkout stays unchanged. Otherwise save the complete relevant diff and untracked inputs as an immutable artifact, or use a review-only worktree at a recorded commit. Include that boundary in every review prompt.

6. If the user specified a Pi provider and model, verify the exact `provider/model-id` and pass both exact values to every requested worker. Pass a thinking argument only if the user specified one. Do not substitute another model. If the user did not specify a provider or model, pass no provider, model, or thinking arguments. Each Pi process then uses its normal configuration. The compatibility guide defines the check and argument construction.

## Split the objective into lanes

Write the completion predicate before starting agents. Give each lane:

1. a short, unique agent name;
2. one concrete deliverable or review question;
3. owned files, modules, or a bounded concern;
4. forbidden overlap and dependencies;
5. targeted validation; and
6. required evidence, including changed files and a commit SHA for a writer.

Prefer independent feature slices. Do not use several vague prompts that ask each agent to solve the whole task. Schedule a dependent reviewer or integrator only after its inputs exist.

Check agent names, branch names, and worktree paths for conflicts. Agent names must match the constraint printed by the installed Herdr CLI. Use distinct branches such as `herdr/<task>/<lane>` for writing lanes.

## Create the topology

For a review swarm, create the requested panes or workspaces with the stable checkout as their working directory. Use explicit returned IDs and a creation command that guarantees no focus change.

For a writing swarm, create linked worktrees **sequentially** because Git worktree creation changes shared repository metadata. For each lane:

1. create the worktree from the same `base_sha` with a unique branch and `--no-focus` when supported;
2. capture the JSON response;
3. parse the workspace ID, root pane ID, worktree path, and branch with checked `jq -e` calls;
4. reject a missing, null, or empty value; and
5. before dispatch, verify that the path is absolute, the branch equals the requested branch, the checkout belongs to `repo`, and its `HEAD` equals `base_sha`. Re-query Herdr by the returned IDs and confirm that the pane and worktree belong to the new workspace.

Do not predict an ID, derive an ID from display order, or blindly retry a failed creation. Inspect both `herdr worktree list` and `git worktree list --porcelain` before any retry.

## Launch every worker before waiting

Use the command form detected during preflight. Start Pi in each assigned pane or worktree. Preserve the user's focus for every start and prompt. If the detected commands cannot pass required Pi arguments or guarantee no focus change, stop before creating resources.

For every review worker, use Pi's advertised equivalents of `--tools read,grep,find,ls --no-extensions --no-mcp`. If the installed Pi cannot remove write, shell, extension, custom, and MCP tools, do not share a checkout. Use an OS-level read-only copy or stop. A prompt prohibition alone does not make an agent read-only.

Build each prompt from the worker prompt contract. Include the absolute checkout path, the branch, the shared base commit, ownership, exclusions, checks, and completion evidence. Do not include secrets or unrelated conversation history.

Start all agents and submit all initial prompts before any long wait. A sequential worktree setup does not justify serial worker execution. If startup or prompt submission fails, inspect the live agent and pane before retrying. A timeout does not prove that the process or turn stopped.

If the user asked only to start the swarm, report each agent name, branch, worktree path, and goal after dispatch. Do not wait for completion unless requested.

## Monitor lifecycle without assuming success

For an end-to-end request, use Herdr lifecycle waits with bounded, non-busy timeouts. Wait for independent workers in parallel when the available tools make failures observable.

For each agent:

1. inspect its agent record by unique name or pane ID;
2. if the state is `blocked`, read the recent unwrapped output and surface the question;
3. if the state is `unknown`, inspect the pane and output instead of treating the work as complete;
4. after `idle` or `done`, read the recent unwrapped output; and
5. verify the checkout and required checks independently.

The states `blocked`, `unknown`, `idle`, and `done` are observations. None proves correctness. Do not answer approval, credential, deployment, destructive Git, or external-side-effect questions without the user's authorization. Do not resend a timed-out prompt until inspection proves that the original turn is no longer running.

Use read commands rather than focus commands. CLI reads preserve which pane the user is viewing.

## Verify each lane

Do not rely on a worker's summary. For each writing worktree, inspect at least:

```bash
test -z "$(git -C "$worktree_path" status --porcelain)" || exit 1
test "$(git -C "$worktree_path" branch --show-current)" = "$expected_branch" || exit 1
git -C "$worktree_path" merge-base --is-ancestor "$base_sha" HEAD || exit 1
lane_commits=$(git -C "$worktree_path" rev-list --reverse "$base_sha"..HEAD) || exit 1
test -n "$lane_commits" || exit 1
git -C "$worktree_path" diff "$base_sha"...HEAD --stat || exit 1
git -C "$worktree_path" diff --check "$base_sha"...HEAD || exit 1
```

Require a clean worktree, the expected branch, and `base_sha` as an ancestor. Review the full diff for scope violations, overlap, generated files, secrets, and unrelated formatting. Run the lane's checks yourself when practical. Prefer one focused commit. If a lane has several commits, record and verify the complete ordered range. Read commit SHAs from Git, not only from terminal output.

Mark every lane as passed, failed, blocked, or unverified. Do not call partial results a completed swarm.

## Integrate verified commits

Decide the integration branch and record its target SHA before changing it. Do not mutate a dirty user checkout. Re-check the target immediately before integration. If it moved, stop and decide how to handle the drift.

For nontrivial integration, create a separate integration worktree from the recorded target SHA. Confirm that `base_sha` is an ancestor of that target, then cherry-pick every verified lane commit in its recorded order. Normal cherry-picks create the integration history, so do not add an empty summary commit. If two lanes changed overlapping code unexpectedly, stop automatic integration and choose or ask for a merge strategy. Resolve interface conflicts deliberately, run lane checks plus cross-cutting checks, and inspect the combined diff.

An integration agent is not a trust boundary. Independently inspect its conflicts, diff, checks, and final tip SHA. Do not claim that the user's original branch contains the result unless Git proves that it does.

## Report and leave resources intact

Report:

- each lane's outcome;
- each agent name, branch, worktree path, and commit SHA;
- checks run and exact failures;
- the integration branch, path, and commit;
- whether the user's original branch changed; and
- unresolved risks or decisions.

Do not close panes or workspaces, stop agents, remove worktrees, delete branches, or clean temporary state unless the user asks. If the user requests cleanup, re-query every swarm-owned ID and path, stop only those agents, require clean worktrees, and remove them without force. Delete branches only with separate explicit authorization.
