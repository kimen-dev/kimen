import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildLlmsTxt,
  buildManifest,
  normalizeDocs,
  serializeJson,
  validateDocs,
} from './agent-surfaces.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');

export async function runBuildSurfaces(options = {}) {
  const paths = {
    docsPath: options.docsPath ?? resolve(packageRoot, 'generated/docs.json'),
    packageJsonPath: options.packageJsonPath ?? resolve(packageRoot, 'package.json'),
    preamblePath: options.preamblePath ?? resolve(packageRoot, 'scripts/llms-preamble.txt'),
    manifestPath: options.manifestPath ?? resolve(packageRoot, 'generated/custom-elements.json'),
    packageLlmsPath: options.packageLlmsPath ?? resolve(packageRoot, 'llms.txt'),
    rootLlmsPath: options.rootLlmsPath ?? resolve(workspaceRoot, 'llms.txt'),
    packageRoot: options.packageRoot ?? packageRoot,
  };

  const docs = normalizeDocs(JSON.parse(await readFile(paths.docsPath, 'utf8')), {
    packageRoot: paths.packageRoot,
  });
  const violations = validateDocs(docs);
  if (violations.length > 0) {
    return {
      ok: false,
      stderr: formatViolations(violations),
      violations,
    };
  }

  const pkg = JSON.parse(await readFile(paths.packageJsonPath, 'utf8'));
  const preamble = await readFile(paths.preamblePath, 'utf8');
  const manifest = buildManifest(docs);
  const llmsTxt = buildLlmsTxt(docs, pkg, preamble);

  await writeFile(paths.docsPath, serializeJson(docs));
  await writeFile(paths.manifestPath, serializeJson(manifest));
  await writeFile(paths.packageLlmsPath, llmsTxt);
  await writeFile(paths.rootLlmsPath, llmsTxt);

  return {
    ok: true,
    stderr: '',
    violations: [],
    outputs: new Map([
      [paths.docsPath, serializeJson(docs)],
      [paths.manifestPath, serializeJson(manifest)],
      [paths.packageLlmsPath, llmsTxt],
      [paths.rootLlmsPath, llmsTxt],
    ]),
  };
}

function formatViolations(violations) {
  return `agent-surfaces: documentation incomplete (Art. I):\n${violations
    .map((violation) => `  ${violation}`)
    .join('\n')}\n`;
}

// Review round 1: import.meta.url percent-encodes what process.argv[1] does
// not — compare real filesystem paths so a checkout under a path with spaces
// or non-ASCII characters cannot silently skip generation (S6).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runBuildSurfaces();
  if (!result.ok) {
    process.stderr.write(result.stderr);
    process.exit(1);
  }
}
