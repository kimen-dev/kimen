// Visual-regression gate consistency (Art. X). The gate arms explicitly via
// the versioned packages/elements/browser-tests/visual/ARMED marker:
// - armed  -> every visual spec must keep its full set of committed linux
//   baselines, so "disarming" the gate by deleting PNGs is detected here.
// - disarmed -> the README must document the two-step bootstrap that leads
//   to arming, so the disarmed state is always a documented transition and
//   never a silent permanent hole.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const browserTestsDirectory = join(repositoryRoot, 'packages/elements/browser-tests');
const armedMarkerPath = join(browserTestsDirectory, 'visual/ARMED');
const harnessPath = join(browserTestsDirectory, 'visual/harness.ts');
const readmePath = join(browserTestsDirectory, 'README.md');
const screenshotsDirectory = join(browserTestsDirectory, '__screenshots__');
const baselinesWorkflowPath = join(repositoryRoot, '.github/workflows/visual-baselines.yml');

const VISUAL_SPEC = /^ki-[a-z-]+\.visual(?:\.dark)?\.browser\.spec\.ts$/u;
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

// Mirrors the harness matrix: light specs capture onmars + material3, dark
// specs capture onmars only, and toMatchScreenshot names baselines
// `<name>-<browser>-<platform>.png`.
function expectedLinuxBaselines(specFileName) {
  const dark = specFileName.endsWith('.visual.dark.browser.spec.ts');
  const component = specFileName.replace(/\.visual(?:\.dark)?\.browser\.spec\.ts$/u, '');
  const captures = dark
    ? [['onmars', 'dark']]
    : [
        ['onmars', 'light'],
        ['material3', 'light'],
      ];
  return captures.map(
    ([theme, scheme]) => `${component}-${theme}-${scheme}-gallery-chromium-linux.png`,
  );
}

function missingLinuxBaselines(specFileNames, existingBaselinesBySpec) {
  return specFileNames.flatMap((spec) =>
    expectedLinuxBaselines(spec)
      .filter((baseline) => !(existingBaselinesBySpec.get(spec)?.has(baseline) ?? false))
      .map((baseline) => `${spec}/${baseline}`),
  );
}

async function visualSpecFiles() {
  const entries = await readdir(browserTestsDirectory);
  return entries.filter((entry) => VISUAL_SPEC.test(entry)).toSorted();
}

async function committedLinuxBaselines(specFileNames) {
  const existing = new Map();
  for (const spec of specFileNames) {
    const files = await readdir(join(screenshotsDirectory, spec)).catch(() => []);
    existing.set(spec, new Set(files.filter((file) => file.endsWith('-chromium-linux.png'))));
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
});

test('a deleted linux baseline is detected by the armed audit', () => {
  const specs = ['ki-button.visual.browser.spec.ts', 'ki-button.visual.dark.browser.spec.ts'];
  const complete = new Map([
    [specs[0], new Set(expectedLinuxBaselines(specs[0]))],
    [specs[1], new Set(expectedLinuxBaselines(specs[1]))],
  ]);
  assert.deepEqual(missingLinuxBaselines(specs, complete), []);

  const gutted = new Map(complete);
  gutted.set(specs[1], new Set());
  assert.deepEqual(missingLinuxBaselines(specs, gutted), [
    'ki-button.visual.dark.browser.spec.ts/ki-button-onmars-dark-gallery-chromium-linux.png',
  ]);
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
