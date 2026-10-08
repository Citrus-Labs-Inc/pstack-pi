import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, resolveModel, RoleSchema, ThinkingSchema } from "../src/config.ts";
import { addUsage, emptyUsage, mapLimited, runReview } from "../src/runner.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stateType = "pstack-mode-v1";
const TaskSchema = Type.Object({
  task: Type.String({ minLength: 1, maxLength: 32_000, description: "Bounded question, exact file paths, scope, and expected evidence. Child has no parent transcript or bash." }),
  role: Type.Optional(RoleSchema),
  model: Type.Optional(Type.String({ minLength: 1, description: "Exact provider/model ID; defaults to role preference or parent model" })),
  thinking: Type.Optional(ThinkingSchema),
  persona: Type.Optional(Type.Union([Type.Literal("default"), Type.Literal("comment-sicko")])),
}, { additionalProperties: false });

export default function pstack(pi: ExtensionAPI) {
  let enabled = false;
  const running = new Map<AbortController, Promise<void>>();
  pi.registerFlag("pstack", { type: "boolean", default: false, description: "Enable pstack mode for this session" });

  const status = (ctx: ExtensionContext) => {
    if (ctx.hasUI) ctx.ui.setStatus("pstack", enabled ? "pstack · poteto" : undefined);
  };
  const restore = (ctx: ExtensionContext) => {
    enabled = false;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === stateType) {
        const data: unknown = entry.data;
        if (typeof data === "object" && data !== null && "enabled" in data && typeof data.enabled === "boolean") enabled = data.enabled;
      }
    }
    status(ctx);
  };
  const report = (ctx: ExtensionContext, text: string) => {
    if (ctx.hasUI) ctx.ui.notify(text, "info");
    else pi.sendMessage({ customType: "pstack-status", content: text, display: true }, { triggerTurn: false });
  };
  pi.on("session_start", (event, ctx) => {
    restore(ctx);
    if (event.reason === "startup" && pi.getFlag("pstack") === true) {
      enabled = true;
      pi.appendEntry(stateType, { enabled });
      status(ctx);
    }
  });
  pi.on("session_tree", (_event, ctx) => restore(ctx));
  pi.on("session_shutdown", async () => {
    const active = [...running];
    for (const [controller] of active) controller.abort();
    await Promise.all(active.map(([, finished]) => finished));
  });
  pi.on("before_agent_start", async (event) => {
    if (!enabled) {
      delete event.systemPromptOptions.sections.pstack;
      return;
    }
    const text = await readFile(join(root, "skills/poteto-mode/SKILL.md"), "utf8");
    event.systemPromptOptions.sections.pstack = [
      `Pstack mode is enabled for this session branch. Package root: ${root}.`,
      `Resolve the following skill's relative paths from ${join(root, "skills/poteto-mode")}.`,
      text.replace(/^---\n[\s\S]*?\n---\n/, ""),
    ].join("\n\n");
  });

  pi.registerCommand("pstack", {
    description: "Pstack mode: on, off, status, models, herdr, help",
    handler: async (args, ctx) => {
      switch (args.trim() || "status") {
        case "on": case "off":
          enabled = args.trim() === "on";
          pi.appendEntry(stateType, { enabled });
          status(ctx);
          report(ctx, `Pstack mode ${enabled ? "enabled" : "disabled"} for this session branch.`);
          return;
        case "status":
          report(ctx, `Pstack mode is ${enabled ? "on" : "off"}. Config: ${join(getAgentDir(), "pstack-models.json")}`);
          return;
        case "models": {
          const models = ctx.modelRegistry.getAvailable();
          report(ctx, models.map(m => `${m.provider}/${m.id}`).join("\n") || "No authenticated models available. Use /login and /model.");
          return;
        }
        case "herdr":
          if (process.env.HERDR_ENV !== "1") {
            report(ctx, "Herdr: unmanaged (HERDR_ENV is not 1). No Herdr session was inspected.");
            return;
          }
          report(ctx, [
            "Herdr: managed (HERDR_ENV=1).",
            `HERDR_WORKSPACE_ID=${process.env.HERDR_WORKSPACE_ID ?? "(unset)"}`,
            `HERDR_TAB_ID=${process.env.HERDR_TAB_ID ?? "(unset)"}`,
            `HERDR_PANE_ID=${process.env.HERDR_PANE_ID ?? "(unset)"}`,
          ].join("\n"));
          return;
        case "help":
          report(ctx, "/pstack on|off|status|models\n/pstack herdr\n/skill:setup-pstack\n/skill:poteto-help\n/skill:how <question>\n/skill:interrogate <scope>\n/skill:pstack-herdr <operation>\n/skill:pstack-herdr-swarm <task>\npstack_review agents are bounded and read-only. Persistent or writing Herdr agents require a separately installed Herdr.");
          return;
        default:
          report(ctx, "Unknown pstack command. Use /pstack help or /skill:<name>.");
      }
    },
  });

  pi.registerTool({
    name: "pstack_review",
    label: "Pstack review",
    description: "Run 1–8 bounded, independent read-only Pi agents (max 4 concurrent). Roles: explorer, reviewer, designer. No bash, writes, MCP, extensions, recursion, or parent transcript. Supply exact paths and evidence. Models inherit the parent unless explicitly configured. May incur model costs. Not an OS sandbox; files accessible to this user remain readable. Returns failed status if any task fails; never treat a partial panel as unanimous approval.",
    parameters: Type.Object({ tasks: Type.Array(TaskSchema, { minItems: 1, maxItems: 8 }) }, { additionalProperties: false }),
    executionMode: "sequential",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async execute(_id, params, signal, onUpdate, ctx) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) controller.abort();
      const completion = Promise.withResolvers<void>();
      running.set(controller, completion.promise);
      try {
        const config = await loadConfig(join(getAgentDir(), "pstack-models.json"));
        const available = ctx.modelRegistry.getAvailable();
        const jobs = params.tasks.map(task => {
          const role = task.role ?? "reviewer";
          const preference = { ...config.roles?.[role],
            ...(task.model ? { model: task.model } : {}), ...(task.thinking ? { thinking: task.thinking } : {}) };
          const model = resolveModel(preference, ctx.model, ctx.thinkingLevel ?? "medium", available);
          return { ...model, task: task.task, personaPath: join(root, "agents", `${task.persona === "comment-sicko" ? "comment-sicko" : role}.md`) };
        });
        const artifactDir = await mkdtemp(join(tmpdir(), "pstack-reviews-"));
        let completed = 0;
        const results = await mapLimited(jobs, 4, async (job, index) => {
          const result = await runReview({ job, cwd: ctx.cwd, signal: controller.signal });
          const reportPath = join(artifactDir, `${index + 1}.md`);
          let artifactError: string | undefined;
          try {
            await writeFile(reportPath, `${result.error ? `Error: ${result.error}\n\n` : ""}${result.output}`, { mode: 0o600 });
          } catch (error) { artifactError = `Cannot save report: ${String(error)}`; }
          completed++;
          onUpdate?.({ content: [{ type: "text", text: `Pstack review: ${completed}/${jobs.length} finished` }], details: undefined });
          return { ...result,
            reportPath: artifactError ? undefined : reportPath,
            ...(artifactError ? { status: "failed" as const, error: artifactError } : {}),
            output: result.output.length > 12_000 ? `${result.output.slice(0, 12_000)}\n[Truncated. Read the report file for full output.]` : result.output,
            model: `${job.provider}/${job.id}`,
          };
        });
        return {
          isError: results.some(result => result.status !== "completed"),
          usage: results.reduce((usage, result) => addUsage(usage, result.usage), emptyUsage()),
          content: [{ type: "text", text: results.map((r, i) => `## Review ${i + 1} (${r.model}): ${r.status}\n${r.error ?? ""}\n${r.output}\n\nReport: ${r.reportPath ?? "unavailable"}`).join("\n\n") }],
          details: { results },
        };
      } finally {
        running.delete(controller);
        completion.resolve();
        signal?.removeEventListener("abort", abort);
      }
    },
  });
}
