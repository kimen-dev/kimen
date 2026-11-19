// @spec:098-ki-confirmation
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-confirmation.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.setAttribute('data-ki-density', 'touch');
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

it('S17: the two decisions have touch-sized targets on a coarse pointer', async ({ skip }) => {
  const emulated = await browser.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This browser cannot emulate a coarse primary pointer');
  }

  fixture.innerHTML = `<ki-confirmation heading="Send this email?" action="send_email"
    approve-label="Send email" deny-label="Keep draft" remember></ki-confirmation>`;
  const approve = page.getByRole('button', { name: 'Send email' });
  const deny = page.getByRole('button', { name: 'Keep draft' });
  for (const decision of [approve, deny]) {
    await expect.element(decision).toBeVisible();
    const { width, height } = decision.element().getBoundingClientRect();
    const target = getComputedStyle(decision.element(), '::before');
    expect(Math.max(width, Number.parseFloat(target.inlineSize) || 0)).toBeGreaterThanOrEqual(44);
    expect(Math.max(height, Number.parseFloat(target.blockSize) || 0)).toBeGreaterThanOrEqual(44);
  }
});
