// @spec:016-ki-list
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';

const STYLE_ID = 'ki-list-browser-token-style';

beforeAll(() => {
  defineKiList();
  defineKiListItem();
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

function cleanup(): HTMLElement {
  ensureTokens();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  const main = document.createElement('main');
  document.body.append(main);
  return main;
}

async function settle(): Promise<void> {
  await customElements.whenDefined('ki-list');
  await customElements.whenDefined('ki-list-item');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mountList(html: string): Promise<HTMLElement> {
  const main = cleanup();
  main.innerHTML = html;
  await settle();
  const list = main.querySelector('ki-list');
  if (!list) {
    throw new Error('ki-list fixture missing');
  }
  return list;
}

function itemParts(item: Element): Record<'item' | 'start' | 'content' | 'end', HTMLElement> {
  const shadow = item.shadowRoot;
  const parts = {
    item: shadow?.querySelector('[part="item"]'),
    start: shadow?.querySelector('[part="start"]'),
    content: shadow?.querySelector('[part="content"]'),
    end: shadow?.querySelector('[part="end"]'),
  };

  for (const [name, part] of Object.entries(parts)) {
    expect(part, `${name} part`).toBeInstanceOf(HTMLElement);
  }

  return parts as Record<'item' | 'start' | 'content' | 'end', HTMLElement>;
}

describe('ki-list in a real browser', () => {
  it('S1 presents three items as one vertical list in source order', async () => {
    const list = await mountList(`
      <ki-list>
        <ki-list-item>Email</ki-list-item>
        <ki-list-item>Notifications</ki-list-item>
        <ki-list-item>Storage</ki-list-item>
      </ki-list>
    `);
    const items = [...list.querySelectorAll('ki-list-item')];
    const rects = items.map((item) => item.getBoundingClientRect());
    const [emailRect, notificationsRect, storageRect] = rects;

    expect(items.map((item) => item.textContent.trim())).toEqual([
      'Email',
      'Notifications',
      'Storage',
    ]);
    expect(emailRect).toBeDefined();
    expect(notificationsRect).toBeDefined();
    expect(storageRect).toBeDefined();
    if (!emailRect || !notificationsRect || !storageRect) {
      throw new Error('expected three item rects');
    }
    expect(emailRect.top).toBeLessThan(notificationsRect.top);
    expect(notificationsRect.top).toBeLessThan(storageRect.top);
  });

  it('S2 composes avatar, primary, secondary and trailing meta in reading order', async () => {
    const list = await mountList(`
      <ki-list>
        <ki-list-item>
          <span slot="start" data-test="avatar">AG</span>
          <span data-test="primary">Ana Garcia</span>
          <span slot="secondary" data-test="secondary">ana@onmars.dev</span>
          <span slot="end" data-test="meta">9:41</span>
        </ki-list-item>
      </ki-list>
    `);
    const item = list.querySelector('ki-list-item');
    if (!item) {
      throw new Error('ki-list-item fixture missing');
    }
    const parts = itemParts(item);
    const avatar = list.querySelector('[data-test="avatar"]');
    const primary = list.querySelector('[data-test="primary"]');
    const secondary = list.querySelector('[data-test="secondary"]');
    const meta = list.querySelector('[data-test="meta"]');

    expect(avatar?.getBoundingClientRect().left).toBeLessThan(
      primary?.getBoundingClientRect().left ?? 0,
    );
    expect(primary?.getBoundingClientRect().top).toBeLessThan(
      secondary?.getBoundingClientRect().top ?? 0,
    );
    expect(meta?.getBoundingClientRect().left).toBeGreaterThan(
      parts.content.getBoundingClientRect().right,
    );
  });

  it('S3 reserves no space for absent regions on a primary-only item', async () => {
    const list = await mountList('<ki-list><ki-list-item>Storage</ki-list-item></ki-list>');
    const item = list.querySelector('ki-list-item');
    if (!item) {
      throw new Error('ki-list-item fixture missing');
    }
    const parts = itemParts(item);
    const style = getComputedStyle(parts.item);

    expect(parts.start.offsetParent).toBeNull();
    expect(item.shadowRoot?.querySelector('.secondary')?.textContent.trim()).toBe('');
    expect(parts.end.offsetParent).toBeNull();
    expect(Math.round(item.getBoundingClientRect().height)).toBe(
      Math.round(Number.parseFloat(style.minBlockSize)),
    );
    expect(style.gap).toBe(getComputedStyle(parts.item).columnGap);
  });

  it('S10 wraps long secondary text and grows without truncation or internal scrolling', async () => {
    const list = await mountList(`
      <ki-list style="inline-size: 16rem">
        <ki-list-item>
          Storage
          <span slot="secondary">This supporting text is intentionally long enough to wrap across multiple visual lines in the available inline size.</span>
        </ki-list-item>
      </ki-list>
    `);
    const item = list.querySelector('ki-list-item');
    if (!item) {
      throw new Error('ki-list-item fixture missing');
    }
    const parts = itemParts(item);
    const style = getComputedStyle(parts.item);

    expect(item.getBoundingClientRect().height).toBeGreaterThan(
      Number.parseFloat(style.minBlockSize),
    );
    expect(parts.content.scrollHeight).toBe(parts.content.clientHeight);
    expect(getComputedStyle(parts.content).overflow).toBe('visible');
    expect(getComputedStyle(parts.content).textOverflow).not.toBe('ellipsis');
  });

  it('has zero axe violations across representative region subsets', async () => {
    await mountList(`
      <ki-list>
        <ki-list-item><span slot="start">A</span>All<span slot="secondary">Detail</span><span slot="end">Now</span></ki-list-item>
        <ki-list-item>Primary only</ki-list-item>
        <ki-list-item><span slot="start">S</span>Start primary</ki-list-item>
        <ki-list-item>Primary secondary<span slot="secondary">Detail</span></ki-list-item>
        <ki-list-item>Primary end<span slot="end">End</span></ki-list-item>
      </ki-list>
    `);

    const results = await axe.run(document.querySelector('main') ?? document.body);
    expect(results.violations).toEqual([]);
  });

  it('S6 exposes one list with exactly three named list items and no interactive list role', async () => {
    await mountList(`
      <ki-list>
        <ki-list-item>Email</ki-list-item>
        <ki-list-item>Notifications</ki-list-item>
        <ki-list-item>Storage</ki-list-item>
      </ki-list>
    `);

    await expect.element(page.getByRole('list')).toBeInTheDocument();
    await expect.element(page.getByRole('listitem', { name: 'Email' })).toBeInTheDocument();
    await expect.element(page.getByRole('listitem', { name: 'Notifications' })).toBeInTheDocument();
    await expect.element(page.getByRole('listitem', { name: 'Storage' })).toBeInTheDocument();
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
  });

  it('S5 tabs to a slotted switch while skipping the list and items', async () => {
    const list = await mountList(`
      <ki-list>
        <ki-list-item>
          Email
          <input slot="end" role="switch" aria-label="Email alerts" type="checkbox" />
        </ki-list-item>
      </ki-list>
    `);
    const control = list.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!control) {
      throw new Error('switch fixture missing');
    }

    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(control);
  });

  it('S11 operates a slotted switch exactly once from the keyboard', async () => {
    const list = await mountList(`
      <ki-list>
        <ki-list-item>
          Email
          <input slot="end" role="switch" aria-label="Email alerts" type="checkbox" />
        </ki-list-item>
      </ki-list>
    `);
    const control = list.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!control) {
      throw new Error('switch fixture missing');
    }
    let changes = 0;
    control.addEventListener('change', () => {
      changes += 1;
    });

    control.focus();
    await userEvent.keyboard(' ');

    expect(control.checked).toBe(true);
    expect(changes).toBe(1);
  });
});
