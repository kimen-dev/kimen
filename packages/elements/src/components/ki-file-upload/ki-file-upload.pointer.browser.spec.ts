// @spec:109-ki-file-upload
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-file-upload.js';

const media = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-density');
  await media.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12 keeps coarse controls usable and enlarges both targets when touch density is selected', async ({
  skip,
}) => {
  const emulated = await media.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This browser cannot emulate a coarse primary pointer.');
  }

  const upload = document.createElement('ki-file-upload') as HTMLElement & {
    files: { name: string; size: number; status: 'queued' }[];
  };
  upload.files = [{ name: 'guide.pdf', size: 1000, status: 'queued' }];
  fixture.append(upload);
  const browse = page.getByRole('button', { name: 'Browse files' });
  const remove = page.getByRole('button', { name: 'Remove guide.pdf' });
  await expect.element(browse).toBeVisible();
  await expect.element(remove).toBeVisible();
  const targets = [browse.element(), remove.element()];
  const minimumDimension = () =>
    Math.min(
      ...targets.flatMap((target) => {
        const rect = target.getBoundingClientRect();
        return [rect.width, rect.height];
      }),
    );
  expect(minimumDimension()).toBeGreaterThanOrEqual(24);

  fixture.setAttribute('data-ki-density', 'touch');

  await expect.poll(minimumDimension).toBeGreaterThanOrEqual(44);
});
