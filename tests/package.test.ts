import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { loadSkillsFromDir } from "@earendil-works/pi-coding-agent";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function markdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}
test("Pi discovers all 41 explicit-only skills without diagnostics", () => {
  const result = loadSkillsFromDir({ dir: join(root, "skills"), source: "test" });
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.skills.length, 41);
  assert.equal(result.skills.filter(skill => skill.name.startsWith("principle-")).length, 24);
  assert.ok(result.skills.every(skill => skill.disableModelInvocation));
  assert.equal(new Set(result.skills.map(skill => skill.name)).size, 41);
});
test("all relative Markdown links resolve and shipped skills have no Codex runtime residue", async () => {
  for (const path of await markdownFiles(root)) {
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      assert.ok(await stat(resolve(dirname(path), target)), `${path}: ${target}`);
    }
    if (path.includes(`${join(root, "skills")}/`)) assert.doesNotMatch(text, /CODEX\.md|~\/\.codex|spawn_agent|\$poteto|gpt-5\.6|gpt-6-astra/);
  }
});
test("manifest explicitly packages the extension and skills; host dependencies stay peers", async () => {
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.pi, { extensions: ["./extensions/pstack.ts"], skills: ["./skills"] });
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.peerDependencies["@earendil-works/pi-coding-agent"], "*");
});
