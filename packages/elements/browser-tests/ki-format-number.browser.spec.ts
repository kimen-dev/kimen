// @spec:093-ki-format
import { expect, it } from 'vitest';
import { expectAccessible } from './axe';
import {
  expectFormat,
  formatBrowserCommands,
  formatOutput,
  mountFormat,
  setupFormatTests,
} from './format-fixture';

setupFormatTests();

it('S3 formats decimal, currency, percent, unit and compact numbers in the page locale', async () => {
  const formats = [
    ['1284.5', '', {}],
    ['49', 'currency="EUR"', { style: 'currency', currency: 'EUR' }],
    [
      '0.496',
      'format-style="percent" minimum-fraction-digits="1" maximum-fraction-digits="1"',
      { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
    ],
    ['23', 'format-style="unit" unit="celsius"', { style: 'unit', unit: 'celsius' }],
    ['59320', 'notation="compact"', { notation: 'compact' }],
  ] satisfies [string, string, Intl.NumberFormatOptions][];
  const main = mountFormat(
    formats
      .map(
        ([value, attrs], index) =>
          `<ki-format-number data-case="${String(index)}" value="${value}" ${attrs}></ki-format-number>`,
      )
      .join(' '),
    'es-ES',
  );

  for (const [index, [value, , options]] of formats.entries()) {
    await expectFormat(
      main,
      `[data-case="${String(index)}"]`,
      new Intl.NumberFormat('es-ES', options).format(Number(value)),
    );
  }
  await expectAccessible(main);
});

it('S7 leaves non-finite values blank and recovers when the value becomes finite', async () => {
  const main = mountFormat('<ki-format-number value="Infinity"></ki-format-number>');
  const number = main.querySelector('ki-format-number');
  await expect.poll(() => number?.shadowRoot).toBeInstanceOf(ShadowRoot);
  expect(formatOutput(main, 'ki-format-number')).toBeNull();
  number?.setAttribute('value', '0');
  await expectFormat(main, 'ki-format-number', '0');
});

it('S11 inherits typography and color in RTL text and uses tabular figures', async () => {
  const main = mountFormat(`
    <section dir="rtl" style="color: rgb(23, 42, 58); font-size: 22px; line-height: 29px">
      <ki-format-date date="2026-11-19"></ki-format-date>
      <ki-format-number value="1111"></ki-format-number>
      <ki-relative-time date="2026-11-19T08:41:00Z"></ki-relative-time>
    </section>
  `);
  for (const tag of ['ki-format-date', 'ki-format-number', 'ki-relative-time']) {
    await expect.poll(() => formatOutput(main, tag)).toBeInstanceOf(HTMLElement);
    const output = formatOutput(main, tag);
    if (!output) throw new Error(`Missing output for ${tag}`);
    expect(getComputedStyle(output)).toMatchObject({
      color: 'rgb(23, 42, 58)',
      direction: 'rtl',
      fontSize: '22px',
      lineHeight: '29px',
    });
  }
  const number = formatOutput(main, 'ki-format-number');
  if (!number) throw new Error('Missing number text');
  expect(getComputedStyle(number).fontVariantNumeric).toBe('tabular-nums');
});

it('S11 remains visible in forced colors with the surrounding ink', async (test) => {
  await formatBrowserCommands.emulateForcedColors('active');
  try {
    const witness = document.createElement('span');
    witness.style.backgroundColor = 'rgb(1, 2, 3)';
    document.body.append(witness);
    const applied = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
    const deadline = Date.now() + 2_000;
    while (!applied() && Date.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    if (navigator.userAgent.includes('Chrome/')) {
      expect(applied(), 'Chromium applies the emulated palette').toBe(true);
    }
    if (!applied()) {
      test.skip('this engine does not repaint under forced-colors emulation');
    }
    witness.remove();
    const main = mountFormat(`
      <ki-format-date date="2026-11-19"></ki-format-date>
      <ki-format-number value="49" currency="EUR"></ki-format-number>
      <ki-relative-time date="2026-11-19T08:41:00Z" threshold="0"></ki-relative-time>
    `);
    for (const tag of ['ki-format-date', 'ki-format-number', 'ki-relative-time']) {
      await expect
        .poll(() => formatOutput(main, tag)?.getBoundingClientRect().width ?? 0)
        .toBeGreaterThan(0);
      const output = formatOutput(main, tag);
      if (!output) throw new Error(`Missing output for ${tag}`);
      expect(getComputedStyle(output).color).toBe(getComputedStyle(main).color);
    }
  } finally {
    await formatBrowserCommands.emulateForcedColors(null);
  }
});
