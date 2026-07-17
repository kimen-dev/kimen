// Shared visual-regression harness (Art. X: zero-flake determinism).
//
// Each capture renders one per-component state gallery from the BUILT
// dist/components output (what ships is what is asserted, Art. III) with the
// real token stylesheets, the vendored font fixtures (Inter for onmars,
// Roboto for material3 — runner font packages can never shift text metrics),
// reduced-motion emulation and DPR 1 headless Chromium. The matcher runs
// strict comparator defaults: zero mismatched pixels, per-pixel threshold 0.1
// (rasterization noise only, so a color delta under ~26/255 is a documented
// blind spot covered by the token gate), antialiased pixels ignored.
//
// Baseline arbiters are the CI-generated linux PNGs committed under
// __screenshots__/; darwin PNGs are a personal safety net and stay
// gitignored. The gate arms explicitly via the versioned visual/ARMED
// marker: while it reads `false`, a capture whose platform baseline does not
// exist yet SKIPS with a loud notice instead of failing, so the harness can
// merge before the bootstrap dispatch of visual-baselines.yml produces the
// first linux baselines. See ../README.md for the full bootstrap and
// regeneration flow.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import material3Css from '@kimen/tokens/css/material3?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import interWoff2Url from './fonts/InterVariable.woff2?url';
import robotoWoff2Url from './fonts/RobotoVariable.woff2?url';
import { visualGalleries } from './galleries';
import type { VisualComponent } from './galleries';

type Scheme = 'dark' | 'light';
type Theme = 'material3' | 'onmars';

interface VisualSuiteOptions {
  component: VisualComponent;
  define: readonly (() => void)[];
  scheme: Scheme;
}

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
  visualGateStatus: (screenshotName: string) => Promise<{
    armed: boolean;
    baselineExists: boolean;
    updateMode: 'all' | 'new' | 'none';
  }>;
};

const ONMARS_STYLE_ID = 'vr-onmars-tokens';
const MATERIAL3_STYLE_ID = 'vr-material3-tokens';

// The default 414x896 tester viewport does not fit the headless window, so
// Vitest CSS-scales the iframe (~0.8) and captures come out resized with
// fractional-scaling artifacts. A viewport that fits the window keeps the
// orchestrator at scale 1: captured pixels equal CSS pixels (DPR 1).
const VIEWPORT_HEIGHT = 700;
const DEFAULT_VIEWPORT = { height: 896, width: 414 };

// The matcher stabilizes on two identical consecutive captures; 3000 ms
// bounds that stabilization loop and stays well under the test timeout so a
// red capture always reports the comparator verdict ("N pixels differ")
// instead of dying as an opaque test timeout. The assertion is a ONE-SHOT
// `expect(...)`: `expect.element(...)` would re-run the failing matcher in a
// poll loop until the test timeout and swallow the comparator message
// (verified against vitest 4.1.9). The test timeout then only bounds a
// slow-but-green CI mount (Art. III latency, Art. X: a timeout is never a
// tolerance).
const CAPTURE_TIMEOUT_MS = 3000;
const VISUAL_TEST_TIMEOUT_MS = 10_000;
const SHADOW_RENDER_DEADLINE_MS = 1500;
const DISARMED_NOTICE = 'visual gate DISARMED — bootstrap pending, see README';

// Vendored fixture fonts (metrics can never drift with the runner image):
// Inter resolves the onmars `--ki-font-family-body`, Roboto the material3
// one. Both load up front so every gallery renders real glyphs, never a
// platform fallback face.
const fixtureFonts = [
  { family: 'Inter', url: interWoff2Url },
  { family: 'Roboto', url: robotoWoff2Url },
] as const;
let fixtureFontsLoaded = false;

async function ensureFixtureFonts(): Promise<void> {
  if (!fixtureFontsLoaded) {
    await Promise.all(
      fixtureFonts.map(async ({ family, url }) => {
        const face = new FontFace(family, `url(${url}) format('woff2')`, {
          weight: '100 900',
        });
        await face.load();
        document.fonts.add(face);
      }),
    );
    fixtureFontsLoaded = true;
  }
  await document.fonts.ready;
}

function injectStylesheet(css: string, id: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForShadowRender(wrapper: HTMLElement): Promise<void> {
  const kiElements = [...wrapper.querySelectorAll('*')].filter((element) =>
    element.tagName.toLowerCase().startsWith('ki-'),
  );
  const tags = [...new Set(kiElements.map((element) => element.tagName.toLowerCase()))];
  await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  // Data-only elements (display:none, e.g. standalone ki-option) never paint
  // shadow content, so they are excluded from the readiness condition.
  const pending = (): boolean =>
    kiElements.some(
      (element) =>
        element.shadowRoot !== null &&
        !element.shadowRoot.hasChildNodes() &&
        getComputedStyle(element).display !== 'none',
    );
  const deadline = Date.now() + SHADOW_RENDER_DEADLINE_MS;
  while (pending() && Date.now() < deadline) {
    await nextFrame();
  }
  if (pending()) {
    // A half-rendered gallery must never reach the comparator: it would
    // either poison a freshly created baseline or produce a misleading
    // pixel diff. Fail loudly with the offending tags instead.
    const stuck = [
      ...new Set(
        kiElements
          .filter(
            (element) =>
              element.shadowRoot !== null &&
              !element.shadowRoot.hasChildNodes() &&
              getComputedStyle(element).display !== 'none',
          )
          .map((element) => element.tagName.toLowerCase()),
      ),
    ];
    throw new Error(
      `waitForShadowRender: shadow content did not paint within ${String(
        SHADOW_RENDER_DEADLINE_MS,
      )}ms for: ${stuck.join(', ')}`,
    );
  }
  await nextFrame();
  await nextFrame();
}

async function mountGallery(component: VisualComponent, theme: Theme): Promise<HTMLElement> {
  document.body.replaceChildren();
  // Deterministic geometry: zero margin plus a wrapper as wide as the
  // viewport (page.viewport uses gallery.width) pins static content at
  // scale 1 with no offset. Top-layer content (modal dialogs) centers in
  // the VIEWPORT, not in this wrapper: horizontally both coincide because
  // wrapper width equals viewport width, while vertically the dialog sits
  // at the viewport midpoint — minHeight only guarantees it stays inside
  // the captured area, not that it is vertically centered in the PNG.
  document.body.style.margin = '0';
  document.documentElement.removeAttribute('data-ki-theme');
  injectStylesheet(onmarsCss, ONMARS_STYLE_ID);
  if (theme === 'material3') {
    injectStylesheet(material3Css, MATERIAL3_STYLE_ID);
    document.documentElement.setAttribute('data-ki-theme', 'material3');
  }
  const gallery = visualGalleries[component];
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'gap:16px',
    'box-sizing:border-box',
    `inline-size:${String(gallery.width ?? 640)}px`,
    ...(gallery.minHeight === undefined ? [] : [`min-block-size:${String(gallery.minHeight)}px`]),
    'padding:24px',
    'background:var(--ki-surface-s0)',
    'color:var(--ki-text-high-em)',
    'font-family:var(--ki-font-family-body)',
  ].join(';');
  wrapper.innerHTML = gallery.html;
  document.body.append(wrapper);
  await waitForShadowRender(wrapper);
  await gallery.prepare?.(wrapper);
  return wrapper;
}

export function runVisualSuite(options: VisualSuiteOptions): void {
  const { component, define, scheme } = options;
  // The approved matrix: onmars light + dark for every component, material3
  // light only (alternate-theme contract at marginal cost).
  const themes: readonly Theme[] = scheme === 'light' ? ['onmars', 'material3'] : ['onmars'];

  describe(`${component} visual gallery [${scheme}]`, () => {
    beforeAll(async () => {
      for (const defineElement of define) {
        defineElement();
      }
      await browserCommands.emulateColorScheme(scheme);
      await browserCommands.emulateReducedMotion('reduce');
      await page.viewport(visualGalleries[component].width ?? 640, VIEWPORT_HEIGHT);
      await ensureFixtureFonts();
    });

    afterAll(async () => {
      document.documentElement.removeAttribute('data-ki-theme');
      await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
      // Restore the Playwright CONTEXT defaults, never null: null falls back
      // to the host system preference and would leak a machine-dependent
      // scheme into whichever functional spec reuses this tester session
      // (observed: a dark-mode host turned the light instance dark).
      await browserCommands.emulateReducedMotion('no-preference');
      await browserCommands.emulateColorScheme('light');
    });

    for (const theme of themes) {
      it(`${theme} ${scheme} state gallery matches the platform baseline`, {
        timeout: VISUAL_TEST_TIMEOUT_MS,
      }, async (testContext) => {
        const screenshotName = `${component}-${theme}-${scheme}-gallery`;
        // Two-step arming (bootstrap deadlock breaker): while visual/ARMED
        // reads `false`, a missing platform baseline is a LOUD SKIP instead
        // of a red, so the harness can land before the founder-dispatched
        // visual-baselines run produces the first linux PNGs. An explicit
        // update run (`--update=all`) always proceeds — that is the run
        // that creates baselines. Once ARMED reads `true`, a missing
        // baseline is red again (scripts/tests/visual-gate.test.mjs pins
        // that armed implies committed linux baselines).
        const gate = await browserCommands.visualGateStatus(screenshotName);
        if (!gate.armed && !gate.baselineExists && gate.updateMode !== 'all') {
          const notice = `${DISARMED_NOTICE} (skipping ${screenshotName})`;
          console.warn(notice);
          testContext.skip(notice);
        }
        const wrapper = await mountGallery(component, theme);
        if (visualGalleries[component].focusFirst === true) {
          await userEvent.keyboard('{Tab}');
        }

        await expect(wrapper).toMatchScreenshot(screenshotName, {
          timeout: CAPTURE_TIMEOUT_MS,
        });
      });
    }
  });
}
