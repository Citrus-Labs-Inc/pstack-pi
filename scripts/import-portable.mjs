import { execFileSync } from 'node:child_process';
import { readdir, readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run only against a reviewed snapshot. Native workflows are maintained separately.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../pstack-codex');
const commit = 'c25afa251f1513b0b28cc089294d468c5e350444';
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim() !== commit) {
  throw new Error('Source is not the reviewed Codex snapshot');
}
const plugin = join(source, 'plugins/pstack');
const names = (await readdir(join(plugin, 'skills'))).filter(name => name.startsWith('principle-'));
names.push('tdd', 'technical-writing', 'unslop', 'blast-radius', 'benchmark-checklist', 'typescript-best-practices');
const oldContract = 'Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.';
for (const name of names.sort()) {
  const target = join(root, 'skills', name);
  await mkdir(target, { recursive: true });
  let text = await readFile(join(plugin, 'skills', name, 'SKILL.md'), 'utf8');
  if (!text.includes(oldContract)) throw new Error(`Missing contract in ${name}`);
  text = text.replace(oldContract, 'Before following this workflow, read [the Pi runtime contract](../../PI.md).');
  text = text.replace(/^---\n/, '---\ndisable-model-invocation: true\n');
  text = text.replace(/\$technical-writing/g, '/skill:technical-writing');
  await writeFile(join(target, 'SKILL.md'), text);
}
await cp(join(plugin, 'skills/typescript-best-practices/references'), join(root, 'skills/typescript-best-practices/references'), { recursive: true });
const license = await readFile(join(source, 'LICENSE'), 'utf8');
await writeFile(join(root, 'LICENSE'), license.replace('Copyright (c) 2026 Lauren Tan', 'Copyright (c) 2026 Lauren Tan\nCopyright (c) 2026 Citrus Labs Inc.'));
await writeFile(join(root, 'UPSTREAM.json'), JSON.stringify({
  source: 'https://github.com/ScriptedAlchemy/pstack-codex', commit,
  original: JSON.parse(await readFile(join(source, 'UPSTREAM.json'), 'utf8')),
  importedSkills: names.sort(),
}, null, 2) + '\n');
console.log(`Imported ${names.length} portable skills from ${commit}`);
