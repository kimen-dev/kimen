// Visual-regression gate consistency (Art. X). The gate arms explicitly via
// the versioned packages/elements/browser-tests/visual/ARMED marker:
// - armed  -> every visual spec must keep its full set of committed linux
//   baselines, so "disarming" the gate by deleting PNGs is detected here.
// - disarmed -> the README must document the two-step bootstrap that leads
//   to arming, so the disarmed state is always a documented transition and
//   never a silent permanent hole.
// @spec:069-ki-icon
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { visualGalleryThemes } from '../../packages/elements/browser-tests/visual/theme-matrix.ts';
import { discoverComponents } from '../lib/component-inventory.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const browserTestsDirectory = join(repositoryRoot, 'packages/elements/browser-tests');
const componentsDirectory = join(repositoryRoot, 'packages/elements/src/components');
const armedMarkerPath = join(browserTestsDirectory, 'visual/ARMED');
const harnessPath = join(browserTestsDirectory, 'visual/harness.ts');
const readmePath = join(browserTestsDirectory, 'README.md');
const screenshotsDirectory = join(browserTestsDirectory, '__screenshots__');
const baselinesWorkflowPath = join(repositoryRoot, '.github/workflows/visual-baselines.yml');

const VISUAL_SPEC = /^ki-[a-z0-9-]+\.visual(?:\.dark)?\.browser\.spec\.ts$/u;
// The release matrix runs the whole browser suite, visual specs included, on
// all three engines, and a capture compares only against the baseline of its
// own engine: every engine needs its own committed set.
const ENGINES = Object.freeze(['chromium', 'firefox', 'webkit']);
const DISARMED_NOTICE = 'visual gate DISARMED — bootstrap pending, see README';

function parseArmedMarker(content) {
  const value = content.trim();
  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `visual/ARMED must be exactly "true" or "false", found ${JSON.stringify(value)}`,
    );
  }
  return value === 'true';
}

// The harness and audit read the same matrix. The screenshot matcher appends
// the browser and platform to the capture name.
function expectedLinuxBaselines(specFileName, engine = 'chromium') {
  const scheme = specFileName.endsWith('.visual.dark.browser.spec.ts') ? 'dark' : 'light';
  const component = specFileName.replace(/\.visual(?:\.dark)?\.browser\.spec\.ts$/u, '');
  return visualGalleryThemes(component, scheme).map(
    (theme) => `${component}-${theme}-${scheme}-gallery-${engine}-linux.png`,
  );
}

function missingLinuxBaselines(specFileNames, existingBaselinesBySpec, engines = ENGINES) {
  return engines.flatMap((engine) =>
    specFileNames.flatMap((spec) =>
      expectedLinuxBaselines(spec, engine)
        .filter((baseline) => !(existingBaselinesBySpec.get(spec)?.has(baseline) ?? false))
        .map((baseline) => `${spec}/${baseline}`),
    ),
  );
}

async function visualSpecFiles() {
  const entries = await Promise.all([
    readdir(browserTestsDirectory, { withFileTypes: true }),
    readdir(componentsDirectory, { recursive: true, withFileTypes: true }),
  ]);
  const specs = entries.flat().filter((entry) => entry.isFile() && VISUAL_SPEC.test(entry.name));
  const names = specs.map(({ name }) => name);
  assert.equal(new Set(names).size, names.length, 'visual spec filenames must be unique');
  return names.toSorted();
}

async function committedLinuxBaselines(specFileNames) {
  const existing = new Map();
  for (const spec of specFileNames) {
    const files = await readdir(join(screenshotsDirectory, spec)).catch(() => []);
    existing.set(spec, new Set(files.filter((file) => file.endsWith('-linux.png'))));
  }
  return existing;
}

test('the ARMED marker is exactly true or false', async () => {
  const armed = parseArmedMarker(await readFile(armedMarkerPath, 'utf8'));

  assert.equal(typeof armed, 'boolean');
  assert.throws(() => parseArmedMarker('yes'), /must be exactly "true" or "false"/);
  assert.throws(() => parseArmedMarker(''), /must be exactly "true" or "false"/);
});

test('the expected baseline names mirror the harness capture matrix', () => {
  assert.deepEqual(expectedLinuxBaselines('ki-button.visual.browser.spec.ts'), [
    'ki-button-onmars-light-gallery-chromium-linux.png',
    'ki-button-material3-light-gallery-chromium-linux.png',
  ]);
  assert.deepEqual(expectedLinuxBaselines('ki-button.visual.dark.browser.spec.ts'), [
    'ki-button-onmars-dark-gallery-chromium-linux.png',
  ]);
  assert.deepEqual(expectedLinuxBaselines('ki-button.visual.browser.spec.ts', 'webkit'), [
    'ki-button-onmars-light-gallery-webkit-linux.png',
    'ki-button-material3-light-gallery-webkit-linux.png',
  ]);
});

test('S12 the icon gallery requires both themes in both schemes', () => {
  assert.deepEqual(expectedLinuxBaselines('ki-icon.visual.browser.spec.ts'), [
    'ki-icon-onmars-light-gallery-chromium-linux.png',
    'ki-icon-material3-light-gallery-chromium-linux.png',
  ]);
  assert.deepEqual(expectedLinuxBaselines('ki-icon.visual.dark.browser.spec.ts'), [
    'ki-icon-onmars-dark-gallery-chromium-linux.png',
    'ki-icon-material3-dark-gallery-chromium-linux.png',
  ]);
});

test('the code block gallery requires both themes in both schemes', () => {
  assert.deepEqual(expectedLinuxBaselines('ki-code-block.visual.browser.spec.ts'), [
    'ki-code-block-onmars-light-gallery-chromium-linux.png',
    'ki-code-block-material3-light-gallery-chromium-linux.png',
  ]);
  assert.deepEqual(expectedLinuxBaselines('ki-code-block.visual.dark.browser.spec.ts'), [
    'ki-code-block-onmars-dark-gallery-chromium-linux.png',
    'ki-code-block-material3-dark-gallery-chromium-linux.png',
  ]);
});

test('a deleted linux baseline is detected by the armed audit', () => {
  const specs = ['ki-button.visual.browser.spec.ts', 'ki-button.visual.dark.browser.spec.ts'];
  const complete = new Map([
    [specs[0], new Set(expectedLinuxBaselines(specs[0]))],
    [specs[1], new Set(expectedLinuxBaselines(specs[1]))],
  ]);
  assert.deepEqual(missingLinuxBaselines(specs, complete, ['chromium']), []);

  const gutted = new Map(complete);
  gutted.set(specs[1], new Set());
  assert.deepEqual(missingLinuxBaselines(specs, gutted, ['chromium']), [
    'ki-button.visual.dark.browser.spec.ts/ki-button-onmars-dark-gallery-chromium-linux.png',
  ]);
});

test('a baseline set complete for one engine is still incomplete for the others', () => {
  const spec = 'ki-button.visual.dark.browser.spec.ts';
  const chromiumOnly = new Map([[spec, new Set(expectedLinuxBaselines(spec))]]);

  assert.deepEqual(missingLinuxBaselines([spec], chromiumOnly), [
    `${spec}/ki-button-onmars-dark-gallery-firefox-linux.png`,
    `${spec}/ki-button-onmars-dark-gallery-webkit-linux.png`,
  ]);
});

// The engines the release matrix checks and the engines the baselines
// workflow regenerates are one list: an engine in the first and not in the
// second has nothing to compare its captures against.
test('the baselines workflow regenerates every engine the release matrix checks', async () => {
  const [baselines, release] = await Promise.all([
    readFile(baselinesWorkflowPath, 'utf8'),
    readFile(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8'),
  ]);
  const matrixEngines = (workflow) =>
    /^ {8}engine: \[([^\]]+)\]$/mu
      .exec(workflow)?.[1]
      .split(',')
      .map((engine) => engine.trim());

  assert.deepEqual(matrixEngines(release), [...ENGINES]);
  assert.deepEqual(matrixEngines(baselines), [...ENGINES]);
  // Each job captures with its own engine and uploads under its own name.
  assert.match(baselines, /^ {10}KIMEN_BROWSER_ENGINE: \$\{\{ matrix\.engine \}\}$/mu);
  assert.match(baselines, /playwright install --with-deps "\$\{\{ matrix\.engine \}\}"/u);
  assert.match(baselines, /name: visual-baselines-linux-\$\{\{ matrix\.engine \}\}/u);
});

test('an armed visual gate keeps every committed linux baseline', async () => {
  const armed = parseArmedMarker(await readFile(armedMarkerPath, 'utf8'));
  const specs = await visualSpecFiles();

  assert.ok(specs.length > 0, 'no visual specs found next to the harness');
  if (!armed) {
    // Disarmed bootstrap window: baselines are not required yet; the
    // companion test below pins the documented path OUT of this state.
    return;
  }
  const missing = missingLinuxBaselines(specs, await committedLinuxBaselines(specs));
  assert.deepEqual(
    missing,
    [],
    `visual gate is ARMED but linux baselines are missing (silent disarm?):\n${missing.join('\n')}`,
  );
});

test('every discovered component has a light and dark visual spec', async () => {
  const [components, specFiles] = await Promise.all([
    discoverComponents({ workspaceRoot: repositoryRoot }),
    visualSpecFiles(),
  ]);
  const specs = new Set(specFiles);
  const missing = components.flatMap(({ tag }) =>
    [`${tag}.visual.browser.spec.ts`, `${tag}.visual.dark.browser.spec.ts`].filter(
      (spec) => !specs.has(spec),
    ),
  );
  assert.deepEqual(missing, [], `missing visual specs:\n${missing.join('\n')}`);
});

test('a disarmed visual gate is a documented bootstrap, not a silent hole', async () => {
  const armed = parseArmedMarker(await readFile(armedMarkerPath, 'utf8'));
  if (armed) {
    return;
  }
  const readme = await readFile(readmePath, 'utf8');
  const harness = await readFile(harnessPath, 'utf8');

  assert.match(readme, /ARMED/, 'README must describe the ARMED marker');
  assert.ok(readme.includes(DISARMED_NOTICE), 'README must quote the disarmed skip notice');
  assert.match(readme, /visual-baselines/, 'README must point at the baselines workflow');
  assert.match(readme, /`visual\/ARMED`\s+to\s+`true`/, 'README must document the arming flip');
  assert.ok(harness.includes(DISARMED_NOTICE), 'harness must emit the documented skip notice');
});

test('the baselines workflow binds the vitest update mode explicitly', async () => {
  const workflow = await readFile(baselinesWorkflowPath, 'utf8');
  const executableLines = workflow
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');

  // vitest declares `--update [type]`: a space-separated value would consume
  // the `.visual.` file filter as the update type and update nothing.
  assert.match(executableLines, /--update=all/);
  assert.doesNotMatch(executableLines, /--update(?!=)[ \t]/);
});
