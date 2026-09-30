import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function filesUnder(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(p));
    else if (entry.isFile()) files.push(p);
  }
  return files;
}

export async function validate(root) {
  const errors = [];
  const fail = (file, message) => errors.push(`${path.relative(root, file)}: ${message}`);
  const skillsRoot = path.join(root, 'skills');
  const files = await filesUnder(skillsRoot);
  const entries = files.filter(f => path.basename(f) === 'SKILL.md');
  const names = new Set(entries.map(f => path.basename(path.dirname(f))));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const router = await readFile(path.join(skillsRoot, 'hyper/SKILL.md'), 'utf8');
  const referenced = new Set();
  let visible = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(file, 'utf8');
    if (path.basename(file) === 'SKILL.md') {
      const front = source.match(/^---\n([\s\S]*?)\n---\n/);
      if (!front) { fail(file, 'missing frontmatter'); continue; }
      const name = front[1].match(/^name: (.+)$/m)?.[1];
      if (name !== path.basename(path.dirname(file)) || !/^[a-z0-9-]{1,64}$/.test(name ?? '')) fail(file, 'invalid name/directory');
      const descriptionRaw = front[1].match(/^description: (.+)$/m)?.[1];
      let description;
      try { description = JSON.parse(descriptionRaw); } catch { fail(file, 'description must be a JSON-quoted YAML string'); }
      if (!description || description.length > 1024 || !description.includes('Use when') || !description.includes('Keywords:')) fail(file, 'incomplete description');
      const visibility = front[1].match(/^user-invocable: (.+)$/m)?.[1];
      if (visibility === 'true') visible++;
      if (visibility !== (name === 'hyper' ? 'true' : 'false')) fail(file, 'incorrect invocation visibility');
      if (/^disable-model-invocation:/m.test(front[1])) fail(file, 'model invocation must remain enabled');
      if (source.split('\n').length >= 500) fail(file, 'entry point must be below 500 lines');
      if (!readme.includes('`'+name+'`')) fail(file, 'missing README inventory');
      if (name !== 'hyper' && !router.includes('`'+name+'`')) fail(file, 'missing router invocation');
      if (!source.includes('session.md)')) fail(file, 'missing direct session contract');
    }
    if (/\/Users\/|~\/|mcp__|tools\.|\.claude\/skills|\.agents\/skills|scripts\/install-hyper|README\.md|AGENTS(?:\.local)?\.md/.test(source)) fail(file, 'maintainer or host dependency in shipped instructions');
    for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^[a-z]+:\/\//i.test(link)) continue;
      const target = path.resolve(path.dirname(file), link);
      if (!target.startsWith(skillsRoot + path.sep)) { fail(file, `reference escapes suite: ${link}`); continue; }
      referenced.add(target);
      try { if (!(await stat(target)).isFile()) fail(file, `reference is not a file: ${link}`); }
      catch { fail(file, `broken bundled reference: ${link}`); }
    }
    for (const match of source.matchAll(/`(hyper-[a-z0-9-]+)`/g)) {
      if (!names.has(match[1])) fail(file, `unknown named job: ${match[1]}`);
    }
  }
  if (visible !== 1 || !names.has('hyper')) fail(skillsRoot, 'exactly one router must be visible');
  for (const file of files) {
    if (path.basename(file) !== 'SKILL.md' && path.basename(file) !== 'LICENSE' && !referenced.has(file)) fail(file, 'bundled file has no reader');
  }
  for (const name of ['install-hyper', 'review-hyper-skills']) {
    const claudeRoot = path.join(root, '.claude/skills', name);
    const agentsRoot = path.join(root, '.agents/skills', name);
    const left = await filesUnder(claudeRoot);
    const right = await filesUnder(agentsRoot);
    const rel = a => a.map(f => path.relative(a === left ? claudeRoot : agentsRoot, f)).sort();
    if (JSON.stringify(rel(left)) !== JSON.stringify(rel(right))) fail(agentsRoot, 'mirror file-set drift');
    for (const f of left) {
      const other = path.join(agentsRoot, path.relative(claudeRoot, f));
      try { if (!(await readFile(f)).equals(await readFile(other))) fail(other, 'mirror content drift'); }
      catch { fail(other, 'missing mirror'); }
    }
  }
  return { errors, skills: entries.length, bundledFiles: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await validate(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
    else console.log(`Validated ${result.skills} skills and ${result.bundledFiles} bundled files; references, invocation and maintainer mirrors pass.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
