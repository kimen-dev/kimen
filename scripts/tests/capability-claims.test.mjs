// @spec:018-project-integrity-hardening#S13
import assert from 'node:assert/strict';
import test from 'node:test';

const subjectUrl = new URL('../lib/capability-claims.mjs', import.meta.url);

const currentSha = 'a'.repeat(40);
const previousSha = 'b'.repeat(40);
const currentWorktreeDigest = 'c'.repeat(64);
const previousWorktreeDigest = 'd'.repeat(64);

const mandatoryEvidenceIds = Object.freeze(['build', 'pack-consumer', 'test-browser']);
const requiredDestinationPaths = Object.freeze([
  'README.md',
  'docs/roadmap.md',
  'packages/catalog/README.md',
  'packages/catalog/package.json',
  'packages/elements/docs/introduction.mdx',
  'packages/kimen/README.md',
  'packages/kimen/package.json',
  'site/index.html',
]);

const destinationIds = Object.freeze([
  'root-readme-status',
  'roadmap-status',
  'catalog-readme-status',
  'catalog-package-status',
  'elements-workshop-status',
  'kimen-readme-status',
  'kimen-package-status',
  'site-status',
]);

const destinations = Object.freeze(
  destinationIds.map((id, index) =>
    Object.freeze({
      id,
      path: requiredDestinationPaths[index],
    }),
  ),
);

const cleanRevision = Object.freeze({
  sha: currentSha,
  worktreeDigest: null,
});
const dirtyRevision = Object.freeze({
  sha: currentSha,
  worktreeDigest: currentWorktreeDigest,
});

async function loadSubject() {
  let subject;
  try {
    subject = await import(subjectUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      assert.fail('T063 RED: scripts/lib/capability-claims.mjs is not implemented');
    }
    throw error;
  }

  assert.equal(
    typeof subject.validateCapabilityManifest,
    'function',
    'validateCapabilityManifest export is required',
  );
  assert.equal(
    typeof subject.renderCapabilityBlocks,
    'function',
    'renderCapabilityBlocks export is required',
  );
  assert.equal(
    typeof subject.validateCapabilityBlocks,
    'function',
    'validateCapabilityBlocks export is required',
  );
  assert.equal(
    typeof subject.evaluateCapabilityEvidence,
    'function',
    'evaluateCapabilityEvidence export is required',
  );
  return subject;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function aManifest() {
  return {
    schemaVersion: 1,
    destinations: clone(destinations),
    capabilities: [
      {
        id: 'web-components-foundation',
        state: 'available',
        evidence: [...mandatoryEvidenceIds],
        destinations: [...destinationIds],
        availableText: 'Machine-readable Web Components foundation',
        plannedText: '',
      },
      {
        id: 'runtime-catalog',
        state: 'planned',
        evidence: [],
        destinations: [...destinationIds],
        availableText: '',
        plannedText: 'Neutral runtime catalog planned',
      },
      {
        id: 'guarded-renderer',
        state: 'planned',
        evidence: [],
        destinations: [...destinationIds],
        availableText: '',
        plannedText: 'Guarded renderer planned',
      },
      {
        id: 'protocol-adapters',
        state: 'planned',
        evidence: [],
        destinations: [...destinationIds],
        availableText: '',
        plannedText: 'Protocol adapters planned',
      },
    ],
  };
}

function greenEvidence(revision = cleanRevision) {
  return {
    schemaVersion: 1,
    revision: clone(revision),
    gates: mandatoryEvidenceIds.map((id) => ({ id, status: 'green' })),
  };
}

const manifestPolicy = Object.freeze({
  mandatoryEvidenceIds,
  requiredDestinationPaths,
});

test('S13 accepts an available foundation and explicitly planned GenUI capabilities', async () => {
  const { validateCapabilityManifest } = await loadSubject();

  assert.doesNotThrow(() => validateCapabilityManifest(aManifest(), manifestPolicy));
});

test('S13 rejects unknown manifest fields instead of silently changing the schema', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.generatedAt = 'now';

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /unknown field generatedAt/i,
  );
});

test('S13 rejects an available capability without evidence', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities[0].evidence = [];

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /web-components-foundation.*evidence/i,
  );
});

test('S13 rejects evidence that is not a mandatory gate', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities[0].evidence.push('advisory-only');

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /advisory-only.*mandatory/i,
  );
});

test('S13 rejects availability text on a planned capability', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities[1].availableText = 'Neutral runtime catalog';

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /runtime-catalog.*availableText/i,
  );
});

test('S13 rejects present-tense availability wording on a planned capability', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities[2].plannedText = 'Guarded renderer available';

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /guarded-renderer.*planned/i,
  );
});

test('S13 rejects mixed planned and present-tense availability wording', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities[2].plannedText = 'Guarded renderer available later';

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /guarded-renderer.*plannedText.*available/i,
  );
});

test('S13 rejects omission of a mandatory README, site, workshop, roadmap, or package destination', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.destinations = manifest.destinations.filter(
    ({ path }) => path !== 'packages/catalog/README.md',
  );

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /packages\/catalog\/README\.md.*destination/i,
  );
});

test('S13 rejects a mandatory destination that no capability populates', async () => {
  const { validateCapabilityManifest } = await loadSubject();
  const manifest = aManifest();
  manifest.capabilities = manifest.capabilities.map((capability) => ({
    ...capability,
    destinations: capability.destinations.filter((id) => id !== 'site-status'),
  }));

  assert.throws(
    () => validateCapabilityManifest(manifest, manifestPolicy),
    /site-status.*destination/i,
  );
});

test('S13 renders byte-deterministic blocks independent of manifest ordering', async () => {
  const { renderCapabilityBlocks } = await loadSubject();
  const manifest = aManifest();
  const reordered = aManifest();
  reordered.destinations.reverse();
  reordered.capabilities.reverse();
  reordered.capabilities = reordered.capabilities.map((capability) => ({
    ...capability,
    evidence: [...capability.evidence].reverse(),
    destinations: [...capability.destinations].reverse(),
  }));

  assert.deepEqual(renderCapabilityBlocks(reordered), renderCapabilityBlocks(manifest));
});

test('S13 renders generated workshop markers as valid MDX comments', async () => {
  const { renderCapabilityBlocks } = await loadSubject();
  const block = renderCapabilityBlocks(aManifest())['elements-workshop-status'];

  assert.match(block, /^\{\/\* kimen:capabilities:elements-workshop-status:start \*\/\}$/m);
  assert.match(block, /^\{\/\* kimen:capabilities:elements-workshop-status:end \*\/\}$/m);
  assert.doesNotMatch(block, /<!--/);
});

test('S13 rejects manual drift in a generated public-status block', async () => {
  const { renderCapabilityBlocks, validateCapabilityBlocks } = await loadSubject();
  const manifest = aManifest();
  const blocks = renderCapabilityBlocks(manifest);
  const driftedBlocks = {
    ...blocks,
    'root-readme-status': blocks['root-readme-status'].replace(
      'Neutral runtime catalog planned',
      'Neutral runtime catalog available',
    ),
  };

  assert.throws(
    () => validateCapabilityBlocks({ manifest, blocks: driftedBlocks }),
    /root-readme-status.*(?:drift|sync)/i,
  );
});

test('S13 rejects a missing generated public-status block', async () => {
  const { renderCapabilityBlocks, validateCapabilityBlocks } = await loadSubject();
  const manifest = aManifest();
  const blocks = renderCapabilityBlocks(manifest);
  delete blocks['elements-workshop-status'];

  assert.throws(
    () => validateCapabilityBlocks({ manifest, blocks }),
    /elements-workshop-status.*missing/i,
  );
});

test('S13 accepts byte-identical generated public-status blocks', async () => {
  const { renderCapabilityBlocks, validateCapabilityBlocks } = await loadSubject();
  const manifest = aManifest();
  const blocks = renderCapabilityBlocks(manifest);

  assert.doesNotThrow(() => validateCapabilityBlocks({ manifest, blocks }));
});

test('S13 rejects green evidence produced for an older Git SHA', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();
  const evidenceRecord = greenEvidence({
    sha: previousSha,
    worktreeDigest: null,
  });

  assert.throws(
    () =>
      evaluateCapabilityEvidence({
        manifest: aManifest(),
        evidenceRecord,
        currentRevision: cleanRevision,
        mandatoryEvidenceIds,
      }),
    /(?:current|stale).*sha|sha.*(?:current|stale)/i,
  );
});

test('S13 rejects green evidence for a different canonical worktree digest', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();
  const evidenceRecord = greenEvidence({
    sha: currentSha,
    worktreeDigest: previousWorktreeDigest,
  });

  assert.throws(
    () =>
      evaluateCapabilityEvidence({
        manifest: aManifest(),
        evidenceRecord,
        currentRevision: dirtyRevision,
        mandatoryEvidenceIds,
      }),
    /worktree.*(?:current|digest|stale)/i,
  );
});

test('S13 rejects an available capability when one current gate is absent', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();
  const evidenceRecord = greenEvidence();
  evidenceRecord.gates = evidenceRecord.gates.filter(({ id }) => id !== 'pack-consumer');

  assert.throws(
    () =>
      evaluateCapabilityEvidence({
        manifest: aManifest(),
        evidenceRecord,
        currentRevision: cleanRevision,
        mandatoryEvidenceIds,
      }),
    /pack-consumer.*(?:evidence|missing)/i,
  );
});

test('S13 rejects an available capability when one current gate is not green', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();
  const evidenceRecord = greenEvidence();
  evidenceRecord.gates = evidenceRecord.gates.map((gate) =>
    gate.id === 'test-browser' ? { ...gate, status: 'red' } : gate,
  );

  assert.throws(
    () =>
      evaluateCapabilityEvidence({
        manifest: aManifest(),
        evidenceRecord,
        currentRevision: cleanRevision,
        mandatoryEvidenceIds,
      }),
    /test-browser.*green/i,
  );
});

test('S13 accepts green evidence for the exact current clean SHA', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();

  const result = evaluateCapabilityEvidence({
    manifest: aManifest(),
    evidenceRecord: greenEvidence(),
    currentRevision: cleanRevision,
    mandatoryEvidenceIds,
  });

  assert.equal(result.decision, 'pass');
  assert.deepEqual(result.availableCapabilityIds, ['web-components-foundation']);
});

test('S13 accepts green evidence for the exact current dirty-worktree digest', async () => {
  const { evaluateCapabilityEvidence } = await loadSubject();

  const result = evaluateCapabilityEvidence({
    manifest: aManifest(),
    evidenceRecord: greenEvidence(dirtyRevision),
    currentRevision: dirtyRevision,
    mandatoryEvidenceIds,
  });

  assert.equal(result.decision, 'pass');
  assert.deepEqual(result.availableCapabilityIds, ['web-components-foundation']);
});
