---
name: why
description: Investigate why a design or behavior exists using source history and contemporaneous evidence, without inventing intent.
disable-model-invocation: true
---

# Why

Read [the Pi runtime contract](../../PI.md).

1. State the behavior or design decision being explained. Use `how` if its current mechanism is unclear.
2. In the parent, inspect scoped git history, blame, commit messages, tests, and linked design records. Use connected issue or review tools only when actually available. Do not search unrelated private sessions or communications.
3. Separate sources into contemporary author statements, code and test evidence, later explanations, and your own inference. A plausible engineering rationale is not proof of the author's intent.
4. For broad questions, give `pstack_review` explorers independent hypotheses and exact source or evidence-file paths. Children cannot fetch history or external records themselves. Include the evidence they need.
5. Synthesize the best-supported explanation and competing hypotheses. Cite source paths, commits, or URLs you actually inspected. A search with no result is a legitimate gap, not permission to invent a citation.

Report what the decision achieved, constraints that still apply, constraints that may have expired, and what evidence would change the conclusion. Label motivation as unknown when the record does not establish it.
