#!/usr/bin/env node
/* global console, process */
import { execFileSync } from 'node:child_process';

const bump = process.argv[2];
const allowed = new Set(['patch', 'minor', 'major']);

if (!bump || !allowed.has(bump)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major>');
  process.exit(2);
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function ensureCleanTree() {
  const status = capture('git', ['status', '--porcelain']);
  if (status) {
    console.error('Release aborted: git working tree is not clean.');
    process.exit(1);
  }
}

function ensureOriginRemote() {
  const remotes = capture('git', ['remote'], true);
  if (!remotes.split('\n').includes('origin')) {
    console.error('Release aborted: git remote "origin" is not configured.');
    process.exit(1);
  }
}

function ensureNpmAuth() {
  try {
    execFileSync('npm', ['whoami'], { stdio: 'ignore' });
  } catch {
    console.error('Release aborted: npm auth missing. Run "npm whoami" or "npm login" first.');
    process.exit(1);
  }
}

function ensureMainBranch() {
  const branch = capture('git', ['branch', '--show-current']);
  if (branch !== 'main') {
    console.error(`Release aborted: releases are only allowed from "main". Current branch: "${branch}".`);
    process.exit(1);
  }
}

ensureCleanTree();
ensureOriginRemote();
ensureNpmAuth();
ensureMainBranch();

run('node', ['scripts/update-changelog.mjs']);
run('pnpm', ['lint']);
run('pnpm', ['typecheck']);
run('pnpm', ['test']);
run('pnpm', ['build']);
run('npm', ['pack', '--dry-run']);

run('npm', ['version', bump, '--no-git-tag-version']);

const branch = capture('git', ['branch', '--show-current']);
const version = capture('node', ['-p', "require('./package.json').version"]);
const tag = `v${version}`;
const changelogPath = capture('node', ['-p', "require('node:fs').existsSync('CHANGELOG.md') ? 'CHANGELOG.md' : 'CHANGELOG'"]);

run('node', ['scripts/update-changelog.mjs', '--release', version]);
run('git', ['add', 'package.json', changelogPath]);
run('git', ['commit', '-m', `chore(release): ${tag}`]);
run('git', ['tag', tag]);
run('git', ['push', 'origin', branch]);
run('git', ['push', 'origin', tag]);
run('npm', ['publish', '--access', 'public']);

console.log(`Released ${version} from ${branch} and published to npm.`);
