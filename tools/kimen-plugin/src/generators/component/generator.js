/**
 * Kimen component generator (constitution Art. X: deterministic scaffolding).
 * A component is born with every gate wired: tokens-only CSS, mock-doc spec,
 * real-browser + axe spec, and a component-token source. Direct package
 * subpaths and every generated surface derive from component source.
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
    tokenName: name.slice(3),
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
  generateFiles(
    tree,
    path.join(__dirname, 'files-token'),
    'packages/tokens/tokens/component',
    substitutions,
  );

  return () => {
    logger.info(`Component ${name} scaffolded. Next steps:`);
    logger.info(
      '  1. pnpm exec nx run @kimen/elements:build && pnpm run format  (derives direct exports, budgets and machine surfaces, then formats them)',
    );
    logger.info(
      '  2. Replace every TODO(spec) with content from the APPROVED spec (Art. II: no behavior without a spec).',
    );
    logger.info('  3. bash scripts/gates/gates-suite.sh');
  };
};
