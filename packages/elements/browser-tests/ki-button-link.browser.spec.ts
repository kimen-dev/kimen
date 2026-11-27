// @spec:002-ki-button
// @spec:046-button-loading
// A ki-button with an href renders its control as a native link carrying the
// button part, so every variant, size and token paints it like the button
// (integrator feedback 0.1.3, item 2), and two tokens align its content
// (item 3). Real-browser tests against the BUILT output (Art. III).
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-button.js';
import { expectAccessible, parkPointer } from './axe';

type KiButtonElement = HTMLElement & {
  href?: string | undefined;
  loading: boolean;
  selected: boolean;
};

const variants = ['primary', 'secondary', 'quaternary', 'ghost', 'outline'] as const;

const styles = [tokensCss, material3Css].map((css) => {
  const style = document.createElement('style');
  style.textContent = css;
  return style;
});

beforeAll(() => {
  defineCustomElement();
  document.head.append(...styles);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  // A followed fragment link leaves its hash behind; the next test starts clean.
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  await parkPointer();
});

afterAll(() => {
  for (const style of styles) style.remove();
});

async function mount(
  attributes: Record<string, string | boolean> = {},
  label: string | Node = 'Get started',
  parent: ParentNode = document.body,
): Promise<KiButtonElement> {
  const el = document.createElement('ki-button') as KiButtonElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') el.toggleAttribute(name, value);
    else el.setAttribute(name, value);
  }
  el.append(label);
  parent.append(el);
  await customElements.whenDefined('ki-button');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="button"]')).not.toBeNull();
  return el;
}

function control(el: KiButtonElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="button"]');
  if (!part) throw new Error('ki-button rendered no button part');
  return part;
}

async function frames(count = 2): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** A native button placed before the element, to reach it with Tab. */
function tabFrom(el: Element): HTMLButtonElement {
  const before = document.createElement('button');
  before.type = 'button';
  before.textContent = 'Before';
  el.before(before);
  before.focus();
  return before;
}

/**
 * A box size to a hundredth of a pixel. Firefox lays out an <a> and a
 * <button> of the same content to sizes a few hundred-thousandths of a pixel
 * apart (111.69999 against 111.70001), far below anything a person sees.
 */
function visibleSize(size: number): number {
  return Math.round(size * 100) / 100;
}

/** Everything the person sees of the control, box included. */
function appearanceOf(part: HTMLElement): Record<string, string | number> {
  const style = getComputedStyle(part);
  const box = part.getBoundingClientRect();
  return {
    width: visibleSize(box.width),
    height: visibleSize(box.height),
    ...Object.fromEntries(
      [
        'alignItems',
        'backgroundColor',
        'backgroundImage',
        'borderBlockEndColor',
        'borderBlockStartColor',
        'borderInlineStartColor',
        'borderEndEndRadius',
        'borderStartStartRadius',
        'borderTopWidth',
        'boxShadow',
        'boxSizing',
        'color',
        'cursor',
        'display',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'justifyContent',
        'lineHeight',
        'paddingBlockStart',
        'paddingInlineStart',
        'textAlign',
        'textDecorationLine',
      ].map((property) => [property, style.getPropertyValue(toKebab(property))]),
    ),
  };
}

function toKebab(property: string): string {
  return property.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

describe('ki-button with href', () => {
  it('S20 renders a link to the destination carrying the button part', async () => {
    const el = await mount({ href: '/start', variant: 'primary' });
    const link = control(el);

    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link.getAttribute('href')).toBe('/start');
    expect(el.shadowRoot?.querySelector('button')).toBeNull();
    expect(link.querySelector('[part="label"]')).not.toBeNull();
    expect(link.hasAttribute('aria-pressed')).toBe(false);
  });

  it('S20 keeps the native button for a blank href', async () => {
    const el = await mount({ href: '   ' });

    expect(control(el)).toBeInstanceOf(HTMLButtonElement);
  });

  it('S20 passes target, rel and download to the link and protects a new tab', async () => {
    const plain = control(await mount({ href: '/start' }));
    const blank = control(await mount({ href: '/start', target: '_blank' }));
    const chosen = control(await mount({ href: '/start', target: '_blank', rel: 'external' }));
    const named = control(await mount({ href: '/report.pdf', download: 'report.pdf' }));
    const unnamed = control(await mount({ href: '/report.pdf', download: true }));

    expect(plain.hasAttribute('rel')).toBe(false);
    expect(plain.hasAttribute('target')).toBe(false);
    expect(blank.getAttribute('target')).toBe('_blank');
    expect(blank.getAttribute('rel')).toBe('noreferrer noopener');
    expect(chosen.getAttribute('rel')).toBe('external');
    expect(named.getAttribute('download')).toBe('report.pdf');
    expect(unnamed.getAttribute('download')).toBe('');
  });

  it('S20 switches between a button and a link when the destination changes', async () => {
    const el = await mount();
    expect(control(el)).toBeInstanceOf(HTMLButtonElement);

    el.href = '/start';
    await expect.poll(() => control(el)).toBeInstanceOf(HTMLAnchorElement);

    el.removeAttribute('href');
    el.href = undefined;
    await expect.poll(() => control(el)).toBeInstanceOf(HTMLButtonElement);
  });

  it('S20 ignores toggle: the destination wins and nothing is selected', async () => {
    const el = await mount({ href: '#ki-button-link-toggle', toggle: true });
    const link = control(el);
    let changes = 0;
    el.addEventListener('ki-change', () => {
      changes += 1;
    });

    await userEvent.click(link);

    expect(link.hasAttribute('aria-pressed')).toBe(false);
    expect(changes).toBe(0);
    expect(el.selected).toBe(false);
    expect(location.hash).toBe('#ki-button-link-toggle');
  });

  it('S21 a disabled button link has no destination and observes no activation', async () => {
    const el = await mount({ href: '#ki-button-link-disabled', disabled: true });
    const link = control(el);
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    await userEvent.click(link, { force: true }).catch(() => undefined);
    await frames();

    expect(link.hasAttribute('href')).toBe(false);
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(activations).toBe(0);
    expect(location.hash).toBe('');
  });

  it('S6 a middle click on a loading button link is canceled and reaches no listener', async () => {
    const el = await mount({ href: '#ki-button-link-loading', loading: true });
    let observed = 0;
    el.addEventListener('auxclick', () => {
      observed += 1;
    });
    const middleClick = () =>
      new MouseEvent('auxclick', { bubbles: true, button: 1, cancelable: true, composed: true });

    // A middle click opens a link in a new tab through auxclick, not click.
    expect(control(el).dispatchEvent(middleClick())).toBe(false);
    expect(observed).toBe(0);

    el.loading = false;
    await expect.poll(() => control(el).getAttribute('aria-disabled')).toBeNull();
    expect(control(el).dispatchEvent(middleClick())).toBe(true);
    expect(observed).toBe(1);
  });

  it('S21 removes a disabled button link from the Tab order, like a disabled button', async () => {
    const el = await mount({ href: '#ki-button-link-disabled', disabled: true });
    const after = document.createElement('button');
    after.type = 'button';
    after.textContent = 'After';
    el.after(after);
    tabFrom(el);

    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
    el.focus();
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S22 reaches the link with Tab, shows focus, and Enter follows it', async () => {
    const el = await mount({ href: '#ki-button-link-start', variant: 'primary' });
    const link = control(el);
    tabFrom(el);

    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(link);
    const focused = getComputedStyle(link);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');

    await userEvent.keyboard('{Enter}');

    await expect.poll(() => location.hash).toBe('#ki-button-link-start');
  });

  it('S22 Space does not follow a focused button link', async () => {
    const el = await mount({ href: '#ki-button-link-space' });
    const link = control(el);
    link.focus();

    await userEvent.keyboard(' ');
    await frames();

    expect(location.hash).toBe('');
    expect(link.hasAttribute('data-ki-pressed')).toBe(false);
  });

  // Inside a landmark, as on a page: axe's region rule wants page content in one.
  function landmark(): HTMLElement {
    const main = document.createElement('main');
    document.body.append(main);
    return main;
  }

  it('S23 exposes a link named by the label, and no button', async () => {
    const main = landmark();
    await mount({ href: '/start', variant: 'primary' }, 'Get started', main);

    await expect.element(page.getByRole('link', { name: 'Get started' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Get started' })).not.toBeInTheDocument();
    await expectAccessible(main);
  });

  it('S23 exposes a disabled button link as an unavailable link', async () => {
    const main = landmark();
    await mount({ href: '/start', disabled: true }, 'Get started', main);

    await expect
      .element(page.getByRole('link', { name: 'Get started', disabled: true }))
      .toBeInTheDocument();
    await expectAccessible(main);
  });

  it('S14 forwards the host aria-description onto the link', async () => {
    const el = await mount();
    el.setAttribute('aria-description', 'Opens the guide');
    el.href = '/guide';

    await expect.poll(() => control(el)).toBeInstanceOf(HTMLAnchorElement);
    await expect.poll(() => control(el).getAttribute('aria-description')).toBe('Opens the guide');
  });

  it('S24 a submit button link never submits its form, by pointer or keyboard', async () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.value = 'Mars';
    form.append(input);
    document.body.append(form);
    const el = await mount(
      { href: '#ki-button-link-form', type: 'submit', name: 'intent', value: 'start' },
      'Get started',
      form,
    );
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(control(el));
    control(el).focus();
    await userEvent.keyboard('{Enter}');
    await frames();

    expect(submissions).toBe(0);
  });

  it('S24 a reset button link never resets its form', async () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.defaultValue = 'Mars';
    input.value = 'Venus';
    form.append(input);
    document.body.append(form);
    const el = await mount({ href: '#ki-button-link-reset', type: 'reset' }, 'Reset', form);

    await userEvent.click(control(el));
    await frames();

    expect(input.value).toBe('Venus');
  });

  it('S25 every variant paints its link exactly like its button', async () => {
    for (const variant of variants) {
      const button = control(await mount({ variant }));
      const link = control(await mount({ variant, href: '/start' }));
      await parkPointer();
      await frames();

      expect(appearanceOf(link), variant).toEqual(appearanceOf(button));
      expect(getComputedStyle(link).textDecorationLine, variant).toBe('none');
    }
  });

  it('S25 reassigned button tokens restyle the link as they restyle the button', async () => {
    const region = document.createElement('div');
    region.style.setProperty('--ki-button-primary-neutral-rest-bg', 'rgb(10, 120, 60)');
    region.style.setProperty('--ki-button-primary-neutral-rest-fg', 'rgb(250, 250, 240)');
    region.style.setProperty('--ki-button-md-radius', '3px');
    region.style.setProperty('--ki-button-md-padding-inline', '20px');
    document.body.append(region);
    const button = control(await mount({ variant: 'primary' }, 'Get started', region));
    const link = control(
      await mount({ variant: 'primary', href: '/start' }, 'Get started', region),
    );
    await parkPointer();
    await frames();

    const style = getComputedStyle(link);
    expect(style.backgroundColor).toBe('rgb(10, 120, 60)');
    expect(style.color).toBe('rgb(250, 250, 240)');
    expect(style.borderStartStartRadius).toBe('3px');
    expect(appearanceOf(link)).toEqual(appearanceOf(button));
  });

  it('S25 a disabled button link takes the disabled appearance of its variant', async () => {
    for (const variant of variants) {
      const button = control(await mount({ variant, disabled: true }));
      const link = control(await mount({ variant, href: '/start', disabled: true }));
      await parkPointer();
      await frames();

      expect(appearanceOf(link), variant).toEqual(appearanceOf(button));
    }
  });

  it('S6 a click on a loading button link reaches no listener and does not navigate', async () => {
    const el = await mount({ href: '#ki-button-link-loading', variant: 'primary' });
    el.loading = true;
    await expect.poll(() => control(el).getAttribute('aria-disabled')).toBe('true');
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    // `force` skips actionability: Playwright never clicks an aria-disabled control.
    await userEvent.click(control(el), { force: true });
    await frames();

    expect(activations).toBe(0);
    expect(location.hash).toBe('');
    expect(control(el).hasAttribute('href')).toBe(true);
    const label = control(el).querySelector<HTMLElement>('[part="label"]');
    expect(label && getComputedStyle(label).opacity).toBe('0');
  });
});

describe('ki-button content alignment tokens', () => {
  function twoLineLabel(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const text of ['Starter plan', 'One agent, one repository and its gates']) {
      const line = document.createElement('span');
      line.style.display = 'block';
      line.textContent = text;
      fragment.append(line);
    }
    return fragment;
  }

  function lineStarts(el: KiButtonElement): number[] {
    return [...el.querySelectorAll('span')].map((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      return range.getBoundingClientRect().left;
    });
  }

  it.each(['onmars', 'material3'] as const)(
    'S26 centres the content by default in %s',
    async (theme) => {
      if (theme === 'material3') document.documentElement.setAttribute('data-ki-theme', theme);
      const style = getComputedStyle(control(await mount()));

      expect(style.justifyContent).toBe('center');
      expect(style.textAlign).toBe('center');
    },
  );

  it('S26 reassigning the alignment tokens alone left-aligns a wide two-line button', async () => {
    const wide = document.createElement('style');
    wide.textContent = 'ki-button.wide { --ki-button-inline-size: 30rem; }';
    document.head.append(wide);
    try {
      const el = await mount({ variant: 'outline', toggle: true }, twoLineLabel());
      el.classList.add('wide');
      await frames();
      const part = control(el);
      const [longer = 0, shorter = 0] = lineStarts(el);
      // The default centres each line, so the shorter one starts further in.
      expect(Math.abs(longer - shorter)).toBeGreaterThan(1);

      el.style.setProperty('--ki-button-justify-content', 'start');
      el.style.setProperty('--ki-button-text-align', 'start');
      await frames();

      const [first, second] = lineStarts(el);
      const label = part.querySelector<HTMLElement>('[part="label"]');
      if (!label) throw new Error('ki-button rendered no label part');
      const partStyle = getComputedStyle(part);
      const expected =
        part.getBoundingClientRect().left +
        Number.parseFloat(partStyle.borderInlineStartWidth) +
        Number.parseFloat(partStyle.paddingInlineStart) +
        Number.parseFloat(getComputedStyle(label).paddingInlineStart);
      expect(first).toBeCloseTo(expected, 0);
      expect(second).toBeCloseTo(expected, 0);
    } finally {
      wide.remove();
    }
  });
});
