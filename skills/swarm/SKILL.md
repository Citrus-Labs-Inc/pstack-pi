---
name: swarm
description: Partition a large read-only investigation or review into bounded independent Pi tasks with explicit coverage.
disable-model-invocation: true
---

# Swarm

Read [the Pi runtime contract](../../PI.md).

1. Name the objective and completion predicate. Make a coverage table of slices, questions, source paths, and expected evidence.
2. Choose the partition: disjoint code areas for coverage, independent hypotheses for diagnosis, or shared scope with separate risk lenses for a review. Avoid several vague copies of the same task.
3. Submit up to eight `pstack_review` tasks per batch. The tool runs at most four concurrently. Use `explorer`, `reviewer`, or `designer` roles and preserve all requested slices across additional batches.
4. Keep briefs bounded. Children have no parent transcript, bash, write tools, integrations, or recursive delegation. The parent supplies diffs and external evidence, performs edits, and runs tests. Do not promise parallel implementation workers.
5. Record every slice as completed, failed, or unexamined. Validate citations, resolve conflicting findings, and run the highest-value proposed checks in the parent.

Return the coverage table, synthesized evidence, unanswered questions, and next action. Do not call a partial swarm a full review. For competing complete designs, use [arena](../arena/SKILL.md).
