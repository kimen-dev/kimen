// @spec:130-ki-markdown
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineCodeBlock } from '../../../dist/components/ki-code-block.js';
import { defineCustomElement as defineMarkdown } from '../../../dist/components/ki-markdown.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCodeBlock();
  defineMarkdown();
  styles.textContent = tokensCss;
  fixture.dataset.kiDensity = 'touch';
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12 preserves the full touch hit area of a rendered snippet’s copy button', async ({
  skip,
}) => {
  const emulated = await browser.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (!emulated && !coarse()) {
    expect(navigator.userAgent).not.toContain('Chrome/');
    skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(coarse).toBe(true);
  const host = document.createElement('ki-markdown');
  host.textContent = '```ts\nconst count = 3;\n```';
  fixture.append(host);

  const copyRoot = () =>
    host.shadowRoot?.querySelector('ki-code-block')?.shadowRoot?.querySelector('ki-copy-button')
      ?.shadowRoot;
  const nativeButton = () => copyRoot()?.querySelector('button');
  await expect.poll(nativeButton).toBeInstanceOf(HTMLButtonElement);
  const root = copyRoot();
  const button = nativeButton();
  if (!root || !button) throw new Error('Missing native copy button');
  const bounds = button.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;

  expect(root.elementFromPoint(x - 21, y)).toBe(button);
  expect(root.elementFromPoint(x + 21, y)).toBe(button);
  expect(root.elementFromPoint(x, y - 21)).toBe(button);
  expect(root.elementFromPoint(x, y + 21)).toBe(button);
});
