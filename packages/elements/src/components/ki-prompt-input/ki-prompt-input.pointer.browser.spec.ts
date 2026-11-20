// @spec:116-ki-prompt-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from '../../../browser-tests/all-components';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.removeAttribute('data-ki-density');
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S18 enlarges attach and send targets when touch density is requested', async ({ skip }) => {
  if (!(await media.emulateHoverCapability('none'))) {
    skip();
    return;
  }
  try {
    fixture.innerHTML =
      '<ki-prompt-input label="Message" accept=".csv" value="Hello"></ki-prompt-input>';
    const attach = page.getByRole('button', { name: 'Attach files' });
    const send = page.getByRole('button', { name: 'Send' });
    await expect.element(attach).toBeEnabled();
    await expect.element(send).toBeEnabled();
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    const controls = [attach.element(), send.element()];
    const box = (button: Element) => button.getBoundingClientRect();
    expect(controls.map((button) => [box(button).width, box(button).height])).toEqual([
      [32, 32],
      [32, 32],
    ]);
    fixture.setAttribute('data-ki-density', 'touch');
    await expect
      .poll(() =>
        controls.every((button) => {
          const { left, top, width, height } = box(button);
          const root = button.getRootNode() as ShadowRoot;
          return (
            width >= 44 &&
            height >= 44 &&
            root.elementFromPoint(left + 3, top + height / 2) === button
          );
        }),
      )
      .toBe(true);
  } finally {
    await media.emulateHoverCapability(null);
  }
});
