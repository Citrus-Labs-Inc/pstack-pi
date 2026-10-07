---
name: interrogate
description: Adversarially review a change with independent Pi reviewers and synthesize actionable findings without automatically editing code.
disable-model-invocation: true
---

# Interrogate

Read [the Pi runtime contract](../../PI.md).

1. Determine the exact scope from the request. Collect the relevant diff, working-tree changes, source, and tests in the parent. Do not assume a base branch named main exists.
2. State the intent before reviewing. Include real constraints and what is explicitly out of scope.
3. Submit two to four `pstack_review` tasks with role `reviewer`. For a multi-model request, use distinct available model IDs from `/pstack models` or `pi --list-models`, honoring the user's choices. If only one model is usable, disclose that and use independent same-model runs without claiming model diversity.
4. Give every reviewer the same intent, scope, and rubric: correctness, boundary cases, security, API compatibility, failure recovery, and unnecessary complexity. Include the diff text or its absolute artifact path. Children cannot execute git or tests. Require each finding to cite a path and line, a concrete failure, and the cheapest verification.
5. Wait for every result. A failed reviewer leaves coverage incomplete. Inspect each finding yourself. Agreement helps prioritize investigation but does not establish truth; check lone-reviewer findings too.
6. Deduplicate and categorize findings as Act on, Consider, Noted, or Dismissed. Give a short reason for each judgment. Execute scoped checks in the parent when authorized and useful.

Return intent, actual reviewer models and statuses, findings by category, agreement and disagreement, and verification gaps. No automatic edits, commits, or external posting. The deliverable is a verdict, not a count of objections.
