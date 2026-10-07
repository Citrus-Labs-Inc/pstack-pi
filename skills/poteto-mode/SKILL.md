---
name: poteto-mode
description: Use pstack's deliberate engineering workflow for investigation, design, implementation, review, and verified delivery.
disable-model-invocation: true
---

# Poteto mode for Pi

Read [the Pi runtime contract](../../PI.md) before working. A direct invocation applies this workflow to the current request. For persistent session-branch routing, the user runs `/pstack on`. Do not claim that reading this file toggles the extension.

## Work within the request

State the objective and the observable completion condition. Inspect the repository and existing changes before editing. Preserve unrelated work. Proceed with reversible work inside the user's scope; ask only for genuine product choices or missing authorization. A workflow does not authorize publishing, merging, deploying, external messages, or deleting data.

For nontrivial work, keep a short checklist. Each unit ends in an executable check. Name the data shape, ownership, and invariant before adding logic. Prefer the smallest complete solution over speculative layers or compatibility paths.

## Route deliberately

Load each applicable skill by reading its SKILL.md relative to this directory. Do not cite a principle as applied unless you read its leaf instructions.

| Trigger | Read |
| --- | --- |
| Understand a subsystem or choose where code belongs | `../how/SKILL.md` |
| Explain motivation or historical constraints | `../why/SKILL.md` |
| Change boundaries, ownership, or domain structure | `../architect/SKILL.md` |
| Partition a large investigation or review | `../swarm/SKILL.md` |
| Compare competing design sketches | `../arena/SKILL.md` |
| Challenge a consequential design or implementation | `../interrogate/SKILL.md` |
| Assess effects beyond a diff | `../blast-radius/SKILL.md` |
| Fix a bug with a cheap regression target, or explicit TDD | `../tdd/SKILL.md` |
| Review comments before delivery | `../no-comments/SKILL.md` |
| Measure performance | `../benchmark-checklist/SKILL.md` |
| Write TypeScript | `../typescript-best-practices/SKILL.md` |
| Write docs, PR descriptions, or commit messages | `../technical-writing/SKILL.md` |
| Write user-facing prose | `../unslop/SKILL.md` |
| Learn from a completed task | `../reflect/SKILL.md` |

Use the smallest useful workflow. Do not turn a trivial edit into an expensive panel. `pstack_review` supplies read-only explorers, reviewers, and designers. The parent performs implementation and runtime verification. Submit a bounded brief and source pointers, not the entire conversation. Identify the actual models used and incomplete reviews. Never present same-model runs as multi-model agreement.

## Ground decisions in principles

All 24 engineering principles are bundled as `../principle-<name>/SKILL.md`.

- Structure: `model-the-domain`, `foundational-thinking`, `boundary-discipline`, `type-system-discipline`, `make-operations-idempotent`, `separate-before-serializing-shared-state`.
- Simplicity: `laziness-protocol`, `subtract-before-you-add`, `minimize-reader-load`, `migrate-callers-then-delete-legacy-apis`.
- Design: `redesign-from-first-principles`, `attack-the-premise`, `experience-first`, `exhaust-the-design-space`, `outcome-oriented-execution`.
- Evidence: `prove-it-works`, `fix-root-causes`, `sequence-verifiable-units`, `test-behavior-not-implementation`, `explain-the-number`.
- Throughput: `build-the-lever`, `guard-the-context-window`, `never-block-on-the-human`, `encode-lessons-in-structure`.

Read only the principles relevant to a real decision. The user's scope, permissions, and approval gates take precedence over autonomy slogans.

## Verify and hand back

For a bug, reproduce before fixing when practical. Run the narrow regression check, then the nearby suite. For an interface, exercise the real CLI, UI, or API rather than treating typechecking as runtime proof. If a browser or integration is missing, state that limitation.

Inspect the final diff for unrelated edits, dead code, narrating comments, and unnecessary guards. Report what changed, the commands actually run and their results, and unresolved risks. Distinguish measured facts, inferences, and untested assumptions. Do not fabricate links or pass through a child's conclusion without checking its evidence.

For long work, keep a user-approved local resume note with decisions, evidence, paths, and remaining checks. Pi session persistence is not a scheduler. On pause, save state and stop cleanly. Do not promise an unattended wakeup.
