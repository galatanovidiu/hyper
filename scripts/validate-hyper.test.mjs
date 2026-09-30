import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-hyper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hyper-contract-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['skills', '.claude/skills', '.agents/skills', 'README.md']) await cp(path.join(root, name), path.join(dir, name), { recursive: true });
  return dir;
}
async function edit(root, file, replace) {
  const p = path.join(root, file);
  await writeFile(p, replace(await readFile(p, 'utf8')));
}

test('the complete new suite validates', async () => assert.deepEqual((await validate(root)).errors, []));
test('packaging regressions fail through the validator public interface', async t => {
  const cases = [
    ['visible job', 'skills/hyper-spec/SKILL.md', s => s.replace('user-invocable: false', 'user-invocable: true'), 'incorrect invocation visibility'],
    ['disabled job', 'skills/hyper-spec/SKILL.md', s => s.replace('user-invocable: false', 'disable-model-invocation: true\nuser-invocable: false'), 'model invocation'],
    ['broken reference', 'skills/hyper-spec/SKILL.md', s => s.replace('(templates/spec.md)', '(templates/missing.md)'), 'broken bundled reference'],
    ['escaping reference', 'skills/hyper-spec/SKILL.md', s => s + '\n[escape](../../README.md)\n', 'reference escapes suite'],
    ['unknown invocation', 'skills/hyper/SKILL.md', s => s + '\nInvoke `hyper-absent`.\n', 'unknown named job'],
    ['host dependency', 'skills/hyper-spec/SKILL.md', s => s + '\nUse /Users/example/source.\n', 'host dependency'],
    ['mirror drift', '.agents/skills/install-hyper/SKILL.md', s => s + '\nchanged\n', 'mirror content drift'],
    ['inventory drift', 'README.md', s => s.replaceAll('`hyper-spec`', '`missing-spec`'), 'missing README inventory'],
  ];
  for (const [name, file, replace, expected] of cases) await t.test(name, async sub => {
    const dir = await fixture(sub); await edit(dir, file, replace);
    assert.ok((await validate(dir)).errors.some(e => e.includes(expected)), name);
  });
});
