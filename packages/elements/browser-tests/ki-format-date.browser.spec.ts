// @spec:093-ki-format
import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { KiFormatDate } from '../dist/components/ki-format-date.js';
import { expectAccessible } from './axe';
import { expectFormat, formatOutput, mountFormat, setupFormatTests } from './format-fixture';

setupFormatTests();

it('S1 uses the nearest language and preserves a date-only value', async () => {
  const main = mountFormat(
    '<div lang="es-ES"><ki-format-date date="2026-11-19" date-style="long" time-zone="America/Los_Angeles"></ki-format-date></div>',
  );
  await expectFormat(main, 'ki-format-date', '19 de noviembre de 2026');
});

it('S2 updates for its own language and requested time zone', async () => {
  const iso = '2026-11-19T23:41:00Z';
  const main = mountFormat(
    `<ki-format-date date="${iso}" date-style="long" time-style="short" time-zone="Europe/Madrid"></ki-format-date>`,
  );
  const expected = (locale: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid',
    }).format(new Date(iso));
  await expectFormat(main, 'ki-format-date', expected('en-US'));
  const host = main.querySelector('ki-format-date');
  if (!host) throw new Error('Missing date formatter');
  host.lang = 'es-ES';
  await expectFormat(main, 'ki-format-date', expected('es-ES'));
});

it('S7 leaves impossible ISO dates empty', async () => {
  const main = mountFormat(
    '<ki-format-date date="2026-04-31"></ki-format-date><ki-relative-time date="2023-02-29"></ki-relative-time>',
  );
  for (const tag of ['ki-format-date', 'ki-relative-time']) {
    await expect.poll(() => main.querySelector(tag)?.shadowRoot).toBeInstanceOf(ShadowRoot);
    expect(formatOutput(main, tag)).toBeNull();
  }
});

it('S8 stays out of the keyboard order as passive text', async () => {
  const main = mountFormat(`
    <button tabindex="0">Before</button>
    <ki-format-date date="2026-11-19"></ki-format-date>
    <ki-format-number value="49"></ki-format-number>
    <ki-relative-time date="2026-11-19T08:41:00Z"></ki-relative-time>
    <button tabindex="0">After</button>
  `);
  await expect.poll(() => formatOutput(main, 'ki-relative-time')).toBeInstanceOf(HTMLTimeElement);
  main.querySelector('button')?.focus();
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'After' })).toHaveFocus();
});

it('S9 exposes a native time element with its machine-readable day', async () => {
  const main = mountFormat('<ki-format-date date="2026-11-19"></ki-format-date>');
  await expect.poll(() => formatOutput(main, 'ki-format-date')).toBeInstanceOf(HTMLTimeElement);
  expect(formatOutput(main, 'ki-format-date')?.getAttribute('datetime')).toBe('2026-11-19');
  await expectAccessible(main);
});

it('leaves an unsupported date style empty', async () => {
  // @ts-expect-error Typed callers can only select a supported date style.
  const invalidStyle = 'invalid' satisfies KiFormatDate['dateStyle'];
  const main = mountFormat(
    `<ki-format-date date="2026-11-19" date-style="${invalidStyle}"></ki-format-date>`,
  );
  await expect
    .poll(() => main.querySelector('ki-format-date')?.shadowRoot)
    .toBeInstanceOf(ShadowRoot);
  expect(formatOutput(main, 'ki-format-date')).toBeNull();
});
