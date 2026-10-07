import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadConfig, resolveModel } from "../src/config.ts";

const parent = { provider: "one", id: "parent" };
const other = { provider: "two", id: "org/model" };
const available = [parent, other];
test("default and aliases inherit the parent; explicit thinking overrides independently", () => {
  for (const model of [undefined, "auto", "inherit-parent"]) {
    assert.deepEqual(resolveModel({ model }, parent, "high", available), { ...parent, thinking: "high" });
    assert.equal(resolveModel({ model, thinking: "low" }, parent, "high", available).thinking, "low");
  }
});
test("models use exact provider-qualified IDs, not fuzzy matching or silent fallback", () => {
  assert.deepEqual(resolveModel({ model: "two/org/model" }, parent, "high", available), { ...other, thinking: "medium" });
  assert.throws(() => resolveModel({ model: "model" }, parent, "high", available), /Unavailable model/);
  assert.throws(() => resolveModel({}, undefined, "high", available), /Select a parent/);
});
test("configuration is optional, validated, and never overwritten", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pstack-config-test-"));
  const path = join(dir, "pstack-models.json");
  try {
    assert.deepEqual(await loadConfig(path), {});
    for (const value of [{ roles: { bogus: {} } }, { roles: { reviewer: { thinking: "ultra" } } }, { roles: [] }, { unexpected: true }, null]) {
      await writeFile(path, JSON.stringify(value));
      await assert.rejects(loadConfig(path), /Invalid pstack configuration/);
    }
    await writeFile(path, "invalid json");
    await assert.rejects(loadConfig(path), SyntaxError);
    const config = { roles: { reviewer: { model: "inherit-parent", thinking: "high" } } };
    await writeFile(path, JSON.stringify(config));
    assert.deepEqual(await loadConfig(path), config);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
