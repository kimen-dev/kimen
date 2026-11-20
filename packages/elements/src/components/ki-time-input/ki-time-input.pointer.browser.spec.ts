// @spec:108-ki-time-input
// Touch emulation is page-wide. Keep these in the isolated pointer project.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-time-input.js';

type TimeInput = HTMLElement & { value: string };

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<{ role: string; live: unknown; text: string }[] | null>;
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const isChromium = navigator.userAgent.includes('Chrome/');
const styles = document.createElement('style');
const fixture = document.createElement('main');
const field = () => page.getByRole('combobox', { name: 'Start time' });
const trigger = () => page.getByRole('button', { exact: true, name: 'Choose time' });
const dialog = () => page.getByRole('dialog', { name: 'Choose time' });
const hour = () => dialog().getByRole('spinbutton', { name: 'Hour' });
const minute = () => dialog().getByRole('spinbutton', { name: 'Minute' });
const apply = () => dialog().getByRole('button', { name: 'Apply' });
const timeText = (value: string) => value.replace(/[\s\u200e]+/gu, '').replace(/^0/u, '');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(styles);
  document.body.append(fixture);
  fixture.dataset.kiTheme = 'material3';
  fixture.dataset.kiDensity = 'touch';
});

afterEach(async () => {
  fixture.replaceChildren();
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function coarsePointer(test: { skip: (note?: string) => void }): Promise<void> {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!isChromium && !emulated) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
}

async function mount(locale: string, attributes: string): Promise<TimeInput> {
  fixture.innerHTML = `<section lang="${locale}"><ki-time-input label="Start time" ${attributes}></ki-time-input></section>`;
  await expect.element(field()).toBeVisible();
  const host = fixture.querySelector<TimeInput>('ki-time-input');
  if (!host) {
    throw new Error('missing TimeInput');
  }
  return host;
}

function deepestFocus(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** Follow the actual sequential keyboard path (including any dialog scroll stop). */
async function tabTo(target: Element): Promise<void> {
  for (let step = 0; step < 12 && deepestFocus() !== target; step += 1) {
    await userEvent.tab();
  }
  expect(deepestFocus()).toBe(target);
}

async function openDialByKeyboard(): Promise<void> {
  field().element().focus();
  await userEvent.tab();
  expect(deepestFocus()).toBe(trigger().element());
  await userEvent.keyboard('{Enter}');
  await expect.element(dialog()).toBeVisible();
  await expect.poll(deepestFocus).toBe(hour().element());
}

it('S9 adjusts hours and minutes by keyboard, applies the draft and restores focus', async (test) => {
  await coarsePointer(test);
  const host = await mount('en-GB', 'picker="dial" value="08:30"');
  const changes: string[] = [];
  host.addEventListener('ki-change', (event) =>
    changes.push((event as CustomEvent<{ value: string }>).detail.value),
  );
  await openDialByKeyboard();

  await userEvent.keyboard('{ArrowUp}');
  await tabTo(minute().element());
  await userEvent.keyboard('{ArrowUp}');
  expect(host.value).toBe('08:30');
  await tabTo(apply().element());
  await userEvent.keyboard('{Enter}');

  await expect.element(dialog()).not.toBeInTheDocument();
  expect(host.value).toBe('09:31');
  expect(changes).toEqual(['09:31']);
  await expect.poll(deepestFocus).toBe(trigger().element());
});

it.for([
  { locale: 'en-US', announcement: '9:31 AM' },
  { locale: 'en-GB', announcement: '09:31' },
])(
  'S10 announces the localized clock time in $locale as the minute advances',
  async ({ locale, announcement }, test) => {
    await coarsePointer(test);
    const host = await mount(locale, 'picker="dial" value="09:30"');
    await openDialByKeyboard();
    await tabTo(minute().element());
    const clock = host.shadowRoot?.querySelector('[part~="clock"]');
    if (!clock) {
      throw new Error('missing clock');
    }
    const handAngle = () => getComputedStyle(clock, '::before').transform;
    const initialAngle = handAngle();
    expect(initialAngle).not.toBe('none');

    await userEvent.keyboard('{ArrowUp}');

    const status = page.getByRole('status');
    await expect.element(status).toBeInTheDocument();
    const expected = timeText(announcement);
    await expect.poll(() => timeText(status.element().textContent)).toBe(expected);
    await expect.poll(() => (minute().element() as HTMLInputElement).value).toBe('31');
    await expect.poll(handAngle).not.toBe(initialAngle);
    await expect
      .poll(async () => {
        const tree = await browserCommands.accessibilityTree();
        return tree?.some(
          (node) => node.live === 'polite' && timeText(node.text).includes(expected),
        );
      })
      .toBe(true);
  },
);

it('allows typing into the dial spinbuttons and discards the draft on Escape', async (test) => {
  await coarsePointer(test);
  const host = await mount('en-GB', 'picker="dial" value="09:30"');
  await openDialByKeyboard();

  await hour().fill('18');
  await minute().fill('43');
  await expect.element(page.getByRole('status')).toHaveTextContent('18:43');
  await userEvent.keyboard('{Escape}');

  await expect.element(dialog()).not.toBeInTheDocument();
  expect(host.value).toBe('09:30');
  await expect.poll(deepestFocus).toBe(trigger().element());
});

it('passes axe for the localized clock dialog on a touch layout', async (test) => {
  await coarsePointer(test);
  await mount('en-US', 'picker="dial" value="09:30"');
  await openDialByKeyboard();

  await expectAccessible(fixture);
});

it('keeps field text and list targets at touch sizes under a coarse pointer', async (test) => {
  await coarsePointer(test);
  await mount('en-GB', 'min="09:00" max="10:00"');
  const control = field().element();
  control.focus();
  await userEvent.keyboard('{ArrowDown}');
  const slot = page.getByRole('option', { name: /^0?9:00$/u });
  await expect.element(slot).toBeVisible();

  expect(Number.parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
  expect(trigger().element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(slot.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
});
