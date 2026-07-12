// @spec:018-project-integrity-hardening#S2
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const capabilityGate = await readFile(
  new URL('../gates/check-capabilities.mjs', import.meta.url),
  'utf8',
);
const mutationGate = await readFile(
  new URL('../gates/mutation-changed.mjs', import.meta.url),
  'utf8',
);
const reviewIo = await readFile(new URL('../lib/review-package-io.mjs', import.meta.url), 'utf8');

test('S2 security-sensitive readers hold a no-follow descriptor before inspecting bytes', () => {
  assert.ok(capabilityGate.includes('open(absolute, fsConstants.O_RDONLY | noFollow | nonBlock)'));
  assert.ok(capabilityGate.includes('await handle.stat()'));
  assert.ok(capabilityGate.includes('await handle.readFile()'));
  assert.equal(capabilityGate.includes('await lstat(absolute)'), false);

  assert.ok(mutationGate.includes('open(reportPath, fsConstants.O_RDONLY | noFollow | nonBlock)'));
  assert.ok(mutationGate.includes('await handle.stat()'));
  assert.ok(mutationGate.includes("await handle.readFile('utf8')"));
  assert.equal(mutationGate.includes('await lstat(reportPath)'), false);

  assert.ok(reviewIo.includes('constants.O_RDONLY | noFollow | closeOnExec | nonBlock'));
  assert.equal(reviewIo.includes('lstatSync(source)'), false);
});
