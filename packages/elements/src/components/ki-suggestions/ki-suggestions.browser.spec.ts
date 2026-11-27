// @spec:117-ki-suggestions
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineSuggestion } from '../../../dist/components/ki-suggestion.js';
import { defineCustomElement as defineSuggestions } from '../../../dist/components/ki-suggestions.js';

const media = commands as unknown as {
  ariaSnapshotByRole: (role: 'group', name: string) => Promise<string>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const styles = document.createElement('style');
let fixture: HTMLElement;
const firstText = 'Which ones recur?';
const secondText = 'Draft release notes';
const description = 'For the merged pull requests';
const choices = `<ki-suggestion>${firstText}</ki-suggestion>
  <ki-suggestion description="${description}">${secondText}</ki-suggestion>`;
const composerMarkup =
  '<textarea tabindex="0" name="prompt" aria-label="Composer">Draft</textarea>';

const button = (name: string) => page.getByRole('button', { name, exact: true });

function paintedSurface(control: Element, variant: string): Element {
  if (variant === 'chips') return control;
  if (!control.parentElement) throw new Error('Missing card surface');
  return control.parentElement;
}

beforeAll(() => {
  defineSuggestion();
  defineSuggestions();
  styles.textContent = tokensCss;
  document.head.append(styles);
});

beforeEach(() => {
  fixture = document.createElement('main');
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.remove();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
});

function group(attributes = '', label = 'Follow-up suggestions'): string {
  return `<ki-suggestions label="${label}" ${attributes}>${choices}</ki-suggestions>`;
}

function bindComposer(): HTMLTextAreaElement {
  const suggestions = fixture.querySelector<HTMLElement & { composer: HTMLTextAreaElement }>(
    'ki-suggestions',
  );
  const composer = fixture.querySelector('textarea');
  if (!suggestions || !composer) throw new Error('Missing suggestions or composer');
  suggestions.composer = composer;
  return composer;
}

function listenForSelection() {
  const select = vi.fn<(event: Event) => void>();
  fixture.addEventListener('ki-select', select);
  return select;
}

it('S1 emits the chosen text in send mode and returns focus to the composer', async () => {
  fixture.innerHTML = group() + composerMarkup;
  const composer = bindComposer();
  const selected = listenForSelection();

  await button(firstText).click();

  expect(selected).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { text: firstText },
      target: fixture.querySelector('ki-suggestions'),
    }),
  );
  await expect.element(composer).toHaveValue('Draft');
  await expect.element(composer).toHaveFocus();
});

it('S2 fills the composer with the card title and returns focus without submitting', async () => {
  fixture.innerHTML = `<form>${group('variant="cards" mode="fill"', 'Start a conversation')}${composerMarkup}</form>`;
  const composer = bindComposer();
  const form = fixture.querySelector('form');
  if (!form) throw new Error('Missing composer form');
  const selected = listenForSelection();
  const submit = vi.fn((event: Event) => {
    event.preventDefault();
  });
  form.addEventListener('submit', submit);

  await button(secondText).click();

  expect(selected).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { text: secondText } }),
  );
  await expect.element(composer).toHaveValue(secondText);
  await expect.element(composer).toHaveFocus();
  expect(submit).not.toHaveBeenCalled();
});

it('S3 tabs through the buttons in reading order and reverses with Shift+Tab', async () => {
  fixture.innerHTML =
    '<button tabindex="0">Before</button>' + group() + '<button tabindex="0">After</button>';
  await expect.element(button(firstText)).toBeVisible();
  (button('Before').element() as HTMLButtonElement).focus();

  await userEvent.keyboard('{Tab}');
  await expect.poll(() => button(firstText).element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Tab}');
  await expect.poll(() => button(secondText).element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Tab}');
  await expect.element(button('After')).toHaveFocus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.poll(() => button(secondText).element().matches(':focus')).toBe(true);
});

it.each(['{Enter}', '[Space]'])('S3 activates the focused suggestion with %s', async (key) => {
  fixture.innerHTML = group('mode="fill"') + composerMarkup;
  const composer = bindComposer();
  const option = button(firstText);
  await expect.element(option).toBeVisible();
  (option.element() as HTMLButtonElement).focus();

  await userEvent.keyboard(key);

  await expect.element(composer).toHaveValue(firstText);
  await expect.element(composer).toHaveFocus();
});

it('S4 exposes a named group of title-only buttons with a separate card description', async () => {
  fixture.innerHTML = group('variant="cards"', 'Start a conversation');
  const option = button(secondText);
  await expect.element(option).toBeVisible();
  await expect.element(option).toHaveAccessibleDescription(description);
  const supportingText = page.getByText(description, { exact: true });
  await expect.element(supportingText).toBeVisible();
  expect(option.element().textContent).toBe(secondText);
  expect(option.element().contains(supportingText.element())).toBe(false);

  const tree = await media.ariaSnapshotByRole('group', 'Start a conversation');
  expect(tree).toContain('group "Start a conversation"');
  expect(tree).toContain(`button "${firstText}"`);
  expect(tree).toContain(`button "${secondText}"`);
  await expectAccessible(fixture);
});

it('S5 contributes no form value and leaves form submission to the host', async () => {
  fixture.innerHTML = `<form>${group()}${composerMarkup}</form>`;
  const form = fixture.querySelector('form');
  if (!form) throw new Error('Missing composer form');
  const submit = vi.fn((event: Event) => {
    event.preventDefault();
  });
  form.addEventListener('submit', submit);

  await button(firstText).click();

  expect([...new FormData(form)]).toEqual([['prompt', 'Draft']]);
  expect(submit).not.toHaveBeenCalled();
});

it('S6 paints the card with the overridden surface token', async () => {
  fixture.innerHTML = group('variant="cards" style="--ki-suggestion-card-bg: rgb(233, 235, 237)"');
  const option = button(secondText);
  await expect.element(option).toBeVisible();

  expect(getComputedStyle(paintedSurface(option.element(), 'cards')).backgroundColor).toBe(
    'rgb(233, 235, 237)',
  );
});

it.for(['chips', 'cards'])(
  'S7 keeps the %s control border and keyboard focus visible in forced colours',
  async (variant, { skip }) => {
    fixture.innerHTML = `<button tabindex="0">Before</button>${group(`variant="${variant}"`)}`;
    const witness = document.createElement('span');
    witness.style.backgroundColor = 'rgb(1, 2, 3)';
    fixture.append(witness);

    await media.emulateForcedColors('active');
    try {
      const applied = () =>
        matchMedia('(forced-colors: active)').matches &&
        getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
      if (navigator.userAgent.includes('Chrome/')) {
        await expect.poll(applied).toBe(true);
      } else if (!applied()) {
        skip('This engine does not apply an emulated forced palette');
        return;
      }

      const option = button(firstText);
      await expect.element(option).toBeVisible();
      (button('Before').element() as HTMLButtonElement).focus();
      await userEvent.keyboard('{Tab}');

      const control = option.element();
      await expect.poll(() => control.matches(':focus-visible')).toBe(true);
      const paint = getComputedStyle(paintedSurface(control, variant));
      expect(paint.borderBlockStartStyle).not.toBe('none');
      expect(Number.parseFloat(paint.borderBlockStartWidth)).toBeGreaterThan(0);
      expect(paint.borderBlockStartColor).not.toBe(paint.backgroundColor);
      expect(paint.outlineStyle).not.toBe('none');
      expect(Number.parseFloat(paint.outlineWidth)).toBeGreaterThan(0);
      expect(paint.outlineColor).not.toBe(paint.backgroundColor);
    } finally {
      await media.emulateForcedColors(null);
    }
  },
);

it('S8 activates without motion when reduced motion is requested', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    fixture.innerHTML = group('mode="fill"') + composerMarkup;
    const composer = bindComposer();
    const option = button(firstText);

    await option.click();

    await expect.element(composer).toHaveValue(firstText);
    const control = option.element();
    const durations = getComputedStyle(control).transitionDuration.split(',');
    expect(durations.map((duration) => Number.parseFloat(duration))).toEqual(
      durations.map(() => 0),
    );
    expect(control.getAnimations()).toHaveLength(0);
  } finally {
    await media.emulateReducedMotion(null);
  }
});

it('S9 lays out the first chip on the inline-start side in RTL', async () => {
  fixture.innerHTML = `<div dir="rtl">${group()}</div>`;
  const first = button(firstText);
  const second = button(secondText);
  await expect.element(first).toBeVisible();
  await expect.element(second).toBeVisible();

  const firstRect = first.element().getBoundingClientRect();
  const secondRect = second.element().getBoundingClientRect();
  expect(firstRect.left).toBeGreaterThan(secondRect.left);
  expect(Math.abs(firstRect.top - secondRect.top)).toBeLessThan(0.5);
});

it('S11 selects the updated title with whitespace normalized', async () => {
  fixture.innerHTML = group();
  await expect.element(button(secondText)).toBeVisible();
  const suggestion = fixture.querySelector('ki-suggestion[description]');
  if (!suggestion) throw new Error('Missing suggestion');
  const selected = listenForSelection();

  suggestion.textContent = '  Review   the\n changes  ';
  await button('Review the changes').click();

  expect(selected).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { text: 'Review the changes' } }),
  );
});

it('S12 cancelling selection preserves the draft and the focused suggestion', async () => {
  fixture.innerHTML = group('mode="fill"') + composerMarkup;
  const composer = bindComposer();
  const veto = vi.fn((event: Event) => {
    event.preventDefault();
  });
  const suggestions = fixture.querySelector('ki-suggestions');
  if (!suggestions) throw new Error('Missing suggestions');
  suggestions.addEventListener('ki-select', veto);
  const option = button(firstText);
  await expect.element(option).toBeVisible();
  (option.element() as HTMLButtonElement).focus();

  await userEvent.keyboard('{Enter}');

  expect(veto).toHaveBeenCalledTimes(1);
  await expect.element(composer).toHaveValue('Draft');
  expect(option.element().matches(':focus')).toBe(true);
});

it('S13 the card description paints its rest, hover and pressed backgrounds', async () => {
  fixture.innerHTML = group('variant="cards"');
  const action = button(secondText);
  await expect.element(action).toBeVisible();
  const details = page.getByText(description, { exact: true }).element();
  const rest = 'rgb(210, 235, 250)';
  const hover = 'rgb(220, 240, 230)';
  const press = 'rgb(200, 230, 215)';
  try {
    await media.emulateReducedMotion('reduce');
    fixture.style.setProperty('--ki-suggestion-card-description-bg', rest);
    fixture.style.setProperty('--ki-suggestion-card-hover-description-bg', hover);
    fixture.style.setProperty('--ki-suggestion-card-pressed-description-bg', press);
    await parkPointer();
    expect(getComputedStyle(details).backgroundColor).toBe(rest);
    await action.hover();
    expect(getComputedStyle(details).backgroundColor).toBe(hover);
    (action.element() as HTMLElement).focus();
    await userEvent.keyboard('{ >}');
    try {
      expect(getComputedStyle(details).backgroundColor).toBe(press);
    } finally {
      await userEvent.keyboard('{/ }');
    }
  } finally {
    await media.emulateReducedMotion(null);
  }
});
