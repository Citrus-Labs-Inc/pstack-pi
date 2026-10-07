---
name: no-comments
description: Audit narrating and workaround comments with the read-only Comment Sicko persona, then make only justified in-scope fixes.
disable-model-invocation: true
---

# No comments

Read [the Pi runtime contract](../../PI.md).

1. Establish the exact files or diff to review. Collect the diff in the parent.
2. Submit a `pstack_review` task with role `reviewer` and persona `comment-sicko`. Give absolute paths, scope, and intent. The persona proposes changes but cannot edit.
3. Judge findings yourself. Remove accepted narration and dead commented-out code only within the requested scope. Do not remove licenses, generated markers, documentation contracts, justified suppressions, or uncertain safety constraints.
4. If a comment explains a workaround, investigate the root cause with `how` or `why`. Prefer a small structural fix over deleting its explanation. Use `architect` for a genuine shape decision, not every comment.
5. Propose the cheapest type, test, or lint that encodes a real constraint. Do not widen the task to build enforcement without authorization. Keep an uncertain constraint comment and report the unresolved question.
6. Run relevant checks in the parent. Report accepted deletions, structural fixes, protected comments, and unresolved constraints. A comment count is not a quality metric.
