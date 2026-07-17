import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

// @spec:019-ki-avatar
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';

const STYLE_ID = 'ki-avatar-dark-tokens';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineKiAvatar();
  defineKiAvatarGroup();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(): void {
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

async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

async function mountAvatar(): Promise<HTMLElement> {
  const el = document.createElement('ki-avatar');
  el.setAttribute('label', 'Ana García');
  el.setAttribute('initials', 'AG');
  landmark().appendChild(el);
  await customElements.whenDefined('ki-avatar');
  await until(() => Boolean(el.shadowRoot?.querySelector('[part="avatar"]')));
  return el;
}

async function mountCappedGroup(): Promise<HTMLElement> {
  const group = document.createElement('ki-avatar-group');
  group.setAttribute('max', '2');
  for (let index = 0; index < 3; index += 1) {
    const member = document.createElement('ki-avatar');
    member.setAttribute('label', `Member ${String(index + 1)}`);
    member.setAttribute('initials', 'M');
    group.appendChild(member);
  }
  landmark().appendChild(group);
  await customElements.whenDefined('ki-avatar-group');
  await until(() => Boolean(group.shadowRoot?.querySelector('[part="counter"]')));
  return group;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function requireBox(el: HTMLElement): HTMLElement {
  const box = el.shadowRoot?.querySelector<HTMLElement>('[part="avatar"]') ?? null;
  expect(box).toBeTruthy();
  if (!box) {
    throw new Error('ki-avatar did not render its box');
  }
  return box;
}

function requireCounter(el: HTMLElement): HTMLElement {
  const counter = el.shadowRoot?.querySelector<HTMLElement>('[part="counter"]') ?? null;
  expect(counter).toBeTruthy();
  if (!counter) {
    throw new Error('ki-avatar-group did not render its counter');
  }
  return counter;
}

describe('ki-avatar under the dark scheme', () => {
  it('S12 resolves the avatar and counter appearance from the dark token values', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'light');
    // Outline/base_em and the counter surface are the scheme-sensitive pieces
    // (Black/3 ↔ White/3; secondary_alpha_base flips its neutral base).
    let avatar = await mountAvatar();
    const lightBorder = getComputedStyle(requireBox(avatar)).borderColor;
    let group = await mountCappedGroup();
    const lightCounterBg = getComputedStyle(requireCounter(group)).backgroundColor;
    avatar.remove();
    group.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    avatar = await mountAvatar();
    group = await mountCappedGroup();
    const darkBorder = getComputedStyle(requireBox(avatar)).borderColor;
    const darkCounterBg = getComputedStyle(requireCounter(group)).backgroundColor;

    expect(darkBorder).toBe(readTokenColor('--ki-avatar-border-color'));
    expect(darkBorder, 'forced dark must change the surface border').not.toBe(lightBorder);
    expect(darkCounterBg).toBe(readTokenColor('--ki-avatar-group-counter-bg'));
    expect(darkCounterBg, 'forced dark must change the counter surface').not.toBe(lightCounterBg);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
