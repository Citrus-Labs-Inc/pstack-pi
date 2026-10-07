import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { buildArgs, mapLimited, runReview } from "../src/runner.ts";

const fixture = fileURLToPath(new URL("./fixtures/pi.mjs", import.meta.url));
const job = { task: JSON.stringify({ mode: "success" }), provider: "test", id: "model/with/slash", thinking: "high", personaPath: "/tmp/persona with space.md" };
const run = (mode: string, extra: Partial<Parameters<typeof runReview>[0]> = {}) => runReview({
  job: { ...job, task: JSON.stringify({ mode }) }, cwd: tmpdir(), command: process.execPath, prefixArgs: [fixture], timeoutMs: 5000, killGraceMs: 50, ...extra,
});

test("child gets an explicit read-only loadout and no task in argv", () => {
  const args = buildArgs(job);
  assert.equal(args[args.indexOf("--tools") + 1], "read,grep,find,ls");
  for (const flag of ["--no-extensions", "--no-mcp", "--no-skills", "--no-context-files", "--no-approve", "--no-session"]) assert.ok(args.includes(flag));
  assert.equal(args[args.indexOf("--model") + 1], "model/with/slash");
  assert.equal(args[args.indexOf("--append-system-prompt") + 1], job.personaPath);
  assert.ok(!args.includes(job.task));
});

test("JSONL handles fragmented UTF-8, Unicode separators, CRLF, and final line without LF", async () => {
  const result = await run("success");
  assert.equal(result.status, "completed");
  assert.equal(result.output, "Verified 🥔\u2028line\u2029end");
  assert.equal(result.usage.input, 20);
  assert.equal(result.usage.output, 10);
  assert.equal(result.usage.totalTokens, 34);
  assert.equal(result.usage.cost.total, 0.06);
});

for (const mode of ["empty", "error", "exit", "incomplete", "length", "malformed", "wrong-model", "malformed-assistant"]) {
  test(`reports ${mode} as failure, never success`, async () => {
    const result = await run(mode);
    assert.equal(result.status, "failed");
    assert.ok(result.error);
  });
}
test("a successful automatic retry replaces the earlier failure and counts both requests", async () => {
  const result = await run("retry");
  assert.equal(result.status, "completed");
  assert.equal(result.output, "recovered");
  assert.equal(result.usage.input, 20);
});
test("reports a missing executable", async () => {
  const result = await run("success", { command: "/nonexistent/pstack-pi-test" });
  assert.equal(result.status, "failed");
  assert.match(result.error!, /Cannot launch Pi/);
});
test("bounds output", async () => {
  const result = await run("overflow", { maxOutputBytes: 1024 });
  assert.equal(result.status, "failed");
  assert.match(result.error!, /output limit/);
});
test("timeouts force-terminate a child ignoring SIGTERM", async () => {
  const result = await run("hang", { timeoutMs: 200 });
  assert.equal(result.status, "failed");
  assert.equal(result.error, "Review timed out");
});
test("an already-aborted task never starts", async () => {
  const result = await run("success", { signal: AbortSignal.abort(), command: "/nonexistent" });
  assert.equal(result.status, "aborted");
});
test("cancellation kills a running child and removes the abort listener", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pstack-abort-test-"));
  const pidPath = join(dir, "pid");
  const controller = new AbortController();
  const promise = run("hang", { signal: controller.signal, job: { ...job, task: JSON.stringify({ mode: "hang", pidPath }) } });
  try {
    let pid: number | undefined;
    for (let attempt = 0; attempt < 100 && !pid; attempt++) {
      try { pid = Number(await readFile(pidPath, "utf8")); } catch { await sleep(20); }
    }
    assert.ok(pid, "fixture started");
    controller.abort();
    assert.equal((await promise).status, "aborted");
    assert.throws(() => process.kill(pid, 0), /ESRCH/);
  } finally { controller.abort(); await promise; await rm(dir, { recursive: true, force: true }); }
});
test("panels retain input order and never exceed concurrency", async () => {
  let active = 0;
  let peak = 0;
  const result = await mapLimited([5, 4, 3, 2, 1, 0], 2, async value => {
    peak = Math.max(peak, ++active);
    await sleep(value * 3);
    active--;
    return `task-${value}`;
  });
  assert.deepEqual(result, ["task-5", "task-4", "task-3", "task-2", "task-1", "task-0"]);
  assert.equal(peak, 2);
  await assert.rejects(mapLimited([1], 0, async x => x));
});
