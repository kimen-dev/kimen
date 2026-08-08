import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:021-ki-status
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-status.js';
import { expectAccessible } from './axe';

type KiStatusElement = HTMLElement & { tone: string; ring: boolean; label?: string };

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const STYLE_ID = 'ki-status-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-status-browser-material3-token-style';

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
  document.head.appendChild(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.appendChild(style);
}

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

function cleanup(): void {
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  landmark().replaceChildren();
}

/** Stencil renders async: wait until the dot part exists (no text content). */
async function mount(
  container: HTMLElement,
  attributes: Partial<Record<'tone' | 'ring' | 'label', string>> = {},
): Promise<KiStatusElement> {
  ensureTokens();
  const el = document.createElement('ki-status') as KiStatusElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-status');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="dot"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function dotOf(el: KiStatusElement): HTMLElement {
  const dot = el.shadowRoot?.querySelector<HTMLElement>('[part="dot"]');
  expect(dot).toBeTruthy();
  if (!dot) {
    throw new Error('ki-status did not render its dot');
  }
  return dot;
}

/** Rect-based geometry must wait out the one-shot mount pop (the dot
 * transitions transform/opacity from @starting-style under no-preference
 * motion). */
async function motionSettled(el: Element): Promise<void> {
  const deadline = Date.now() + 2000;
  // Walks shadow roots explicitly: in this Chromium `getAnimations({subtree})`
  // does not cross the shadow boundary, so the dot's @starting-style
  // transition was invisible to the old wait and geometry reads landed mid
  // pop-in (a half-scaled dot). A calm streak of two clean checks two frames
  // apart covers transitions that start on a late render pass.
  const animations = (): Animation[] => {
    const found = new Set<Animation>();
    const collect = (element: Element): void => {
      for (const animation of element.getAnimations({ subtree: true })) {
        found.add(animation);
      }
    };
    collect(el);
    const walk = (node: ParentNode): void => {
      for (const element of node.querySelectorAll('*')) {
        const shadow = element.shadowRoot;
        if (shadow !== null) {
          for (const child of shadow.children) {
            collect(child);
          }
          walk(shadow);
        }
      }
    };
    const shadow = el.shadowRoot;
    if (shadow !== null) {
      for (const child of shadow.children) {
        collect(child);
      }
      walk(shadow);
    }
    walk(el);
    return [...found];
  };
  let calm = false;
  for (;;) {
    const running = animations().filter(
      (animation) =>
        animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity,
    );
    if (Date.now() >= deadline) {
      return;
    }
    if (running.length === 0) {
      if (calm) {
        return;
      }
      calm = true;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      continue;
    }
    calm = false;
    // Bounded wait: `finished` can stall forever when an animation sticks in
    // `running` (observed on loaded CI runners with the dialog's backdrop /
    // focus-shadow transitions — issue #105), and an unbounded await here
    // means the deadline above is never re-checked. Racing against the
    // remaining budget keeps the settle loop, and the test, bounded.
    await Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - Date.now()))),
    ]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-status', () => {
  it('S1 fills the dot from the tone token values at the theme token size', async () => {
    cleanup();
    const online = await mount(landmark(), { label: 'Online', tone: 'success' });
    const onlineDot = dotOf(online);
    await motionSettled(online);
    expect(getComputedStyle(onlineDot).backgroundColor).toBe(
      readTokenColor('--ki-status-success-color'),
    );
    const rect = onlineDot.getBoundingClientRect();
    expect(rect.width).toBe(readTokenLength('--ki-status-size'));
    expect(rect.height).toBe(readTokenLength('--ki-status-size'));

    const failing = await mount(landmark(), { label: 'Build failing', tone: 'danger' });
    expect(getComputedStyle(dotOf(failing)).backgroundColor).toBe(
      readTokenColor('--ki-status-danger-color'),
    );
    expect(getComputedStyle(dotOf(failing)).backgroundColor).not.toBe(
      getComputedStyle(onlineDot).backgroundColor,
    );
  });

  it('S3 renders an unrecognized tone with the neutral tone appearance', async () => {
    cleanup();
    const control = await mount(landmark(), { tone: 'neutral', label: 'Inactive' });
    const neutralColor = getComputedStyle(dotOf(control)).backgroundColor;

    const unknown = await mount(landmark(), { tone: 'primary', label: 'Unknown' });
    expect(getComputedStyle(dotOf(unknown)).backgroundColor).toBe(neutralColor);
    expect(neutralColor).toBe(readTokenColor('--ki-status-neutral-color'));
  });

  it('S4 surrounds the dot with a contrasting ring over an avatar image', async () => {
    cleanup();
    // A media stand-in the dot overlays, the consumer's layout concern.
    const avatar = document.createElement('div');
    avatar.style.position = 'relative';
    avatar.style.inlineSize = '48px';
    avatar.style.blockSize = '48px';
    avatar.style.background = 'var(--ki-surface-primary-med-em)';
    avatar.style.borderRadius = 'var(--ki-radius-round)';
    landmark().appendChild(avatar);

    const plain = await mount(landmark(), { label: 'Online', tone: 'success' });
    const plainShadow = getComputedStyle(dotOf(plain)).boxShadow;

    const el = await mount(avatar, { label: 'Online', tone: 'success', ring: '' });
    el.style.position = 'absolute';
    el.style.insetBlockEnd = '0';
    el.style.insetInlineEnd = '0';
    await motionSettled(el);
    const ringShadow = getComputedStyle(dotOf(el)).boxShadow;

    // The ring is a spread box-shadow layer in the theme ring color,
    // stacked over the base effects — and absent without the attribute.
    expect(ringShadow).toContain(readTokenColor('--ki-status-ring-color'));
    expect(ringShadow).toContain(
      `0px 0px 0px ${String(readTokenLength('--ki-status-ring-width'))}px`,
    );
    expect(plainShadow).not.toContain(readTokenColor('--ki-status-ring-color'));
    // The ring never resizes the dot (the Figma symbol stays 4x4).
    expect(dotOf(el).getBoundingClientRect().width).toBe(readTokenLength('--ki-status-size'));
  });

  it('S5 adds no keyboard stop between two buttons', async () => {
    cleanup();
    const save = document.createElement('button');
    save.textContent = 'Save';
    landmark().appendChild(save);
    const el = await mount(landmark(), { label: 'Online' });
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    landmark().appendChild(cancel);

    save.focus();
    expect(document.activeElement).toBe(save);
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(cancel);
    expect(el.contains(document.activeElement)).toBe(false);
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S6 exposes a labeled dot as a named image with no interactive role or state', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Online', tone: 'success' });
    const dot = dotOf(el);
    expect(dot.getAttribute('role')).toBe('img');
    expect(dot.getAttribute('aria-label')).toBe('Online');
    expect(dot.getAttribute('aria-hidden')).toBeNull();
    expect(dot.getAttribute('tabindex')).toBeNull();
    expect(dot.textContent).toBe('');

    await expectAccessible(document.body);
  });

  it('S7 keeps an unlabeled dot out of the accessibility tree beside its visible text', async () => {
    cleanup();
    const row = document.createElement('p');
    landmark().appendChild(row);
    const el = await mount(row);
    const text = document.createElement('span');
    text.textContent = 'Online';
    row.appendChild(text);

    // Decorative by contract (FR-003): hidden from assistive technology,
    // the adjacent text alone carries the status meaning.
    const dot = dotOf(el);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.getAttribute('role')).toBeNull();
    expect(dot.getAttribute('aria-label')).toBeNull();
    expect(dot.textContent).toBe('');
    expect(row.textContent).toBe('Online');

    await expectAccessible(document.body);
  });

  it('S8 restyles size, fill and effects through material3 tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Build failing', tone: 'danger' });
    await motionSettled(onmars);
    const onmarsColor = getComputedStyle(dotOf(onmars)).backgroundColor;
    const onmarsSize = dotOf(onmars).getBoundingClientRect().width;
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Build failing', tone: 'danger' });
    await motionSettled(el);
    const dot = dotOf(el);

    expect(el.outerHTML).toBe(markup);
    expect(getComputedStyle(dot).backgroundColor).toBe(readTokenColor('--ki-status-danger-color'));
    expect(getComputedStyle(dot).backgroundColor, 'material3 must restyle the fill').not.toBe(
      onmarsColor,
    );
    // material3 resolves the dot to the ~6dp badge-dot size, onmars to 4px.
    expect(dot.getBoundingClientRect().width).toBe(readTokenLength('--ki-status-size'));
    expect(dot.getBoundingClientRect().width).not.toBe(onmarsSize);

    await expectAccessible(document.body);
  });

  it('S10 crossfades tone changes with paint-only motion from the motion tokens', async () => {
    cleanup();
    // Explicit emulation: sibling spec files (visual galleries, motion
    // contracts) emulate `reduce` on the same page, so relying on the runner
    // default makes this assertion order-dependent (CI-observed flake).
    await browserCommands.emulateReducedMotion('no-preference');
    const el = await mount(landmark(), { label: 'Online', tone: 'success' });
    const dot = dotOf(el);
    const computed = getComputedStyle(dot);

    // Paint-only crossfade (background-color + box-shadow) plus the mount
    // pop (transform/opacity), all riding --ki-motion-* tokens; the
    // properties never include layout members.
    const properties = computed.transitionProperty.split(',').map((p) => p.trim());
    expect(properties).toContain('background-color');
    expect(properties).toContain('box-shadow');
    expect(properties).toContain('transform');
    expect(properties).toContain('opacity');
    expect(properties).not.toContain('width');
    expect(properties).not.toContain('inline-size');
    for (const duration of computed.transitionDuration.split(',')) {
      expect(Number.parseFloat(duration)).toBeCloseTo(0.12, 2);
    }
    await browserCommands.emulateReducedMotion(null);
  });
});
