// @spec:093-ki-format
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { formatOutput, mountFormat, setupFormatTests } from './format-fixture';

setupFormatTests();

it('S11 renders without animation under reduced motion', async () => {
  await commands.emulateReducedMotion('reduce');
  try {
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const main = mountFormat(`
      <ki-format-date date="2026-11-19"></ki-format-date>
      <ki-format-number value="49" currency="EUR"></ki-format-number>
      <ki-relative-time date="${new Date().toISOString()}" sync></ki-relative-time>
    `);
    for (const tag of ['ki-format-date', 'ki-format-number', 'ki-relative-time']) {
      await expect.poll(() => formatOutput(main, tag)).toBeInstanceOf(HTMLElement);
      const output = formatOutput(main, tag);
      expect(output?.getAnimations({ subtree: true })).toEqual([]);
    }
  } finally {
    await commands.emulateReducedMotion(null);
  }
});
