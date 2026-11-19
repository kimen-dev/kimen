// @spec:093-ki-format
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { expectFormat, formatOutput, mountFormat, setupFormatTests } from './format-fixture';

setupFormatTests();

it('S11 retains its inline density and tabular figures on coarse pointers', async (test) => {
  const main = mountFormat('<ki-format-number value="123"></ki-format-number>');
  await expectFormat(main, 'ki-format-number', '123');
  const number = formatOutput(main, 'ki-format-number');
  if (!number) throw new Error('Missing number text');
  const before = number.getBoundingClientRect();
  if (!(await commands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    expect(number.getBoundingClientRect().height).toBeCloseTo(before.height);
    expect(number.getBoundingClientRect().width).toBeCloseTo(before.width);
    expect(getComputedStyle(number).fontVariantNumeric).toBe('tabular-nums');
  } finally {
    await commands.emulateHoverCapability(null);
  }
});
