import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:011-ki-alert
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-alert.js';

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

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
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
  it('S1 presents the danger message with the danger tone appearance', async () => {
    cleanup();
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
    expect(getComputedStyle(alert).backgroundColor).toBe(readTokenColor('--ki-alert-danger-bg'));
    expect(getComputedStyle(alert).color).toBe(readTokenColor('--ki-alert-danger-fg'));
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

    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
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
    save.textContent = 'Save';
    document.body.append(save);

    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(save);
  });

  it('S16 keyboard dismissal hands focus to the following Save button', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const save = document.createElement('button');
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

  it('S6 keeps the dismiss target at least 24 by 24 CSS pixels', async () => {
    cleanup();
    const el = await mount('Backup completed', { dismissible: true });
    const button = dismissButton(el);

    expect(button).toBeInstanceOf(HTMLButtonElement);
    if (!button) {
      throw new Error('ki-alert did not render a dismiss button');
    }
    const rect = button.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);
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

    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
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
