import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type { Usage } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Check } from "typebox/value";

export function emptyUsage(): Usage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
}
export function addUsage(total: Usage, next: Usage): Usage {
  return {
    input: total.input + next.input, output: total.output + next.output,
    cacheRead: total.cacheRead + next.cacheRead, cacheWrite: total.cacheWrite + next.cacheWrite,
    totalTokens: total.totalTokens + next.totalTokens,
    cost: {
      input: total.cost.input + next.cost.input, output: total.cost.output + next.cost.output,
      cacheRead: total.cost.cacheRead + next.cost.cacheRead,
      cacheWrite: total.cost.cacheWrite + next.cost.cacheWrite, total: total.cost.total + next.cost.total,
    },
  };
}
const Count = Type.Number({ minimum: 0 });
const UsageSchema = Type.Object({
  input: Count, output: Count, cacheRead: Count, cacheWrite: Count, totalTokens: Count,
  cost: Type.Object({ input: Count, output: Count, cacheRead: Count, cacheWrite: Count, total: Count }),
});
const AssistantEventSchema = Type.Object({
  type: Type.Literal("message_end"),
  message: Type.Object({
    role: Type.Literal("assistant"),
    provider: Type.String(),
    model: Type.String(),
    content: Type.Array(Type.Union([
      Type.Object({ type: Type.Literal("text"), text: Type.String() }),
      Type.Object({ type: Type.Literal("thinking") }),
      Type.Object({ type: Type.Literal("toolCall") }),
    ])),
    stopReason: Type.String(),
    errorMessage: Type.Optional(Type.String()),
    usage: UsageSchema,
  }),
});

export interface ReviewJob {
  task: string;
  provider: string;
  id: string;
  thinking: string;
  personaPath: string;
}
export interface ReviewResult {
  status: "completed" | "failed" | "aborted";
  output: string;
  error?: string;
  usage: Usage;
}
export function buildArgs(job: ReviewJob): string[] {
  return [
    "--mode", "json", "--print", "--no-session", "--no-extensions", "--no-mcp",
    "--no-skills", "--no-prompt-templates", "--no-themes", "--no-context-files", "--no-approve",
    "--tools", "read,grep,find,ls", "--provider", job.provider, "--model", job.id,
    "--thinking", job.thinking, "--append-system-prompt", job.personaPath,
  ];
}

export async function runReview(options: {
  job: ReviewJob;
  cwd: string;
  signal?: AbortSignal;
  command?: string;
  prefixArgs?: string[];
  timeoutMs?: number;
  killGraceMs?: number;
  maxOutputBytes?: number;
}): Promise<ReviewResult> {
  if (options.signal?.aborted) return { status: "aborted", output: "", error: "Review cancelled", usage: emptyUsage() };
  return new Promise(resolve => {
    const child = spawn(options.command ?? process.env.PSTACK_PI_COMMAND ?? "pi", [
      ...(options.prefixArgs ?? []), ...buildArgs(options.job),
    ], { cwd: options.cwd, shell: false, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    let stderr = "";
    let output = "";
    let usage = emptyUsage();
    let error: string | undefined;
    let stopReason: string | undefined;
    let settled = false;
    let closed = false;
    let cancelled = false;
    let received = 0;
    const decoder = new StringDecoder("utf8");
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      if (closed) return;
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (cause) {
        if (!(cause instanceof Error && "code" in cause && cause.code === "ESRCH")) child.kill(signal);
      }
    };
    const stop = (reason: string) => {
      if (error || closed) return;
      error = reason;
      kill("SIGTERM");
      forceKill = setTimeout(() => kill("SIGKILL"), options.killGraceMs ?? 1000);
    };
    const abort = () => { cancelled = true; stop("Review cancelled"); };
    const timeout = setTimeout(() => stop("Review timed out"), options.timeoutMs ?? 300_000);
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();

    const consume = (line: string) => {
      if (!line.trim() || error) return;
      let event: unknown;
      try { event = JSON.parse(line); }
      catch { stop("Invalid JSON from Pi subprocess"); return; }
      if (Check(AssistantEventSchema, event)) {
        const message = event.message;
        usage = addUsage(usage, message.usage);
        if (message.provider !== options.job.provider || message.model !== options.job.id) {
          stop(`Child used unexpected model ${message.provider}/${message.model}; requested ${options.job.provider}/${options.job.id}`);
          return;
        }
        output = message.content.flatMap(part => part.type === "text" ? [part.text] : []).join("\n");
        stopReason = message.stopReason;
        // Error messages can precede a successful automatic retry. Judge the last response.
        stderr = message.errorMessage ?? stderr;
      } else if (typeof event === "object" && event !== null && "type" in event) {
        if (event.type === "agent_settled") settled = true;
        if (event.type === "message_end" && "message" in event && typeof event.message === "object" && event.message !== null && "role" in event.message && event.message.role === "assistant") {
          stop("Malformed assistant message from Pi subprocess");
        }
      }
    };
    child.stdout.on("data", (data: Buffer) => {
      received += data.length;
      if (received > (options.maxOutputBytes ?? 16 * 1024 * 1024)) {
        stop("Review exceeded its output limit");
        return;
      }
      if (error) return;
      buffer += decoder.write(data);
      let index: number;
      while ((index = buffer.indexOf("\n")) !== -1) {
        consume(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    });
    child.stderr.on("data", (data: Buffer) => { stderr = (stderr + data.toString("utf8")).slice(-8192); });
    child.on("error", cause => { error = `Cannot launch Pi: ${cause.message}`; });
    child.stdin.on("error", cause => {
      if (!("code" in cause && cause.code === "EPIPE")) stop(`Cannot send review task: ${cause.message}`);
    });
    child.on("close", (code, exitSignal) => {
      buffer += decoder.end();
      if (buffer.trim()) consume(buffer);
      closed = true;
      clearTimeout(timeout);
      clearTimeout(forceKill);
      options.signal?.removeEventListener("abort", abort);
      const complete = !error && code === 0 && settled && stopReason === "stop" && output.trim().length > 0;
      resolve({
        status: cancelled ? "aborted" : complete ? "completed" : "failed", output, usage,
        ...(!complete ? { error: error ?? (stderr || `Incomplete review (exit ${code ?? exitSignal}, stop ${stopReason ?? "none"})`) } : {}),
      });
    });
    // A fixed prefix prevents slash-command dispatch and @file/option interpretation.
    child.stdin.end(`Review task (read-only; do not delegate):\n\n${options.job.task}\n`);
  });
}

export async function mapLimited<T, R>(items: readonly T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Concurrency must be a positive integer");
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }));
  return results;
}
