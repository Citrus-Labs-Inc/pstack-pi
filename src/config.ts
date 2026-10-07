import { readFile } from "node:fs/promises";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

export const ThinkingSchema = Type.Union([
  Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"),
  Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max"),
]);
export const RoleSchema = Type.Union([Type.Literal("explorer"), Type.Literal("reviewer"), Type.Literal("designer")]);
export type Role = Static<typeof RoleSchema>;
export const ModelPreferenceSchema = Type.Object({
  model: Type.Optional(Type.String({ minLength: 1 })),
  thinking: Type.Optional(ThinkingSchema),
}, { additionalProperties: false });
export type ModelPreference = Static<typeof ModelPreferenceSchema>;
const ConfigSchema = Type.Object({
  roles: Type.Optional(Type.Object({
    explorer: Type.Optional(ModelPreferenceSchema),
    reviewer: Type.Optional(ModelPreferenceSchema),
    designer: Type.Optional(ModelPreferenceSchema),
  }, { additionalProperties: false })),
}, { additionalProperties: false });
export type Config = Static<typeof ConfigSchema>;

export async function loadConfig(path: string): Promise<Config> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
  const value: unknown = JSON.parse(text);
  if (!Check(ConfigSchema, value)) throw new Error(`Invalid pstack configuration: ${path}`);
  return value;
}

export function resolveModel(
  preference: ModelPreference,
  parent: { provider: string; id: string } | undefined,
  parentThinking: string,
  available: readonly { provider: string; id: string }[],
): { provider: string; id: string; thinking: string } {
  const inherit = !preference.model || ["auto", "inherit-parent"].includes(preference.model);
  const model = inherit ? parent : available.find(m => `${m.provider}/${m.id}` === preference.model);
  if (!model) throw new Error(inherit ? "Select a parent model before delegating" : `Unavailable model: ${preference.model}. Use an exact provider/model ID from /pstack models.`);
  return { ...model, thinking: preference.thinking ?? (inherit ? parentThinking : "medium") };
}
