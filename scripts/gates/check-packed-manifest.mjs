#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
// @spec:018-project-integrity-hardening#S9
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path, { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const isBlank = (value) => typeof value !== 'string' || value.trim().length === 0;

function normalizePackedFiles(packedFiles) {
  return new Set(
    packedFiles
      .filter((entry) => typeof entry === 'string' && entry.length > 0 && !entry.endsWith('/'))
      .map((entry) => entry.replace(/^\.\//u, '').replace(/^package\//u, '')),
  );
}

function pathViolation(label, candidate, packedFiles) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return `${label}: path is empty`;
  }
  if (
    path.posix.isAbsolute(candidate) ||
    /^[A-Za-z]:[\\/]/u.test(candidate) ||
    candidate.includes('\\')
  ) {
    return `${label}: path must be package-relative`;
  }
  const segments = candidate.split('/');
  if (segments.includes('..') || path.posix.normalize(candidate).startsWith('../')) {
    return `${label}: path escapes the package`;
  }
  if (segments.includes('.') || path.posix.normalize(candidate) !== candidate) {
    return `${label}: path is not normalized`;
  }
  if (!packedFiles.has(candidate)) {
    return `${label}: path is not present in the packed package`;
  }
  return null;
}

function facetDescriptionViolations(declaration) {
  const tag = declaration.tagName ?? declaration.name ?? '<unknown>';
  const violations = [];
  if (isBlank(declaration.description)) {
    violations.push(`${tag}: description is empty`);
  }

  const facetFamilies = [
    ['attribute', declaration.attributes ?? [], (facet) => facet.name ?? '<unknown>'],
    [
      'member',
      (declaration.members ?? []).filter(
        (facet) => facet.privacy !== 'private' && facet.privacy !== 'protected',
      ),
      (facet) => facet.name ?? '<unknown>',
    ],
    ['event', declaration.events ?? [], (facet) => facet.name ?? '<unknown>'],
    ['slot', declaration.slots ?? [], (facet) => facet.name || 'default'],
    ['cssPart', declaration.cssParts ?? [], (facet) => facet.name ?? '<unknown>'],
    ['cssProperty', declaration.cssProperties ?? [], (facet) => facet.name ?? '<unknown>'],
  ];

  for (const [family, facets, nameFrom] of facetFamilies) {
    for (const facet of facets) {
      if (isBlank(facet.description)) {
        violations.push(`${tag}.${family}[${nameFrom(facet)}]: description is empty`);
      }
    }
  }
  return violations;
}

/** Validate CEM consumer paths and descriptions against exact packed files. */
export function validatePackedManifest({ manifest, packedFiles }) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest: root must be an object'];
  }
  if (!Array.isArray(manifest.modules)) {
    return ['manifest.modules: must be an array'];
  }

  const files = normalizePackedFiles(Array.isArray(packedFiles) ? packedFiles : []);
  const modulePathViolations = [];
  const exportPathViolations = [];
  const descriptionViolations = [];

  for (const module of manifest.modules) {
    const moduleLabel = `module[${String(module?.path)}]`;
    const moduleIssue = pathViolation(moduleLabel, module?.path, files);
    if (moduleIssue !== null) {
      modulePathViolations.push(moduleIssue);
    }

    for (const declaration of module?.declarations ?? []) {
      if (declaration?.customElement === true || typeof declaration?.tagName === 'string') {
        descriptionViolations.push(...facetDescriptionViolations(declaration));
      }
      if (typeof declaration?.source === 'string') {
        const sourceIssue = pathViolation(
          `${moduleLabel}.declaration[${declaration.name ?? '<unknown>'}].source`,
          declaration.source,
          files,
        );
        if (sourceIssue !== null) {
          exportPathViolations.push(sourceIssue);
        }
      }
    }

    for (const exported of module?.exports ?? []) {
      const referencedModule = exported?.declaration?.module;
      if (referencedModule === undefined) {
        continue;
      }
      const exportIssue = pathViolation(
        `${moduleLabel}.export[${exported.name ?? '<unknown>'}]`,
        referencedModule,
        files,
      );
      if (exportIssue !== null) {
        exportPathViolations.push(
          exportIssue.replace(': path', `: path ${String(referencedModule)}`),
        );
      }
    }
  }

  return [
    ...modulePathViolations.sort(compareText),
    ...exportPathViolations.sort(compareText),
    ...descriptionViolations.sort(compareText),
  ];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error !== undefined || result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || result.error?.message || '';
    throw new Error(`${command} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout;
}

export async function checkPackedManifest({
  workspaceRoot = process.cwd(),
  environment = process.env,
} = {}) {
  const packageRoot = join(workspaceRoot, 'packages/elements');
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'kimen-packed-manifest-'));
  try {
    const packOutput = run(
      'npm',
      ['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory],
      {
        cwd: packageRoot,
        env: {
          ...environment,
          npm_config_cache: join(temporaryDirectory, 'npm-cache'),
          NPM_CONFIG_CACHE: join(temporaryDirectory, 'npm-cache'),
        },
      },
    );
    const packRecords = JSON.parse(packOutput);
    if (!Array.isArray(packRecords) || packRecords.length !== 1) {
      throw new Error('npm pack did not report exactly one package.');
    }
    const tarballPath = join(temporaryDirectory, path.basename(packRecords[0].filename));
    const tarEntries = run('tar', ['-tzf', tarballPath]).split(/\r?\n/u).filter(Boolean);
    const manifestEntry = tarEntries.find(
      (entry) => entry.replace(/^\.\//u, '') === 'package/generated/custom-elements.json',
    );
    if (manifestEntry === undefined) {
      return ['generated/custom-elements.json: missing from packed package'];
    }
    const manifest = JSON.parse(run('tar', ['-xOzf', tarballPath, manifestEntry]));
    return validatePackedManifest({ manifest, packedFiles: tarEntries });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write(
      'check-packed-manifest: usage: node scripts/gates/check-packed-manifest.mjs\n',
    );
    process.exitCode = 1;
    return;
  }

  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const violations = await checkPackedManifest({ workspaceRoot });
  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`check-packed-manifest: ${violation}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write('PASS packed-manifest: all CEM facets are described and paths are packed\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `check-packed-manifest: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
