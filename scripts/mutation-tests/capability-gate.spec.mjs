import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  checkCapabilities,
  currentRevision,
  discoverMandatoryEvidenceIds,
  extractTextBlock,
  generateCapabilityBlocks,
  parseCapabilityArguments,
  parseGateEvidence,
  readCapabilityBlocks,
  replaceCapabilityBlock,
} from '../gates/check-capabilities.mjs';
import { renderCapabilityBlocks, validateCapabilityBlocks } from '../lib/capability-claims.mjs';

// @spec:018-project-integrity-hardening#S13

const run = (command, arguments_, cwd) =>
  execFileSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { HOME: process.env.HOME, LC_ALL: 'C', PATH: process.env.PATH },
  }).trim();

async function temporaryRoot(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

const miniManifest = () => ({
  schemaVersion: 1,
  destinations: [
    { id: 'package-status', path: 'package.json' },
    { id: 'readme-status', path: 'README.md' },
    { id: 'site-status', path: 'site/index.html' },
  ],
  capabilities: [
    {
      id: 'foundation',
      state: 'available',
      evidence: ['build'],
      destinations: ['package-status', 'readme-status', 'site-status'],
      availableText: 'Web Components foundation',
      plannedText: '',
    },
    {
      id: 'catalog',
      state: 'planned',
      evidence: [],
      destinations: ['package-status', 'readme-status', 'site-status'],
      availableText: '',
      plannedText: 'Runtime catalog planned',
    },
  ],
});

describe('capability file and evidence mutation boundary', () => {
  it('S13 parses every supported CLI evidence mode and rejects contradictory input', () => {
    expect(parseCapabilityArguments([], {})).toMatchObject({
      evidence: null,
      gateEvidence: null,
      generate: false,
      staticOnly: false,
      writeEvidence: null,
    });
    expect(
      parseCapabilityArguments(
        [
          '--manifest',
          'fixture-manifest.json',
          '--evidence',
          'fixture-evidence.json',
          '--gate-evidence',
          'fixture-gates.tsv',
          '--static-only',
        ],
        {},
      ),
    ).toMatchObject({
      evidence: expect.stringMatching(/fixture-evidence\.json$/u),
      gateEvidence: expect.stringMatching(/fixture-gates\.tsv$/u),
      generate: false,
      manifest: expect.stringMatching(/fixture-manifest\.json$/u),
      staticOnly: true,
      writeEvidence: null,
    });
    expect(
      parseCapabilityArguments([], {
        KIMEN_CAPABILITY_EVIDENCE_FILE: 'environment-evidence.json',
        KIMEN_GATE_EVIDENCE_FILE: 'environment-gates.tsv',
      }),
    ).toMatchObject({
      evidence: expect.stringMatching(/environment-evidence\.json$/u),
      gateEvidence: expect.stringMatching(/environment-gates\.tsv$/u),
    });
    expect(() => parseCapabilityArguments(['--unknown'], {})).toThrow(/unknown argument/iu);
    expect(() => parseCapabilityArguments(['--manifest'], {})).toThrow(/requires a path/iu);
    expect(() =>
      parseCapabilityArguments(['--generate', '--evidence', 'evidence.json'], {}),
    ).toThrow(/generate cannot/iu);
    expect(() => parseCapabilityArguments(['--write-evidence', 'evidence.json'], {})).toThrow(
      /requires --gate-evidence/iu,
    );
  });

  it('S13 derives only literal mandatory gate invocations from both wrappers', async () => {
    const root = await temporaryRoot('kimen-capability-gates-');
    await put(
      root,
      'scripts/gates/gates-core.sh',
      [
        '# run_core_gate commented fake',
        'run_core_gate build pnpm run build',
        '  run_core_gate pack-consumer pnpm run consumer',
      ].join('\n'),
    );
    await put(
      root,
      'scripts/gates/gates-suite.sh',
      ['run_gate core bash core.sh', 'run_gate test-browser bash browser.sh'].join('\n'),
    );

    await expect(discoverMandatoryEvidenceIds(root)).resolves.toEqual([
      'build',
      'core',
      'pack-consumer',
      'test-browser',
    ]);
  });

  it('S13 rejects gate wrappers that expose no literal mandatory gate', async () => {
    const root = await temporaryRoot('kimen-capability-empty-gates-');
    await put(root, 'scripts/gates/gates-core.sh', '# no gate invocation\n');
    await put(root, 'scripts/gates/gates-suite.sh', '# no gate invocation\n');

    await expect(discoverMandatoryEvidenceIds(root)).rejects.toThrow(/no mandatory gates/iu);
  });

  it('S13 extracts and replaces exact marked blocks while rejecting duplicate markers', () => {
    const destination = { id: 'readme-status', path: 'README.md' };
    const original = [
      '# Project',
      '',
      '<!-- kimen:capabilities:readme-status:start -->',
      '- stale',
      '<!-- kimen:capabilities:readme-status:end -->',
      'after',
      '',
    ].join('\n');
    const expected = [
      '<!-- kimen:capabilities:readme-status:start -->',
      '- current',
      '<!-- kimen:capabilities:readme-status:end -->',
      '',
    ].join('\n');

    expect(extractTextBlock(original, destination.id)?.text).toContain('- stale');
    expect(replaceCapabilityBlock(original, destination, expected)).toBe(
      `# Project\n\n${expected}after\n`,
    );
    expect(() => extractTextBlock(`${original}${expected}`, destination.id)).toThrow(
      /duplicate.*start/iu,
    );
  });

  it('S13 fails closed for missing or duplicate end markers and preserves insertion grammar', () => {
    const markdown = { id: 'readme-status', path: 'README.md' };
    const html = { id: 'site-status', path: 'site/index.html' };
    const block = [
      '<!-- kimen:capabilities:site-status:start -->',
      '<section>current</section>',
      '<!-- kimen:capabilities:site-status:end -->',
      '',
    ].join('\n');

    expect(extractTextBlock('# no generated block\n', markdown.id)).toBeNull();
    expect(() =>
      extractTextBlock('<!-- kimen:capabilities:readme-status:start -->\n', markdown.id),
    ).toThrow(/missing or duplicate.*end/iu);
    expect(() =>
      extractTextBlock(
        [
          '<!-- kimen:capabilities:readme-status:start -->',
          '<!-- kimen:capabilities:readme-status:end -->',
          '<!-- kimen:capabilities:readme-status:end -->',
        ].join('\n'),
        markdown.id,
      ),
    ).toThrow(/missing or duplicate.*end/iu);
    expect(replaceCapabilityBlock('# Project', markdown, 'generated\n')).toBe(
      '# Project\n\ngenerated\n',
    );
    expect(replaceCapabilityBlock('<main>\n</main>\n', html, block)).toBe(
      `<main>\n${block}</main>\n`,
    );
    expect(() => replaceCapabilityBlock('<body></body>', html, block)).toThrow(
      /no <\/main> insertion point/iu,
    );
  });

  it('S13 generates and re-reads deterministic Markdown, HTML, and JSON destinations', async () => {
    const root = await temporaryRoot('kimen-capability-files-');
    const manifest = miniManifest();
    await put(root, 'README.md', '# Project\n');
    await put(root, 'site/index.html', '<html><body><main>\n</main></body></html>\n');
    await put(root, 'package.json', '{"name":"fixture"}\n');

    await generateCapabilityBlocks(manifest, root);
    const blocks = await readCapabilityBlocks(manifest, root);

    expect(() => validateCapabilityBlocks({ manifest, blocks })).not.toThrow();
    expect(await readFile(join(root, 'README.md'), 'utf8')).toContain('Runtime catalog planned');
    expect(await readFile(join(root, 'site/index.html'), 'utf8')).toContain(
      '<section class="section"',
    );
    expect(
      JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).kimenCapabilities,
    ).toEqual(JSON.parse(renderCapabilityBlocks(manifest)['package-status']));

    await put(
      root,
      'README.md',
      (await readFile(join(root, 'README.md'), 'utf8')).replace('Runtime catalog planned', 'drift'),
    );
    const driftedBlocks = await readCapabilityBlocks(manifest, root);
    expect(() => validateCapabilityBlocks({ manifest, blocks: driftedBlocks })).toThrow(
      /drift|sync/iu,
    );
  });

  it('S13 runs generate and static-only capability modes through the in-process gate', async () => {
    const root = await temporaryRoot('kimen-capability-main-');
    const manifestSource = await readFile(
      new URL('../../docs/capabilities.json', import.meta.url),
      'utf8',
    );
    const manifest = JSON.parse(manifestSource);
    const manifestPath = join(root, 'docs/capabilities.json');
    await put(root, 'docs/capabilities.json', manifestSource);
    const evidenceIds = [
      ...new Set(manifest.capabilities.flatMap((capability) => capability.evidence)),
    ].sort();
    await put(
      root,
      'scripts/gates/gates-core.sh',
      evidenceIds.map((id) => `run_core_gate ${id} true`).join('\n'),
    );
    await put(root, 'scripts/gates/gates-suite.sh', '# fixture suite\n');
    for (const destination of manifest.destinations) {
      const contents = destination.path.endsWith('.json')
        ? '{"name":"fixture"}\n'
        : destination.path.endsWith('.html')
          ? '<html><body><main>\n</main></body></html>\n'
          : '# Fixture\n';
      await put(root, destination.path, contents);
    }
    const output = [];
    const stdout = { write: (value) => output.push(value) };

    await checkCapabilities({
      arguments_: ['--manifest', manifestPath, '--generate'],
      environment: {},
      root,
      stdout,
    });
    await checkCapabilities({
      arguments_: ['--manifest', manifestPath, '--static-only'],
      environment: {},
      root,
      stdout,
    });

    run('git', ['init', '--quiet'], root);
    run('git', ['config', 'user.name', 'fixture'], root);
    run('git', ['config', 'user.email', 'fixture@kimen.local'], root);
    run('git', ['add', '-A'], root);
    run('git', ['commit', '--quiet', '-m', 'test: capability fixture'], root);
    const evidenceRoot = await temporaryRoot('kimen-capability-evidence-');
    const gateEvidencePath = join(evidenceRoot, 'current-run.tsv');
    const evidencePath = join(evidenceRoot, 'capabilities.json');
    await writeFile(
      gateEvidencePath,
      `${evidenceIds.map((id) => `core\t${id}\tgreen`).join('\n')}\n`,
      'utf8',
    );
    await checkCapabilities({
      arguments_: [
        '--manifest',
        manifestPath,
        '--write-evidence',
        evidencePath,
        '--gate-evidence',
        gateEvidencePath,
      ],
      environment: {},
      root,
      stdout,
    });
    await checkCapabilities({
      arguments_: ['--manifest', manifestPath, '--evidence', evidencePath],
      environment: {},
      root,
      stdout,
    });

    expect(output).toHaveLength(4);
    expect(output.join('')).toMatch(/claims, 8 synchronized destinations/iu);
    expect(output.join('')).toMatch(/PASS \(web-components-foundation\)/u);
  });

  it('S13 filters current-run TSV to mandatory gates and rejects malformed or conflicting rows', () => {
    expect(
      parseGateEvidence(
        'core\tbuild\tgreen\nbrowser\tchromium\tgreen\nsuite\ttest-browser\tgreen\n',
        ['build', 'test-browser'],
      ),
    ).toEqual([
      { id: 'build', status: 'green' },
      { id: 'test-browser', status: 'green' },
    ]);
    expect(() => parseGateEvidence('core\tbuild\n', ['build'])).toThrow(/malformed/iu);
    expect(() => parseGateEvidence('core\tbuild\tgreen\ncore\tbuild\tred\n', ['build'])).toThrow(
      /conflicting/iu,
    );
  });

  it('S13 refuses generated destinations that are symbolic links', async () => {
    const root = await temporaryRoot('kimen-capability-symlink-');
    const manifest = miniManifest();
    await put(root, 'target.md', '# target\n');
    await put(root, 'site/index.html', '<html><body><main>\n</main></body></html>\n');
    await put(root, 'package.json', '{"name":"fixture"}\n');
    await symlink('target.md', join(root, 'README.md'));

    await expect(readCapabilityBlocks(manifest, root)).rejects.toThrow(/symbolic link/iu);
    await expect(generateCapabilityBlocks(manifest, root)).rejects.toThrow(/symbolic link/iu);
  });

  it('S13 rejects non-file and escaping destination paths while tolerating absent reads', async () => {
    const root = await temporaryRoot('kimen-capability-destination-');
    const outside = await temporaryRoot('kimen-capability-outside-');
    const missingManifest = {
      ...miniManifest(),
      destinations: [{ id: 'readme-status', path: 'missing.md' }],
      capabilities: miniManifest().capabilities.map((capability) => ({
        ...capability,
        destinations: ['readme-status'],
      })),
    };
    await expect(readCapabilityBlocks(missingManifest, root)).resolves.toEqual({});
    await expect(generateCapabilityBlocks(missingManifest, root)).rejects.toThrow(
      /missing destination file/iu,
    );

    await mkdir(join(root, 'README.md'));
    await expect(
      readCapabilityBlocks(
        { ...miniManifest(), destinations: [{ id: 'readme-status', path: 'README.md' }] },
        root,
      ),
    ).rejects.toThrow(/regular file/iu);

    await symlink(outside, join(root, 'escape'));
    await expect(
      readCapabilityBlocks(
        {
          ...miniManifest(),
          destinations: [{ id: 'readme-status', path: 'escape/README.md' }],
        },
        root,
      ),
    ).rejects.toThrow(/escapes the repository root/iu);
  });

  it('S13 binds clean and dirty repositories to stable full revision evidence', async () => {
    const root = await temporaryRoot('kimen-capability-revision-');
    run('git', ['init', '--quiet'], root);
    run('git', ['config', 'user.name', 'fixture'], root);
    run('git', ['config', 'user.email', 'fixture@kimen.local'], root);
    await put(root, 'tracked.txt', 'baseline\n');
    run('git', ['add', 'tracked.txt'], root);
    run('git', ['commit', '--quiet', '-m', 'test: baseline'], root);

    const clean = await currentRevision(root);
    expect(clean.sha).toMatch(/^[0-9a-f]{40}$/u);
    expect(clean.worktreeDigest).toBeNull();

    await put(root, 'tracked.txt', 'changed\n');
    const dirty = await currentRevision(root);
    expect(dirty.sha).toBe(clean.sha);
    expect(dirty.worktreeDigest).toMatch(/^[0-9a-f]{64}$/u);
    await expect(currentRevision(root)).resolves.toEqual(dirty);

    await put(root, 'untracked.txt', 'new\n');
    const untrackedFile = await currentRevision(root);
    expect(untrackedFile.worktreeDigest).not.toBe(dirty.worktreeDigest);

    await symlink('tracked.txt', join(root, 'untracked-link'));
    expect((await currentRevision(root)).worktreeDigest).not.toBe(untrackedFile.worktreeDigest);
  });
});
