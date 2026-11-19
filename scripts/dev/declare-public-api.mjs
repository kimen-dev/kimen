#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readCanonicalJson,
  readPublicApiCandidate,
  readPublicApiDeclarations,
} from '../gates/check-public-api.mjs';
import { canonicalJson } from '../lib/canonical-json.mjs';
import { createPublicApiDeclaration, evaluatePublicApiChange } from '../lib/public-api.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(root, 'changes/api');
const baselinePath = join(directory, 'baselines/0.0.0.json');
const legacyCandidatePath = 'packages/elements/generated/public-api.json';
const candidatePath = join(root, 'packages/elements/generated/public-api');

function legacySnapshot(current, declaration, ref) {
  if (current.surfaceSha256 === declaration.candidateSha256) return current;
  const git = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 ** 2 });
  const legacyRef = ref ?? 'ORIG_HEAD';
  try {
    const commit = git([
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${legacyRef}^{commit}`,
    ]).trim();
    return JSON.parse(git(['show', `${commit}:${legacyCandidatePath}`]));
  } catch (error) {
    throw new Error(
      `Cannot read the legacy candidate at ${legacyRef}; pass the old branch tip as the final argument`,
      {
        cause: error,
      },
    );
  }
}

async function declare([mode, name, releaseOrRef, reason, ...extra]) {
  if (mode === 'create') {
    if (!name || !/^[a-z0-9][a-z0-9-]*$/u.test(name) || !releaseOrRef || !reason || extra.length) {
      throw new Error('Usage: pnpm api:declare <slug> <patch|minor|major> "<reason>"');
    }
  } else if (mode === 'migrate') {
    if (!name || reason !== undefined) {
      throw new Error('Usage: pnpm api:migrate changes/api/<legacy>.json [<old-branch-tip>]');
    }
  } else {
    throw new Error('Expected create or migrate');
  }

  const path = mode === 'create' ? join(directory, `${name}.json`) : resolve(root, name);
  if (dirname(path) !== directory || !path.endsWith('.json')) {
    throw new Error('Declare a JSON file directly in changes/api');
  }
  const [baseline, candidate] = await Promise.all([
    readCanonicalJson('baseline', baselinePath),
    readPublicApiCandidate(candidatePath),
  ]);
  const declarations = await readPublicApiDeclarations(directory, {
    baseline,
    except: mode === 'migrate' ? path : undefined,
  });
  const options = { baseline, candidate, declarations, release: releaseOrRef, reason };
  if (mode === 'migrate') {
    const declaration = await readCanonicalJson('legacy declaration', path);
    options.legacy = {
      declaration,
      candidate: legacySnapshot(candidate, declaration, releaseOrRef),
    };
  }
  const declaration = createPublicApiDeclaration(options);
  const result = evaluatePublicApiChange({
    baseline,
    candidate,
    declarations: [...declarations, declaration],
  });
  if (result.decision === 'blocked') throw new Error(result.reasons.join('\n'));
  await writeFile(path, canonicalJson(declaration), { flag: mode === 'create' ? 'wx' : 'w' });
  process.stdout.write(`Wrote ${path} (${result.release})\n`);
}

declare(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`declare-public-api: ${error.message}\n`);
  process.exitCode = 1;
});
