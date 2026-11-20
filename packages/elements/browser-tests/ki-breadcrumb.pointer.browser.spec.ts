// @spec:096-ki-breadcrumb
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { defineCustomElement as defineBreadcrumbItem } from '../dist/components/ki-breadcrumb-item.js';
import { defineCustomElement as defineBreadcrumb } from '../dist/components/ki-breadcrumb.js';
import { parkPointer } from './axe';

const styles = document.createElement('style');
const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineBreadcrumbItem();
  defineBreadcrumb();
  styles.textContent = tokensCss;
  document.head.append(styles);
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
});

function expectTarget(element: Element, minimum: number): void {
  const { width, height } = element.getBoundingClientRect();
  expect(width).toBeGreaterThanOrEqual(minimum);
  expect(height).toBeGreaterThanOrEqual(minimum);
}

it('S9 meets the coarse-pointer target minimum and grows with opt-in touch density', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    const main = document.createElement('main');
    main.innerHTML = `
      <ki-breadcrumb max-items="4">
        <ki-breadcrumb-item href="#a">A</ki-breadcrumb-item>
        <ki-breadcrumb-item href="#b">B</ki-breadcrumb-item>
        <ki-breadcrumb-item href="#c">C</ki-breadcrumb-item>
        <ki-breadcrumb-item href="#d">D</ki-breadcrumb-item>
        <ki-breadcrumb-item current>E</ki-breadcrumb-item>
      </ki-breadcrumb>
    `;
    document.body.append(main);
    const ancestor = page.getByRole('link', { name: 'A', exact: true });
    const trigger = page.getByRole('button', { name: 'Show 2 more levels', exact: true });
    await expect.element(ancestor).toBeVisible();
    await expect.element(trigger).toBeVisible();
    expectTarget(ancestor.element(), 24);
    expectTarget(trigger.element(), 24);

    main.dataset.kiDensity = 'touch';

    expectTarget(ancestor.element(), 44);
    expectTarget(trigger.element(), 44);
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
