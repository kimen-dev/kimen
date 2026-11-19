// @spec:061-backdrop-filter-token
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  byPart,
  findDeep,
  installKimen,
  mount,
  resetPreferences,
  resetRoot,
  SCHEMES,
  settleAnimations,
  THEMES,
  themeDocument,
  underTransparency,
  uninstallKimen,
  unmountAll,
} from './modes';

const GLASS = [
  '<ki-badge>Draft</ki-badge>',
  '<ki-button variant="secondary">Cancel</ki-button>',
  '<ki-icon-button variant="secondary" label="Copy"></ki-icon-button>',
  '<ki-alert dismissible>Saved</ki-alert>',
  '<ki-dialog heading="Delete">This cannot be undone.</ki-dialog>',
  '<ki-tooltip label="Copy link"><button type="button">Copy</button></ki-tooltip>',
  '<ki-select label="Country"><ki-option value="es">Spain</ki-option></ki-select>',
  '<ki-video label="Play"><video slot="media"></video></ki-video>',
].join('');

const STANDARD_PARTS = [
  ['ki-badge', 'badge'],
  ['ki-button', 'button'],
  ['ki-icon-button', 'button'],
  ['ki-alert', 'alert'],
  ['ki-alert', 'dismiss'],
  ['ki-dialog', 'dialog'],
  ['ki-tooltip', 'tooltip'],
  ['ki-video', 'play'],
] as const;

const root = document.documentElement;

function host(fixture: HTMLElement, tag: string): HTMLElement {
  const element = fixture.querySelector<HTMLElement>(tag);
  if (element === null) throw new Error(`The fixture must mount ${tag}`);
  return element;
}

function filter(fixture: HTMLElement, tag: string, part: string): string {
  return getComputedStyle(findDeep(host(fixture, tag), byPart(part))).backdropFilter;
}

async function mountGlass(): Promise<HTMLElement> {
  const fixture = await mount(GLASS);
  const tooltip = host(fixture, 'ki-tooltip');
  tooltip.querySelector('button')?.focus();
  await expect
    .poll(() => findDeep(tooltip, byPart('tooltip')).checkVisibility({ opacityProperty: true }))
    .toBe(true);
  findDeep(host(fixture, 'ki-select'), byPart('trigger')).click();
  await expect
    .poll(() => findDeep(host(fixture, 'ki-select'), byPart('listbox')).checkVisibility())
    .toBe(true);
  const dialog = host(fixture, 'ki-dialog') as HTMLKiDialogElement;
  await dialog.show();
  await settleAnimations();
  return fixture;
}

function expectFilters(fixture: HTMLElement, standard: string, listbox: string): void {
  for (const [tag, part] of STANDARD_PARTS) {
    expect(filter(fixture, tag, part), `${tag} ${part}`).toBe(standard);
  }
  expect(filter(fixture, 'ki-select', 'listbox')).toBe(listbox);
  const videoGlass = findDeep(host(fixture, 'ki-video'), (element) =>
    element.classList.contains('control'),
  );
  expect(getComputedStyle(videoGlass).backdropFilter, 'ki-video glass control').toBe(standard);
}

beforeAll(installKimen);

afterEach(async () => {
  unmountAll();
  root.removeAttribute('style');
  resetRoot();
  await resetPreferences();
});

afterAll(uninstallKimen);

it('S1 turns the computed backdrop filter off on every glass surface', async () => {
  themeDocument('onmars', 'light');
  root.style.setProperty('--ki-effect-component-backdrop-filter', 'none');

  expectFilters(await mountGlass(), 'none', 'none');
});

it('S2 can enable glass for a badge alone in a flat theme', async () => {
  themeDocument('onmars', 'light');
  root.style.setProperty('--ki-effect-component-backdrop-filter', 'none');
  const fixture = await mount(GLASS);
  host(fixture, 'ki-badge').style.setProperty('--ki-badge-backdrop-filter', 'blur(12px)');

  expect(filter(fixture, 'ki-badge', 'badge')).toBe('blur(12px)');
  expect(filter(fixture, 'ki-button', 'button')).toBe('none');
});

describe.each(THEMES)('S3 built-in %s theme', (theme) => {
  it.each(SCHEMES)('S3 preserves glass appearance in %s', async (scheme) => {
    themeDocument(theme, scheme);
    const fixture = await mountGlass();

    if (theme === 'onmars') {
      expectFilters(fixture, 'blur(12px)', 'blur(24px)');
    } else {
      for (const name of [
        '--ki-effect-component-backdrop-blur',
        '--ki-select-listbox-backdrop-blur',
        '--ki-tooltip-backdrop-blur',
      ]) {
        expect(getComputedStyle(root).getPropertyValue(name).trim(), name).toBe('0px');
      }
      expectFilters(fixture, 'blur(0px)', 'blur(0px)');
    }
  });
});

it('S4 keeps theme and component-local overrides of the old blur lengths', async () => {
  themeDocument('onmars', 'light');
  root.style.setProperty('--ki-effect-component-backdrop-blur', '4px');
  root.style.setProperty('--ki-select-listbox-backdrop-blur', '8px');
  const fixture = await mountGlass();
  const button = host(fixture, 'ki-button');
  button.style.setProperty('--ki-button-backdrop-blur', '6px');

  expect(filter(fixture, 'ki-badge', 'badge')).toBe('blur(4px)');
  expect(filter(fixture, 'ki-button', 'button')).toBe('blur(6px)');
  expect(filter(fixture, 'ki-select', 'listbox')).toBe('blur(8px)');

  button.style.setProperty('--ki-button-backdrop-filter', 'none');
  expect(filter(fixture, 'ki-button', 'button')).toBe('none');
});

it('S5 turns the filter off in a page that declares reduced transparency', async () => {
  themeDocument('onmars', 'light');
  root.setAttribute('data-ki-transparency', 'reduce');

  expectFilters(await mountGlass(), 'none', 'none');
});

it('S5 turns the filter off under the system reduced-transparency preference', async (context) => {
  themeDocument('onmars', 'light');
  await underTransparency('reduce', context);

  expectFilters(await mountGlass(), 'none', 'none');
});
