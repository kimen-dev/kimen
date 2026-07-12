// @spec:019-agent-skills-canonical
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const cliPath = join(repositoryRoot, 'scripts/gates/check-agent-skills.mjs');
const sutUrl = new URL('../lib/agent-skill-catalog.mjs', import.meta.url);

const loadSut = () => import(sutUrl.href);

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');
const inventoryDigests = (entries) => {
  const sorted = [...entries].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  return {
    finalTreeSha256: sha256(sorted.map(({ hash, path }) => `${path}\0${hash}\n`).join('')),
    pathSetSha256: sha256(sorted.map(({ path }) => `${path}\n`).join('')),
  };
};

async function synchronizeFixtureInventory(root) {
  const contractPath = join(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
  );
  const inventory = JSON.parse(await readFile(contractPath, 'utf8'));
  const paths = runGit(root, ['ls-files', '.agents/skills'])
    .stdout.trim()
    .split('\n')
    .filter(Boolean);
  const entries = await Promise.all(
    paths.map(async (path) => ({
      hash: sha256(await readFile(join(root, path))),
      path: path.replace(/^\.agents\/skills\//, ''),
    })),
  );
  const digests = inventoryDigests(entries);
  await write(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
    `${JSON.stringify(
      {
        ...inventory,
        candidateTreeSha256: digests.finalTreeSha256,
        expectedArtifactCount: entries.length,
        expectedSkillCount: entries.filter(({ path }) => path.endsWith('/SKILL.md')).length,
        finalTreeSha256: digests.finalTreeSha256,
        pathSetSha256: digests.pathSetSha256,
        validatedTreeSha256: digests.finalTreeSha256,
      },
      null,
      2,
    )}\n`,
  );
  runGit(root, ['add', '-A']);
}

function run(root, command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: join(root, '.home'), ...options.env },
  });
}

function runGit(root, args) {
  const result = run(root, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function runCli(root) {
  return run(root, process.execPath, [cliPath, '--root', root]);
}

async function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

const validRoleGuidance = [
  'Repository skills are canonical at `.agents/skills`.',
  '`.claude/skills` is compatibility-only.',
  '',
].join('\n');

async function createFixture(
  t,
  {
    compatibility = 'valid',
    commit = false,
    guidance = validRoleGuidance,
    missingEntrypoint = false,
  } = {},
) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-agent-skills-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  await write(root, '.agents/skills/alpha/SKILL.md', '# Alpha\n');
  await write(root, '.agents/skills/beta/SKILL.md', '# Beta\n');
  if (missingEntrypoint) {
    await unlink(join(root, '.agents/skills/beta/SKILL.md'));
  }
  await mkdir(join(root, '.claude'), { recursive: true });

  if (compatibility === 'valid') {
    await symlink('../.agents/skills', join(root, '.claude/skills'));
  } else if (compatibility === 'directory') {
    await write(root, '.claude/skills/alpha/SKILL.md', '# Alpha\n');
    await write(root, '.claude/skills/beta/SKILL.md', '# Beta\n');
  } else if (compatibility === 'broken') {
    await symlink('../missing-skills', join(root, '.claude/skills'));
  } else if (compatibility === 'absolute') {
    await symlink(join(root, '.agents/skills'), join(root, '.claude/skills'));
  } else if (compatibility === 'escaping') {
    await symlink('../../outside-repository', join(root, '.claude/skills'));
  } else if (compatibility === 'cyclic') {
    await symlink('loop', join(root, '.claude/skills'));
    await symlink('skills', join(root, '.claude/loop'));
  } else if (compatibility === 'wrong-target') {
    await mkdir(join(root, 'other-skills'), { recursive: true });
    await symlink('../other-skills', join(root, '.claude/skills'));
  } else if (compatibility !== 'missing') {
    throw new Error(`Unknown compatibility fixture: ${compatibility}`);
  }

  await write(root, 'AGENTS.md', guidance);
  await write(root, 'CLAUDE.md', guidance);
  await write(root, 'NOTICE', 'Vendored skills live under `.agents/skills`.\n');
  await write(
    root,
    '.specify/extensions.yml',
    '# Skill sources are canonical under .agents/skills.\n',
  );
  await write(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
    `${JSON.stringify(
      (() => {
        const entries = [
          { hash: sha256('# Alpha\n'), path: 'alpha/SKILL.md' },
          ...(missingEntrypoint ? [] : [{ hash: sha256('# Beta\n'), path: 'beta/SKILL.md' }]),
        ];
        const digests = inventoryDigests(entries);
        return {
          approvedConflicts: [],
          canonicalPath: '.agents/skills',
          candidateTreeSha256: digests.finalTreeSha256,
          entryEncoding: 'utf8(path) + NUL + lowercase-sha256(bytes) + LF, sorted by path',
          expectedArtifactCount: missingEntrypoint ? 1 : 2,
          expectedConflictCount: 0,
          expectedRewriteCount: 0,
          expectedSkillCount: 2,
          finalTreeSha256: digests.finalTreeSha256,
          pathEncoding: 'utf8(path) + LF, sorted by path',
          pathSetSha256: digests.pathSetSha256,
          rewrittenAfterMigration: [],
          schemaVersion: 1,
          validatedTreeSha256: digests.finalTreeSha256,
        };
      })(),
      null,
      2,
    )}\n`,
  );
  await mkdir(join(root, '.home'), { recursive: true });

  runGit(root, ['init', '--quiet']);
  runGit(root, ['config', 'user.email', 'fixture@example.invalid']);
  runGit(root, ['config', 'user.name', 'Kimen Fixture']);
  runGit(root, ['add', '-A']);
  if (commit) {
    runGit(root, ['commit', '--quiet', '-m', 'fixture']);
  }
  return root;
}

test('S1 a generic agent discovers every canonical skill and required entrypoint', async (t) => {
  const root = await createFixture(t);
  const result = runCli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /canonical=\.agents\/skills/);
  assert.match(result.stdout, /skills=2/);
});

test('S1 canonical discovery rejects a skill without SKILL.md', async (t) => {
  const root = await createFixture(t, { missingEntrypoint: true });
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_ENTRY_MISSING/);
});

test('S1 canonical discovery rejects an immediate file masquerading as a skill', async (t) => {
  const root = await createFixture(t);
  await write(root, '.agents/skills/not-a-skill', 'not a directory\n');
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_ENTRY_TYPE/);
  assert.match(result.stderr, /\.agents\/skills\/not-a-skill/);
});

test('S1 canonical discovery rejects an immediate symlink masquerading as a skill', async (t) => {
  const root = await createFixture(t);
  await symlink('alpha', join(root, '.agents/skills/linked-skill'));
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_ENTRY_TYPE/);
  assert.match(result.stderr, /\.agents\/skills\/linked-skill/);
});

test('S2 Claude resolves the exact canonical catalog through its conventional path', async (t) => {
  const root = await createFixture(t);
  const result = runCli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(join(root, '.claude/skills/alpha/SKILL.md'), 'utf8'), '# Alpha\n');
  assert.match(result.stdout, /compatibility=\.claude\/skills/);
  assert.match(result.stdout, /target=\.\.\/\.agents\/skills/);
});

test('S3 one canonical edit and compatibility write share one content owner', async (t) => {
  const root = await createFixture(t);
  await write(root, '.agents/skills/alpha/SKILL.md', '# Updated Alpha\n');
  assert.equal(
    await readFile(join(root, '.claude/skills/alpha/SKILL.md'), 'utf8'),
    '# Updated Alpha\n',
  );
  await write(root, '.claude/skills/gamma/SKILL.md', '# Gamma\n');
  runGit(root, ['add', '-A']);
  await synchronizeFixtureInventory(root);
  assert.equal(await readFile(join(root, '.agents/skills/gamma/SKILL.md'), 'utf8'), '# Gamma\n');
  const result = runCli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skills=3/);
});

test('S4 a byte-identical independent Claude directory fails the single-source invariant', async (t) => {
  const root = await createFixture(t, { compatibility: 'directory' });
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_COMPAT_NOT_LINK/);
});

test('S5 migration retains validated bytes, unique artifacts and approved conflicts', async () => {
  const { reconcileMigrationEntries } = await loadSut();
  const report = reconcileMigrationEntries({
    approvedConflictPaths: ['review/SKILL.md'],
    candidateEntries: [
      { hash: 'old-review', path: 'review/SKILL.md' },
      { hash: 'same', path: 'shared/SKILL.md' },
      { hash: 'candidate-only', path: 'unique/reference.md' },
    ],
    requiredPaths: [
      'review/SKILL.md',
      'shared/SKILL.md',
      'unique/reference.md',
      'validated/LICENSE-NOTICE.md',
    ],
    validatedEntries: [
      { hash: 'validated-review', path: 'review/SKILL.md' },
      { hash: 'same', path: 'shared/SKILL.md' },
      { hash: 'validated-license', path: 'validated/LICENSE-NOTICE.md' },
    ],
  });

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.conflicts, ['review/SKILL.md']);
  assert.deepEqual(
    report.entries.map(({ hash, path, resolution }) => ({ hash, path, resolution })),
    [
      { hash: 'validated-review', path: 'review/SKILL.md', resolution: 'main-validated' },
      { hash: 'same', path: 'shared/SKILL.md', resolution: 'identical' },
      { hash: 'candidate-only', path: 'unique/reference.md', resolution: 'unique-preserved' },
      {
        hash: 'validated-license',
        path: 'validated/LICENSE-NOTICE.md',
        resolution: 'main-validated',
      },
    ],
  );
});

test('S5 migration fails closed for omissions and unapproved conflicts', async () => {
  const { reconcileMigrationEntries } = await loadSut();
  const report = reconcileMigrationEntries({
    approvedConflictPaths: [],
    candidateEntries: [{ hash: 'old', path: 'review/SKILL.md' }],
    requiredPaths: ['missing/SKILL.md', 'review/SKILL.md'],
    validatedEntries: [{ hash: 'validated', path: 'review/SKILL.md' }],
  });
  assert.deepEqual(
    report.findings.map(({ code, path }) => ({ code, path })),
    [
      { code: 'AGENT_SKILLS_MIGRATION_OMISSION', path: 'missing/SKILL.md' },
      { code: 'AGENT_SKILLS_MIGRATION_CONFLICT', path: 'review/SKILL.md' },
    ],
  );
});

test('S5 the real migration inventory is gate-bound to every final artifact', async () => {
  const inventory = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
      ),
      'utf8',
    ),
  );
  assert.equal(inventory.expectedSkillCount, 27);
  assert.equal(inventory.expectedArtifactCount, 70);
  assert.equal(inventory.approvedConflicts.length, 8);
  assert.match(inventory.pathSetSha256, /^[a-f0-9]{64}$/);
  assert.match(inventory.candidateTreeSha256, /^[a-f0-9]{64}$/);
  assert.match(inventory.validatedTreeSha256, /^[a-f0-9]{64}$/);
  assert.match(inventory.finalTreeSha256, /^[a-f0-9]{64}$/);
  const result = runCli(repositoryRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /inventory=verified/);
});

test('S5 migration inventory rejects a changed canonical artifact hash', async (t) => {
  const root = await createFixture(t);
  await write(root, '.agents/skills/alpha/SKILL.md', '# Tampered Alpha\n');
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_MIGRATION_HASH/);
});

for (const [condition, code] of [
  ['missing', 'AGENT_SKILLS_COMPAT_MISSING'],
  ['broken', 'AGENT_SKILLS_COMPAT_BROKEN'],
  ['absolute', 'AGENT_SKILLS_COMPAT_ABSOLUTE'],
  ['escaping', 'AGENT_SKILLS_COMPAT_ESCAPE'],
  ['cyclic', 'AGENT_SKILLS_COMPAT_CYCLE'],
  ['wrong-target', 'AGENT_SKILLS_COMPAT_TARGET'],
]) {
  test(`S6 unsafe compatibility condition ${condition} reports ${code}`, async (t) => {
    const root = await createFixture(t, { compatibility: condition });
    const result = runCli(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(code));
    assert.match(result.stderr, /invariant=/);
    assert.match(result.stderr, /expected=.*\.claude\/skills.*\.\.\/\.agents\/skills/);
  });
}

test('S7 a fresh clone needs no user-level skills and preserves both discovery paths', async (t) => {
  const source = await createFixture(t, { commit: true });
  const clone = await mkdtemp(join(tmpdir(), 'kimen-agent-skills-clone-'));
  t.after(() => rm(clone, { recursive: true, force: true }));
  await rm(clone, { recursive: true, force: true });
  const cloned = run(dirname(clone), 'git', ['clone', '--quiet', '--no-local', source, clone]);
  assert.equal(cloned.status, 0, cloned.stderr);
  const result = runCli(clone);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skills=2/);
});

test('S8 a vendor-path tool write persists only in the canonical catalog', async (t) => {
  const root = await createFixture(t);
  await write(root, '.claude/skills/tool-added/SKILL.md', '# Tool added\n');
  runGit(root, ['add', '-A']);
  await synchronizeFixtureInventory(root);
  assert.equal(
    await readFile(join(root, '.agents/skills/tool-added/SKILL.md'), 'utf8'),
    '# Tool added\n',
  );
  const result = runCli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skills=3/);
});

test('S8 repository-owned tooling cannot configure a vendor-owned skill write', async (t) => {
  const root = await createFixture(t);
  await write(
    root,
    'scripts/update-skills.mjs',
    "import { writeFile } from 'node:fs/promises';\nawait writeFile('.claude/skills/new/SKILL.md', '# New\\n');\n",
  );
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_TOOLING_VENDOR_WRITE/);
  assert.match(result.stderr, /scripts\/update-skills\.mjs/);
});

test('S9 stale operating guidance reports canonical ownership drift', async (t) => {
  const root = await createFixture(t, {
    guidance: 'Constitutional skills live only in `.claude/skills`.\n',
  });
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_GUIDANCE_DRIFT/);
});

test('S9 reversed canonical and compatibility roles fail closed', async (t) => {
  const root = await createFixture(t, {
    guidance:
      'Repository skills are canonical at `.claude/skills`. `.agents/skills` is compatibility-only.\n',
  });
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_GUIDANCE_DRIFT/);
});

test('S1 S2 S7 the real repository exposes 27 tracked skills through the Git symlink', async () => {
  const result = runCli(repositoryRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skills=27/);
  assert.equal(
    runGit(repositoryRoot, ['ls-files', '.agents/skills']).stdout.trim().length > 0,
    true,
  );
  assert.match(
    runGit(repositoryRoot, ['ls-files', '--stage', '.claude/skills']).stdout,
    /^120000 /,
  );
  assert.equal(
    await readFile(join(repositoryRoot, '.claude/skills/requesting-code-review/SKILL.md'), 'utf8'),
    await readFile(join(repositoryRoot, '.agents/skills/requesting-code-review/SKILL.md'), 'utf8'),
  );
  assert.match(
    await readFile(join(repositoryRoot, 'scripts/gates/gates-core.sh'), 'utf8'),
    /run_core_gate agent-skills node scripts\/gates\/check-agent-skills\.mjs/,
  );
});

test('S6 mutation sandboxes exclude the compatibility symlink and retain canonical sources', async () => {
  for (const configPath of ['stryker.node.config.mjs', 'stryker.elements.config.mjs']) {
    const config = await readFile(join(repositoryRoot, configPath), 'utf8');
    assert.match(config, /ignorePatterns:[\s\S]*['"]\/\.claude['"]/);
    assert.doesNotMatch(config, /ignorePatterns:[\s\S]*['"]\/\.agents['"]/);
  }
});
