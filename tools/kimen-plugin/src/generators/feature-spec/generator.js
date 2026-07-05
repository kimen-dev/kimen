/**
 * Kimen feature-spec generator (constitution Art. II): scaffolds
 * specs/<NNN>-<slug>/feature.feature with the five scenario families,
 * stable S-IDs and one When per scenario, shaped to pass
 * scripts/gates/lint-feature.sh from birth (content stays TODO until the
 * founder-approved spec fills it).
 */
const path = require('node:path');
const { generateFiles, logger } = require('@nx/devkit');

const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

module.exports = async function featureSpecGenerator(tree, options) {
  const slug = options.name;
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Feature slug must be kebab-case (got "${slug}")`);
  }
  const title = options.title ?? slug.replace(/-/g, ' ');

  let max = 0;
  if (tree.exists('specs')) {
    for (const child of tree.children('specs')) {
      const m = /^(\d{3})-/.exec(child);
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
  }
  const nnn = String(max + 1).padStart(3, '0');
  const dir = `specs/${nnn}-${slug}`;

  generateFiles(tree, path.join(__dirname, 'files'), dir, {
    slug,
    title,
    tmpl: '',
  });

  return () => {
    logger.info(`Feature skeleton at ${dir}/feature.feature. Next steps:`);
    logger.info(
      '  1. /speckit-specify writes spec.md (with the Scenario Family Coverage table) in the same directory.',
    );
    logger.info(
      '  2. Fill scenarios from the spec, then: bash scripts/gates/lint-feature.sh ' +
        `${dir}/feature.feature`,
    );
    logger.info(
      '  3. Founder approval is recorded with scripts/gates/record-approval.sh (human gate 1).',
    );
  };
};
