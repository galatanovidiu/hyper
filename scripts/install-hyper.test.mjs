import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, lstat, readlink, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/install-hyper.sh');
const jobs = (await readdir(path.join(root, 'skills'))).filter(n => n === 'hyper' || n.startsWith('hyper-'));
async function temporary(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hyper-install-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
function run(operation, targets) {
  return spawnSync('bash', [script, operation], { encoding: 'utf8', env: { ...process.env, HYPER_INSTALL_TARGETS: targets } });
}

test('status is read-only; install exposes every skill with usable sibling references and notice', async t => {
  const dir = await temporary(t), target = path.join(dir, 'skill directory');
  const before = run('status', target);
  assert.equal(before.status, 0, before.stderr);
  await assert.rejects(lstat(target), { code: 'ENOENT' });
  const installed = run('install', target);
  assert.equal(installed.status, 0, installed.stderr);
  for (const name of jobs) assert.equal(await readlink(path.join(target, name)), path.join(root, 'skills', name));
  assert.equal(await readlink(path.join(target, 'hyper-LICENSE')), path.join(root, 'skills/LICENSE'));
  const first = await lstat(path.join(target, 'hyper'));
  assert.equal(run('install', target).status, 0);
  assert.equal((await lstat(path.join(target, 'hyper'))).ino, first.ino);
});

test('preflight preserves foreign files and prevents partial writes across multiple targets', async t => {
  const dir = await temporary(t), clean = path.join(dir, 'clean'), foreign = path.join(dir, 'foreign');
  await mkdir(foreign);
  await writeFile(path.join(foreign, 'hyper'), 'personal skill');
  const result = run('install', clean + '\n' + foreign);
  assert.equal(result.status, 1);
  await assert.rejects(lstat(clean), { code: 'ENOENT' });
  assert.deepEqual(await readdir(foreign), ['hyper']);
});

test('foreign dangling links survive and are treated as conflicts', async t => {
  const dir = await temporary(t);
  await symlink(path.join(dir, 'missing-source'), path.join(dir, 'hyper-spec'));
  const result = run('install', dir);
  assert.equal(result.status, 1);
  assert.equal(await readlink(path.join(dir, 'hyper-spec')), path.join(dir, 'missing-source'));
  assert.deepEqual(await readdir(dir), ['hyper-spec']);
});

test('install supports multiple destinations and preserves retired/unrelated entries', async t => {
  const dir = await temporary(t), a = path.join(dir, 'a'), b = path.join(dir, 'b');
  await mkdir(a); await writeFile(path.join(a, 'personal'), 'keep');
  await symlink('/nonexistent/retired-hyper', path.join(a, 'hyper-retired'));
  assert.equal(run('install', a + '\n' + b).status, 0);
  assert.equal(await readlink(path.join(a, 'hyper-retired')), '/nonexistent/retired-hyper');
  assert.equal(await readlink(path.join(b, 'hyper')), path.join(root, 'skills/hyper'));
  assert.ok((await readdir(a)).includes('personal'));
});

test('empty, relative and repository-overlapping targets fail without writing', async () => {
  for (const target of ['', 'relative-target', path.join(root, 'skills')]) assert.equal(run('install', target).status, 2);
});


test('source overlap through a symlink parent or dot alias is rejected before writes', async t => {
  const dir = await temporary(t);
  const alias = path.join(dir, 'source-alias');
  await symlink(root, alias);
  for (const operation of ['status', 'install']) {
    assert.equal(run(operation, path.join(alias, 'absent-install-target')).status, 2);
    assert.equal(run(operation, root.replace('/hyper', '/./hyper') + '/absent-install-target').status, 2);
  }
  await assert.rejects(lstat(path.join(root, 'absent-install-target')), { code: 'ENOENT' });
});
