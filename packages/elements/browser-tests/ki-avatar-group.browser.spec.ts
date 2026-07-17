// @spec:019-ki-avatar
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';

type KiAvatarGroupElement = HTMLElement & { max?: number; size: string };

const STYLE_ID = 'ki-avatar-group-browser-token-style';

beforeAll(() => {
  defineKiAvatar();
  defineKiAvatarGroup();
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

async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Members are labeled per S5/S10: "Member 1" … "Member N". */
async function mountGroup(
  container: HTMLElement,
  memberCount: number,
  attributes: Partial<Record<'max' | 'size', string>> = {},
  memberSizes: readonly string[] = [],
): Promise<KiAvatarGroupElement> {
  ensureTokens();
  const el = document.createElement('ki-avatar-group') as KiAvatarGroupElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  for (let index = 0; index < memberCount; index += 1) {
    const member = document.createElement('ki-avatar');
    member.setAttribute('label', `Member ${String(index + 1)}`);
    member.setAttribute('initials', 'M');
    const memberSize = memberSizes[index];
    if (memberSize !== undefined) {
      member.setAttribute('size', memberSize);
    }
    el.appendChild(member);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-avatar-group');
  await customElements.whenDefined('ki-avatar');
  // The group is synchronized once every member holds its stacking depth or
  // its overflow marker — and, when the cap hides members, once the counter
  // re-render flushed.
  await until(() =>
    Array.from(el.querySelectorAll('ki-avatar')).every(
      (member) =>
        member.style.zIndex !== '' || member.hasAttribute('data-ki-avatar-group-overflow'),
    ),
  );
  const cap = Number(attributes.max);
  if (Number.isInteger(cap) && cap > 0 && cap < memberCount) {
    await until(() => Boolean(el.shadowRoot?.querySelector('[part="counter"]')));
  }
  return el;
}

function membersOf(el: KiAvatarGroupElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('ki-avatar'));
}

function visibleMembersOf(el: KiAvatarGroupElement): HTMLElement[] {
  return membersOf(el).filter((member) => getComputedStyle(member).display !== 'none');
}

function counterOf(el: KiAvatarGroupElement): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('[part="counter"]') ?? null;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-avatar-group', () => {
  it('S5 stacks the capped members with the token overlap and trails a "+5" counter', async () => {
    cleanup();
    const el = await mountGroup(landmark(), 8, { max: '3' });

    const visible = visibleMembersOf(el);
    expect(visible.length).toBe(3);
    expect(membersOf(el).length - visible.length).toBe(5);

    const counter = counterOf(el);
    expect(counter?.textContent).toBe('+5');

    // One overlapping stack: each member tucks under its predecessor by the
    // md overlap token, the leading member paints on top (reversed z-order).
    const [first, second] = visible;
    if (!first || !second) {
      throw new Error('the capped stack did not render two members');
    }
    const overlap = readTokenLength('--ki-avatar-group-md-overlap');
    expect(first.getBoundingClientRect().right - second.getBoundingClientRect().left).toBeCloseTo(
      overlap,
      1,
    );
    expect(Number(getComputedStyle(first).zIndex)).toBeGreaterThan(
      Number(getComputedStyle(second).zIndex),
    );
    if (!counter) {
      throw new Error('the capped stack did not render its counter');
    }
    expect(counter.getBoundingClientRect().height).toBe(readTokenLength('--ki-avatar-md-size'));
  });

  it('S6 renders every member at the group size, overriding member-declared sizes', async () => {
    cleanup();
    const el = await mountGroup(landmark(), 3, { size: 'sm' }, ['lg', 'xl']);

    const smSize = readTokenLength('--ki-avatar-sm-size');
    for (const member of visibleMembersOf(el)) {
      const box = member.shadowRoot?.querySelector('[part="avatar"]');
      if (!box) {
        throw new Error('a member did not render its box');
      }
      expect(box.getBoundingClientRect().width).toBe(smSize);
    }
  });

  it('S7 adds no keyboard stop between two buttons', async () => {
    cleanup();
    const save = document.createElement('button');
    save.textContent = 'Save';
    landmark().appendChild(save);
    const el = await mountGroup(landmark(), 3);
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

  it('S10 exposes the visible members by name and the overflow as the text "+5"', async () => {
    cleanup();
    const el = await mountGroup(landmark(), 8, { max: '3' });

    const visible = visibleMembersOf(el);
    expect(visible.map((member) => member.getAttribute('aria-label'))).toEqual([
      'Member 1',
      'Member 2',
      'Member 3',
    ]);
    for (const member of visible) {
      expect(member.getAttribute('role')).toBe('img');
    }
    // Members beyond the cap leave no accessible trace but the counter text.
    for (const member of membersOf(el).slice(3)) {
      expect(getComputedStyle(member).display).toBe('none');
    }
    expect(counterOf(el)?.textContent).toBe('+5');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S13 follows a right-to-left document: the stack leads right, the counter trails left', async () => {
    cleanup();
    const rtl = document.createElement('div');
    rtl.setAttribute('dir', 'rtl');
    landmark().appendChild(rtl);
    const el = await mountGroup(rtl, 4, { max: '3' });

    const visible = visibleMembersOf(el);
    const [first, second, third] = visible;
    const counter = counterOf(el);
    if (!first || !second || !third || !counter) {
      throw new Error('the RTL stack did not render three members and a counter');
    }
    // The first avatar leads from the right edge…
    expect(first.getBoundingClientRect().left).toBeGreaterThan(second.getBoundingClientRect().left);
    expect(second.getBoundingClientRect().left).toBeGreaterThan(third.getBoundingClientRect().left);
    // …and the "+1" counter trails at the stack's left end.
    expect(counter.textContent).toBe('+1');
    expect(counter.getBoundingClientRect().left).toBeLessThan(third.getBoundingClientRect().left);
  });

  it('S14 shows every member and no counter under the malformed cap "0"', async () => {
    cleanup();
    const el = await mountGroup(landmark(), 3, { max: '0' });

    expect(visibleMembersOf(el).length).toBe(3);
    expect(counterOf(el)).toBeNull();
  });

  it('S15 shows every member and no counter without a cap, never "+0"', async () => {
    cleanup();
    const el = await mountGroup(landmark(), 3);

    expect(visibleMembersOf(el).length).toBe(3);
    expect(counterOf(el)).toBeNull();
    expect(el.shadowRoot?.textContent).not.toContain('+0');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
