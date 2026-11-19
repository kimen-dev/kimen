import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);

// docs.yml deploys a preview of every pull request under its branch name and
// refuses a name outside this charset. Renovate names a group's branch after
// the group's slug, which by default is the group name lowercased with its
// spaces turned into hyphens: "dev dependencies (non-major)" became
// `renovate/dev-dependencies-(non-major)`, and every PR of that group failed
// its docs `publish` check for the parentheses alone.
const DOCS_SAFE_BRANCH = /^[A-Za-z0-9._/-]+$/u;

function branchSlug(rule) {
  return rule.groupSlug ?? rule.groupName.toLowerCase().replaceAll(/\s+/gu, '-');
}

test('every Renovate group names a branch the docs preview can deploy', async () => {
  const renovate = JSON.parse(await readFile(new URL('renovate.json', repositoryRoot), 'utf8'));
  const groups = (renovate.packageRules ?? []).filter((rule) => rule.groupName !== undefined);

  assert.ok(groups.length > 0, 'renovate.json declares no groups');
  for (const rule of groups) {
    const branch = `renovate/${branchSlug(rule)}`;
    assert.match(branch, DOCS_SAFE_BRANCH, `group "${rule.groupName}" names branch ${branch}`);
  }
});

test('the branch charset is the one the docs deployment enforces', async () => {
  const docs = await readFile(new URL('.github/workflows/docs.yml', repositoryRoot), 'utf8');

  assert.match(docs, /''\|\*\[!A-Za-z0-9\._\/-\]\*\)/u);
});

// The config validator runs on the Node major its Renovate version declares;
// Renovate's own node bump must not move it with the other workflows.
test('the config validator keeps the Node major Renovate supports', async () => {
  const [workflow, renovate] = await Promise.all([
    readFile(new URL('.github/workflows/renovate-config.yml', repositoryRoot), 'utf8'),
    readFile(new URL('renovate.json', repositoryRoot), 'utf8').then(JSON.parse),
  ]);

  assert.match(workflow, /^ {10}node-version: 24$/mu);
  const held = (renovate.packageRules ?? []).find(
    (rule) =>
      rule.matchFileNames?.includes('.github/workflows/renovate-config.yml') &&
      rule.matchDepNames?.includes('node'),
  );
  assert.ok(held, 'renovate.json must keep the validator workflow out of node bumps');
  assert.deepEqual(held.matchUpdateTypes, ['major']);
  assert.equal(held.enabled, false);
});
