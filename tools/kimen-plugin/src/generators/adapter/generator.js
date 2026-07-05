/**
 * Kimen adapter generator (constitution Art. VIII): protocol adapters are
 * disposable and isolated. Born with scope:adapter boundary tags (no protocol
 * type can leak into @kimen/elements) and a COMPAT.md protocol matrix.
 */
const path = require('node:path');
const { generateFiles, logger, updateJson } = require('@nx/devkit');

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

module.exports = async function adapterGenerator(tree, options) {
  const name = options.name;
  if (!NAME_RE.test(name)) {
    throw new Error(`Adapter name must be kebab-case (got "${name}")`);
  }
  const dir = `packages/adapter-${name}`;
  if (tree.exists(`${dir}/package.json`)) {
    throw new Error(`${dir} already exists`);
  }

  generateFiles(tree, path.join(__dirname, 'files'), dir, {
    name,
    constName: name.replace(/-/g, '_').toUpperCase(),
    tmpl: '',
  });

  // Root solution build must cover the new package (typecheck gate).
  updateJson(tree, 'tsconfig.json', (json) => {
    const ref = { path: dir };
    json.references = json.references ?? [];
    if (!json.references.some((r) => r.path === dir)) {
      json.references.push(ref);
    }
    return json;
  });

  return () => {
    logger.info(`Adapter @kimen/adapter-${name} scaffolded at ${dir}. Next steps:`);
    logger.info('  1. Declare supported protocol version(s) in COMPAT.md (Art. VIII).');
    logger.info(
      '  2. Add the package to the root "packaging" script (publint + attw) in package.json.',
    );
    logger.info('  3. pnpm install && bash scripts/gates/gates-suite.sh');
  };
};
