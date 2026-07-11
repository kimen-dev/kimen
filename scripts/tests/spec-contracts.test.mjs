import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { createFixtureRepo } from './helpers/fixture-repo.mjs';

// @spec:018-project-integrity-hardening

const approvedAt = '2026-07-09T20:00:00Z';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const specSource = (featureBytes) =>
  [
    '# Fixture specification',
    '',
    '## Gherkin Scenarios',
    '',
    '```gherkin',
    featureBytes.trimEnd(),
    '```',
    '',
  ].join('\n');

const approvalV1 = ({ specBytes, specHash = sha256(specBytes) }) =>
  [`approved-at: ${approvedAt}`, `spec-sha256: ${specHash}`, ''].join('\n');

const approvalV2 = ({
  specBytes,
  featureBytes,
  specHash = sha256(specBytes),
  featureHash = sha256(featureBytes),
  migrated = false,
}) =>
  [
    'approval-version: 2',
    `approved-at: ${approvedAt}`,
    `spec-sha256: ${specHash}`,
    `feature-sha256: ${featureHash}`,
    ...(migrated ? ['migrated-from-version: 1'] : []),
    '',
  ].join('\n');

async function createContractFixture(t) {
  const fixture = await createFixtureRepo({ featureId: '999-contract-fixture' });
  t.after(() => fixture.cleanup());
  await fixture.copyFromRepo('scripts/gates');

  const featurePath = join(fixture.root, fixture.featureDir, 'feature.feature');
  const featureBytes = await readFile(featurePath, 'utf8');
  const specBytes = specSource(featureBytes);
  await fixture.write(`${fixture.featureDir}/spec.md`, specBytes);

  return { fixture, specBytes, featureBytes };
}

const runGate = (fixture, gate) =>
  fixture.run('bash', [`scripts/gates/${gate}`, fixture.featureDir]);

const diagnostic = ({ stdout, stderr }) => `${stdout}\n${stderr}`;

test('@spec:018 S1 record-approval emits marker v2 with hashes for both exact files', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);

  const result = await runGate(fixture, 'record-approval.sh');

  assert.equal(result.code, 0, diagnostic(result));
  const marker = await readFile(join(fixture.root, fixture.featureDir, '.approved'), 'utf8');
  const lines = marker.trimEnd().split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[0], 'approval-version: 2');
  assert.match(lines[1], /^approved-at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(lines[2], `spec-sha256: ${sha256(specBytes)}`);
  assert.equal(lines[3], `feature-sha256: ${sha256(featureBytes)}`);
});

test('@spec:018 S1 an intact synchronized pair with both recorded hashes is approved', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV2({ specBytes, featureBytes }));

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.equal(result.code, 0, diagnostic(result));
  assert.match(diagnostic(result), /approval.*pass|pass.*approval/i);
});

test('@spec:018 S1 one byte of spec drift invalidates its recorded hash', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV2({ specBytes, featureBytes }));
  await fixture.write(`${fixture.featureDir}/spec.md`, `${specBytes} `);

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /spec(?:\.md|-sha256).*(?:stale|mismatch)|(?:stale|mismatch).*spec/i,
  );
});

test('@spec:018 S1 one byte of feature drift invalidates its recorded hash', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV2({ specBytes, featureBytes }));
  await fixture.write(
    `${fixture.featureDir}/feature.feature`,
    featureBytes.replace('Fixture S1', 'Fixture X1'),
  );

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /feature(?:\.feature|-sha256).*(?:stale|mismatch)|(?:stale|mismatch).*feature/i,
  );
});

test('@spec:018 S1 pre-plan blocks a changed approved feature file', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV2({ specBytes, featureBytes }));
  await fixture.write(
    `${fixture.featureDir}/feature.feature`,
    featureBytes.replace('Fixture S1', 'Fixture X1'),
  );

  const result = await runGate(fixture, 'pre-plan-check.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /feature(?:\.feature|-sha256).*(?:stale|mismatch|match)|(?:stale|mismatch|match).*feature\.feature/i,
  );
});

test('@spec:018 S1 pre-implement blocks a changed approved feature file', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV2({ specBytes, featureBytes }));
  await fixture.write(
    `${fixture.featureDir}/feature.feature`,
    featureBytes.replace('Fixture S1', 'Fixture X1'),
  );

  const result = await runGate(fixture, 'pre-implement-check.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /feature(?:\.feature|-sha256).*(?:stale|mismatch|match)|(?:stale|mismatch|match).*feature\.feature/i,
  );
});

test('@spec:018 S1 dual current hashes cannot approve a desynchronized contract pair', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  const driftedFeature = featureBytes.replace('Fixture S1', 'Fixture X1');
  await fixture.write(`${fixture.featureDir}/feature.feature`, driftedFeature);
  await fixture.write(
    `${fixture.featureDir}/.approved`,
    approvalV2({ specBytes, featureBytes: driftedFeature }),
  );

  const result = await runGate(fixture, 'check-spec-contracts.sh');

  assert.notEqual(result.code, 0);
  assert.match(diagnostic(result), /spec\.md.*feature\.feature|feature\.feature.*spec\.md/i);
  assert.match(diagnostic(result), /(?:byte|contract|synchron|match)/i);
});

test('@spec:018 S1 marker v2 rejects a missing feature hash', async (t) => {
  const { fixture, specBytes } = await createContractFixture(t);
  await fixture.write(
    `${fixture.featureDir}/.approved`,
    [
      'approval-version: 2',
      `approved-at: ${approvedAt}`,
      `spec-sha256: ${sha256(specBytes)}`,
      '',
    ].join('\n'),
  );

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /feature-sha256.*(?:missing|required)|(?:missing|required).*feature-sha256/i,
  );
});

test('@spec:018 S1 marker v2 rejects a duplicate required key', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  const validMarker = approvalV2({ specBytes, featureBytes }).trimEnd();
  await fixture.write(
    `${fixture.featureDir}/.approved`,
    `${validMarker}\nspec-sha256: ${sha256(specBytes)}\n`,
  );

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(diagnostic(result), /duplicate.*spec-sha256|spec-sha256.*duplicate/i);
});

test('@spec:018 S1 marker v2 rejects an unknown key', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  const validMarker = approvalV2({ specBytes, featureBytes }).trimEnd();
  await fixture.write(`${fixture.featureDir}/.approved`, `${validMarker}\nunexpected: value\n`);

  const result = await runGate(fixture, 'check-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(diagnostic(result), /unknown.*unexpected|unexpected.*unknown/i);
});

test('@spec:018 S1 safe migration preserves approval time and adds the feature hash', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  await fixture.write(`${fixture.featureDir}/.approved`, approvalV1({ specBytes }));

  const migration = await runGate(fixture, 'migrate-approvals.sh');

  assert.equal(migration.code, 0, diagnostic(migration));
  assert.equal(
    await readFile(join(fixture.root, fixture.featureDir, '.approved'), 'utf8'),
    approvalV2({ specBytes, featureBytes, migrated: true }),
  );
  const validation = await runGate(fixture, 'check-approvals.sh');
  assert.equal(validation.code, 0, diagnostic(validation));
});

test('@spec:018 S1 migration refuses a stale legacy spec hash without rewriting evidence', async (t) => {
  const { fixture, specBytes } = await createContractFixture(t);
  const legacyMarker = approvalV1({ specBytes, specHash: '0'.repeat(64) });
  await fixture.write(`${fixture.featureDir}/.approved`, legacyMarker);

  const result = await runGate(fixture, 'migrate-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(
    diagnostic(result),
    /spec(?:\.md|-sha256).*(?:stale|mismatch)|(?:stale|mismatch).*spec/i,
  );
  assert.equal(
    await readFile(join(fixture.root, fixture.featureDir, '.approved'), 'utf8'),
    legacyMarker,
  );
});

test('@spec:018 S1 migration refuses a feature that is not exact derived content', async (t) => {
  const { fixture, specBytes, featureBytes } = await createContractFixture(t);
  const legacyMarker = approvalV1({ specBytes });
  await fixture.write(`${fixture.featureDir}/.approved`, legacyMarker);
  await fixture.write(
    `${fixture.featureDir}/feature.feature`,
    featureBytes.replace('Fixture S1', 'Fixture X1'),
  );

  const result = await runGate(fixture, 'migrate-approvals.sh');

  assert.notEqual(result.code, 0);
  assert.match(diagnostic(result), /spec\.md.*feature\.feature|feature\.feature.*spec\.md/i);
  assert.equal(
    await readFile(join(fixture.root, fixture.featureDir, '.approved'), 'utf8'),
    legacyMarker,
  );
});

test('@spec:018 S1 core gates stop at contract drift before approval or traceability', async (t) => {
  const { fixture, featureBytes } = await createContractFixture(t);
  await fixture.write(
    `${fixture.featureDir}/feature.feature`,
    featureBytes.replace('Fixture S1', 'Fixture X1'),
  );

  const result = await runGate(fixture, 'gates-core.sh');
  const output = diagnostic(result);

  assert.notEqual(result.code, 0);
  assert.match(output, /CORE spec-contracts/i);
  assert.doesNotMatch(output, /CORE approvals|CORE traceability/i);
});

test('@spec:018 S1 core gates check approval before traceability', async (t) => {
  const { fixture } = await createContractFixture(t);

  const result = await runGate(fixture, 'gates-core.sh');
  const output = diagnostic(result);

  assert.notEqual(result.code, 0);
  assert.match(output, /CORE spec-contracts/i);
  assert.match(output, /CORE approvals/i);
  assert.ok(output.indexOf('CORE spec-contracts') < output.indexOf('CORE approvals'));
  assert.doesNotMatch(output, /CORE traceability/i);
});
