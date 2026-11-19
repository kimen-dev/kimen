// @spec:082-ki-segmented-control
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineSegment } from '../../../dist/components/ki-segment.js';
import { defineCustomElement as defineGroup } from '../../../dist/components/ki-segmented-control.js';

const media = commands as unknown as {
  ariaSnapshotByRole: (role: 'radiogroup', name: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const style = document.createElement('style');
const fixture = document.createElement('main');
const fallbackOptions = '<ki-segment value="day" disabled>Day</ki-segment>';
const options = '<ki-segment value="day">Day</ki-segment>';
const week = '<ki-segment value="week">Week</ki-segment>';
const month = '<ki-segment value="month">Month</ki-segment>';
const radio = (name: string) => page.getByRole('radio', { name, exact: true });

beforeAll(() => {
  defineGroup();
  defineSegment();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  await media.emulateForcedColors(null);
  await media.emulateReducedMotion(null);
  fixture.replaceChildren();
  fixture.removeAttribute('style');
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

function group(children = options + week + month, attributes = 'value="week"'): string {
  return `<ki-segmented-control label="Range" ${attributes}>${children}</ki-segmented-control>`;
}

async function mount(markup: string) {
  fixture.innerHTML = markup;
  const control = fixture.querySelector<HTMLElement & { value: string }>('ki-segmented-control');
  if (!control) throw new Error('Missing segmented control fixture');
  await expect.element(page.getByRole('radiogroup')).toBeInTheDocument();
  return control;
}

function listenForChanges(control: HTMLElement) {
  const listener = vi.fn<(event: CustomEvent<{ value: string }>) => void>();
  control.addEventListener('ki-change', listener as EventListener);
  return listener;
}

it('S1 selects the first available option when no value was requested', async () => {
  const control = await mount(group(fallbackOptions + week + month, ''));

  await expect.element(radio('Week')).toBeChecked();
  await expect.element(radio('Day')).toBeDisabled();
  await expect.element(radio('Month')).not.toBeChecked();
  expect(control.value).toBe('week');
});

it('S2 applies a pointer choice once and ignores repeated and disabled activation', async () => {
  const control = await mount(group(fallbackOptions + week + month));
  const changes = listenForChanges(control);

  await radio('Month').click();
  await radio('Month').click();
  (radio('Day').element() as HTMLButtonElement).click();

  await expect.element(radio('Month')).toBeChecked();
  await expect.element(radio('Week')).not.toBeChecked();
  expect(control.value).toBe('month');
  expect(changes).toHaveBeenCalledTimes(1);
  expect(changes.mock.calls[0]?.[0].detail).toEqual({ value: 'month' });
});

it('S3 tabs in on the selection and out in one more step', async () => {
  const control = await mount(`<input aria-label="Before">${group()}<input aria-label="After">`);
  const changes = listenForChanges(control);
  await expect.element(radio('Week')).toBeChecked();
  (page.getByRole('textbox', { name: 'Before' }).element() as HTMLInputElement).focus();

  await userEvent.keyboard('{Tab}');
  await expect.element(radio('Week')).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  await expect.element(page.getByRole('textbox', { name: 'After' })).toHaveFocus();
  expect(changes).not.toHaveBeenCalled();
});

it('S4 wraps arrow navigation past a disabled option while selecting and focusing', async () => {
  const control = await mount(
    group(options + week + '<ki-segment value="month" disabled>Month</ki-segment>'),
  );
  const changes = listenForChanges(control);
  await expect.element(radio('Week')).toBeChecked();
  (radio('Week').element() as HTMLButtonElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(radio('Day')).toHaveFocus();
  await expect.element(radio('Day')).toBeChecked();
  expect(changes).toHaveBeenCalledTimes(1);
  expect(changes.mock.calls[0]?.[0].detail).toEqual({ value: 'day' });
});

it.each(['{Enter}', '[Space]'])('S4 activates a focused option with %s', async (key) => {
  const control = await mount(group());
  const changes = listenForChanges(control);
  await expect.element(radio('Week')).toBeChecked();
  (radio('Month').element() as HTMLButtonElement).focus();

  await userEvent.keyboard(key);

  await expect.element(radio('Month')).toBeChecked();
  expect(changes).toHaveBeenCalledTimes(1);
});

it('S5 exposes named radios and a group, shows the icon tooltip and passes axe', async () => {
  await mount(`<ki-segmented-control label="View" value="board">
    <ki-segment value="list">List</ki-segment>
    <ki-segment value="board" aria-label="Board">
      <svg slot="start" aria-hidden="true" viewBox="0 0 16 16"><path d="M2 2h12v12H2z"/></svg>
    </ki-segment>
  </ki-segmented-control>`);
  const board = radio('Board');
  await expect.element(board).toBeChecked();
  const tree = await media.ariaSnapshotByRole('radiogroup', 'View');
  expect(tree).toContain('radiogroup "View"');
  expect(tree).toContain('radio "List"');
  expect(tree).toContain('radio "Board" [checked]');
  await expectAccessible(fixture);

  (board.element() as HTMLButtonElement).focus();
  await expect.element(page.getByRole('tooltip')).toHaveTextContent('Board');

  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('tooltip')).not.toBeInTheDocument();
  await expect.element(board).toHaveFocus();
});

it('S6 contributes no form value and clicking a segment does not submit', async () => {
  await mount(`<form><label>Query<input name="query" value="forecast"></label>${group()}</form>`);
  const form = fixture.querySelector('form');
  if (!form) throw new Error('Missing form fixture');
  const submit = vi.fn((event: Event) => { event.preventDefault(); });
  form.addEventListener('submit', submit);

  await radio('Month').click();

  expect([...new FormData(form)]).toEqual([['query', 'forecast']]);
  expect(submit).not.toHaveBeenCalled();
});

it('S7 uses the selected surface, ink and elevation tokens', async () => {
  const control = await mount(group());
  control.style.setProperty('--ki-segmented-selected-bg', 'rgb(240, 240, 240)');
  control.style.setProperty('--ki-segmented-selected-fg', 'rgb(20, 30, 40)');
  control.style.setProperty('--ki-segmented-selected-shadow', '0 0 2px rgb(1, 2, 3)');
  await expect.element(radio('Week')).toBeChecked();

  const selected = getComputedStyle(radio('Week').element());
  expect(selected.backgroundColor).toBe('rgb(240, 240, 240)');
  expect(selected.color).toBe('rgb(20, 30, 40)');
  expect(selected.boxShadow).toContain('rgb(1, 2, 3)');
  expect(getComputedStyle(radio('Day').element()).backgroundColor).not.toBe(
    selected.backgroundColor,
  );
});

it.each([
  ['xs', 28],
  ['sm', 32],
  ['md', 40],
] as const)('S7 uses the %s track height', async (size, height) => {
  const control = await mount(group(undefined, `size="${size}"`));
  await expect.element(radio('Week')).toBeInTheDocument();
  expect(control.getBoundingClientRect().height).toBe(height);
});

it('S8 paints the selected border in the forced-colours Highlight colour', async (context) => {
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  witness.style.color = 'Highlight';
  await mount(group());
  fixture.append(witness);
  await media.emulateForcedColors('active');

  const applied = () =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
  if (navigator.userAgent.includes('Chrome/')) {
    await expect.poll(applied).toBe(true);
  } else if (!applied()) {
    context.skip('This engine does not apply an emulated forced palette');
  }

  await expect.element(radio('Week')).toBeChecked();
  const selected = getComputedStyle(radio('Week').element());
  const unselected = getComputedStyle(radio('Day').element());
  expect(Number.parseFloat(selected.borderBlockStartWidth)).toBeGreaterThan(0);
  // The witness resolves the system keyword to the browser's actual palette.
  witness.style.forcedColorAdjust = 'none';
  expect(selected.borderBlockStartColor).toBe(getComputedStyle(witness).color);
  expect(unselected.borderBlockStartColor).not.toBe(selected.borderBlockStartColor);
});

it('S9 changes selection without motion when reduced motion is requested', async () => {
  await media.emulateReducedMotion('reduce');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  await mount(group());

  await radio('Month').click();

  await expect.element(radio('Month')).toBeChecked();
  const button = radio('Month').element();
  expect(button.getAnimations()).toHaveLength(0);
  expect(getComputedStyle(button).transitionDuration).toBe('0s');
});

it('S10 reverses horizontal arrow navigation in RTL', async () => {
  await mount(`<div dir="rtl">${group()}</div>`);
  await expect.element(radio('Week')).toBeChecked();
  (radio('Week').element() as HTMLButtonElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(radio('Day')).toHaveFocus();
  await expect.element(radio('Day')).toBeChecked();
});

it('S12 fills the row with equal-width options', async () => {
  fixture.style.inlineSize = '300px';
  const control = await mount(
    group(options + '<ki-segment value="month">Calendar month</ki-segment>', 'full-width'),
  );
  await expect.element(radio('Day')).toBeChecked();

  expect(control.getBoundingClientRect().width).toBe(300);
  expect(radio('Day').element().getBoundingClientRect().width).toBeCloseTo(
    radio('Calendar month').element().getBoundingClientRect().width,
    1,
  );
});

it('S13 applies a programmatic value without a change event', async () => {
  const control = await mount(group());
  const changes = listenForChanges(control);
  await expect.element(radio('Week')).toBeChecked();

  control.value = 'month';

  await expect.element(radio('Month')).toBeChecked();
  await expect.element(radio('Week')).not.toBeChecked();
  expect(changes).not.toHaveBeenCalled();
});

it('S14 silently falls back when the selected option becomes disabled', async () => {
  const control = await mount(group());
  const changes = listenForChanges(control);
  await expect.element(radio('Week')).toBeChecked();

  control.querySelector('ki-segment[value="week"]')?.setAttribute('disabled', '');

  await expect.element(radio('Day')).toBeChecked();
  await expect.element(radio('Day')).toHaveAttribute('tabindex', '0');
  await expect.element(radio('Week')).toBeDisabled();
  expect(changes).not.toHaveBeenCalled();
});

it('S1 applies a pending requested value when its option arrives', async () => {
  const control = await mount(group(options + week, 'value="month"'));
  await expect.element(radio('Day')).toBeChecked();

  control.insertAdjacentHTML('beforeend', month);

  await expect.element(radio('Month')).toBeChecked();
  expect(control.value).toBe('month');
});
