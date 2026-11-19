import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect } from 'vitest';
import { defineCustomElement as defineDate } from '../dist/components/ki-format-date.js';
import { defineCustomElement as defineNumber } from '../dist/components/ki-format-number.js';
import { defineCustomElement as defineRelative } from '../dist/components/ki-relative-time.js';
import { parkPointer } from './axe';

import { commands } from 'vitest/browser';

export const formatBrowserCommands = commands as unknown as {
  accessibilityTree: () => Promise<{ name: string; role: string }[] | null>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  resumeClock: () => Promise<void>;
};

export function setupFormatTests(): void {
  beforeAll(() => {
    defineDate();
    defineNumber();
    defineRelative();
  });

  afterEach(async () => {
    document.body.replaceChildren();
    await parkPointer();
  });
}

export function mountFormat(markup: string, lang = 'en-US'): HTMLElement {
  const main = document.createElement('main');
  main.lang = lang;
  const styles = document.createElement('style');
  styles.textContent = tokensCss;
  main.innerHTML = markup;
  main.prepend(styles);
  document.body.append(main);
  return main;
}

export function formatOutput(main: HTMLElement, selector: string): HTMLElement | null | undefined {
  return main.querySelector(selector)?.shadowRoot?.querySelector<HTMLElement>('time, span');
}

export async function expectFormat(
  main: HTMLElement,
  selector: string,
  expected: string,
): Promise<void> {
  await expect.poll(() => formatOutput(main, selector)?.textContent).toBe(expected);
}
