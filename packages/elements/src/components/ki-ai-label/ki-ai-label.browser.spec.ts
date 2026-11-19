// @spec:089-ki-ai-label
import baseCss from '@kimen/tokens/css/base?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-ai-label.js';
import { defineCustomElement as defineKiInput } from '../../../dist/components/ki-input.js';

const explanation = 'Written from the incident reports of the last 30 days.';
const triggerName = 'AI-generated: about this content';
const dialogName = 'About this content';
const styles = document.createElement('style');
const fixture = document.createElement('main');
const isChromium = navigator.userAgent.includes('Chrome/');

const browserCommands = commands as unknown as {
  accessibilityTree: () => Promise<{ role: string; name: string; description: string }[] | null>;
  emulateForcedColors: (mode: 'active' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  defineKiInput();
  styles.textContent = tokensCss + baseCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function required<T extends Element>(element: T | null | undefined, name: string): T {
  if (!element) {
    throw new Error(`Missing ${name}`);
  }
  return element;
}

function part(host: Element, name: string): HTMLElement {
  return required(host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`), name);
}

function mountLabel(text?: string, revertible = false) {
  const label = document.createElement('ki-ai-label');
  if (text !== undefined) {
    label.setAttribute('explanation', text);
  }
  label.toggleAttribute('revertible', revertible);
  fixture.append(label);
  return label;
}

const trigger = () => page.getByRole('button', { name: triggerName, exact: true });
const dialog = () => page.getByRole('dialog', { name: dialogName, exact: true });
const revertAction = () => page.getByRole('button', { name: 'Revert to my text', exact: true });

it.each([undefined, '', '  '])('S1 stays static when the explanation is %s', async (text) => {
  mountLabel(text, true);

  await expect.element(page.getByText('AI', { exact: true })).toBeVisible();
  await expect.element(trigger()).not.toBeInTheDocument();
  await expect.element(revertAction()).not.toBeInTheDocument();
});

it('S2 shows plain-text provenance in a non-modal dialog and dismisses outside', async () => {
  const literalExplanation = `<strong>${explanation}</strong>`;
  const label = mountLabel(literalExplanation);
  label.setAttribute('model', 'Standard');
  label.setAttribute('generated-at', '2026-11-19T10:32');
  const outside = document.createElement('button');
  outside.textContent = 'Continue';
  fixture.append(outside);

  await trigger().click();

  await expect.element(dialog()).toBeVisible();
  await expect.element(dialog()).not.toHaveAttribute('aria-modal', 'true');
  await expect.element(page.getByText(literalExplanation, { exact: true })).toBeVisible();
  await expect.element(page.getByText('Standard', { exact: true })).toBeVisible();
  await expect.element(page.getByText('2026-11-19T10:32', { exact: true })).toBeVisible();
  await expect.element(revertAction()).not.toBeInTheDocument();
  await expectAccessible(label);

  await userEvent.click(outside);

  await expect.element(dialog()).not.toBeInTheDocument();
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
});

it('S3 sends one revert request without changing or submitting the field', async () => {
  const label = mountLabel(explanation, true);
  label.slot = 'end';
  const form = document.createElement('form');
  const field = document.createElement('ki-input');
  field.setAttribute('label', 'Subject');
  field.setAttribute('name', 'subject');
  field.setAttribute('value', 'Incident summary');
  field.append(label);
  form.append(field);
  fixture.append(form);
  const reverted = vi.fn();
  const submitted = vi.fn((event: Event) => { event.preventDefault(); });
  form.addEventListener('ki-revert', reverted);
  form.addEventListener('submit', submitted);

  await trigger().click();
  await expectAccessible(form);
  await revertAction().click();

  expect(reverted).toHaveBeenCalledTimes(1);
  expect(reverted.mock.calls[0]?.[0]).toMatchObject({ bubbles: true, composed: true });
  expect(submitted).not.toHaveBeenCalled();
  expect(new FormData(form).get('subject')).toBe('Incident summary');
  await expect.element(dialog()).not.toBeInTheDocument();
  expect(label.shadowRoot?.activeElement).toBe(part(label, 'trigger'));
});

it('S4 opens on Enter and returns focus on Escape', async () => {
  const label = mountLabel(explanation, true);
  await expect.element(trigger()).toBeVisible();
  const button = part(label, 'trigger');
  button.focus();

  await userEvent.keyboard('{Enter}');

  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'true');
  expect(label.shadowRoot?.activeElement).toBe(part(label, 'popover'));

  await userEvent.keyboard('{Escape}');

  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  await expect.element(dialog()).not.toBeInTheDocument();
  expect(label.shadowRoot?.activeElement).toBe(button);
});

it('S5 Tabs from the explanation to its action and then out to the next control', async () => {
  const label = mountLabel(explanation, true);
  const next = document.createElement('button');
  next.tabIndex = 0;
  next.textContent = 'Next';
  fixture.append(next);
  await expect.element(trigger()).toBeVisible();
  part(label, 'trigger').focus();
  await userEvent.keyboard(' ');
  await expect.element(dialog()).toBeVisible();

  await userEvent.tab();
  await expect.element(revertAction()).toHaveFocus();

  await userEvent.tab();

  expect(document.activeElement).toBe(next);
  await expect.element(dialog()).not.toBeInTheDocument();
});

it('S6 exposes the disclosure name, collapsed state and dialog relationship', async () => {
  const label = mountLabel(explanation);

  await expect.element(trigger()).toHaveAccessibleName(triggerName);
  await expect.element(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
  await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
  const controls = part(label, 'trigger').getAttribute('aria-controls') ?? '';
  expect(label.shadowRoot?.getElementById(controls)).toBe(part(label, 'popover'));
});

function describedText(input: HTMLElement): string {
  const tree = input.getRootNode() as ShadowRoot;
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => required(tree.getElementById(id), id).textContent.trim())
    .join(' ');
}

it('S7 combines the input help and suggestion in the textbox description', async () => {
  const label = mountLabel();
  label.slot = 'end';
  const field = document.createElement('ki-input');
  field.setAttribute('label', 'Subject');
  field.setAttribute('help-text', 'Keep it brief.');
  field.append(label);
  fixture.append(field);
  const textbox = page.getByRole('textbox', { name: 'Subject', exact: true });

  await expect.element(textbox).toBeVisible();
  const input = part(field, 'input');
  input.focus();

  await expect.poll(() => describedText(input)).toBe('Keep it brief. Suggested by AI');
  if (isChromium) {
    await expect
      .poll(async () => {
        const nodes = await browserCommands.accessibilityTree();
        return nodes?.find((node) => node.role === 'textbox' && node.name === 'Subject')
          ?.description;
      })
      .toBe('Keep it brief. Suggested by AI');
  }
  field.setAttribute('ai-suggestion-text', 'AI suggestion');
  await expect.poll(() => describedText(input)).toBe('Keep it brief. AI suggestion');

  label.remove();

  await expect.poll(() => describedText(input)).toBe('Keep it brief.');
});

it('S8 submits only the native field value', async () => {
  fixture.innerHTML = `<form><ki-input label="Subject" name="subject" value="Incident summary">
    <ki-ai-label slot="end"></ki-ai-label></ki-input></form>`;
  const form = required(fixture.querySelector('form'), 'the form');
  const submitted = vi.fn((event: Event) => {
    event.preventDefault();
    return [...new FormData(form)];
  });
  form.addEventListener('submit', submitted);
  await expect.element(page.getByRole('textbox', { name: 'Subject' })).toBeVisible();

  form.requestSubmit();

  expect(submitted).toHaveReturnedWith([['subject', 'Incident summary']]);
});

it('S9 resolves the mark colors from reassigned theme tokens', async () => {
  const label = mountLabel();
  label.style.setProperty('--ki-surface-primary-low-em', 'navy');
  label.style.setProperty('--ki-text-primary-on-primary-light', 'white');
  await expect.element(page.getByText('AI', { exact: true })).toBeVisible();

  const style = getComputedStyle(part(label, 'label'));
  expect(style.backgroundColor).toBe('rgb(0, 0, 128)');
  expect(style.color).toBe('rgb(255, 255, 255)');
  expect(style.backgroundImage).toBe('none');
});

it('S10 puts the sparkles at the logical start in RTL', async () => {
  fixture.dir = 'rtl';
  const label = mountLabel();
  await expect.element(page.getByText('AI', { exact: true })).toBeVisible();

  const text = required(part(label, 'label').querySelector('span'), 'the AI text');
  expect(part(label, 'icon').getBoundingClientRect().left).toBeGreaterThan(
    text.getBoundingClientRect().right,
  );
});

it('S11 preserves the outlines of the mark and panel in forced colors', async (context) => {
  const result = await browserCommands.emulateForcedColors('active');
  try {
    if (result === false) {
      expect(isChromium).toBe(false);
      context.skip('this engine cannot emulate a forced palette');
    }
    const label = mountLabel(explanation);
    await trigger().click();
    await expect.element(dialog()).toBeVisible();
    const witness = document.createElement('span');
    witness.style.backgroundColor = 'rgb(1, 2, 3)';
    witness.style.color = 'CanvasText';
    fixture.append(witness);
    if (getComputedStyle(witness).backgroundColor === 'rgb(1, 2, 3)') {
      expect(isChromium).toBe(false);
      context.skip('this engine does not repaint under forced-palette emulation');
    }

    const forcedText = getComputedStyle(witness).color;
    for (const name of ['label', 'popover']) {
      const style = getComputedStyle(part(label, name));
      expect(style.borderBlockStartStyle).toBe('solid');
      expect(style.borderBlockStartColor).toBe(forcedText);
    }
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S12 opens without animation under reduced motion', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  try {
    const label = mountLabel(explanation);
    await trigger().click();

    await expect.element(dialog()).toBeVisible();
    expect(part(label, 'popover').getAnimations({ subtree: true })).toEqual([]);
  } finally {
    await browserCommands.emulateReducedMotion(null);
  }
});
