---
name: how
description: Explain how code works, where behavior lives, and which module owns a responsibility. Use why for historical motivation.
disable-model-invocation: true
---

# How

Read [the Pi runtime contract](../../PI.md).

1. Bound the question. For one function or module, inspect directly rather than delegating by habit.
2. For a cross-cutting subsystem, partition two to four distinct exploration angles. Submit them through `pstack_review` with role `explorer`. Give exact paths and a bounded question to each. Children can read source but cannot run git or tests.
3. Follow entry points, data shapes, ownership, state transitions, errors, and callers. Distinguish observed source behavior from runtime inference. Collect missing runtime evidence in the parent when available and in scope.
4. Check the explorers' citations and resolve conflicting claims. A failed explorer is a coverage gap, not corroboration.
5. Present a concise mental model with Overview, Key concepts, Runtime flow, Where things live, and Gotchas. Omit empty sections. Cite real paths and lines. Do not produce an annotated dump of every function.
