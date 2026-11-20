// @spec:102-ki-slider
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-slider.js';

type Slider = HTMLElement & { value?: number | string };
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<boolean>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
let fixture: HTMLElement;

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = tokensCss + material3Css;
  document.head.append(style);
  fixture = document.createElement('div');
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('data-ki-theme');
  await parkPointer();
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected the slider fixture to exist');
  return value;
}

async function mount(markup: string): Promise<Slider> {
  fixture.innerHTML = markup;
  const host = required(fixture.querySelector<Slider>('ki-slider'));
  await expect.element(page.getByRole('slider').first()).toBeVisible();
  return host;
}

function part(host: Slider, name: string): HTMLElement {
  return required(host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`));
}

function thumb(name: string) {
  return page.getByRole('slider', { name });
}

describe('ki-slider', () => {
  it('S1 previews a value while dragging and commits after pointer release', async () => {
    const host = await mount('<ki-slider label="Volume" step="5" value="20"></ki-slider>');
    const rail = part(host, 'track').getBoundingClientRect();
    const control = host.getBoundingClientRect();
    const timeline: string[] = [];
    fixture.addEventListener('pointerup', () => timeline.push('release'), {
      capture: true,
      once: true,
    });
    host.addEventListener('input', () => timeline.push(`input:${String(host.value)}`));
    host.addEventListener('change', () => timeline.push(`change:${String(host.value)}`));

    await userEvent.dragAndDrop(thumb('Volume'), host, {
      targetPosition: {
        x: rail.left + rail.width * 0.75 - control.left,
        y: rail.top + rail.height / 2 - control.top,
      },
    });

    await expect.element(thumb('Volume')).toHaveAttribute('aria-valuenow', '75');
    const release = timeline.indexOf('release');
    expect(release).toBeGreaterThan(0);
    expect(timeline.slice(0, release)).toContain('input:75');
    expect(timeline.slice(release)).toEqual(['release', 'change:75']);
  });

  it('S2 tabs through both named range thumbs and prevents crossing from either end', async () => {
    const host = await mount('<ki-slider label="Price" value="20,80" range></ki-slider>');
    const lower = thumb('Price minimum');
    const upper = thumb('Price maximum');

    await userEvent.tab();
    expect(host.shadowRoot?.activeElement).toBe(lower.element());
    await userEvent.keyboard('{End}');
    await expect.element(lower).toHaveAttribute('aria-valuenow', '80');
    await expect.element(lower).toHaveAttribute('aria-valuemax', '80');
    await userEvent.tab();
    expect(host.shadowRoot?.activeElement).toBe(upper.element());
    await userEvent.keyboard('{Home}');
    await expect.element(upper).toHaveAttribute('aria-valuenow', '80');
    await expect.element(upper).toHaveAttribute('aria-valuemin', '80');
    expect(host.value).toBe('80,80');
  });

  it.each([
    ['ArrowRight', '52'],
    ['ArrowUp', '52'],
    ['ArrowLeft', '48'],
    ['ArrowDown', '48'],
    ['PageUp', '70'],
    ['PageDown', '30'],
    ['Home', '0'],
    ['End', '100'],
  ])('S3 %s selects %s and commits once', async (key, expected) => {
    const host = await mount('<ki-slider label="Volume" step="2" value="50"></ki-slider>');
    const events: string[] = [];
    host.addEventListener('input', () => events.push('input'));
    host.addEventListener('change', () => events.push('change'));
    part(host, 'thumb').focus();

    await userEvent.keyboard(`{${key}}`);

    await expect.element(thumb('Volume')).toHaveAttribute('aria-valuenow', expected);
    expect(events).toEqual(['input', 'change']);
  });

  it('S4 names, describes and formats both range thumbs', async () => {
    await mount(
      '<ki-slider lang="en-IE" label="Price" help-text="Price per night" value="20,80" range format="currency" currency="EUR"></ki-slider>',
    );
    const euros = new Intl.NumberFormat('en-IE', { currency: 'EUR', style: 'currency' });
    const lower = thumb('Price minimum');
    const upper = thumb('Price maximum');

    await expect.element(lower).toHaveAccessibleDescription('Price per night');
    await expect.element(lower).toHaveAttribute('aria-valuenow', '20');
    await expect.element(lower).toHaveAttribute('aria-valuemin', '0');
    await expect.element(lower).toHaveAttribute('aria-valuemax', '80');
    await expect.element(lower).toHaveAttribute('aria-valuetext', euros.format(20));
    await expect.element(upper).toHaveAccessibleDescription('Price per night');
    await expect.element(upper).toHaveAttribute('aria-valuenow', '80');
    await expect.element(upper).toHaveAttribute('aria-valuemin', '20');
    await expect.element(upper).toHaveAttribute('aria-valuemax', '100');
    await expect.element(upper).toHaveAttribute('aria-valuetext', euros.format(80));
    await expectAccessible(fixture);
  });

  it('S5 submits both the scalar and the range as one entry each', async () => {
    await mount(
      '<form><ki-slider name="volume" label="Volume" value="60"></ki-slider><ki-slider name="price" label="Price" value="20,80" range></ki-slider></form>',
    );
    const form = required(fixture.querySelector('form'));
    let formData: FormData | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      formData = new FormData(form);
    });

    form.requestSubmit();

    expect(formData?.getAll('volume')).toEqual(['60']);
    expect(formData?.getAll('price')).toEqual(['20,80']);
  });

  it('S6 resets to the initial value without emitting user events', async () => {
    const host = await mount(
      '<form><ki-slider name="volume" label="Volume" value="60"></ki-slider></form>',
    );
    const form = required(fixture.querySelector('form'));
    host.value = 75;
    await expect.element(thumb('Volume')).toHaveAttribute('aria-valuenow', '75');
    const events: string[] = [];
    host.addEventListener('change', () => events.push('change'));
    host.addEventListener('input', () => events.push('input'));

    form.reset();

    await expect.element(thumb('Volume')).toHaveAttribute('aria-valuenow', '60');
    expect(new FormData(form).get('volume')).toBe('60');
    expect(events).toEqual([]);
  });

  it('S7 paints consumer rail and fill overrides', async () => {
    const host = await mount('<ki-slider label="Volume" value="60"></ki-slider>');
    host.style.setProperty('--ki-slider-track-bg', 'navy');
    host.style.setProperty('--ki-slider-fill-bg', 'gold');

    expect(getComputedStyle(part(host, 'track')).backgroundColor).toBe('rgb(0, 0, 128)');
    expect(getComputedStyle(part(host, 'fill')).backgroundColor).toBe('rgb(255, 215, 0)');
  });

  it.each(['onmars', 'material3'])(
    'S8 places the midpoint and negative fill in RTL in %s',
    async (theme) => {
      fixture.dir = 'rtl';
      fixture.dataset.kiTheme = theme;
      const host = await mount(
        '<ki-slider centered label="Exposure" min="-50" max="50" value="-20"></ki-slider>',
      );
      const rail = part(host, 'track').getBoundingClientRect();
      const center = rail.left + rail.width / 2;
      const tick = part(host, 'center-tick').getBoundingClientRect();
      const fill = part(host, 'fill').getBoundingClientRect();
      const target = part(host, 'thumb');
      const { left, width } = target.getBoundingClientRect();
      expect(Math.abs(tick.left + tick.width / 2 - center)).toBeLessThan(0.5);
      expect(Math.abs(fill.left - center)).toBeLessThan(0.5);
      expect(Math.abs(fill.right - left - width / 2)).toBeLessThan(0.5);
      expect(fill.width).toBeGreaterThan(0);

      target.focus();
      await userEvent.keyboard('{ArrowLeft}');
      await expect.element(thumb('Exposure')).toHaveAttribute('aria-valuenow', '-19');
    },
  );

  it.each([
    ['onmars', 'ltr'],
    ['onmars', 'rtl'],
    ['material3', 'ltr'],
    ['material3', 'rtl'],
  ])('S9 increases upward on a vertical %s slider in %s', async (theme, direction) => {
    fixture.dir = direction;
    fixture.dataset.kiTheme = theme;
    const host = await mount(
      '<ki-slider orientation="vertical" label="Bass" max="10" value="4"></ki-slider>',
    );
    const target = part(host, 'thumb');
    const top = target.getBoundingClientRect().top;
    await expect.element(thumb('Bass')).toHaveAttribute('aria-orientation', 'vertical');
    target.focus();

    await userEvent.keyboard('{ArrowUp}');

    await expect.element(thumb('Bass')).toHaveAttribute('aria-valuenow', '5');
    expect(target.getBoundingClientRect().top).toBeLessThan(top);
  });

  it('S12 skips a slider in a disabled fieldset and omits its entry', async () => {
    await mount(
      '<form><button tabindex="0" type="button">Before</button><fieldset><ki-slider name="volume" label="Volume"></ki-slider></fieldset><button tabindex="0" type="button">After</button></form>',
    );
    const fieldset = required(fixture.querySelector('fieldset'));
    fieldset.disabled = true;

    await expect.element(thumb('Volume')).toHaveAttribute('aria-disabled', 'true');
    required(fixture.querySelector('button')).focus();
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(new FormData(required(fixture.querySelector('form'))).has('volume')).toBe(false);
  });

  it('keeps the track, fill, and thumb edge visible in forced colors', async (context) => {
    try {
      if (!(await media.emulateForcedColors('active'))) {
        context.skip();
        return;
      }
      const host = await mount('<ki-slider label="Volume" value="60"></ki-slider>');
      const track = getComputedStyle(part(host, 'track')).backgroundColor;
      const fill = getComputedStyle(part(host, 'fill')).backgroundColor;
      const grip = getComputedStyle(part(host, 'thumb'), '::before');
      expect(track).not.toBe('rgba(0, 0, 0, 0)');
      expect(fill).not.toBe(track);
      expect(grip.borderInlineStartColor).not.toBe(grip.backgroundColor);
    } finally {
      await media.emulateForcedColors(null);
    }
  });

  it('changes position immediately with reduced motion', async () => {
    try {
      await media.emulateReducedMotion('reduce');
      const host = await mount(
        '<ki-slider label="Volume" max="10" value="3" marks="5"></ki-slider>',
      );
      const target = part(host, 'thumb');
      const left = target.getBoundingClientRect().left;
      expect(host.shadowRoot?.querySelectorAll('[part="mark"]')).toHaveLength(6);
      target.focus();

      await userEvent.keyboard('{ArrowRight}');

      await expect.element(thumb('Volume')).toHaveAttribute('aria-valuenow', '4');
      expect(target.getBoundingClientRect().left).toBeGreaterThan(left);
      expect(part(host, 'field').getAnimations({ subtree: true })).toEqual([]);
    } finally {
      await media.emulateReducedMotion(null);
    }
  });
});
