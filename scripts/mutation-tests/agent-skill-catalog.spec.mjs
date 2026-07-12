import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  formatAgentSkillFinding,
  parseAgentSkillArguments,
  runAgentSkillCheck,
} from '../gates/check-agent-skills.mjs';
import {
  agentSkillTopology,
  reconcileMigrationEntries,
  validateAgentSkillFacts,
} from '../lib/agent-skill-catalog.mjs';

// @spec:019-agent-skills-canonical

const validFacts = () => ({
  canonical: {
    artifactCount: 2,
    entries: [
      { name: 'alpha', type: 'directory' },
      { name: 'beta', type: 'directory' },
    ],
    exists: true,
    ignoredPaths: [],
    path: '.agents/skills',
    realPath: '/repo/.agents/skills',
    skills: [
      { entrypointType: 'file', name: 'alpha' },
      { entrypointType: 'file', name: 'beta' },
    ],
    type: 'directory',
    untrackedPaths: [],
  },
  compatibility: {
    exists: true,
    gitMode: '120000',
    linkTarget: '../.agents/skills',
    path: '.claude/skills',
    realPath: '/repo/.agents/skills',
    resolution: 'ok',
    type: 'symlink',
  },
  guidance: [
    {
      compatibilityDeclared: true,
      canonicalDeclared: true,
      path: 'AGENTS.md',
    },
  ],
  migration: {
    actualArtifactCount: 2,
    actualPathSetSha256: 'a'.repeat(64),
    actualTreeSha256: 'b'.repeat(64),
    approvedConflicts: [],
    candidateTreeSha256: 'c'.repeat(64),
    canonicalPath: '.agents/skills',
    exists: true,
    expectedArtifactCount: 2,
    expectedConflictCount: 0,
    expectedRewriteCount: 0,
    expectedSkillCount: 2,
    finalTreeSha256: 'b'.repeat(64),
    pathSetSha256: 'a'.repeat(64),
    rewrittenAfterMigration: [],
    schemaVersion: 1,
    validatedTreeSha256: 'd'.repeat(64),
  },
  repositoryRoot: '/repo',
  tooling: { writerDriftPaths: [] },
});

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');

async function writeFixture(root, relativePath, contents) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

function fixtureGit(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

async function createCliFixture({
  compatibility = 'valid',
  guidance: guidanceOverride,
  staleGuidance = false,
  toolingWriter = false,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-agent-skills-mutation-'));
  await writeFixture(root, '.agents/skills/alpha/SKILL.md', '# Alpha\n');
  await mkdir(join(root, '.claude'), { recursive: true });
  if (compatibility === 'valid') {
    await symlink('../.agents/skills', join(root, '.claude/skills'));
  } else if (compatibility === 'directory') {
    await writeFixture(root, '.claude/skills/alpha/SKILL.md', '# Alpha\n');
  } else if (compatibility === 'broken') {
    await symlink('../missing', join(root, '.claude/skills'));
  } else if (compatibility === 'absolute') {
    await symlink(join(root, '.agents/skills'), join(root, '.claude/skills'));
  } else if (compatibility === 'escape') {
    await symlink('../../outside', join(root, '.claude/skills'));
  } else if (compatibility === 'cycle') {
    await symlink('loop', join(root, '.claude/skills'));
    await symlink('skills', join(root, '.claude/loop'));
  } else if (compatibility === 'target') {
    await mkdir(join(root, 'other'), { recursive: true });
    await symlink('../other', join(root, '.claude/skills'));
  }
  const guidance =
    guidanceOverride ??
    (staleGuidance
      ? 'Skills live only in .claude/skills.\n'
      : 'Skills are canonical at .agents/skills; .claude/skills is compatibility-only.\n');
  await writeFixture(root, 'AGENTS.md', guidance);
  await writeFixture(root, 'CLAUDE.md', guidance);
  await writeFixture(root, 'NOTICE', 'Vendored under .agents/skills.\n');
  await writeFixture(root, '.specify/extensions.yml', '# canonical .agents/skills\n');
  if (toolingWriter) {
    await writeFixture(
      root,
      'scripts/update-skills.mjs',
      "import { writeFile } from 'node:fs/promises';\nawait writeFile('.claude/skills/new/SKILL.md', '# New\\n');\n",
    );
  }
  const artifactHash = sha256('# Alpha\n');
  const path = 'alpha/SKILL.md';
  const pathSetSha256 = sha256(`${path}\n`);
  const finalTreeSha256 = sha256(`${path}\0${artifactHash}\n`);
  await writeFixture(
    root,
    'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
    `${JSON.stringify({
      approvedConflicts: [],
      candidateTreeSha256: finalTreeSha256,
      canonicalPath: '.agents/skills',
      expectedArtifactCount: 1,
      expectedConflictCount: 0,
      expectedRewriteCount: 0,
      expectedSkillCount: 1,
      finalTreeSha256,
      pathSetSha256,
      rewrittenAfterMigration: [],
      schemaVersion: 1,
      validatedTreeSha256: finalTreeSha256,
    })}\n`,
  );
  fixtureGit(root, ['init', '--quiet']);
  fixtureGit(root, ['add', '-A']);
  return root;
}

async function executeCli(root, argv = ['--root', root]) {
  let stderr = '';
  let stdout = '';
  const exitCode = await runAgentSkillCheck({
    argv,
    currentDirectory: root,
    stderr: { write: (value) => (stderr += value) },
    stdout: { write: (value) => (stdout += value) },
  });
  return { exitCode, stderr, stdout };
}

describe('canonical agent skill facts', () => {
  it('@spec:019 S1 S2 S3 S7 accepts one valid canonical catalog and compatibility view', () => {
    expect(validateAgentSkillFacts(validFacts())).toEqual({
      artifactCount: 2,
      findings: [],
      skillCount: 2,
    });
  });

  it.each([
    ['missing', 'AGENT_SKILLS_COMPAT_MISSING'],
    ['broken', 'AGENT_SKILLS_COMPAT_BROKEN'],
    ['cycle', 'AGENT_SKILLS_COMPAT_CYCLE'],
  ])('@spec:019 S6 maps %s resolution to %s', (resolution, code) => {
    const facts = validFacts();
    facts.compatibility.resolution = resolution;
    if (resolution === 'missing') facts.compatibility.exists = false;
    expect(validateAgentSkillFacts(facts).findings.map((finding) => finding.code)).toContain(code);
  });

  it('@spec:019 S4 rejects a byte-identical independent compatibility directory', () => {
    const facts = validFacts();
    facts.compatibility.type = 'directory';
    expect(validateAgentSkillFacts(facts).findings.map((finding) => finding.code)).toContain(
      'AGENT_SKILLS_COMPAT_NOT_LINK',
    );
  });

  it('@spec:019 S8 S9 rejects untracked content and stale role guidance', () => {
    const facts = validFacts();
    facts.canonical.untrackedPaths = ['.agents/skills/gamma/SKILL.md'];
    facts.guidance[0].canonicalDeclared = false;
    expect(validateAgentSkillFacts(facts).findings.map((finding) => finding.code)).toEqual([
      'AGENT_SKILLS_UNTRACKED',
      'AGENT_SKILLS_GUIDANCE_DRIFT',
    ]);
  });
});

describe('agent skill migration inventory', () => {
  it('@spec:019 S5 preserves validated conflicts and candidate-only artifacts', () => {
    expect(
      reconcileMigrationEntries({
        approvedConflictPaths: ['a/SKILL.md'],
        candidateEntries: [
          { hash: 'old', path: 'a/SKILL.md' },
          { hash: 'candidate', path: 'b/reference.md' },
        ],
        requiredPaths: ['a/SKILL.md', 'b/reference.md'],
        validatedEntries: [{ hash: 'validated', path: 'a/SKILL.md' }],
      }),
    ).toMatchObject({
      conflicts: ['a/SKILL.md'],
      entries: [
        { hash: 'validated', path: 'a/SKILL.md', resolution: 'main-validated' },
        { hash: 'candidate', path: 'b/reference.md', resolution: 'unique-preserved' },
      ],
      findings: [],
    });
  });
});

describe('complete agent skill invariant matrix', () => {
  it('@spec:019 S1 freezes the public topology constants', () => {
    expect(agentSkillTopology).toEqual({
      canonicalPath: '.agents/skills',
      compatibilityPath: '.claude/skills',
      expectedLinkTarget: '../.agents/skills',
      migrationContractPath:
        'specs/019-agent-skills-canonical/contracts/migration-inventory-v1.json',
    });
  });

  it('@spec:019 S1 distinguishes a missing canonical catalog from a wrong type', () => {
    const missing = validFacts();
    missing.canonical.exists = false;
    missing.canonical.type = 'missing';
    expect(validateAgentSkillFacts(missing).findings).toEqual([
      { code: 'AGENT_SKILLS_CANONICAL_MISSING', path: '.agents/skills' },
    ]);

    const wrongType = validFacts();
    wrongType.canonical.type = 'symlink';
    expect(validateAgentSkillFacts(wrongType).findings).toEqual([
      { code: 'AGENT_SKILLS_CANONICAL_TYPE', path: '.agents/skills' },
    ]);
  });

  it('@spec:019 S1 rejects immediate canonical entries that are not real directories', () => {
    const facts = validFacts();
    facts.canonical.entries = [
      { name: 'file-entry', type: 'file' },
      { name: 'linked-entry', type: 'symlink' },
    ];
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: 'AGENT_SKILLS_ENTRY_TYPE', path: '.agents/skills/file-entry' },
      { code: 'AGENT_SKILLS_ENTRY_TYPE', path: '.agents/skills/linked-entry' },
    ]);
  });

  it('@spec:019 S1 sorts skills and rejects every non-file entrypoint', () => {
    const facts = validFacts();
    facts.canonical.artifactCount = 9;
    facts.migration.actualArtifactCount = 9;
    facts.migration.expectedArtifactCount = 9;
    facts.migration.expectedSkillCount = 3;
    facts.canonical.skills = [
      { entrypointType: 'missing', name: 'zeta' },
      { entrypointType: 'directory', name: 'alpha' },
      { entrypointType: 'file', name: 'middle' },
    ];
    expect(validateAgentSkillFacts(facts)).toEqual({
      artifactCount: 9,
      findings: [
        { code: 'AGENT_SKILLS_ENTRY_MISSING', path: '.agents/skills/alpha/SKILL.md' },
        { code: 'AGENT_SKILLS_ENTRY_MISSING', path: '.agents/skills/zeta/SKILL.md' },
      ],
      skillCount: 3,
    });
  });

  it('@spec:019 S1 S8 reports ignored and untracked paths deterministically', () => {
    const facts = validFacts();
    facts.canonical.ignoredPaths = [
      '.agents/skills/zeta/SKILL.md',
      '.agents/skills/alpha/SKILL.md',
    ];
    facts.canonical.untrackedPaths = [
      '.agents/skills/zeta/SKILL.md',
      '.agents/skills/beta/SKILL.md',
    ];
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: 'AGENT_SKILLS_IGNORED', path: '.agents/skills/alpha/SKILL.md' },
      { code: 'AGENT_SKILLS_UNTRACKED', path: '.agents/skills/beta/SKILL.md' },
      { code: 'AGENT_SKILLS_IGNORED', path: '.agents/skills/zeta/SKILL.md' },
      { code: 'AGENT_SKILLS_UNTRACKED', path: '.agents/skills/zeta/SKILL.md' },
    ]);
  });

  it.each([
    [{ exists: false, resolution: 'ok' }, 'AGENT_SKILLS_COMPAT_MISSING'],
    [{ exists: true, resolution: 'missing' }, 'AGENT_SKILLS_COMPAT_MISSING'],
    [{ exists: true, resolution: 'broken' }, 'AGENT_SKILLS_COMPAT_BROKEN'],
    [{ exists: true, resolution: 'cycle' }, 'AGENT_SKILLS_COMPAT_CYCLE'],
    [{ exists: true, resolution: 'escape' }, 'AGENT_SKILLS_COMPAT_ESCAPE'],
  ])('@spec:019 S6 rejects resolution fact %o', (override, expectedCode) => {
    const facts = validFacts();
    Object.assign(facts.compatibility, override);
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: expectedCode, path: '.claude/skills' },
    ]);
  });

  it('@spec:019 S4 returns only NOT_LINK for an independent compatibility path', () => {
    const facts = validFacts();
    facts.compatibility.type = 'directory';
    facts.compatibility.gitMode = '100644';
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: 'AGENT_SKILLS_COMPAT_NOT_LINK', path: '.claude/skills' },
    ]);
  });

  it('@spec:019 S6 orders absolute, Git-mode and target findings at one path', () => {
    const facts = validFacts();
    facts.compatibility.gitMode = '100644';
    facts.compatibility.linkTarget = '/repo/.agents/skills';
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: 'AGENT_SKILLS_COMPAT_ABSOLUTE', path: '.claude/skills' },
      { code: 'AGENT_SKILLS_COMPAT_TARGET', path: '.claude/skills' },
      { code: 'AGENT_SKILLS_GIT_MODE', path: '.claude/skills' },
    ]);
  });

  it.each([
    ['../other-skills', '/repo/.agents/skills'],
    ['../.agents/skills', '/repo/other-skills'],
  ])('@spec:019 S2 rejects stored or resolved target drift', (linkTarget, realPath) => {
    const facts = validFacts();
    facts.compatibility.linkTarget = linkTarget;
    facts.compatibility.realPath = realPath;
    expect(validateAgentSkillFacts(facts).findings).toEqual([
      { code: 'AGENT_SKILLS_COMPAT_TARGET', path: '.claude/skills' },
    ]);
  });

  it('@spec:019 S9 applies compatibility wording only to role guidance', () => {
    const inventory = validFacts();
    inventory.guidance = [
      {
        canonicalDeclared: true,
        compatibilityDeclared: false,
        compatibilityRequired: false,
        path: 'NOTICE',
      },
    ];
    expect(validateAgentSkillFacts(inventory).findings).toEqual([]);

    const stale = validFacts();
    stale.guidance = [
      {
        canonicalDeclared: true,
        compatibilityDeclared: false,
        compatibilityRequired: true,
        path: 'CLAUDE.md',
      },
      {
        canonicalDeclared: false,
        compatibilityDeclared: true,
        compatibilityRequired: false,
        path: 'AGENTS.md',
      },
    ];
    expect(validateAgentSkillFacts(stale).findings).toEqual([
      { code: 'AGENT_SKILLS_GUIDANCE_DRIFT', path: 'AGENTS.md' },
      { code: 'AGENT_SKILLS_GUIDANCE_DRIFT', path: 'CLAUDE.md' },
    ]);
  });

  it('@spec:019 S5 rejects invalid or drifted migration inventory facts', () => {
    const invalid = validFacts();
    invalid.migration.schemaVersion = 2;
    expect(validateAgentSkillFacts(invalid).findings).toContainEqual({
      code: 'AGENT_SKILLS_MIGRATION_CONTRACT',
      path: agentSkillTopology.migrationContractPath,
    });

    const drifted = validFacts();
    drifted.migration.actualTreeSha256 = 'e'.repeat(64);
    expect(validateAgentSkillFacts(drifted).findings).toContainEqual({
      code: 'AGENT_SKILLS_MIGRATION_HASH',
      path: agentSkillTopology.migrationContractPath,
    });
  });

  it('@spec:019 S8 rejects repository tooling that writes through a vendor path', () => {
    const facts = validFacts();
    facts.tooling.writerDriftPaths = ['scripts/update-skills.mjs'];
    expect(validateAgentSkillFacts(facts).findings).toContainEqual({
      code: 'AGENT_SKILLS_TOOLING_VENDOR_WRITE',
      path: 'scripts/update-skills.mjs',
    });
  });

  it('@spec:019 S6 formats a bounded diagnostic with invariant and exact expected target', () => {
    expect(
      formatAgentSkillFinding({ code: 'AGENT_SKILLS_COMPAT_TARGET', path: '.claude/skills\nX' }),
    ).toBe(
      'AGENT_SKILLS_COMPAT_TARGET .claude/skills?X invariant="compatibility link must resolve to the canonical catalog" expected=".claude/skills -> ../.agents/skills; .agents/skills is the sole real catalog"',
    );
  });

  it('@spec:019 S5 accounts for every migration resolution and finding in path order', () => {
    expect(
      reconcileMigrationEntries({
        approvedConflictPaths: ['d-approved/SKILL.md'],
        candidateEntries: [
          { hash: 'candidate', path: 'e-candidate/SKILL.md' },
          { hash: 'same', path: 'c-identical/SKILL.md' },
          { hash: 'old', path: 'd-approved/SKILL.md' },
          { hash: 'old', path: 'f-unapproved/SKILL.md' },
        ],
        requiredPaths: [
          'f-unapproved/SKILL.md',
          'a-missing/SKILL.md',
          'b-validated/SKILL.md',
          'c-identical/SKILL.md',
          'd-approved/SKILL.md',
          'e-candidate/SKILL.md',
        ],
        validatedEntries: [
          { hash: 'validated', path: 'f-unapproved/SKILL.md' },
          { hash: 'validated', path: 'd-approved/SKILL.md' },
          { hash: 'same', path: 'c-identical/SKILL.md' },
          { hash: 'validated', path: 'b-validated/SKILL.md' },
        ],
      }),
    ).toEqual({
      conflicts: ['d-approved/SKILL.md', 'f-unapproved/SKILL.md'],
      entries: [
        {
          hash: 'validated',
          path: 'b-validated/SKILL.md',
          resolution: 'main-validated',
        },
        { hash: 'same', path: 'c-identical/SKILL.md', resolution: 'identical' },
        {
          hash: 'validated',
          path: 'd-approved/SKILL.md',
          resolution: 'main-validated',
        },
        {
          hash: 'candidate',
          path: 'e-candidate/SKILL.md',
          resolution: 'unique-preserved',
        },
        {
          hash: 'validated',
          path: 'f-unapproved/SKILL.md',
          resolution: 'main-validated',
        },
      ],
      findings: [
        { code: 'AGENT_SKILLS_MIGRATION_OMISSION', path: 'a-missing/SKILL.md' },
        { code: 'AGENT_SKILLS_MIGRATION_CONFLICT', path: 'f-unapproved/SKILL.md' },
      ],
    });
    expect(reconcileMigrationEntries({})).toEqual({ conflicts: [], entries: [], findings: [] });
  });
});

describe('agent skill filesystem and Git collector', () => {
  it('@spec:019 S6 parses only the explicit root contract', () => {
    expect(parseAgentSkillArguments([], '/repo')).toEqual({ root: '/repo' });
    expect(parseAgentSkillArguments(['--root', 'fixture'], '/repo')).toEqual({
      root: '/repo/fixture',
    });
    expect(() => parseAgentSkillArguments(['--root'], '/repo')).toThrow(
      'usage: check-agent-skills.mjs [--root <repository>]',
    );
    expect(() => parseAgentSkillArguments(['--unknown', 'value'], '/repo')).toThrow(
      'usage: check-agent-skills.mjs [--root <repository>]',
    );
  });

  it('@spec:019 S1 S2 S7 collects and prints one valid tracked topology', async () => {
    const root = await createCliFixture();
    try {
      expect(await executeCli(root)).toEqual({
        exitCode: 0,
        stderr: '',
        stdout:
          'canonical=.agents/skills compatibility=.claude/skills target=../.agents/skills skills=1 artifacts=1 inventory=verified\n',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    ['missing', 'AGENT_SKILLS_COMPAT_MISSING'],
    ['directory', 'AGENT_SKILLS_COMPAT_NOT_LINK'],
    ['broken', 'AGENT_SKILLS_COMPAT_BROKEN'],
    ['absolute', 'AGENT_SKILLS_COMPAT_ABSOLUTE'],
    ['escape', 'AGENT_SKILLS_COMPAT_ESCAPE'],
    ['cycle', 'AGENT_SKILLS_COMPAT_CYCLE'],
    ['target', 'AGENT_SKILLS_COMPAT_TARGET'],
  ])('@spec:019 S4 S6 collects unsafe %s compatibility', async (compatibility, code) => {
    const root = await createCliFixture({ compatibility });
    try {
      const result = await executeCli(root);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`${code} .claude/skills invariant=`);
      expect(result.stdout).toBe('');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('@spec:019 S1 rejects missing and non-directory canonical catalogs', async () => {
    const missingRoot = await createCliFixture();
    try {
      await rm(join(missingRoot, '.agents/skills'), { recursive: true, force: true });
      expect((await executeCli(missingRoot)).stderr).toContain('AGENT_SKILLS_CANONICAL_MISSING');
    } finally {
      await rm(missingRoot, { recursive: true, force: true });
    }

    const linkedRoot = await createCliFixture();
    try {
      await rm(join(linkedRoot, '.agents/skills'), { recursive: true, force: true });
      await mkdir(join(linkedRoot, 'canonical-target'), { recursive: true });
      await symlink('../canonical-target', join(linkedRoot, '.agents/skills'));
      expect((await executeCli(linkedRoot)).stderr).toContain('AGENT_SKILLS_CANONICAL_TYPE');
    } finally {
      await rm(linkedRoot, { recursive: true, force: true });
    }
  });

  it('@spec:019 S1 S8 reports entrypoint, ignored and untracked Git drift', async () => {
    const root = await createCliFixture();
    try {
      await unlink(join(root, '.agents/skills/alpha/SKILL.md'));
      await writeFixture(root, '.gitignore', '.agents/skills/alpha/ignored.md\n');
      await writeFixture(root, '.agents/skills/alpha/ignored.md', 'ignored\n');
      await writeFixture(root, '.agents/skills/alpha/untracked.md', 'untracked\n');
      const result = await executeCli(root);
      expect(result.stderr).toContain('AGENT_SKILLS_ENTRY_MISSING');
      expect(result.stderr).toContain('AGENT_SKILLS_IGNORED');
      expect(result.stderr).toContain('AGENT_SKILLS_UNTRACKED');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('@spec:019 S9 collects stale and absent ownership guidance', async () => {
    const staleRoot = await createCliFixture({ staleGuidance: true });
    try {
      const result = await executeCli(staleRoot);
      expect(result.stderr).toContain('AGENT_SKILLS_GUIDANCE_DRIFT AGENTS.md');
      expect(result.stderr).toContain('AGENT_SKILLS_GUIDANCE_DRIFT CLAUDE.md');
    } finally {
      await rm(staleRoot, { recursive: true, force: true });
    }

    const absentRoot = await createCliFixture();
    try {
      await unlink(join(absentRoot, 'NOTICE'));
      expect((await executeCli(absentRoot)).stderr).toContain('AGENT_SKILLS_GUIDANCE_DRIFT NOTICE');
    } finally {
      await rm(absentRoot, { recursive: true, force: true });
    }
  });

  it('@spec:019 S8 S9 collects writer drift and rejects reversed role wording', async () => {
    const root = await createCliFixture({
      guidance: 'Skills are canonical at .claude/skills; .agents/skills is compatibility-only.\n',
      toolingWriter: true,
    });
    try {
      const result = await executeCli(root);
      expect(result.stderr).toContain('AGENT_SKILLS_GUIDANCE_DRIFT AGENTS.md');
      expect(result.stderr).toContain('AGENT_SKILLS_GUIDANCE_DRIFT CLAUDE.md');
      expect(result.stderr).toContain(
        'AGENT_SKILLS_TOOLING_VENDOR_WRITE scripts/update-skills.mjs',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
