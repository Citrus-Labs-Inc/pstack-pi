# pstack for Pi

An independent Pi-native adaptation of [ScriptedAlchemy/pstack-codex](https://github.com/ScriptedAlchemy/pstack-codex), based on [Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack).

This first release includes **41 skills**, all **24 engineering principles**, session-branch poteto mode, and bounded read-only review agents. It is a scoped port, not full upstream parity. See [coverage](PARITY.md) and the [runtime contract](PI.md).

## Install

Requires Node.js 22+ and Pi 1.0.4 (`@earendil-works/pi-coding-agent`). Other Pi versions and the older package namespace are not verified.

From this checkout:

```sh
pi install /absolute/path/to/pstack-pi
```

Restart Pi or run `/reload`, then:

```text
/pstack help
/skill:setup-pstack
/pstack on
```

For one session without changing package settings:

```sh
pi -e /absolute/path/to/pstack-pi
```

Use `pi install --local /absolute/path/to/pstack-pi` for project-local installation. Review the source before trusting a project package. Installation does not enable mode, modify AGENTS.md, install agents globally, or configure credentials.

## Use it

| Command | Purpose |
| --- | --- |
| `/pstack on` / `/pstack off` | Enable or disable standing workflow instructions |
| `/pstack status` | Inspect mode and configuration path |
| `/pstack models` | List authenticated model IDs |
| `/skill:how <question>` | Understand code and ownership |
| `/skill:why <question>` | Investigate historical motivation |
| `/skill:architect <change>` | Compare structural designs |
| `/skill:swarm <scope>` | Partition an investigation or review |
| `/skill:arena <decision>` | Compare independent proposals |
| `/skill:interrogate <scope>` | Challenge a change and judge findings |
| `/skill:blast-radius <change>` | Trace downstream risks |
| `/skill:tdd <bug>` | Establish a regression before fixing |
| `/skill:no-comments <scope>` | Audit comments with Comment Sicko |
| `/skill:reflect` | Propose evidence-backed improvements |
| `/skill:poteto-help` | See all workflow categories |

All skills are explicit-only. Mode routes to them as needed without advertising every principle to the model on unrelated tasks. Mode persists on the active session branch, including resume and tree navigation. Start a print-mode task with `pi -e /absolute/path/to/pstack-pi --pstack --print "your task"`.

## Review agents

The `pstack_review` tool runs fresh Pi processes with explorer, reviewer, or designer instructions. Comment Sicko is an optional review persona. Batches support eight tasks with four running at a time. Each child has a five-minute timeout and a 16 MiB output-stream limit. Cancellation terminates children.

Children have `read`, `grep`, `find`, and `ls`. **They cannot write, run git or tests, browse, load extensions or MCP, or delegate recursively.** The parent supplies evidence, implements changes, and verifies results. Failures remain visible; a partial panel is not an approval.

By default, children use the parent's model and thinking level. Optional role preferences live in `~/.pi/agent/pstack-models.json`, respecting `PI_CODING_AGENT_DIR`. Use exact IDs from `/pstack models`; see [configuration](PI.md#model-preferences). Reviews incur ordinary provider costs. No dollar budget is enforced.

Pi must be on PATH. Set `PSTACK_PI_COMMAND` to another Pi executable if necessary. Parent-only provider extensions and one-shot API-key overrides do not transfer to children. Credentials must work in an ordinary Pi subprocess.

This is not an OS sandbox. Children can read files available to your user and send selected content to their model provider. Private full reports remain in the OS temporary directory. Use an isolated environment for untrusted code.

## Develop and verify

```sh
npm ci --ignore-scripts
npm run validate
npm run smoke
npm pack --dry-run
```

Validation covers skill discovery and links, configuration, mode lifecycle, subprocess framing, limits, cancellation, failure propagation, and accounting. The smoke test loads the real extension through Pi and runs an actual Pi child against a local fixture provider, including a real `read` tool call. It uses temporary configuration and no paid model API. This does not prove live provider authentication, review quality, browser behavior, or unattended execution.

## Attribution and scope

MIT. Original copyright and license are retained. The source commit is pinned in [UPSTREAM.json](UPSTREAM.json). [NOTICE](NOTICE) describes attribution. `scripts/import-portable.mjs` reproduces the 30 lightly adapted skill imports; the 11 host-dependent workflows are maintained as native Pi implementations.

Unattended orchestration, writing workers, upstream playbooks and executable helpers, Benny, the HTTP bot bridge, and session-history mining are deferred. Nothing is published or globally installed by this checkout.
