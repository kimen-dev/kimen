import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:011-ki-alert
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-alert.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';

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
async function motionSettled(el: Element): Promise<void> {
  const deadline = Date.now() + 2000;
  while (el.getAnimations({ subtree: true }).length > 0 && Date.now() < deadline) {
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

describe('ki-alert in a real browser', () => {
  it('S1 presents the danger message on a surface of its own, unlike the neutral one', async () => {
    cleanup();
    const neutral = await mount('Service notice', { tone: 'neutral' });
    const el = await mount('We could not save your changes', { tone: 'danger' });
    const alert = part(el, 'alert');
    const message = part(el, 'message');
    await nextFrame();

    expect(
      message
        .querySelector('slot')
        ?.assignedNodes()
        .map((node) => node.textContent),
    ).toEqual(['We could not save your changes']);
    expect(getComputedStyle(alert).backgroundColor).not.toMatch(/, 0\)$/u);
    expect(getComputedStyle(alert).backgroundColor).not.toBe(
      getComputedStyle(part(neutral, 'alert')).backgroundColor,
    );
  });

  it('S1 resolves five distinct tone background values', async () => {
    cleanup();
    const backgrounds = new Set<string>();

    for (const tone of tones) {
      const el = await mount(tone, { tone });
      backgrounds.add(getComputedStyle(part(el, 'alert')).backgroundColor);
    }

    expect(backgrounds.size).toBe(tones.length);
  });

  it('S5 renders an unrecognized tone exactly like the neutral tone, as a polite status', async () => {
    cleanup();
    const neutral = await mount('Service notice', { tone: 'neutral' });
    const unknown = await mount('Service notice', { tone: 'banana' });
    const danger = await mount('Service notice', { tone: 'danger' });
    const neutralStyle = getComputedStyle(part(neutral, 'alert'));
    const unknownStyle = getComputedStyle(part(unknown, 'alert'));

    expect(unknownStyle.backgroundColor).toBe(neutralStyle.backgroundColor);
    expect(unknownStyle.color).toBe(neutralStyle.color);
    expect(unknownStyle.backgroundColor).not.toBe(
      getComputedStyle(part(danger, 'alert')).backgroundColor,
    );
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
      onmars.set(tone, getComputedStyle(part(el, 'alert')).backgroundColor);
    }

    cleanup();
    ensureTokens();
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const material3 = new Map<string, string>();
    for (const tone of tones) {
      const el = await mount(tone, { tone });
      material3.set(tone, getComputedStyle(part(el, 'alert')).backgroundColor);
    }

    for (const tone of tones) {
      expect(material3.get(tone), `${tone} should restyle under material3`).not.toBe(
        onmars.get(tone),
      );
    }
  });

  it('S1 draws the borderless MarsUI surface with the 12px card gap and 4px text-stack gap', async () => {
    cleanup();
    const el = await mount('Restart soon', { heading: 'Update available', tone: 'info' });
    const alert = part(el, 'alert');
    const computed = getComputedStyle(alert);

    // MarsUI never strokes alert surfaces: tone lives in fill and text.
    expect(computed.borderTopWidth).toBe('0px');
    expect(computed.columnGap).toBe('12px');

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

  it('S6 raises the dismiss control as the MarsUI circular secondary chip', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);

    expect(button).toBeInstanceOf(HTMLButtonElement);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    await motionSettled(el);
    const computed = getComputedStyle(button);

    // A circle with a hairline bevel, on a fill of its own that lifts it off
    // the alert surface. Square to layout precision: at a fractional position
    // on the page the box the engine reports is a float away from 24 x 24.
    const box = button.getBoundingClientRect();
    expect(box.width).toBeCloseTo(box.height, 3);
    expect(Number.parseFloat(computed.borderTopLeftRadius)).toBeGreaterThanOrEqual(box.width / 2);
    expect(Number.parseFloat(computed.borderTopWidth)).toBeGreaterThan(0);
    expect(computed.backgroundColor).not.toBe(getComputedStyle(part(el, 'alert')).backgroundColor);

    // Component_effect/secondary_default: drop shadow + inner highlight.
    expect(computed.boxShadow).not.toBe('none');
    expect(computed.boxShadow).toContain('inset');

    // The glass backdrop blur rides the effect token.
    expect(computed.backdropFilter).toContain('blur(');
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
