import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import pstack from "../extensions/pstack.ts";
import type { ReviewResult } from "../src/runner.ts";

type Handler = (event: any, ctx: any) => any;
function harness(flag = false) {
  const handlers = new Map<string, Handler>();
  const commands = new Map<string, Parameters<ExtensionAPI["registerCommand"]>[1]>();
  const tools: Parameters<ExtensionAPI["registerTool"]>[0][] = [];
  let branch: any[] = [];
  const notifications: string[] = [];
  const statuses: (string | undefined)[] = [];
  const api = {
    on: (name: string, fn: Handler) => { handlers.set(name, fn); },
    registerFlag: () => {}, getFlag: () => flag,
    registerCommand: (name: string, command: Parameters<ExtensionAPI["registerCommand"]>[1]) => commands.set(name, command),
    registerTool: (tool: Parameters<ExtensionAPI["registerTool"]>[0]) => tools.push(tool),
    appendEntry: (customType: string, data: unknown) => branch.push({ type: "custom", customType, data }),
    sendMessage: (message: { content: string }) => notifications.push(message.content),
  } as unknown as ExtensionAPI;
  const ctx = {
    cwd: tmpdir(), hasUI: true, thinkingLevel: "high",
    model: { provider: "test", id: "reviewer" },
    modelRegistry: { getAvailable: () => [{ provider: "test", id: "reviewer" }] },
    sessionManager: { getBranch: () => branch },
    ui: { setStatus: (_name: string, status?: string) => statuses.push(status), notify: (text: string) => notifications.push(text) },
  } as unknown as ExtensionCommandContext;
  pstack(api);
  const emit = (name: string, event: any = {}) => handlers.get(name)?.(event, ctx);
  return { ctx, tools, notifications, statuses, emit,
    command: (args: string) => commands.get("pstack")!.handler(args, ctx),
    setBranch: (entries: any[]) => { branch = entries; },
    getBranch: () => [...branch],
    prompt: async () => {
      const event = { systemPromptOptions: { sections: { existing: "keep me" } as Record<string, string> } };
      await emit("before_agent_start", event);
      return event.systemPromptOptions.sections;
    },
  };
}

test("mode is opt-in, preserves other prompt sections, and turns off", async () => {
  const h = harness();
  await h.emit("session_start", { reason: "startup" });
  assert.deepEqual(await h.prompt(), { existing: "keep me" });
  await h.command("on");
  const sections = await h.prompt();
  assert.equal(sections.existing, "keep me");
  assert.match(sections.pstack, /Poteto mode for Pi/);
  assert.match(sections.pstack, /Package root:/);
  assert.ok(!sections.pstack.includes("disable-model-invocation"));
  await h.command("off");
  assert.deepEqual(await h.prompt(), { existing: "keep me" });
  assert.equal(h.statuses.at(-1), undefined);
});
test("resume, reload, fork, and tree navigation restore only the active branch", async () => {
  const h = harness();
  await h.command("on");
  const onBranch = h.getBranch();
  await h.command("off");
  for (const reason of ["resume", "reload", "fork"]) {
    h.setBranch(onBranch);
    await h.emit("session_start", { reason });
    assert.match((await h.prompt()).pstack, /Poteto mode/);
  }
  h.setBranch([]);
  await h.emit("session_tree");
  assert.equal((await h.prompt()).pstack, undefined);
  h.setBranch(onBranch);
  await h.emit("session_tree");
  assert.match((await h.prompt()).pstack, /Poteto mode/);
  h.setBranch([]);
  await h.emit("session_start", { reason: "new" });
  assert.equal((await h.prompt()).pstack, undefined);
});
test("CLI flag starts this session on but does not enable unrelated new sessions", async () => {
  const h = harness(true);
  await h.emit("session_start", { reason: "startup" });
  assert.match((await h.prompt()).pstack, /Poteto mode/);
  assert.equal(h.getBranch().length, 1);
  h.setBranch([]);
  await h.emit("session_start", { reason: "new" });
  assert.equal((await h.prompt()).pstack, undefined);
});
test("unknown commands do not toggle mode; non-UI status does not require a dialog", async () => {
  const h = harness();
  await h.command("surprise");
  assert.match(h.notifications.at(-1)!, /Unknown/);
  assert.equal((await h.prompt()).pstack, undefined);
  Object.assign(h.ctx, { hasUI: false, ui: undefined });
  await h.command("status");
  assert.match(h.notifications.at(-1)!, /off/);
});
test("herdr status reads only the managed environment and works without UI", async () => {
  const keys = ["HERDR_ENV", "HERDR_WORKSPACE_ID", "HERDR_TAB_ID", "HERDR_PANE_ID"] as const;
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const h = harness();
  try {
    await h.command("help");
    assert.match(h.notifications.at(-1)!, /\/pstack herdr/);
    assert.match(h.notifications.at(-1)!, /\/skill:pstack-herdr-swarm/);

    for (const key of keys) delete process.env[key];
    Object.assign(h.ctx, { hasUI: false, ui: undefined });
    await h.command("herdr");
    assert.equal(h.notifications.at(-1), "Herdr: unmanaged (HERDR_ENV is not 1). No Herdr session was inspected.");

    Object.assign(process.env, {
      HERDR_ENV: "1",
      HERDR_WORKSPACE_ID: "w-test",
      HERDR_TAB_ID: "w-test:t2",
      HERDR_PANE_ID: "w-test:p3",
    });
    await h.command("herdr");
    assert.equal(h.notifications.at(-1), [
      "Herdr: managed (HERDR_ENV=1).",
      "HERDR_WORKSPACE_ID=w-test",
      "HERDR_TAB_ID=w-test:t2",
      "HERDR_PANE_ID=w-test:p3",
    ].join("\n"));
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
test("review tool returns partial failures, real usage, and private reports", { skip: process.platform === "win32" }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "pstack-tool-test-"));
  const executable = join(dir, "fake-pi");
  const oldCommand = process.env.PSTACK_PI_COMMAND;
  const oldDir = process.env.PI_CODING_AGENT_DIR;
  const fixture = fileURLToPath(new URL("./fixtures/pi.mjs", import.meta.url));
  const artifactDirs: string[] = [];
  try {
    await writeFile(executable, `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(fixture)} "$@"\n`);
    await chmod(executable, 0o700);
    process.env.PSTACK_PI_COMMAND = executable;
    process.env.PI_CODING_AGENT_DIR = dir;
    const h = harness();
    assert.equal(h.tools[0].executionMode, "sequential");
    const result = await h.tools[0].execute("id", { tasks: [{ task: '{"mode":"success"}' }, { task: '{"mode":"exit"}' }] }, undefined, undefined, h.ctx as unknown as ExtensionToolContext);
    assert.equal(result.isError, true);
    assert.equal(result.usage?.input, 20);
    assert.equal(result.usage?.cost.total, 0.06);
    const { results } = result.details as { results: (ReviewResult & { model: string; reportPath: string })[] };
    assert.equal(results[0].status, "completed");
    assert.equal(results[1].status, "failed");
    assert.equal(results[0].model, "test/reviewer");
    artifactDirs.push(dirname(results[0].reportPath));
    assert.equal(await readFile(results[0].reportPath, "utf8"), "Verified 🥔\u2028line\u2029end");
    assert.match(await readFile(results[1].reportPath, "utf8"), /provider unavailable/);
    await assert.rejects(h.tools[0].execute("id", { tasks: [{ task: "hello", model: "unknown/model" }] }, undefined, undefined, h.ctx as unknown as ExtensionToolContext), /Unavailable model/);
    const pending = h.tools[0].execute("id", { tasks: [{ task: '{"mode":"hang"}' }] }, undefined, undefined, h.ctx as unknown as ExtensionToolContext);
    await new Promise(resolve => setTimeout(resolve, 100));
    await h.emit("session_shutdown");
    const stopped = await pending;
    assert.equal(stopped.isError, true);
    const details = stopped.details as { results: (ReviewResult & { reportPath: string })[] };
    assert.equal(details.results[0].status, "aborted");
    artifactDirs.push(dirname(details.results[0].reportPath));
    await h.emit("session_shutdown");
  } finally {
    if (oldCommand === undefined) delete process.env.PSTACK_PI_COMMAND; else process.env.PSTACK_PI_COMMAND = oldCommand;
    if (oldDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = oldDir;
    await rm(dir, { recursive: true, force: true });
    for (const artifactDir of artifactDirs) await rm(artifactDir, { recursive: true, force: true });
  }
});
