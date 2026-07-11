import { describe, expect, it } from 'vitest';

import {
  evaluateCapabilityEvidence,
  renderCapabilityBlocks,
  validateCapabilityBlocks,
  validateCapabilityManifest,
} from '../lib/capability-claims.mjs';

// @spec:018-project-integrity-hardening#S13

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const digest = 'c'.repeat(64);
const otherDigest = 'd'.repeat(64);
const mandatoryEvidenceIds = ['build', 'pack-consumer', 'test-browser'];
const destinations = [
  { id: 'readme-status', path: 'README.md' },
  { id: 'workshop-status', path: 'packages/elements/docs/introduction.mdx' },
  { id: 'site-status', path: 'site/index.html' },
  { id: 'package-status', path: 'packages/example/package.json' },
];
const destinationIds = destinations.map(({ id }) => id);
const policy = {
  mandatoryEvidenceIds,
  requiredDestinationPaths: destinations.map(({ path }) => path),
};
const clone = (value) => JSON.parse(JSON.stringify(value));

const manifest = () => ({
  schemaVersion: 1,
  destinations: clone(destinations),
  capabilities: [
    {
      id: 'foundation',
      state: 'available',
      evidence: [...mandatoryEvidenceIds],
      destinations: [...destinationIds],
      availableText: 'Web Components foundation',
      plannedText: '',
    },
    {
      id: 'mutation-gate',
      state: 'hardening',
      evidence: ['build'],
      destinations: [...destinationIds],
      availableText: '',
      plannedText: 'Mutation gate in hardening',
    },
    {
      id: 'catalog',
      state: 'planned',
      evidence: [],
      destinations: [...destinationIds],
      availableText: '',
      plannedText: 'Runtime catalog planned',
    },
  ],
});

const evidence = (revision = { sha, worktreeDigest: null }) => ({
  schemaVersion: 1,
  revision: clone(revision),
  gates: mandatoryEvidenceIds.map((id) => ({ id, status: 'green' })),
});

describe('capability claim mutation boundary', () => {
  it('S13 accepts the complete state, evidence, and destination grammar', () => {
    expect(() => validateCapabilityManifest(manifest(), policy)).not.toThrow();
  });

  it.each([
    ['schema', (value) => (value.schemaVersion = 2), /schemaVersion/iu],
    ['unknown manifest field', (value) => (value.generatedAt = 'now'), /unknown field/iu],
    ['destinations array', (value) => (value.destinations = null), /destinations/iu],
    ['capabilities array', (value) => (value.capabilities = []), /capabilities/iu],
    ['destination ID', (value) => (value.destinations[0].id = 'Bad'), /destination ID/iu],
    ['destination path', (value) => (value.destinations[0].path = '../README.md'), /path/iu],
    [
      'duplicate destination ID',
      (value) => (value.destinations[1].id = value.destinations[0].id),
      /duplicate.*destination ID/iu,
    ],
    [
      'duplicate destination path',
      (value) => (value.destinations[1].path = value.destinations[0].path),
      /duplicate.*destination path/iu,
    ],
    ['capability ID', (value) => (value.capabilities[0].id = 'Bad'), /capability ID/iu],
    [
      'duplicate capability ID',
      (value) => (value.capabilities[1].id = value.capabilities[0].id),
      /duplicate.*capability ID/iu,
    ],
    ['state', (value) => (value.capabilities[0].state = 'ready'), /state/iu],
    ['duplicate evidence', (value) => value.capabilities[0].evidence.push('build'), /duplicate/iu],
    [
      'unknown evidence',
      (value) => value.capabilities[0].evidence.push('advisory'),
      /mandatory gate/iu,
    ],
    [
      'duplicate capability destination',
      (value) => value.capabilities[0].destinations.push('site-status'),
      /duplicate/iu,
    ],
    [
      'unknown capability destination',
      (value) => value.capabilities[0].destinations.push('unknown-status'),
      /unknown destination/iu,
    ],
    [
      'unpopulated destination',
      (value) => {
        for (const capability of value.capabilities) {
          capability.destinations = capability.destinations.filter((id) => id !== 'site-status');
        }
      },
      /site-status.*not populated/iu,
    ],
    [
      'available evidence',
      (value) => (value.capabilities[0].evidence = []),
      /available.*evidence/iu,
    ],
    ['available text', (value) => (value.capabilities[0].availableText = ''), /availableText/iu],
    [
      'available planned text',
      (value) => (value.capabilities[0].plannedText = 'Also planned'),
      /empty plannedText/iu,
    ],
    [
      'hardening evidence',
      (value) => (value.capabilities[1].evidence = []),
      /hardening.*evidence/iu,
    ],
    [
      'hardening availability',
      (value) => (value.capabilities[1].availableText = 'Ready'),
      /hardening.*availableText/iu,
    ],
    [
      'hardening wording',
      (value) => (value.capabilities[1].plannedText = 'Mutation gate'),
      /incomplete hardening/iu,
    ],
    [
      'planned evidence',
      (value) => (value.capabilities[2].evidence = ['build']),
      /planned.*must not claim/iu,
    ],
    [
      'planned availability',
      (value) => (value.capabilities[2].availableText = 'Catalog available'),
      /planned.*availableText/iu,
    ],
    [
      'planned wording',
      (value) => (value.capabilities[2].plannedText = 'Catalog available'),
      /plannedText.*available/iu,
    ],
    [
      'mixed planned availability wording',
      (value) => (value.capabilities[2].plannedText = 'Catalog available later'),
      /plannedText.*available/iu,
    ],
  ])('S13 rejects %s drift', (_name, mutate, error) => {
    const value = manifest();
    mutate(value);
    expect(() => validateCapabilityManifest(value, policy)).toThrow(error);
  });

  it('S13 renders stable Markdown, HTML, and JSON blocks regardless of ordering', () => {
    const value = manifest();
    const reordered = manifest();
    reordered.destinations.reverse();
    reordered.capabilities.reverse();
    for (const capability of reordered.capabilities) {
      capability.destinations.reverse();
      capability.evidence.reverse();
    }

    const blocks = renderCapabilityBlocks(value);

    expect(renderCapabilityBlocks(reordered)).toEqual(blocks);
    expect(blocks['readme-status']).toContain('<!-- kimen:capabilities:readme-status:start -->');
    expect(blocks['workshop-status']).toContain('{/* kimen:capabilities:workshop-status:start */}');
    expect(blocks['workshop-status']).not.toContain('<!--');
    expect(blocks['readme-status']).toContain('Runtime catalog planned');
    expect(blocks['site-status']).toContain('<section class="section"');
    expect(JSON.parse(blocks['package-status']).claims).toHaveLength(3);
  });

  it('S13 detects missing, extra, and byte-drifted generated blocks', () => {
    const value = manifest();
    const blocks = renderCapabilityBlocks(value);
    const missing = { ...blocks };
    delete missing['readme-status'];
    expect(() => validateCapabilityBlocks({ manifest: value, blocks: missing })).toThrow(
      /missing/iu,
    );
    expect(() =>
      validateCapabilityBlocks({
        manifest: value,
        blocks: { ...blocks, 'readme-status': `${blocks['readme-status']}drift` },
      }),
    ).toThrow(/drift|sync/iu);
    expect(() =>
      validateCapabilityBlocks({ manifest: value, blocks: { ...blocks, extra: 'x' } }),
    ).toThrow(/undeclared/iu);
    expect(() => validateCapabilityBlocks({ manifest: value, blocks })).not.toThrow();
  });

  it.each([
    [
      'stale SHA',
      evidence({ sha: otherSha, worktreeDigest: null }),
      { sha, worktreeDigest: null },
      /stale.*SHA/iu,
    ],
    [
      'stale worktree',
      evidence({ sha, worktreeDigest: otherDigest }),
      { sha, worktreeDigest: digest },
      /worktree digest.*stale/iu,
    ],
    [
      'missing gate',
      { ...evidence(), gates: evidence().gates.filter(({ id }) => id !== 'pack-consumer') },
      { sha, worktreeDigest: null },
      /pack-consumer.*missing/iu,
    ],
    [
      'red gate',
      {
        ...evidence(),
        gates: evidence().gates.map((gate) =>
          gate.id === 'test-browser' ? { ...gate, status: 'red' } : gate,
        ),
      },
      { sha, worktreeDigest: null },
      /test-browser.*green/iu,
    ],
    [
      'unknown gate',
      { ...evidence(), gates: [...evidence().gates, { id: 'advisory', status: 'green' }] },
      { sha, worktreeDigest: null },
      /not a mandatory gate/iu,
    ],
  ])('S13 rejects %s evidence', (_name, evidenceRecord, revision, error) => {
    expect(() =>
      evaluateCapabilityEvidence({
        manifest: manifest(),
        evidenceRecord,
        currentRevision: revision,
        mandatoryEvidenceIds,
      }),
    ).toThrow(error);
  });

  it.each([
    [{ sha, worktreeDigest: null }],
    [{ sha, worktreeDigest: digest }],
  ])('S13 accepts exact current green revision evidence %#', (revision) => {
    expect(
      evaluateCapabilityEvidence({
        manifest: manifest(),
        evidenceRecord: evidence(revision),
        currentRevision: revision,
        mandatoryEvidenceIds,
      }),
    ).toEqual({ decision: 'pass', availableCapabilityIds: ['foundation'] });
  });
});
