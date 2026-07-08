/**
 * Kimen component generator (constitution Art. X: deterministic scaffolding).
 * A component is born with every gate wired: tokens-only CSS, mock-doc spec,
 * real-browser + axe spec, and its export in the public entry (Art. I).
 */
const path = require('node:path');
const { generateFiles, logger, names } = require('@nx/devkit');

const TAG_RE = /^ki-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

module.exports = async function componentGenerator(tree, options) {
  const name = options.name;
  if (!TAG_RE.test(name)) {
    throw new Error(`Component tag must match ki-<lowercase> (got "${name}")`);
  }
  const dir = `packages/elements/src/components/${name}`;
  if (tree.exists(`${dir}/${name}.tsx`)) {
    throw new Error(`${dir} already exists: components are never overwritten`);
  }

  // Traceability marker (Art. II): tests declare the feature they trace with
  // a file-level `// @spec:<feature-dir>` marker (scripts/gates/check-traceability.sh).
  const specMarker = options.spec
    ? `// @spec:${options.spec}`
    : "// TODO(spec): add '// @spec:<feature-dir>' when the approved feature exists (Art. II).";

  const substitutions = {
    name,
    className: names(name).className,
    specMarker,
    tmpl: '',
  };
  generateFiles(tree, path.join(__dirname, 'files'), dir, substitutions);
  // Browser specs live OUTSIDE src/: they import dist output, which Stencil
  // must never try to compile (and a fresh clone has no dist yet).
  generateFiles(
    tree,
    path.join(__dirname, 'files-browser'),
    'packages/elements/browser-tests',
    substitutions,
  );

  // Register in the public entry (Art. I: the contract is the single source).
  const indexPath = 'packages/elements/src/index.ts';
  const index = tree.read(indexPath, 'utf-8') ?? '';
  const exportLine = `export { ${names(name).className} } from './components/${name}/${name}.js';\nexport type * from './components/${name}/${name}.js';`;
  if (!index.includes(exportLine)) {
    tree.write(indexPath, `${index.trimEnd()}\n${exportLine}\n`);
  }

  return () => {
    logger.info(`Component ${name} scaffolded. Next steps:`);
    logger.info(
      '  1. pnpm exec nx run @kimen/elements:build && pnpm run format  (regenerates components.d.ts + docs.json, then formats them)',
    );
    logger.info(
      '  2. Replace every TODO(spec) with content from the APPROVED spec (Art. II: no behavior without a spec).',
    );
    logger.info('  3. bash scripts/gates/gates-suite.sh');
  };
};
