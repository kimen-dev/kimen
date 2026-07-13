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

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');
const canonicalUnignoreGuard = [
  '!.agents/',
  '!.agents/skills/',
  `!.agents/skills/${'*'.repeat(2)}`,
  '',
].join('\n');
const inventoryDigests = (entries) => {
  const sorted = [...entries].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  return {
    finalTreeSha256: sha256(sorted.map(({ hash, path }) => `${path}\0${hash}\n`).join('')),
    pathSetSha256: sha256(sorted.map(({ path }) => `${path}\n`).join('')),
  };
};

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

  runGit(root, ['init', '--quiet']);
  runGit(root, ['config', 'user.email', 'fixture@example.invalid']);
  runGit(root, ['config', 'user.name', 'Kimen Fixture']);

  await write(root, '.claude/skills/alpha/SKILL.md', '# Alpha\n');
  await write(root, '.claude/skills/beta/SKILL.md', '# Beta\n');
  runGit(root, ['add', '-A']);
  runGit(root, ['commit', '--quiet', '-m', 'validated source']);
  const validatedCommitSha = runGit(root, ['rev-parse', 'HEAD']).stdout.trim();

  await write(root, '.agents/skills/alpha/SKILL.md', '# Alpha\n');
  await write(root, '.agents/skills/beta/SKILL.md', '# Beta\n');
  await rm(join(root, '.claude/skills'), { recursive: true, force: true });
  await symlink('../.agents/skills', join(root, '.claude/skills'));
  runGit(root, ['add', '-A']);
  runGit(root, ['commit', '--quiet', '-m', 'migrated source']);
  const migratedTreeOid = runGit(root, ['rev-parse', 'HEAD:.agents/skills']).stdout.trim();

  if (compatibility !== 'valid') {
    await rm(join(root, '.claude/skills'), { recursive: true, force: true });
  }

  if (compatibility === 'valid') {
    // The migrated historical symlink remains the live compatibility view.
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
  if (missingEntrypoint) {
    await unlink(join(root, '.agents/skills/beta/SKILL.md'));
  }

  await write(root, 'AGENTS.md', guidance);
  await write(root, 'CLAUDE.md', guidance);
  await write(root, 'NOTICE', 'Vendored skills live under `.agents/skills`.\n');
  await write(root, '.gitignore', canonicalUnignoreGuard);
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
          { hash: sha256('# Beta\n'), path: 'beta/SKILL.md' },
        ];
        const digests = inventoryDigests(entries);
        return {
          approvedConflicts: [],
          candidateCapture: {
            artifactCount: 2,
            pathSetSha256: digests.pathSetSha256,
            provenance: 'founder-approved local pre-migration capture',
            skillCount: 2,
            treeSha256: digests.finalTreeSha256,
          },
          canonicalPath: '.agents/skills',
          entryEncoding: 'utf8(path) + NUL + lowercase-sha256(bytes) + LF, sorted by path',
          expectedConflictCount: 0,
          expectedRewriteCount: 0,
          migratedSource: {
            artifactCount: 2,
            pathSetSha256: digests.pathSetSha256,
            rootPath: '.agents/skills',
            skillCount: 2,
            treeOid: migratedTreeOid,
            treeSha256: digests.finalTreeSha256,
          },
          pathEncoding: 'utf8(path) + LF, sorted by path',
          rewrittenAfterMigration: [],
          schemaVersion: 3,
          validatedSource: {
            artifactCount: 2,
            commitSha: validatedCommitSha,
            pathSetSha256: digests.pathSetSha256,
            rootPath: '.claude/skills',
            skillCount: 2,
            treeSha256: digests.finalTreeSha256,
          },
        };
      })(),
      null,
      2,
    )}\n`,
  );
  await mkdir(join(root, '.home'), { recursive: true });

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

test('S5 the real migration inventory is bound to immutable Git trees', async () => {
  const inventory = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
      ),
      'utf8',
    ),
  );
  assert.equal(inventory.schemaVersion, 3);
  assert.equal(inventory.validatedSource.commitSha, 'd4bd216090e3eb6515a59bee8db29760328108e6');
  assert.equal(inventory.migratedSource.treeOid, 'dab40a007b09d898b61120e8f9fb9fc7191cbb7d');
  assert.equal(inventory.validatedSource.artifactCount, 70);
  assert.equal(inventory.migratedSource.artifactCount, 70);
  assert.equal(inventory.approvedConflicts.length, 8);
  assert.match(inventory.candidateCapture.treeSha256, /^[a-f0-9]{64}$/);
  const result = runCli(repositoryRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /inventory=historical-verified/);
});

test('S5 historical evidence does not freeze a later canonical edit', async (t) => {
  const root = await createFixture(t);
  await write(root, '.agents/skills/alpha/SKILL.md', '# Later Alpha\n');
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /inventory=historical-verified/);
});

test('S5 historical evidence rejects an unavailable pinned source commit', async (t) => {
  const root = await createFixture(t);
  const contractPath = join(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
  );
  const inventory = JSON.parse(await readFile(contractPath, 'utf8'));
  inventory.validatedSource.commitSha = '0'.repeat(40);
  await write(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  runGit(root, ['add', '-A']);
  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_MIGRATION_SOURCE/);
});

test('S5 squash-only history retains the migrated source evidence', async (t) => {
  const source = await createFixture(t, { commit: true });
  const sourceTree = runGit(source, ['rev-parse', 'HEAD^{tree}']).stdout.trim();
  const baseCommit = runGit(source, ['rev-list', '--max-parents=0', 'HEAD']).stdout.trim();
  const squashedCommit = runGit(source, [
    'commit-tree',
    sourceTree,
    '-p',
    baseCommit,
    '-m',
    'synthetic squash',
  ]).stdout.trim();
  runGit(source, ['branch', 'squashed', squashedCommit]);

  const clone = await mkdtemp(join(tmpdir(), 'kimen-agent-skills-squash-clone-'));
  t.after(() => rm(clone, { recursive: true, force: true }));
  await rm(clone, { recursive: true, force: true });
  const cloned = run(dirname(clone), 'git', [
    'clone',
    '--quiet',
    '--no-local',
    '--single-branch',
    '--branch',
    'squashed',
    source,
    clone,
  ]);
  assert.equal(cloned.status, 0, cloned.stderr);

  const result = runCli(clone);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /inventory=historical-verified/);
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

test('S1 S8 a later ignore rule cannot hide a future canonical artifact', async (t) => {
  const root = await createFixture(t);
  await write(
    root,
    '.gitignore',
    ['*.log', canonicalUnignoreGuard.trimEnd(), '.agents/skills/new-*.md', ''].join('\n'),
  );
  const ignored = run(root, 'git', [
    'check-ignore',
    '--no-index',
    '.agents/skills/new-sentinel.md',
  ]);
  assert.equal(ignored.status, 0, 'fixture must reproduce the latent ignore rule');

  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_IGNORED \.gitignore/);
});

test('S1 S8 a nested ignore file cannot override canonical visibility', async (t) => {
  const root = await createFixture(t);
  await write(root, '.gitignore', canonicalUnignoreGuard);
  await write(root, '.agents/skills/alpha/.gitignore', '*.md\n');
  runGit(root, ['add', '-A']);

  const result = runCli(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AGENT_SKILLS_IGNORED \.agents\/skills\/alpha\/\.gitignore/);
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

test('S9 ownership paths are matched literally without dynamic regular expressions', async () => {
  const source = await readFile(cliPath, 'utf8');
  assert.doesNotMatch(source, /new RegExp\((?:targetPath|otherPath)/u);
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

test('S5 CI gates checkout retains the pinned historical Git sources', async () => {
  const workflow = await readFile(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');
  const gatesJob = workflow.slice(workflow.indexOf('  gates:'), workflow.indexOf('  mutation:'));
  assert.match(gatesJob, /actions\/checkout@[a-f0-9]{40}[\s\S]*fetch-depth: 0/);
});
