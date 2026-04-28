#!/usr/bin/env node
/* global console, process */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const releaseIndex = args.indexOf('--release');
const releaseVersion = releaseIndex >= 0 ? args[releaseIndex + 1] : null;

const changelogPath = existsSync('CHANGELOG.md') ? 'CHANGELOG.md' : 'CHANGELOG';

function capture(command, commandArgs, allowFailure = false) {
  try {
    return execFileSync(command, commandArgs, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function getLastTag() {
  const tag = capture('git', ['describe', '--tags', '--abbrev=0'], true);
  return tag || null;
}

function getCommitSubjects() {
  const lastTag = getLastTag();
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const output = capture('git', ['log', range, '--pretty=format:%s'], true);
  return output ? output.split('\n').map((line) => line.trim()).filter(Boolean) : [];
}

function toBullet(subject) {
  if (subject.startsWith('chore(release):')) return null;
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s+(.+)$/);
  if (!match) return null;
  const [, type, , summary] = match;
  const text = summary.charAt(0).toUpperCase() + summary.slice(1);
  if (type === 'feat') return `- Added ${text.replace(/^Add\s+/i, '').replace(/\.$/, '')}.`;
  if (type === 'fix') return `- Fixed ${text.replace(/^Fix\s+/i, '').replace(/\.$/, '')}.`;
  if (type === 'perf') return `- Improved ${text.replace(/^Improve\s+/i, '').replace(/\.$/, '')}.`;
  return null;
}

function defaultChangelog() {
  return '# Changelog\n\n## Unreleased\n';
}

function ensureUnreleasedSection(content) {
  if (/^## \[?Unreleased\]?$/m.test(content)) return content;
  return content.replace(/^# [^\n]+\n/, (heading) => `${heading}\n## Unreleased\n`);
}

function getSection(content, heading) {
  const pattern = new RegExp(`^## ${heading}\\s*$`, 'm');
  const match = pattern.exec(content);
  if (!match) return null;
  const start = match.index;
  const bodyStart = start + match[0].length;
  const rest = content.slice(bodyStart);
  const nextHeading = rest.match(/\n## /);
  const end = nextHeading ? bodyStart + nextHeading.index + 1 : content.length;
  return { start, bodyStart, end, body: content.slice(bodyStart, end) };
}

function updateUnreleased(content) {
  const section = getSection(content, '\\[?Unreleased\\]?');
  if (!section) return content;
  const existing = new Set((section.body.match(/^- .+$/gm) ?? []).map((line) => line.trim()));
  const additions = getCommitSubjects().map(toBullet).filter((line) => line && !existing.has(line));
  if (additions.length === 0) return content;
  const trimmedBody = section.body.trim();
  const newBody = `${trimmedBody ? `${trimmedBody}\n` : ''}${additions.join('\n')}\n`;
  return `${content.slice(0, section.bodyStart)}\n${newBody}${content.slice(section.end)}`;
}

function finalizeRelease(content, version) {
  const section = getSection(content, '\\[?Unreleased\\]?');
  if (!section) return content;
  const body = section.body.trim();
  if (!body) return content;
  const date = new Date().toISOString().slice(0, 10);
  const releaseHeading = `## ${version} - ${date}`;
  const releaseSection = `## Unreleased\n\n${releaseHeading}\n\n${body}\n`;
  return `${content.slice(0, section.start)}${releaseSection}${content.slice(section.end)}`;
}

let content = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : defaultChangelog();
content = ensureUnreleasedSection(content);
content = updateUnreleased(content);
if (releaseVersion) content = finalizeRelease(content, releaseVersion);
writeFileSync(changelogPath, content.endsWith('\n') ? content : `${content}\n`);
console.log(`Updated ${changelogPath}${releaseVersion ? ` for release ${releaseVersion}` : ''}.`);
