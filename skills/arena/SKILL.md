---
name: arena
description: Compare independent design or diagnostic proposals, select a coherent base, and identify an experiment that can decide between them.
disable-model-invocation: true
---

# Arena

Read [the Pi runtime contract](../../PI.md).

1. Freeze the problem statement, scope, constraints, and judging criteria before seeing proposals.
2. Run two to four independent `pstack_review` tasks with role `designer` for designs or `reviewer` for diagnostics. Give all entrants the same evidence. Use distinct verified models when requested and available; disclose same-model runs.
3. Require each entrant to name assumptions, a concrete solution using real symbols, risks, and a cheap falsification test. This release compares written proposals, not autonomous code branches.
4. Compare against the frozen criteria. Select one base. Graft a part from another proposal only when its contract fits the base without unnecessary complexity.
5. If a decision depends on empirical behavior, the parent implements the smallest in-scope prototype and runs it. Do not call prose comparison a benchmark.

Report the comparison, chosen base, rejected alternatives, borrowed parts, and evidence. Failed entrants remain visible. Implementation and external actions still require the user's scope and authorization.
