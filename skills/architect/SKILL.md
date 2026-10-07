---
name: architect
description: Explore domain models, ownership, and boundary contracts before implementing a nontrivial structural change.
disable-model-invocation: true
---

# Architect

Read [the Pi runtime contract](../../PI.md), [Model the domain](../principle-model-the-domain/SKILL.md), and [Boundary discipline](../principle-boundary-discipline/SKILL.md).

1. Write the intent, constraints, actual callers, and success criteria. Name the current data shape and invariant.
2. For a meaningful design fork, submit two or three independent `pstack_review` tasks with role `designer`. Give the same problem and code pointers; ask for structurally different solutions, including the smallest useful change. Do not delegate trivial naming choices.
3. Compare proposals by invariant strength, ownership, number of concepts, migration cost, testability, and fit with real callers. Model diversity requires different verified model IDs, not different labels.
4. Choose a base design. Borrow another proposal's part only when it preserves a coherent model; do not combine every abstraction.
5. Produce a concrete sketch with types, state transitions, signatures, caller migration, and an executable acceptance check. Identify the cheapest prototype for unresolved empirical questions.

Stop at the sketch unless implementation was requested. Children only propose; the parent implements and verifies. Report rejected alternatives and the evidence behind the choice.
