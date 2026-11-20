import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { componentRegistrationPlugin } from './scripts/component-registration-plugin.mjs';
import { measureThemeFonts } from './scripts/measure-theme-fonts.ts';

// The explicit .ts extension keeps this config importable by plain Node type
// stripping (scripts/tests/browser-gates.test.mjs loads it without a bundler).
import { coverageOptions, distSourceCoveragePlugin } from './vitest.coverage.config.ts';

// Real-browser suite (constitution Art. III: component suites never run in
// jsdom/mock-doc alone; Art. IV: engine baseline is verified, not declared).
// Every invocation runs exactly one validated engine. The local suite supplies
// Chromium; prerelease supplies one explicit matrix value per independent job.
const supportedBrowsers = ['chromium', 'firefox', 'webkit'] as const;
type SupportedBrowser = (typeof supportedBrowsers)[number];
const configuredBrowser = process.env['KIMEN_BROWSER_ENGINE'] ?? 'chromium';

if (!supportedBrowsers.some((browser) => browser === configuredBrowser)) {
  throw new Error(
    `KIMEN_BROWSER_ENGINE must be one of ${supportedBrowsers.join(', ')}; received ${configuredBrowser}`,
  );
}

const browser = configuredBrowser as SupportedBrowser;
const pointerCapabilitySpec = 'browser-tests/pointer-capability.browser.spec.ts';
const browserSpecPatterns = (suffix: string): string[] =>
  ['browser-tests', 'src/components/ki-*'].map(
    (directory) => `${directory}/**/${suffix}.browser.spec.{ts,tsx}`,
  );
// Specs that change the page's input device through CDP touch emulation. They
// share one isolated setup, never the ordinary light one: the pointer
// capability audit, the touch text size of fields (spec 048) and of sized
// fields (spec 050), and every component's `*.pointer` spec.
// A component's own input-device spec is named `<tag>.pointer.browser.spec.ts`
// and joins this setup by name, so new components never edit this list.
const inputDeviceSpecs = [
  pointerCapabilitySpec,
  'src/components/ki-icon/ki-icon.browser.spec.ts',
  'src/components/ki-segment/ki-segment.browser.spec.ts',
  'browser-tests/touch-field-text.browser.spec.ts',
  'browser-tests/touch-size-field-text.browser.spec.ts',
  ...browserSpecPatterns('*.pointer'),
];
const visualSpecPatterns = [
  ...browserSpecPatterns('*.visual'),
  ...browserSpecPatterns('*.visual.*'),
];
const visualExcludes =
  process.platform !== 'linux' && !process.env['CI'] && process.env['KIMEN_RUN_VISUALS'] !== '1'
    ? visualSpecPatterns
    : [];
if (visualExcludes.length > 0) {
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  const count = globSync(visualSpecPatterns, { cwd, withFileTypes: true }).filter((entry) =>
    entry.isFile(),
  ).length;
  console.warn(
    `VISUAL TESTS: visual specs run only on Linux: ${count} skipped. Set KIMEN_RUN_VISUALS=1 to run them locally.`,
  );
}

// The interaction media features (`hover`, `pointer`) are the only way to ask
// a page "can this device hover?", and Playwright's emulateMedia() does not
// carry them — they are set over CDP, which exists on Chromium alone. The
// session is kept alive per page on purpose: Chrome drops the overrides set
// through a session when that session detaches, so a detach-per-call would
// undo the emulation before the test could read it.
const cdpSessions = new WeakMap<object, Promise<{ send: CdpSend }>>();
type CdpSend = (method: string, params: Record<string, unknown>) => Promise<unknown>;

const cacheRoot = process.env['KIMEN_WORKTREE_CACHE_ROOT'] ?? process.env['KIMEN_CACHE_ROOT'];
const cacheDir = cacheRoot ? join(cacheRoot, `vite/elements-browser-${browser}`) : undefined;
// Playwright's default headless Chromium selects a separate headless-shell
// binary. Selecting the installed `chromium` channel makes the executable that
// gates-browser verifies via the public executablePath() API the one launched.
const provider = playwright(
  browser === 'chromium' ? { launchOptions: { channel: 'chromium' } } : undefined,
);

const browserTestsDirectory = fileURLToPath(new URL('./browser-tests', import.meta.url));
const visualBaselinePath = (spec: string, name: string, engine: string, platform: string): string =>
  join(browserTestsDirectory, '__screenshots__', spec, `${name}-${engine}-${platform}.png`);

export default defineConfig({
  ...(cacheDir ? { cacheDir } : {}),
  plugins: [distSourceCoveragePlugin, componentRegistrationPlugin()],
  optimizeDeps: {
    // dist/components imports @stencil/core/internal/client at runtime.
    // Pre-bundling it up front prevents the mid-run dependency discovery
    // reload ("Vite unexpectedly reloaded a test") that on a cold cache can
    // re-execute a failed test inside the same run and mask a genuine
    // failure (observed while validating the visual-regression harness).
    include: ['@stencil/core/internal/client'],
  },
  test: {
    name: `elements-browser-${browser}`,
    include: browserSpecPatterns('*'),
    // V8 coverage collection needs CDP, so it is only available on the
    // chromium engine (the ordinary local/PR engine, Art. III); the
    // firefox/webkit prerelease matrix runs never pass --coverage. Browser
    // specs import the built dist/components custom elements, so those are
    // the executed scripts that remap onto src (index.js is a barrel the
    // specs never import, hence the ki-* pattern).
    coverage: coverageOptions(`elements-browser-${browser}`, ['dist/components/ki-*.js']),
    browser: {
      enabled: true,
      headless: true,
      provider,
      screenshotFailures: false,
      expect: {
        toMatchScreenshot: {
          // Keep established Linux artifact paths when the spec lives beside its component.
          resolveScreenshotPath: ({ arg, browserName, platform, testFileName }) =>
            visualBaselinePath(testFileName, arg, browserName, platform),
        },
      },
      commands: {
        measureThemeFonts: defineBrowserCommand(
          async ({ page }, theme: 'onmars' | 'material3', withFonts: boolean) =>
            measureThemeFonts(page, theme, withFonts),
        ),
        // `null` restores the suite BASELINE (light — Playwright's context
        // default every spec was written against), not the host preference:
        // `emulateMedia({ colorScheme: null })` re-exposes the machine's
        // system scheme, so on a dark-mode host every reset turned the page
        // dark and whatever ran next read dark token values from a spec
        // that never asked for them.
        emulateColorScheme: defineBrowserCommand(
          async ({ page }, scheme: 'dark' | 'light' | null) => {
            await page.emulateMedia({ colorScheme: scheme ?? 'light' });
          },
        ),
        // Emulate a device with no hovering pointer (a touch screen), or lift
        // it. Returns false where CDP does not exist, so a spec can report the
        // engine it could not measure instead of skipping in silence.
        //
        // NOT Emulation.setEmulatedMedia: Chromium accepts `hover` and
        // `pointer` in its feature list and then ignores them — measured, the
        // page kept reporting `(hover: hover)`. The primary pointer type
        // follows touch emulation instead, and that does reach the iframe a
        // vitest spec runs inside. Mouse input is deliberately NOT re-emitted
        // as touch (setEmitTouchEventsForMouse stays off): a real touch screen
        // latches :hover on the tap, so the measurement has to be able to
        // deliver a hover to a device that says it cannot hover.
        emulateHoverCapability: defineBrowserCommand(
          async ({ page }, capability: 'hover' | 'none' | null) => {
            let session: { send: CdpSend };
            try {
              let pending = cdpSessions.get(page);
              if (pending === undefined) {
                pending = page.context().newCDPSession(page) as Promise<{ send: CdpSend }>;
                cdpSessions.set(page, pending);
              }
              session = await pending;
            } catch {
              cdpSessions.delete(page);
              return false;
            }
            await session.send(
              'Emulation.setTouchEmulationEnabled',
              capability === 'none' ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
            );
            return true;
          },
        ),
        tapWithCoarsePointer: defineBrowserCommand(async ({ page }, selector: string) => {
          const session = await cdpSessions.get(page);
          if (!session) throw new Error('Touch emulation must be enabled before tapping');
          for (const frame of page.frames()) {
            const target = frame.locator(selector);
            if ((await target.count()) === 0) continue;
            const bounds = await target.first().boundingBox();
            if (!bounds) throw new Error(`Touch target is not visible: ${selector}`);
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }],
            });
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            return;
          }
          throw new Error(`Touch target not found: ${selector}`);
        }),
        // The real computed accessibility tree (Playwright's ariaSnapshot,
        // returned as a YAML role/name outline). Needed for roles set via
        // ElementInternals.role, which dom-accessibility-api (getByRole) and
        // axe-core cannot read — the only way to verify list OWNERSHIP rather
        // than reading back the value the component set.
        ariaSnapshot: defineBrowserCommand(async ({ page }, selector: string) => {
          // The test DOM lives in vitest's tester iframe, not the top page —
          // resolve the selector inside whichever frame actually contains it.
          for (const frame of page.frames()) {
            const locator = frame.locator(selector);
            if ((await locator.count()) > 0) {
              return locator.first().ariaSnapshot();
            }
          }
          throw new Error(`ariaSnapshot: no frame contains ${selector}`);
        }),
        // Same baseline rule as emulateColorScheme above: `null` restores
        // the suite baseline (no-preference — what every ungated spec was
        // written against), never the host preference. `emulateMedia({
        // reducedMotion: null })` re-exposes the machine's Reduce Motion
        // setting, so on a host with it enabled every reset stripped the
        // motion-gated rules out from under whatever spec ran next.
        emulateReducedMotion: defineBrowserCommand(
          async ({ page }, reducedMotion: 'reduce' | 'no-preference' | null) => {
            await page.emulateMedia({ reducedMotion: reducedMotion ?? 'no-preference' });
          },
        ),
        // A forced palette (Windows Contrast themes) as a media emulation.
        // Same baseline rule as emulateColorScheme above: `null` restores
        // the suite BASELINE (`none` — Playwright's context default, what
        // every other spec was written against), never the host preference.
        // `emulateMedia({ forcedColors: null })` re-exposes the machine's
        // own setting, so on a host with a contrast theme enabled every
        // reset would leave the specs that follow under the user's palette.
        emulateForcedColors: defineBrowserCommand(
          async ({ page }, forcedColors: 'active' | 'none' | null) => {
            await page.emulateMedia({ forcedColors: forcedColors ?? 'none' });
          },
        ),
        // `prefers-contrast` (specs 043/044). Same baseline rule as above:
        // `null` restores `no-preference`, never the host's own setting, so a
        // host with Increase Contrast on cannot leak into the specs that follow.
        // Returns false where the engine cannot emulate it, so a spec can say
        // which engine it could not measure instead of failing or passing for
        // a reason that has nothing to do with the component.
        emulateContrast: defineBrowserCommand(
          async ({ page }, contrast: 'more' | 'no-preference' | null) => {
            try {
              await page.emulateMedia({ contrast: contrast ?? 'no-preference' });
              return true;
            } catch {
              return false;
            }
          },
        ),
        // `prefers-reduced-transparency` (spec 044). Playwright's emulateMedia
        // does not carry it, so it goes over CDP, which exists on Chromium
        // alone; the command returns false elsewhere so a spec can say which
        // engine it could not measure. Same baseline rule: `null` restores
        // `no-preference`. The session is the long-lived one of
        // emulateHoverCapability, for the same detach reason.
        emulateReducedTransparency: defineBrowserCommand(
          async ({ page }, transparency: 'reduce' | 'no-preference' | null) => {
            let session: { send: CdpSend };
            try {
              let pending = cdpSessions.get(page);
              if (pending === undefined) {
                pending = page.context().newCDPSession(page) as Promise<{ send: CdpSend }>;
                cdpSessions.set(page, pending);
              }
              session = await pending;
            } catch {
              cdpSessions.delete(page);
              return false;
            }
            await session.send('Emulation.setEmulatedMedia', {
              features: [
                {
                  name: 'prefers-reduced-transparency',
                  value: transparency ?? 'no-preference',
                },
              ],
            });
            return true;
          },
        ),
        // The engine's own computed accessibility tree of the tester frame,
        // flattened: role, name, DESCRIPTION, invalid and live-region state
        // of every node the tree does not ignore, and for a live region the
        // text it holds (Chromium marks only the region root as live, and a
        // generic root has no name of its own). Playwright's ariaSnapshot
        // carries no description, and dom-accessibility-api resolves names
        // itself instead of reading what the engine exposes across shadow
        // roots (spec 042). CDP exists on Chromium alone: elsewhere this
        // returns null so a spec can report the engine it could not measure.
        accessibilityTree: defineBrowserCommand(async ({ page }) => {
          if (browser !== 'chromium') {
            return null;
          }
          const tester = await page.locator('[data-vitest="true"]').elementHandle();
          const testerUrl = (await tester?.contentFrame())?.url();
          const session = await page.context().newCDPSession(page);
          try {
            interface FrameTree {
              frame: { id: string; url: string };
              childFrames?: FrameTree[];
            }
            const find = (tree: FrameTree): string | undefined =>
              tree.frame.url === testerUrl
                ? tree.frame.id
                : (tree.childFrames ?? []).map(find).find((id) => id !== undefined);
            const { frameTree } = (await session.send('Page.getFrameTree')) as {
              frameTree: FrameTree;
            };
            const frameId = find(frameTree);
            await session.send('Accessibility.enable');
            const { nodes } = (await session.send(
              'Accessibility.getFullAXTree',
              frameId === undefined ? {} : { frameId },
            )) as {
              nodes: {
                nodeId: string;
                childIds?: string[];
                ignored: boolean;
                role?: { value?: string };
                name?: { value?: string };
                description?: { value?: string };
                properties?: { name: string; value?: { value?: unknown } }[];
              }[];
            };
            const byId = new Map(nodes.map((node) => [node.nodeId, node]));
            const textOf = (node: (typeof nodes)[number]): string =>
              node.role?.value === 'StaticText'
                ? (node.name?.value ?? '')
                : (node.childIds ?? [])
                    .map((id) => byId.get(id))
                    .filter((child) => child !== undefined)
                    .map(textOf)
                    .join('');
            return nodes
              .filter((node) => !node.ignored)
              .map((node) => {
                const property = (name: string): unknown =>
                  node.properties?.find((entry) => entry.name === name)?.value?.value;
                const live = property('live') ?? null;
                return {
                  role: node.role?.value ?? '',
                  name: node.name?.value ?? '',
                  description: node.description?.value ?? '',
                  invalid: property('invalid') ?? 'false',
                  live,
                  text: live === null ? '' : textOf(node),
                  focused: property('focused') === true,
                  // Unavailable and still reachable: what a pending button
                  // exposes through aria-disabled (spec 046).
                  disabled: property('disabled') === true,
                  focusable: property('focusable') === true,
                };
              });
          } finally {
            await session.detach();
          }
        }),
        ariaSnapshotByRole: defineBrowserCommand(
          async ({ page }, role: Parameters<typeof page.getByRole>[0], name?: string) =>
            page
              .locator('[data-vitest="true"]')
              .contentFrame()
              .getByRole(role, name === undefined ? undefined : { name })
              .ariaSnapshot({ timeout: 1000 }),
        ),
        // Two-step arming of the visual gate (see browser-tests/README.md):
        // the harness asks the server whether the versioned ARMED marker is
        // flipped, whether the platform baseline PNG for a capture exists,
        // and whether this run was launched with an explicit --update mode.
        // The filesystem checks must run server-side — the browser cannot
        // see __screenshots__/.
        visualGateStatus: defineBrowserCommand(async ({ project, testPath }, screenshotName) => {
          if (typeof screenshotName !== 'string' || testPath === undefined) {
            throw new TypeError('visualGateStatus requires a screenshot name and a test path');
          }
          const armedMarker = join(browserTestsDirectory, 'visual/ARMED');
          const baseline = visualBaselinePath(
            basename(testPath),
            screenshotName,
            project.config.browser.name,
            process.platform,
          );
          return {
            armed: readFileSync(armedMarker, 'utf8').trim() === 'true',
            baselineExists: existsSync(baseline),
            updateMode: project.serializedConfig.snapshotOptions.updateSnapshot,
          };
        }),
        installClock: defineBrowserCommand(async ({ page }) => {
          await page.clock.install();
        }),
        pauseClock: defineBrowserCommand(async ({ page }) => {
          const pausedAt = Date.now();
          await page.clock.setFixedTime(pausedAt);
          await page.clock.pauseAt(pausedAt);
          await page.clock.setSystemTime(pausedAt);
        }),
        fastForwardClock: defineBrowserCommand(async ({ page }, milliseconds: number) => {
          await page.clock.fastForward(milliseconds);
        }),
        // Visual captures must not inherit pointer position from earlier
        // functional specs in the same browser page: their userEvent clicks
        // leave the mouse wherever the last interaction happened, and a
        // pointer resting over a gallery control flips its :hover state
        // (the armed gate caught a stable 125/45px two-state drift on the
        // ki-input galleries). (0,0) reproduces the mint-run conditions
        // exactly — visual-baselines runs only visual specs, mouse untouched.
        resetPointer: defineBrowserCommand(async ({ page }) => {
          await page.mouse.move(0, 0);
        }),
        resumeClock: defineBrowserCommand(async ({ page }) => {
          await page.clock.resume();
        }),
      },
      instances: [
        {
          browser,
          name: `${browser}-light`,
          exclude: [
            ...browserSpecPatterns('*.dark'),
            ...browserSpecPatterns('*.motion'),
            ...inputDeviceSpecs,
            ...visualExcludes,
          ],
          // Files in one browser setup have isolated DOMs but share the
          // Playwright page's physical pointer, keyboard focus and CDP media
          // emulation. Run them sequentially inside that page; the three
          // independent setup pages still run in parallel with one another.
          fileParallelism: false,
        },
        {
          browser,
          name: `${browser}-dark`,
          include: browserSpecPatterns('*.dark'),
          ...(visualExcludes.length > 0 ? { exclude: visualExcludes } : {}),
          fileParallelism: false,
        },
        {
          browser,
          name: `${browser}-reduced-motion`,
          include: browserSpecPatterns('*.motion'),
          ...(visualExcludes.length > 0 ? { exclude: visualExcludes } : {}),
          fileParallelism: false,
        },
        {
          browser,
          name: `${browser}-pointer-capability`,
          // This audit mutates the page-level input device through CDP. On
          // headless Linux, disabling touch emulation does not reliably
          // restore the page's original hover capability, so it must not
          // share a project/page with ordinary hover behavior contracts.
          include: inputDeviceSpecs,
          fileParallelism: false,
        },
      ],
    },
  },
});
