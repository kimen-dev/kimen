import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:011-ki-alert
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-alert.js';
import { expectAccessible } from './axe';
import { hasVisibleShadow } from './contracts';
import { repaintedUnderForcedDark } from './color-scheme';
import { disableComponentEffectShadows } from './flat-effects';

type KiAlertElement = HTMLElement & {
  dismissed: boolean;
  dismissible: boolean;
  dismissLabel: string;
  heading: string;
  tone: string;
};

const STYLE_ID = 'ki-alert-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-alert-browser-material3-token-style';
const tones = ['neutral', 'success', 'danger', 'info', 'warning'] as const;

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(
  message = 'We could not save your changes',
  attributes: Partial<
    Record<'dismissed' | 'dismissible' | 'dismiss-label' | 'heading' | 'tone', string | boolean>
  > = {},
  parent: ParentNode = document.body,
): Promise<KiAlertElement> {
  ensureTokens();
  const el = document.createElement('ki-alert') as KiAlertElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.textContent = message;
  parent.appendChild(el);
  await customElements.whenDefined('ki-alert');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return el;
}

function part(el: KiAlertElement, name: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  expect(node, `missing part ${name}`).toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error(`ki-alert did not render part="${name}"`);
  }
  return node;
}

/** Axe contrast scans must wait out the one-shot opacity entrance (the
 * alert surface animates in under no-preference motion). */
async function motionSettled(el: Element | ShadowRoot): Promise<void> {
  const deadline = Date.now() + 2000;
  // A shadow root lists the animations of its own tree; an element's subtree
  // stops at its shadow boundary.
  const running = (): Animation[] =>
    el instanceof ShadowRoot ? el.getAnimations() : el.getAnimations({ subtree: true });
  while (running().length > 0 && Date.now() < deadline) {
    await nextFrame();
  }
}

function liveWrapper(el: KiAlertElement): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>('.live');
  expect(node, 'missing live wrapper').toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error('ki-alert did not render its live wrapper');
  }
  return node;
}

function dismissButton(el: KiAlertElement): HTMLButtonElement | null {
  return el.shadowRoot?.querySelector<HTMLButtonElement>('[part="dismiss"]') ?? null;
}

const browserCommands = commands as unknown as {
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<boolean | undefined>;
  emulateReducedTransparency: (transparency: 'reduce' | 'no-preference' | null) => Promise<boolean>;
  accessibilityTree: () => Promise<
    { role: string; name: string; live: unknown; text: string }[] | null
  >;
};

// The real accessibility tree comes over CDP, on Chromium alone (the engine
// the PR gate runs); elsewhere the command answers null.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

const ICON =
  '<svg slot="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="currentColor"></circle></svg>';

/** An alert composed the way a page writes one: heading, icon and actions are optional. */
async function mountComposed(
  options: {
    message?: string;
    heading?: string;
    tone?: string;
    dismissible?: boolean;
    icon?: string;
    actions?: string[];
  } = {},
  parent: ParentNode = document.body,
): Promise<KiAlertElement> {
  ensureTokens();
  const el = document.createElement('ki-alert') as KiAlertElement;
  if (options.tone !== undefined) {
    el.setAttribute('tone', options.tone);
  }
  if (options.heading !== undefined) {
    el.setAttribute('heading', options.heading);
  }
  el.toggleAttribute('dismissible', options.dismissible === true);
  el.innerHTML = `${options.icon ?? ''}${options.message ?? 'Something you might like to know.'}${(
    options.actions ?? []
  )
    .map((label) => `<button slot="actions" type="button">${label}</button>`)
    .join('')}`;
  parent.appendChild(el);
  await customElements.whenDefined('ki-alert');
  await expect.poll(() => el.shadowRoot?.querySelector('[part="card"]')).not.toBeNull();
  await nextFrame();
  await nextFrame();
  await motionSettled(el.shadowRoot ?? el);
  return el;
}

/** The text a live region exposes: its own nodes plus what its slots render. */
function exposedText(node: Node): string {
  if (node instanceof HTMLSlotElement) {
    return node.assignedNodes({ flatten: true }).map(exposedText).join(' ');
  }
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
    return '';
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  return [...node.childNodes].map(exposedText).join(' ');
}

function liveText(el: KiAlertElement): string {
  return exposedText(liveWrapper(el)).replace(/\s+/gu, ' ').trim();
}

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

/** What a part paints: fill and ink, for telling tones apart. */
function paint(element: Element): string {
  const style = getComputedStyle(element);
  return `${style.backgroundColor} / ${style.color}`;
}

describe('ki-alert in a real browser', () => {
  it('S1 presents the danger message with its icon in the danger tone, unlike the neutral one', async () => {
    cleanup();
    const neutral = await mountComposed({ message: 'Service notice', tone: 'neutral', icon: ICON });
    const el = await mountComposed({
      message: 'We could not save your changes',
      tone: 'danger',
      icon: ICON,
    });
    const message = part(el, 'message');

    expect(
      message
        .querySelector('slot')
        ?.assignedNodes()
        .map((node) => node.textContent),
    ).toEqual(['We could not save your changes']);
    expect(getComputedStyle(part(el, 'icon')).backgroundColor).not.toMatch(/, 0\)$/u);
    expect(paint(part(el, 'icon'))).not.toBe(paint(part(neutral, 'icon')));
  });

  it('S1 gives each of the five tones an icon of its own', async () => {
    cleanup();
    const icons = new Set<string>();

    for (const tone of tones) {
      const el = await mountComposed({ message: tone, tone, icon: ICON });
      icons.add(paint(part(el, 'icon')));
    }

    expect(icons.size).toBe(tones.length);
  });

  it('S5 renders an unrecognized tone exactly like the neutral tone, as a polite status', async () => {
    cleanup();
    const neutral = await mountComposed({ message: 'Service notice', tone: 'neutral', icon: ICON });
    const unknown = await mountComposed({ message: 'Service notice', tone: 'banana', icon: ICON });
    const danger = await mountComposed({ message: 'Service notice', tone: 'danger', icon: ICON });

    expect(paint(part(unknown, 'card'))).toBe(paint(part(neutral, 'card')));
    expect(paint(part(unknown, 'icon'))).toBe(paint(part(neutral, 'icon')));
    expect(paint(part(unknown, 'icon'))).not.toBe(paint(part(danger, 'icon')));
    expect(liveWrapper(unknown).getAttribute('role')).toBe('status');
    expect(dismissButton(unknown)).toBeNull();
  });

  it('S2 renders the heading before the message in visual flow', async () => {
    cleanup();
    const el = await mount('Restart soon', { heading: 'Update available' });
    const heading = part(el, 'heading');
    const message = part(el, 'message');

    expect(heading.getBoundingClientRect().top).toBeLessThanOrEqual(
      message.getBoundingClientRect().top,
    );
  });

  it('S9 exposes a dynamically appended danger alert assertively without moving focus', async () => {
    cleanup();
    const button = document.createElement('button');
    button.textContent = 'Save';
    document.body.append(button);
    button.focus();

    const el = await mount('We could not save your changes', {
      heading: 'Save failed',
      tone: 'danger',
    });

    expect(liveWrapper(el).getAttribute('role')).toBe('alert');
    expect([...liveWrapper(el).children].map((node) => node.getAttribute('part'))).toEqual([
      'heading',
      'message',
    ]);
    expect(document.activeElement).toBe(button);
  });

  it('S17 exposes a dynamically appended warning alert assertively without moving focus', async () => {
    cleanup();
    const button = document.createElement('button');
    button.textContent = 'Continue';
    document.body.append(button);
    button.focus();

    const el = await mount('Your session expires in one minute', { tone: 'warning' });

    expect(liveWrapper(el).getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(button);
  });

  it('S10 exposes a dynamically appended success alert as a polite status without moving focus', async () => {
    cleanup();
    const button = document.createElement('button');
    button.textContent = 'Continue';
    document.body.append(button);
    button.focus();

    const el = await mount('Profile saved', { tone: 'success' });

    expect(liveWrapper(el).getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(button);
  });

  it('S18 exposes info and neutral alerts as polite status updates', async () => {
    cleanup();

    const info = await mount('Maintenance starts at midnight', { tone: 'info' });
    const neutral = await mount('Maintenance starts at midnight', { tone: 'neutral' });

    expect(liveWrapper(info).getAttribute('role')).toBe('status');
    expect(liveWrapper(neutral).getAttribute('role')).toBe('status');
  });

  it('S9 exposes an alert present since initial load with its role', async () => {
    cleanup();

    const el = await mount('We could not save your changes', { tone: 'danger' });

    expect(liveWrapper(el).getAttribute('role')).toBe('alert');
  });

  it('S18 exposes an empty alert as an empty live region with no phantom content', async () => {
    cleanup();

    const el = await mount('', { tone: 'neutral' });

    expect(liveWrapper(el).getAttribute('role')).toBe('status');
    expect(liveWrapper(el).textContent.trim()).toBe('');
  });

  it('S9 S10 S17 S18 have zero axe violations across five tones', async () => {
    cleanup();
    ensureTokens();
    const main = document.createElement('main');
    document.body.append(main);

    for (const tone of tones) {
      await mount(`${tone} alert`, { heading: `${tone} heading`, tone }, main);
    }

    await motionSettled(main);
    await expectAccessible(main);
  });

  it('S3 dismissing a dismissible alert hides it and dispatches one non-cancelable event', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);
    const events: CustomEvent<null>[] = [];
    el.addEventListener('ki-dismiss', (event) => {
      event.preventDefault();
      events.push(event as CustomEvent<null>);
    });

    expect(button).toBeInstanceOf(HTMLButtonElement);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    await userEvent.click(button);
    await nextFrame();

    expect(el.dismissed).toBe(true);
    expect(el.hasAttribute('dismissed')).toBe(true);
    expect(getComputedStyle(el).display).toBe('none');
    expect(el.shadowRoot?.querySelector('[part="alert"]')).toBeNull();
    expect(events).toHaveLength(1);
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
    expect(events[0]?.cancelable).toBe(false);
    expect(events[0]?.detail).toBeNull();
    expect(el.dismissed).toBe(true);
  });

  // A press shows whatever the input. Firefox never matches `:active` on a
  // button held with Space, so from the keyboard the press shows there only
  // because the component marks it itself (utils/keyboard-press).
  it('S3 the dismiss button changes appearance while Space is held on it', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    await motionSettled(el);
    const painted = (): string => {
      const style = getComputedStyle(button);
      return [style.color, style.backgroundImage, style.boxShadow, style.transform].join('|');
    };
    button.focus();
    await nextFrame();
    const focused = painted();

    // `{ >}` holds the key down; the matching `{/ }` releases it.
    await userEvent.keyboard('{ >}');
    await nextFrame();
    await nextFrame();
    const held = painted();
    await userEvent.keyboard('{/ }');

    expect(held, 'the dismiss button looks the same while held from the keyboard').not.toBe(
      focused,
    );
  });

  it('S3 programmatic dismissed changes fire no ki-dismiss event', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    let events = 0;
    el.addEventListener('ki-dismiss', () => {
      events += 1;
    });

    el.dismissed = true;
    await nextFrame();

    expect(events).toBe(0);
  });

  it('S4 non-dismissible alerts render no dismiss control', async () => {
    cleanup();
    const el = await mount('Backup completed');

    expect(dismissButton(el)).toBeNull();
  });

  it('S19 clearing dismissed displays the alert again with a populated live wrapper', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissed: true });

    expect(el.shadowRoot?.querySelector('[part="alert"]')).toBeNull();
    el.dismissed = false;
    await nextFrame();

    expect(part(el, 'alert')).toBeInstanceOf(HTMLElement);
    expect(liveWrapper(el).querySelector('[part="message"] slot')).toBeInstanceOf(HTMLSlotElement);
  });

  it('S6 reaches the dismiss control with Tab and shows visible focus', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);

    await userEvent.keyboard('{Tab}');

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(el.shadowRoot?.activeElement).toBe(button);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    const focused = getComputedStyle(button);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S6 keeps the dismiss focus halo with component effect shadows disabled (#349)', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    disableComponentEffectShadows(el);

    await userEvent.keyboard('{Tab}');

    const button = part(el, 'dismiss');
    expect(button.matches(':focus-visible')).toBe(true);
    await expect
      .poll(() => getComputedStyle(button, '::after').boxShadow)
      .toMatch(/0px 0px 0px 3px/u);
  });

  it('S7 keyboard activation with Enter and Space dismisses exactly once each', async () => {
    cleanup();
    const enterAlert = await mount('Backup completed', { dismissible: true });
    const enterButton = dismissButton(enterAlert);
    let enterEvents = 0;
    enterAlert.addEventListener('ki-dismiss', () => {
      enterEvents += 1;
    });
    enterButton?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    cleanup();
    const spaceAlert = await mount('Backup completed', { dismissible: true });
    const spaceButton = dismissButton(spaceAlert);
    let spaceEvents = 0;
    spaceAlert.addEventListener('ki-dismiss', () => {
      spaceEvents += 1;
    });
    spaceButton?.focus();
    await userEvent.keyboard(' ');
    await nextFrame();

    expect(enterEvents).toBe(1);
    expect(spaceEvents).toBe(1);
  });

  it('S8 non-dismissible alerts add no tab stop before Save', async () => {
    cleanup();
    await mount('Read only');
    const save = document.createElement('button');
    save.tabIndex = 0;
    save.textContent = 'Save';
    document.body.append(save);

    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(save);
  });

  it('S16 keyboard dismissal hands focus to the following Save button', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const save = document.createElement('button');
    save.tabIndex = 0;
    save.textContent = 'Save';
    document.body.append(save);
    const button = dismissButton(el);

    button?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(document.activeElement).toBe(save);
    expect(el.shadowRoot?.activeElement).not.toBe(button);
  });

  it('S16 skips a hidden following control and hands focus to the next visible one', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const hidden = document.createElement('button');
    hidden.textContent = 'Hidden';
    hidden.hidden = true;
    const visible = document.createElement('button');
    visible.textContent = 'Visible';
    document.body.append(hidden, visible);
    const button = dismissButton(el);

    button?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(document.activeElement).toBe(visible);
  });

  it('S16 hands focus to a following focus-delegating custom element', async () => {
    cleanup();
    if (!customElements.get('x-delegating')) {
      customElements.define(
        'x-delegating',
        class extends HTMLElement {
          connectedCallback(): void {
            if (!this.shadowRoot) {
              const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
              root.append(document.createElement('button'));
            }
          }
        },
      );
    }
    const el = await mount('Backup completed', { dismissible: true });
    const delegating = document.createElement('x-delegating');
    document.body.append(delegating);
    const button = dismissButton(el);

    button?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(document.activeElement).toBe(delegating);
  });

  // The next alert's dismiss button is the following focus stop, but ki-alert
  // does not delegate focus: focusing its host is a no-op and the handoff
  // dropped focus on the body instead.
  it('S16 keyboard dismissal hands focus to the dismiss control of the next alert', async () => {
    cleanup();
    const first = await mount('Backup completed', { dismissible: true });
    const second = await mount('Sync completed', { dismissible: true });
    const save = document.createElement('button');
    save.textContent = 'Save';
    document.body.append(save);

    await userEvent.keyboard('{Tab}');
    expect(first.shadowRoot?.activeElement).toBe(dismissButton(first));
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(first.dismissed).toBe(true);
    expect(document.activeElement).toBe(second);
    expect(second.shadowRoot?.activeElement).toBe(dismissButton(second));
  });

  it('S16 falls back to the preceding control when nothing focusable follows the alert', async () => {
    cleanup();
    const back = document.createElement('button');
    back.textContent = 'Back';
    document.body.append(back);
    const el = await mount('Backup completed', { dismissible: true });

    dismissButton(el)?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(el.dismissed).toBe(true);
    expect(document.activeElement).toBe(back);
  });

  // A scan of the body's own children would miss an alert nested in a section
  // and hand focus to the control that precedes it.
  it('S16 hands focus to the control that follows a nested alert in document order', async () => {
    cleanup();
    const main = document.createElement('main');
    const back = document.createElement('button');
    back.textContent = 'Back';
    const section = document.createElement('section');
    const save = document.createElement('button');
    save.textContent = 'Save';
    main.append(back, section, save);
    document.body.append(main);
    const el = await mount('Backup completed', { dismissible: true }, section);

    dismissButton(el)?.focus();
    await userEvent.keyboard('{Enter}');
    await nextFrame();

    expect(el.dismissed).toBe(true);
    expect(document.activeElement).toBe(save);
  });

  it('S6 keeps the dismiss target at least 24 by 24 CSS pixels', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);

    expect(button).toBeInstanceOf(HTMLButtonElement);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    // Polled, not read once: the fidelity pass gave the chip a gated
    // transform transition (press compress scale 0.96), and a one-shot read
    // taken on the tail of that transition measures 24 x (1 - epsilon) —
    // a frame, not a smaller target. The 24px floor itself is unchanged.
    await expect.poll(() => button.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    await expect.poll(() => button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  it('S11 exposes the default dismiss label as the button accessible name', async () => {
    cleanup();
    await mount('Backup completed', { dismissible: true });

    await expect.element(page.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('S12 exposes a localized dismiss label as the button accessible name', async () => {
    cleanup();
    const el = await mount('Backup completed', {
      dismissible: true,
      'dismiss-label': 'Descartar',
    });
    const button = dismissButton(el);
    const svg = button?.querySelector('svg');

    await expect.element(page.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('S11 S12 have zero axe violations on dismissible variants', async () => {
    cleanup();
    ensureTokens();
    const main = document.createElement('main');
    document.body.append(main);

    await mount('Backup completed', { dismissible: true }, main);
    await mount('Copia completada', { dismissible: true, 'dismiss-label': 'Descartar' }, main);

    await motionSettled(main);
    await expectAccessible(main);
  });

  it('S14 honors a forced dark scheme: the surface, the heading and the message repaint', async () => {
    cleanup();
    const el = await mount('We could not save your changes', {
      heading: 'Save failed',
      tone: 'danger',
    });

    expect(await repaintedUnderForcedDark(el)).toEqual(
      expect.arrayContaining(['alert', 'heading', 'message']),
    );
  });

  it('S13 material3 restyles all five alert tones through tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = new Map<string, string>();
    for (const tone of tones) {
      const el = await mount(tone, { tone });
      onmars.set(tone, getComputedStyle(part(el, 'card')).backgroundColor);
    }

    cleanup();
    ensureTokens();
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const material3 = new Map<string, string>();
    for (const tone of tones) {
      const el = await mount(tone, { tone });
      material3.set(tone, getComputedStyle(part(el, 'card')).backgroundColor);
    }

    for (const tone of tones) {
      expect(material3.get(tone), `${tone} should restyle under material3`).not.toBe(
        onmars.get(tone),
      );
    }
  });

  it('S1 draws the borderless MarsUI card with the 12px stack gap and 4px text-stack gap', async () => {
    cleanup();
    const el = await mount('Restart soon', { heading: 'Update available', tone: 'info' });
    const computed = getComputedStyle(part(el, 'card'));

    // MarsUI never strokes alert surfaces.
    expect(computed.borderTopWidth).toBe('0px');
    expect(computed.rowGap).toBe('12px');

    // Text_wrap: heading→description stack gap is Space/xs (4px), not the
    // outer card gap.
    const live = liveWrapper(el);
    expect(getComputedStyle(live).rowGap).toBe('4px');
  });

  it('S1 renders the message at the MarsUI 13/20 para line height', async () => {
    cleanup();
    const el = await mount('Something you might like to know.');
    const message = part(el, 'message');

    expect(getComputedStyle(message).fontSize).toBe('13px');
    expect(getComputedStyle(message).lineHeight).toBe('20px');
  });

  it('S6 renders a flat circular dismiss control', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);

    expect(button).toBeInstanceOf(HTMLButtonElement);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    await motionSettled(el);
    const computed = getComputedStyle(button);

    // A circle with a hairline border on a fill that distinguishes it from
    // the alert surface. Square to layout precision: at a fractional position
    // on the page the box the engine reports is a float away from 24 x 24.
    const box = button.getBoundingClientRect();
    expect(box.width).toBeCloseTo(box.height, 3);
    expect(Number.parseFloat(computed.borderTopLeftRadius)).toBeGreaterThanOrEqual(box.width / 2);
    expect(Number.parseFloat(computed.borderTopWidth)).toBeGreaterThan(0);
    expect(computed.backgroundColor).not.toBe(getComputedStyle(part(el, 'alert')).backgroundColor);

    expect(hasVisibleShadow(computed.boxShadow)).toBe(false);

    expect(computed.backdropFilter).toBe('blur(0px)');
  });

  it('S15 keeps the message leading and dismiss control trailing under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount('Backup completed', { dismissible: true });
    const message = part(el, 'message');
    const dismiss = dismissButton(el);

    expect(dismiss).toBeInstanceOf(HTMLButtonElement);
    if (!dismiss) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    expect(message.getBoundingClientRect().left).toBeGreaterThan(
      dismiss.getBoundingClientRect().left,
    );
  });
});

// Amendment A1: the Alert master anatomy (12074:6202, all five variants).
describe('ki-alert Alert master anatomy, icon and actions', () => {
  it('S20 holds its content in an elevated card inside a padded shell', async () => {
    cleanup();
    const el = await mountComposed({ heading: 'Backup completed', tone: 'info' });
    const shell = getComputedStyle(part(el, 'alert'));
    const card = getComputedStyle(part(el, 'card'));

    expect(shell.paddingBlockStart).toBe('12px');
    expect(shell.paddingInlineStart).toBe('12px');
    expect(shell.borderTopLeftRadius).toBe('28px');
    expect(card.paddingBlockStart).toBe('12px');
    expect(card.paddingInlineStart).toBe('12px');
    expect(card.borderTopLeftRadius).toBe('12px');
    // e5, read off its deepest layer.
    expect(card.boxShadow).toContain('0px 56px 56px -28px');
  });

  it('S21 a slotted icon heads the card in a round 32px frame, above the heading', async () => {
    cleanup();
    const el = await mountComposed({ heading: 'Backup completed', icon: ICON });
    const card = box(part(el, 'card'));
    const icon = part(el, 'icon');
    const heading = box(part(el, 'heading'));

    expect(box(icon).width).toBeCloseTo(32, 0);
    expect(box(icon).height).toBeCloseTo(32, 0);
    expect(getComputedStyle(icon).borderTopLeftRadius).toBe('1000px');
    expect(box(icon).top - card.top).toBeCloseTo(12, 0);
    expect(heading.top - box(icon).bottom).toBeCloseTo(12, 0);
  });

  it('S22 an alert without an icon reserves no space for one', async () => {
    cleanup();
    const el = await mountComposed({ heading: 'Backup completed' });
    const card = box(part(el, 'card'));

    expect(box(part(el, 'heading')).top - card.top).toBeCloseTo(12, 0);
    expect(box(part(el, 'icon')).height).toBe(0);
  });

  it('S23 slotted actions sit in one row at the bottom of the card, 12px after the message', async () => {
    cleanup();
    const el = await mountComposed({
      message: 'Your session expires in one minute',
      actions: ['Sign out', 'Stay signed in'],
    });
    const [signOut, stay] = [...el.querySelectorAll('button[slot="actions"]')].map(box);
    const message = box(part(el, 'message'));
    const card = box(part(el, 'card'));
    if (!signOut || !stay) {
      throw new Error('missing actions');
    }

    expect(signOut.top).toBeCloseTo(stay.top, 0);
    expect(signOut.right).toBeLessThan(stay.left);
    expect(box(part(el, 'actions')).top - message.bottom).toBeCloseTo(12, 0);
    expect(card.bottom - box(part(el, 'actions')).bottom).toBeCloseTo(12, 0);
  });

  it('S24 an alert without actions ends its card 12px below the message', async () => {
    cleanup();
    const el = await mountComposed({ message: 'Profile saved' });

    expect(box(part(el, 'card')).bottom - box(part(el, 'message')).bottom).toBeCloseTo(12, 0);
    expect(box(part(el, 'actions')).height).toBe(0);
  });

  it('S25 activating an action leaves the alert in place and fires no ki-dismiss', async () => {
    cleanup();
    const el = await mountComposed({ dismissible: true, actions: ['Retry'] });
    let dismissals = 0;
    el.addEventListener('ki-dismiss', () => {
      dismissals += 1;
    });

    await userEvent.click(page.getByRole('button', { name: 'Retry' }));

    expect(el.dismissed).toBe(false);
    expect(box(part(el, 'card')).height).toBeGreaterThan(0);
    expect(dismissals).toBe(0);
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)(
    'S26 a %s alert keeps the neutral anatomy and colours everything but its icon',
    async (tone) => {
      cleanup();
      const compose = { heading: 'Heads up', icon: ICON, actions: ['Review'], dismissible: true };
      const neutral = await mountComposed({ ...compose, tone: 'neutral' });
      const toned = await mountComposed({ ...compose, tone });

      for (const name of ['alert', 'card', 'heading', 'message', 'dismiss']) {
        expect(paint(part(toned, name)), name).toBe(paint(part(neutral, name)));
      }
      for (const name of ['alert', 'card', 'icon', 'actions']) {
        const [a, b] = [box(part(toned, name)), box(part(neutral, name))];
        expect([a.width, a.height], name).toEqual([b.width, b.height]);
      }
      expect(paint(part(toned, 'icon'))).not.toBe(paint(part(neutral, 'icon')));
    },
  );

  it('S27 Tab reaches the dismiss control and then the actions, in reading order', async () => {
    cleanup();
    const el = await mountComposed({
      dismissible: true,
      actions: ['Sign out', 'Stay signed in'],
    });
    (document.activeElement as HTMLElement | null)?.blur();

    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(dismissButton(el));
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.textContent).toBe('Sign out');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.textContent).toBe('Stay signed in');
  });

  it('S28 an action that makes the application dismiss the alert hands focus to the next element', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    const el = await mountComposed({ actions: ['Undo'] }, main);
    const save = document.createElement('button');
    save.textContent = 'Save';
    main.append(save);
    let dismissals = 0;
    el.addEventListener('ki-dismiss', () => {
      dismissals += 1;
    });
    const undo = el.querySelector<HTMLButtonElement>('button[slot="actions"]');
    undo?.addEventListener('click', () => {
      el.dismissed = true;
    });
    undo?.focus();

    await userEvent.keyboard('{Enter}');

    await expect.poll(() => getComputedStyle(el).display).toBe('none');
    expect(document.activeElement).toBe(save);
    expect(dismissals).toBe(0);
  });

  it('S29 the icon is never part of the announcement', async () => {
    cleanup();
    const el = await mountComposed({
      tone: 'danger',
      heading: 'Payment failed',
      message: 'Your card was declined',
      icon: '<svg slot="icon" role="img" aria-label="Error" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"></circle></svg>',
    });

    expect(liveText(el)).toBe('Payment failed Your card was declined');
    expect(part(el, 'icon').getAttribute('aria-hidden')).toBe('true');

    await nextFrame();
    const nodes = await browserCommands.accessibilityTree();
    if (nodes === null) {
      expect(IS_CHROMIUM, 'Chromium stopped answering its accessibility tree').toBe(false);
      return;
    }
    expect(nodes.filter((node) => node.name === 'Error')).toEqual([]);
    const live = nodes.find((node) => node.live !== null && node.text.includes('Payment failed'));
    expect(live?.text).toContain('Your card was declined');
    expect(live?.text).not.toContain('Error');
  });

  it('S30 actions are reachable buttons outside the announcement', async () => {
    cleanup();
    const el = await mountComposed({
      tone: 'warning',
      message: 'Your session expires in one minute',
      actions: ['Stay signed in'],
    });

    expect(liveWrapper(el).contains(part(el, 'actions'))).toBe(false);
    expect(liveText(el)).toBe('Your session expires in one minute');
    await expect.element(page.getByRole('button', { name: 'Stay signed in' })).toBeVisible();
  });

  it('S31 a theme flattens the shell and the card into one box through tokens alone', async () => {
    cleanup();
    const flat: Record<string, string> = {
      '--ki-alert-shell-padding': '0px',
      '--ki-alert-shell-bg': 'transparent',
      '--ki-alert-shell-backdrop-blur': '0px',
      '--ki-alert-card-shadow': 'none',
    };
    for (const [name, value] of Object.entries(flat)) {
      document.documentElement.style.setProperty(name, value);
    }
    try {
      const el = await mountComposed({ heading: 'Heads up', icon: ICON });
      const shell = box(part(el, 'alert'));
      const card = box(part(el, 'card'));

      expect([card.left, card.top, card.width, card.height]).toEqual([
        shell.left,
        shell.top,
        shell.width,
        shell.height,
      ]);
      expect(getComputedStyle(part(el, 'card')).boxShadow).toBe('none');
      expect(getComputedStyle(part(el, 'alert')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    } finally {
      for (const name of Object.keys(flat)) {
        document.documentElement.style.removeProperty(name);
      }
    }
  });

  it('S32 icon, dismiss control and actions follow a right-to-left document', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mountComposed({
      dismissible: true,
      icon: ICON,
      actions: ['Sign out', 'Stay signed in'],
    });
    const card = box(part(el, 'card'));
    const dismiss = dismissButton(el);
    const [signOut, stay] = [...el.querySelectorAll('button[slot="actions"]')].map(box);
    if (!dismiss || !signOut || !stay) {
      throw new Error('missing controls');
    }

    expect(card.right - box(part(el, 'icon')).right).toBeCloseTo(12, 0);
    expect(box(dismiss).left - card.left).toBeCloseTo(12, 0);
    expect(box(dismiss).top - card.top).toBeCloseTo(12, 0);
    expect(signOut.left).toBeGreaterThan(stay.right);
  });

  it('S33 under forced colors the alert keeps its edge and a visible icon', async (test) => {
    cleanup();
    if ((await browserCommands.emulateForcedColors('active')) === false) {
      test.skip('this engine cannot emulate forced colors');
    }
    try {
      const el = await mountComposed({ tone: 'info', icon: ICON, actions: ['Review'] });
      const canvasText = (() => {
        const probe = document.createElement('span');
        probe.style.color = 'CanvasText';
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      })();
      const shell = getComputedStyle(part(el, 'alert'));

      expect(shell.borderTopStyle).toBe('solid');
      expect(shell.borderTopColor).toBe(canvasText);
      expect(getComputedStyle(part(el, 'icon')).color).toBe(canvasText);
    } finally {
      await browserCommands.emulateForcedColors(null);
    }
  });

  it('S34 reduced transparency makes the shell opaque, drops its blur and keeps the card raised', async (test) => {
    cleanup();
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    if (!(await browserCommands.emulateReducedTransparency('reduce'))) {
      test.skip('this engine cannot emulate prefers-reduced-transparency');
    }
    try {
      const el = await mountComposed({ tone: 'info', icon: ICON });
      const shell = getComputedStyle(part(el, 'alert'));
      const card = getComputedStyle(part(el, 'card'));

      expect(['none', 'blur(0px)']).toContain(shell.backdropFilter);
      expect(shell.backgroundColor).toMatch(/^rgb\(/u);
      expect(card.backgroundColor).toMatch(/^rgb\(/u);
      expect(card.boxShadow).not.toBe('none');
    } finally {
      await browserCommands.emulateReducedTransparency(null);
    }
  });

  it('S35 without an icon the heading leaves room for the dismiss control', async () => {
    cleanup();
    const el = await mountComposed({
      dismissible: true,
      heading: 'Your changes could not be saved because the server is not reachable right now',
    });
    const heading = box(part(el, 'heading'));
    const dismiss = dismissButton(el);
    if (!dismiss) {
      throw new Error('missing dismiss control');
    }

    // The heading wrapped (more than one 24px line) ...
    expect(heading.height).toBeGreaterThan(30);
    // ... and stops short of the dismiss control.
    expect(heading.right).toBeLessThanOrEqual(box(dismiss).left);
  });
});
