/**
 * Kimen component generator (constitution Art. X: deterministic scaffolding).
 * Component files live together, with separate token sources for both themes.
 * Gate, docs and package registration derive from those inputs.
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
  if (tree.children(dir).length > 0) {
    throw new Error(`${dir} already exists: components are never overwritten`);
  }
  const tokenName = name.slice(3);
  const tokenDir = 'packages/tokens/tokens/component';
  for (const suffix of ['tokens.json', 'material3.tokens.json']) {
    const tokenPath = `${tokenDir}/${tokenName}.${suffix}`;
    if (tree.exists(tokenPath)) {
      throw new Error(`${tokenPath} already exists: component tokens are never overwritten`);
    }
  }

  // Traceability marker (Art. II): tests declare the feature they trace with
  // a file-level `// @spec:<feature-dir>` marker (scripts/gates/check-traceability.sh).
  const specMarker = options.spec
    ? `// @spec:${options.spec}`
    : '// TODO(spec): add a marker such as @spec:NNN-ki-name for the approved feature (Art. II).';

  const substitutions = {
    name,
    className: names(name).className,
    tokenName,
    specMarker,
    tmpl: '',
  };
  generateFiles(tree, path.join(__dirname, 'files'), dir, substitutions);
  generateFiles(tree, path.join(__dirname, 'files-token'), tokenDir, substitutions);

  return () => {
    logger.info(`Component ${name} scaffolded. Next steps:`);
    logger.info(
      '  1. Replace TODO(spec) with the approved component contract and its scenario tests.',
    );
    logger.info('  2. Update the component fixtures, stories, docs and both theme token sources.');
    logger.info('  3. pnpm regen && bash scripts/gates/gates-suite.sh');
  };
};
