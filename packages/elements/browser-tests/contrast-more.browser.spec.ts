// @spec:043-contrast-more
//
// More contrast (spec 043). Each test mounts real components, puts the page
// under the emulated `prefers-contrast: more` preference or the page's own
// `data-ki-contrast="more"` declaration, and measures what is painted: the
// contrast of text against the surface behind it, of a control's edge and of a
// separator against the page, and the thickness of the focus ring. Nothing
// here names a token: the thresholds are the contract.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { textMeasurements } from './contracts';
import {
  boundaryRatio,
  byPart,
  contrast,
  findDeep,
  installKimen,
  mount,
  over,
  pageSurface,
  paint,
  parseColor,
  resetPreferences,
  resetRoot,
  ruleRatio,
  SCHEMES,
  settleAnimations,
  textRatio,
  THEMES,
  themeDocument,
  underContrast,
  uninstallKimen,
  unmountAll,
} from './modes';

const NEUTRAL_TEXT = 7;
const CONTROL_BOUNDARY = 4.5;
const SEPARATOR = 3;
const FOCUS_RING_CONTRAST = 4.5;
const FOCUS_RING_WIDTH = 3;

const EMAIL_FIELD = '<ki-input label="Email" placeholder="name@example.com"></ki-input>';
// Neutral text on neutral surfaces, every control boundary and every
// separator the thresholds name — and no brand or tone fill, which S6 covers.
const NEUTRAL_GALLERY =
  EMAIL_FIELD +
  '<ki-select label="Country" placeholder="Choose a country">' +
  '<ki-option value="es">Spain</ki-option></ki-select>' +
  '<ki-checkbox>Accept the terms</ki-checkbox>' +
  '<ki-radio-group label="Plan"><ki-radio value="basic">Basic</ki-radio></ki-radio-group>' +
  '<ki-card>Invoice total</ki-card>' +
  '<ki-divider></ki-divider>' +
  '<ki-list><ki-list-item>Invoice<span slot="secondary">Due in 3 days</span></ki-list-item></ki-list>' +
  '<ki-button variant="quaternary">More</ki-button>';

function field(fixture: HTMLElement, selector = 'ki-input'): HTMLElement {
  const host = fixture.querySelector(selector);
  if (host === null) throw new Error(`no ${selector} mounted`);
  return host as HTMLElement;
}

/** Label and placeholder contrast of a ki-input, each against what is behind it. */
function fieldTextRatios(host: HTMLElement): { label: number; placeholder: number } {
  const label = findDeep(host, byPart('label'));
  const input = findDeep(host, (element) => element instanceof HTMLInputElement);
  return { label: textRatio(label), placeholder: textRatio(input, '::placeholder') };
}

function expectEnhancedField(host: HTMLElement, page: ReturnType<typeof pageSurface>): void {
  const ratios = fieldTextRatios(host);
  expect(ratios.label, 'label').toBeGreaterThanOrEqual(NEUTRAL_TEXT);
  expect(ratios.placeholder, 'placeholder').toBeGreaterThanOrEqual(NEUTRAL_TEXT);
  expect(boundaryRatio(host, page), 'boundary').toBeGreaterThanOrEqual(CONTROL_BOUNDARY);
}

beforeAll(async () => {
  await installKimen();
});

afterEach(async () => {
  unmountAll();
  resetRoot();
  await resetPreferences();
});

afterAll(async () => {
  await uninstallKimen();
});

describe('043 more contrast under the system preference', () => {
  it('S1: secondary text reaches enhanced contrast under the system preference', async () => {
    const fixture = await mount(EMAIL_FIELD);
    await underContrast('more');

    const ratios = fieldTextRatios(field(fixture));
    expect(ratios.label).toBeGreaterThanOrEqual(NEUTRAL_TEXT);
    expect(ratios.placeholder).toBeGreaterThanOrEqual(NEUTRAL_TEXT);
  });

  it('S2: control boundaries strengthen under the system preference', async () => {
    const fixture = await mount(
      EMAIL_FIELD +
        '<ki-select label="Country" placeholder="Choose a country">' +
        '<ki-option value="es">Spain</ki-option></ki-select>' +
        '<ki-checkbox>Accept the terms</ki-checkbox>' +
        '<ki-radio-group label="Plan"><ki-radio value="basic">Basic</ki-radio></ki-radio-group>',
    );
    await underContrast('more');
    const page = pageSurface(fixture);

    for (const selector of ['ki-input', 'ki-select', 'ki-checkbox', 'ki-radio']) {
      expect(boundaryRatio(field(fixture, selector), page), selector).toBeGreaterThanOrEqual(
        CONTROL_BOUNDARY,
      );
    }
  });

  it('S3: separators and container edges become visible under the system preference', async () => {
    const fixture = await mount('<ki-card>Invoice</ki-card><ki-divider></ki-divider>');
    await underContrast('more');
    const page = pageSurface(fixture);

    expect(boundaryRatio(field(fixture, 'ki-card'), page), 'card edge').toBeGreaterThanOrEqual(
      SEPARATOR,
    );
    expect(ruleRatio(field(fixture, 'ki-divider'), page), 'divider').toBeGreaterThanOrEqual(
      SEPARATOR,
    );
  });

  it('S4: the keyboard focus indicator thickens under the system preference', async () => {
    const fixture = await mount('<ki-button variant="primary">Save</ki-button>');
    await underContrast('more');
    await userEvent.tab();
    await settleAnimations();
    const button = findDeep(field(fixture, 'ki-button'), byPart('button'));
    expect(button.matches(':focus-visible'), 'Save has keyboard focus').toBe(true);

    const style = getComputedStyle(button);
    const page = pageSurface(fixture);
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(FOCUS_RING_WIDTH);
    expect(contrast(over(parseColor(style.outlineColor), page), page)).toBeGreaterThanOrEqual(
      FOCUS_RING_CONTRAST,
    );
  });

  describe.each(THEMES.flatMap((theme) => SCHEMES.map((scheme) => [theme, scheme] as const)))(
    'S5: enhanced contrast holds in %s %s',
    (theme, scheme) => {
      it(`S5: every neutral text, boundary and separator meets the enhanced thresholds in ${theme} ${scheme}`, async () => {
        themeDocument(theme, scheme);
        const fixture = await mount(NEUTRAL_GALLERY);
        await underContrast('more');
        const page = pageSurface(fixture);

        const weak = textMeasurements(fixture).filter((text) => text.ratio < NEUTRAL_TEXT);
        expect(weak.map((text) => `${text.where} "${text.text}" ${text.ratio.toFixed(2)}`)).toEqual(
          [],
        );
        for (const selector of ['ki-input', 'ki-select', 'ki-checkbox', 'ki-radio']) {
          expect(boundaryRatio(field(fixture, selector), page), selector).toBeGreaterThanOrEqual(
            CONTROL_BOUNDARY,
          );
        }
        expect(boundaryRatio(field(fixture, 'ki-card'), page), 'card').toBeGreaterThanOrEqual(
          SEPARATOR,
        );
        expect(ruleRatio(field(fixture, 'ki-divider'), page), 'divider').toBeGreaterThanOrEqual(
          SEPARATOR,
        );
      });
    },
  );

  it('S6: text on brand and tone fills keeps at least the standard contrast', async () => {
    themeDocument('material3', 'light');
    const fixture = await mount(
      '<ki-button variant="primary">Save</ki-button>' +
        '<ki-alert tone="danger">Payment failed</ki-alert>',
    );
    await underContrast('more');

    const weak = textMeasurements(fixture).filter((text) => text.ratio < 4.5);
    expect(weak.map((text) => `${text.where} "${text.text}" ${text.ratio.toFixed(2)}`)).toEqual([]);
  });

  it('S9: disabled controls keep their standard appearance under more contrast', async () => {
    const fixture = await mount('<ki-input label="Email" disabled></ki-input>');
    await underContrast('no-preference');
    const standard = paint(field(fixture));
    await underContrast('more');

    expect(paint(field(fixture))).toEqual(standard);
  });
});

describe('043 more contrast declared by the page', () => {
  it('S7: a page can declare more contrast without the system preference', async () => {
    document.documentElement.setAttribute('data-ki-contrast', 'more');
    const fixture = await mount(EMAIL_FIELD);
    await underContrast('no-preference');

    const ratios = fieldTextRatios(field(fixture));
    expect(ratios.label).toBeGreaterThanOrEqual(NEUTRAL_TEXT);
    expect(ratios.placeholder).toBeGreaterThanOrEqual(NEUTRAL_TEXT);
  });

  it('S8: without the preference or a declaration the standard appearance is unchanged', async () => {
    const fixture = await mount(EMAIL_FIELD);
    await underContrast('no-preference');
    const standard = paint(field(fixture));
    const standardRatios = fieldTextRatios(field(fixture));
    await underContrast('more');
    const enhanced = paint(field(fixture));
    await underContrast('no-preference');

    expect(enhanced, 'the mode changes something it is meant to').not.toEqual(standard);
    expect(paint(field(fixture))).toEqual(standard);
    expect(standardRatios.placeholder).toBeLessThan(NEUTRAL_TEXT);
  });

  it('S10: a themed region inside a page that declares more contrast keeps it', async () => {
    document.documentElement.setAttribute('data-ki-contrast', 'more');
    await underContrast('no-preference');
    const region = await mount(`<section data-ki-theme="material3">${EMAIL_FIELD}</section>`);
    const inRegion = paint(field(region));
    unmountAll();

    themeDocument('material3', 'light');
    const page = await mount(EMAIL_FIELD);
    expect(inRegion).toEqual(paint(field(page)));
    expectEnhancedField(field(page), pageSurface(page));
  });

  it('S11: a themed region can declare more contrast on its own', async () => {
    await underContrast('no-preference');
    const outsideOnly = await mount(EMAIL_FIELD);
    const standard = paint(field(outsideOnly));
    unmountAll();

    const fixture = await mount(
      `${EMAIL_FIELD}<section data-ki-theme="onmars" data-ki-contrast="more">${EMAIL_FIELD}</section>`,
    );
    const [outside, inside] = [...fixture.querySelectorAll('ki-input')] as HTMLElement[];
    if (outside === undefined || inside === undefined) throw new Error('two fields expected');

    expectEnhancedField(inside, pageSurface(fixture));
    expect(paint(outside)).toEqual(standard);
  });

  it("S12: a page's own value for a strengthened token wins under more contrast", async () => {
    const own = document.createElement('style');
    own.textContent =
      '@media (prefers-contrast: more) { :root { --ki-outline-control: #000000; } }';
    document.head.append(own);
    try {
      const fixture = await mount(EMAIL_FIELD);
      await underContrast('more');

      const edge = findDeep(field(fixture), byPart('field'));
      expect(getComputedStyle(edge).borderTopColor).toBe('rgb(0, 0, 0)');
    } finally {
      own.remove();
    }
  });
});
