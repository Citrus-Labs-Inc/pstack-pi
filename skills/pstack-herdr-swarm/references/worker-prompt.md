# Write bounded worker prompts

A Herdr worker has no reliable access to the orchestrator's conversation. Put the lane's facts, limits, and evidence requirements in its prompt.

## Writing lane template

```text
You are worker <agent-name> in a parallel Herdr run.

Repository and worktree: <absolute-path>
Branch: <branch>
Shared base commit: <base-sha>

Overall objective
<one paragraph that states the user-visible result>

Your lane
<one concrete deliverable>

Ownership
- You own only: <files, modules, APIs, or concern>
- Do not edit: <other lanes and unrelated paths>
- Preserve these contracts: <interfaces and dependencies>

Requirements
- <acceptance criterion>
- Read the repository instructions and relevant code before editing.
- Do not cherry-pick or incorporate another worker's branch.
- Do not change architecture outside this lane to make the task easier.
- Do not deploy, publish, push, alter credentials, or run destructive Git commands.

Validation
- Run: <targeted commands>
- Add or update tests when this lane changes behavior.
- Inspect the final diff for unrelated changes, generated files, and secrets.

Completion
- Commit the lane on this branch with a focused message.
- End with the outcome, changed files, exact check results, the complete ordered commit SHA list, assumptions, integration notes, and remaining risks.
- If blocked, state the exact missing input or decision. Do not guess across a consequential boundary.
```

Use the absolute path and actual branch from parsed Herdr output. Include the same base commit in every writing prompt. Name both positive ownership and forbidden overlap.

## Review lane template

```text
You are read-only reviewer <agent-name> in a parallel Herdr run.

Checkout: <absolute-path>
Review boundary: <commit range, immutable saved diff, or stable checkout state>

Question
<one bounded review question or risk lens>

Evidence
- Inspect: <specific paths and symbols>
- Report only actionable findings with severity, file and line evidence, impact, and a proposed fix.
- State what you checked and what you could not check.

Constraints
- Your Pi process has only read, grep, find, and ls tools. Do not attempt to obtain shell, write, extension, custom, or MCP tools.
- Do not edit files, create commits, change branches, stash changes, or run commands that mutate the checkout.
- Do not deploy, publish, push, alter credentials, or approve external actions.
```

Several reviewers may share a checkout only while their Pi processes lack write, shell, extension, custom, and MCP tools and the checkout stays unchanged. If files may change, give each reviewer the same immutable artifact or a review-only worktree at a recorded commit.

## Integration lane template

Create an integration agent only after the orchestrator has verified the input commits.

```text
You are integrator <agent-name> in a parallel Herdr run.

Integration worktree: <absolute-path>
Integration branch: <branch>
Base commit: <base-sha>
Verified commits in order: <sha list>

Goal
Integrate only the listed commits and preserve these contracts: <contracts>.

Requirements
- Inspect each commit before applying it.
- Resolve conflicts according to the stated contracts. Do not silently drop either lane's behavior.
- Do not add unrelated cleanup or redesign.
- Do not deploy, publish, push, alter credentials, or run destructive Git commands.

Validation
- Run each lane's checks: <commands>
- Run these combined checks: <commands>
- Inspect the combined diff for scope, secrets, and generated files.

Completion
- Use normal ordered cherry-picks. Their final tip is the integrated result. Do not create an empty summary commit.
- Report each applied commit, conflict decisions, changed files, exact check results, final tip SHA, and remaining risks.
- If a conflict has no stated resolution, stop and report the decision needed.
```

The orchestrator must still inspect and test the integrated result.

## Prompt rules

- Give every worker one bounded responsibility.
- Include acceptance criteria instead of only suggesting an implementation.
- Name checks when known. Otherwise require the worker to find the narrowest relevant checks.
- Do not paste secrets, tokens, credentials, or unrelated transcript history.
- Do not ask a worker to manage another agent.
- Do not ask all workers to solve the full objective.
- Require writers to commit. Tell analysis-only workers not to edit or commit.
- Require a concise completion report, but verify every claim from the checkout.
