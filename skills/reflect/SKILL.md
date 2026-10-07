---
name: reflect
description: Review a completed task for demonstrated lessons and propose the smallest durable code, test, or workflow improvement.
disable-model-invocation: true
---

# Reflect

Read [the Pi runtime contract](../../PI.md) and [Encode lessons in structure](../principle-encode-lessons-in-structure/SKILL.md).

1. Gather the current task's stated goal, decisions, corrections, test results, and final diff. Do not mine unrelated private session history.
2. Identify demonstrated failures and avoidable rework. Separate tooling gaps, judgment errors, and missing evidence. A preference expressed once is not automatically a global rule.
3. For a large task, ask bounded `pstack_review` reviewers to challenge the lessons from independent angles, supplying evidence explicitly. Do not ask them to reconstruct the parent conversation.
4. For each accepted lesson, choose the smallest useful encoding: simpler code, an invariant, a test, a lint, a script, or a scoped instruction. Prefer enforcement to repeating prose when the cost is justified.
5. Present the proposed change, its evidence, benefit, and cost. Apply only changes within the user's request. Do not silently edit this installed package, global instructions, or another project's skills.

Return a short list of accepted lessons and concrete changes, plus rejected generalizations. State when the task offers no new durable lesson.
