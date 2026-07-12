// @spec:018-project-integrity-hardening#S9
// @spec:018-project-integrity-hardening#S10
// @spec:018-project-integrity-hardening#S11
import { expect, it } from 'vitest';

import * as componentInventory from '../gates/check-component-inventory.mjs';
import * as generatedSync from '../gates/check-generated-sync.mjs';
import * as packaging from '../gates/check-packaging.mjs';
import * as publicApi from '../gates/check-public-api.mjs';
import * as tokens from '../gates/check-tokens.mjs';
import * as workflows from '../gates/check-workflows.mjs';
import * as generator from '../generator-smoke.mjs';
import * as candidate from '../release/candidate-cli.mjs';
import * as infrastructure from '../run-infra-tests.mjs';

it.each([
  ['component inventory', componentInventory, 'runComponentInventoryCli'],
  ['generated sync', generatedSync, 'runGeneratedSyncCli'],
  ['packaging', packaging, 'runPackagingCli'],
  ['public API', publicApi, 'runPublicApiCli'],
  ['tokens', tokens, 'runTokenCli'],
  ['workflows', workflows, 'runWorkflowCli'],
  ['generator', generator, 'runGeneratorCli'],
  ['candidate', candidate, 'runCandidateCli'],
  ['infrastructure', infrastructure, 'runInfrastructureCli'],
])('%s exposes an awaitable CLI boundary', (_name, subject, exportName) => {
  expect(subject[exportName]).toBeTypeOf('function');
});
