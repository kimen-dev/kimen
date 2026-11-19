// @spec:062-solid-surface-background
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  byPart,
  findDeep,
  installKimen,
  mount,
  resetRoot,
  themeDocument,
  uninstallKimen,
  unmountAll,
} from './modes';

const surfaces = [
  {
    tag: 'ki-dialog',
    part: 'dialog',
    onmars: { light: 'rgb(255, 255, 255)', dark: 'rgb(40, 38, 35)' },
    material3: { light: 'rgb(236, 230, 240)', dark: 'rgb(43, 41, 48)' },
    token: '--ki-dialog-bg',
    markup: '<ki-dialog heading="Confirm changes"><p>Publish now?</p></ki-dialog>',
  },
  {
    tag: 'ki-tooltip',
    part: 'tooltip',
    onmars: { light: 'rgb(46, 43, 38)', dark: 'rgb(243, 240, 235)' },
    material3: { light: 'rgb(0, 0, 0)', dark: 'rgb(255, 255, 255)' },
    token: '--ki-tooltip-bg',
    markup:
      '<ki-tooltip label="Copy link" placement="bottom"><button type="button">Copy</button></ki-tooltip>',
  },
  {
    tag: 'ki-select',
    part: 'listbox',
    onmars: { light: 'rgba(255, 255, 255, 0.8)', dark: 'rgba(36, 36, 36, 0.8)' },
    material3: { light: 'rgb(243, 237, 247)', dark: 'rgb(33, 31, 38)' },
    token: '--ki-select-listbox-bg',
    markup: '<ki-select label="Country"><ki-option value="es">Spain</ki-option></ki-select>',
  },
] as const;

const glassSurfaces = surfaces.slice(0, 2);
type Surface = (typeof surfaces)[number];

async function showSurface(fixture: HTMLElement, { tag, part }: Surface): Promise<HTMLElement> {
  const host = findDeep(fixture, (element) => element.localName === tag);
  if (tag === 'ki-dialog') {
    await (host as HTMLElement & { show: () => Promise<void> }).show();
  } else if (tag === 'ki-tooltip') {
    findDeep(
      host,
      (element) => element.textContent === 'Copy' && element.localName === 'button',
    ).focus();
  } else {
    findDeep(host, byPart('trigger')).click();
  }
  const surface = findDeep(host, byPart(part));
  await expect
    .poll(() => surface.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    .toBe(true);
  return surface;
}

beforeAll(installKimen);

afterEach(() => {
  unmountAll();
  resetRoot();
});

afterAll(uninstallKimen);

describe.each(surfaces)('$part background', (overlay) => {
  it('S1 paints only the supplied fill when the image is absent', async () => {
    const fixture = await mount(overlay.markup);
    const host = findDeep(fixture, (element) => element.localName === overlay.tag);
    host.style.setProperty(overlay.token, 'rgb(36, 52, 68)');
    host.style.setProperty(`${overlay.token}-image`, 'initial');
    const surface = await showSurface(fixture, overlay);

    expect(getComputedStyle(surface).backgroundColor).toBe('rgb(36, 52, 68)');
    expect(getComputedStyle(surface).backgroundImage).toBe('none');
    if (overlay.tag === 'ki-tooltip') {
      // Calma uses the bubble fill for its arrow when no override is supplied.
      const arrow = findDeep(surface, (element) => element.getAttribute('aria-hidden') === 'true');
      expect(getComputedStyle(arrow).backgroundColor).toBe('rgb(36, 52, 68)');
    }
  });

  it('S2 layers the supplied image over the fill', async () => {
    const fixture = await mount(overlay.markup);
    const host = findDeep(fixture, (element) => element.localName === overlay.tag);
    host.style.setProperty(overlay.token, 'rgb(36, 52, 68)');
    host.style.setProperty(
      `${overlay.token}-image`,
      'linear-gradient(rgba(10, 20, 30, 0.4), rgb(55, 66, 77))',
    );
    const surface = await showSurface(fixture, overlay);

    const style = getComputedStyle(surface);
    expect(style.backgroundImage).toContain('rgba(10, 20, 30, 0.4), rgb(55, 66, 77)');
    expect(style.backgroundColor).toBe('rgb(36, 52, 68)');
  });

  it.each([
    ['onmars', 'light'],
    ['onmars', 'dark'],
    ['material3', 'light'],
    ['material3', 'dark'],
  ] as const)('S3 paints the %s %s fill without an image', async (theme, scheme) => {
    themeDocument(theme, scheme);
    const fixture = await mount(overlay.markup);
    const surface = await showSurface(fixture, overlay);

    const style = getComputedStyle(surface);
    expect(style.backgroundImage).toBe('none');
    expect(style.backgroundColor).toBe(overlay[theme][scheme]);
  });
});

describe.each(glassSurfaces)('onmars v1 $part background', (overlay) => {
  it('S4 still takes the legacy colors from the theme scope', async () => {
    const fixture = await mount(overlay.markup);
    fixture.dataset.kiTheme = 'onmars';
    // Calma ships without images. Select the legacy glass image to test its stops.
    fixture.style.setProperty(
      `${overlay.token}-image`,
      `var(--ki-foundation-onmars-v1-${overlay.part}-bg-image)`,
    );
    if (overlay.tag === 'ki-tooltip') {
      fixture.style.setProperty(
        '--ki-surface-image-tooltip-arrow-start',
        'var(--ki-foundation-onmars-v1-tooltip-arrow-start)',
      );
    }
    fixture.style.setProperty(`${overlay.token}-start`, 'rgb(10, 20, 30)');
    fixture.style.setProperty(`${overlay.token}-end`, 'rgb(40, 50, 60)');
    const surface = await showSurface(fixture, overlay);

    expect(getComputedStyle(surface).backgroundImage).toContain('rgb(10, 20, 30), rgb(40, 50, 60)');
    if (overlay.tag === 'ki-tooltip') {
      const arrow = findDeep(surface, (element) => element.getAttribute('aria-hidden') === 'true');
      expect(getComputedStyle(arrow).backgroundColor).toBe('rgb(10, 20, 30)');
    }
  });
});
