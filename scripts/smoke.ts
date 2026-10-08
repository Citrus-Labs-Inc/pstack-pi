import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndLoadExtensions, loadSkillsFromDir } from "@earendil-works/pi-coding-agent";
import { runReview } from "../src/runner.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(join(tmpdir(), "pstack-smoke-"));
const savedDir = process.env.PI_CODING_AGENT_DIR;
const savedOffline = process.env.PI_OFFLINE;
const command = process.env.PSTACK_PI_COMMAND ?? "pi";
let server: ReturnType<typeof createServer> | undefined;
try {
  process.env.PI_CODING_AGENT_DIR = dir;
  process.env.PI_OFFLINE = "1";
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const staged = join(dir, "package");
  for (const path of ["package.json", "README.md", ...manifest.files]) {
    await cp(join(root, path), join(staged, path), { recursive: true });
  }
  const loaded = await discoverAndLoadExtensions([join(staged, "extensions/pstack.ts")], dir, dir);
  assert.deepEqual(loaded.errors, []);
  const extension = loaded.extensions.find(item => item.tools.has("pstack_review"));
  assert.ok(extension, "real Pi loader registered pstack_review");
  assert.ok(extension.commands.has("pstack"));
  const skills = loadSkillsFromDir({ dir: join(staged, "skills"), source: "smoke" });
  assert.deepEqual(skills.diagnostics, []);
  assert.equal(skills.skills.length, 43);

  const help = spawnSync(command, ["--offline", "--no-extensions", "--no-skills", "--no-context-files", "--no-approve", "-e", staged, "--help"], {
    cwd: dir, encoding: "utf8", timeout: 30_000, env: process.env,
  });
  assert.equal(help.status, 0, help.stderr || help.error?.message);
  assert.match(help.stdout, /--pstack/);
  assert.doesNotMatch(help.stderr, /failed|error/i);

  const target = join(dir, "evidence.txt");
  await writeFile(target, "PSTACK_SMOKE_SENTINEL\n");
  let calls = 0;
  let readVerified = false;
  const failures: string[] = [];
  server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.ok(request.url?.endsWith("/chat/completions"));
      assert.deepEqual(body.tools.map((tool: any) => tool.function.name).sort(), ["find", "grep", "ls", "read"]);
      assert.equal(body.model, "reviewer");
      calls++;
      assert.ok(calls <= 2, "unexpected extra request");
      const isFirst = calls === 1;
      if (!isFirst) {
        const result = body.messages.find((message: any) => message.role === "tool");
        assert.ok(JSON.stringify(result).includes("PSTACK_SMOKE_SENTINEL"), "real Pi read tool returned the file");
        readVerified = true;
      }
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      const chunk = (delta: unknown, finish: string | null) => response.write(`data: ${JSON.stringify({
        id: "fixture", object: "chat.completion.chunk", created: 1, model: "reviewer",
        choices: [{ index: 0, delta, finish_reason: finish }],
      })}\n\n`);
      chunk(isFirst ? {
        role: "assistant", tool_calls: [{ index: 0, id: "read-evidence", type: "function", function: { name: "read", arguments: JSON.stringify({ path: target }) } }],
      } : { role: "assistant", content: "Verified PSTACK_SMOKE_SENTINEL with the read tool." }, null);
      chunk({}, isFirst ? "tool_calls" : "stop");
      response.end("data: [DONE]\n\n");
    } catch (error) {
      failures.push(String(error));
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: String(error) } }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await writeFile(join(dir, "models.json"), JSON.stringify({ providers: {
    "pstack-fixture": {
      baseUrl: `http://127.0.0.1:${address.port}/v1`, api: "openai-completions", apiKey: "local-fixture",
      models: [{ id: "reviewer", reasoning: false, input: ["text"], contextWindow: 16000, maxTokens: 1024 }],
    },
  } }));
  const result = await runReview({
    cwd: dir, command, timeoutMs: 30_000,
    job: { task: `Read ${target} and report its sentinel.`, provider: "pstack-fixture", id: "reviewer", thinking: "off", personaPath: join(staged, "agents/reviewer.md") },
  });
  assert.deepEqual(failures, []);
  assert.equal(result.status, "completed", result.error);
  assert.equal(calls, 2);
  assert.equal(readVerified, true);
  assert.equal(result.output, "Verified PSTACK_SMOKE_SENTINEL with the read tool.");
  console.log("PASS: Pi loaded the extension, CLI flag, and 43 skills; a real Pi child completed a read-tool round trip against a local fixture provider. No paid API calls.");
} finally {
  server?.closeAllConnections();
  if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
  if (savedDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = savedDir;
  if (savedOffline === undefined) delete process.env.PI_OFFLINE; else process.env.PI_OFFLINE = savedOffline;
  await rm(dir, { recursive: true, force: true });
}
