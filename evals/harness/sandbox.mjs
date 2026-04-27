import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { REPO_ROOT } from "./load-skill.mjs";

const COPY_INCLUDE = [
  "skills",
  "scripts",
  "docs",
  "README.md",
  "AGENTS.md",
  "CHANGELOG.md",
];

const TASK_FOLDER_PARENT = ".hyper/tasks";

export function createSandbox({ runId, fixture }) {
  const tag = `${fixture.skill}-${fixture.id}-${runId}-${crypto.randomBytes(3).toString("hex")}`;
  const tmpRoot = path.join(os.tmpdir(), `hyper7-eval-${tag}`);
  fs.mkdirSync(tmpRoot, { recursive: true });
  const root = fs.realpathSync(tmpRoot);

  for (const entry of COPY_INCLUDE) {
    const src = path.join(REPO_ROOT, entry);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(root, entry);
    copyRecursive(src, dest);
  }

  ensureChangelogStub(root);

  const taskMd = fixture.inputTaskMd;
  const taskFolderName = `T${extractTaskId(taskMd)}-${extractSlug(taskMd)}`;
  const taskFolder = path.join(root, TASK_FOLDER_PARENT, taskFolderName);
  fs.mkdirSync(taskFolder, { recursive: true });
  fs.writeFileSync(path.join(taskFolder, "task.md"), taskMd, "utf8");

  return {
    root,
    taskFolder,
    taskFolderRelative: path.join(TASK_FOLDER_PARENT, taskFolderName),
    cleanup() {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {}
    },
  };
}

function ensureChangelogStub(root) {
  const changelog = path.join(root, "CHANGELOG.md");
  if (!fs.existsSync(changelog)) {
    fs.writeFileSync(changelog, "# Changelog\n\nAll notable changes to this project are documented in this file.\n", "utf8");
  }
}

function extractTaskId(taskMd) {
  const m = taskMd.match(/^id:\s*T?(\d+)/m);
  return m ? m[1] : "0";
}

function extractSlug(taskMd) {
  const m = taskMd.match(/^slug:\s*([\w-]+)/m);
  return m ? m[1] : "task";
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === "node_modules" || entry === ".git") continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(src);
    try { fs.symlinkSync(target, dest); } catch {}
  } else {
    fs.copyFileSync(src, dest);
  }
}

export function snapshotFiles(root, relativePaths) {
  const out = {};
  for (const rel of relativePaths) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) {
      out[rel] = fs.readFileSync(full, "utf8");
    } else {
      out[rel] = null;
    }
  }
  return out;
}

export function listSandboxFiles(root, prefix = "") {
  const out = [];
  const start = path.join(root, prefix);
  if (!fs.existsSync(start)) return out;
  walk(start, root, out);
  return out.sort();
}

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walk(full, root, out);
    } else {
      out.push(path.relative(root, full));
    }
  }
}

export function isPathInsideSandbox(root, candidate) {
  const resolved = path.resolve(root, candidate);
  const rel = path.relative(root, resolved);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function isPathInsideTaskFolder(root, taskFolderRelative, candidate) {
  const resolved = path.resolve(root, candidate);
  const rel = path.relative(path.join(root, taskFolderRelative), resolved);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
