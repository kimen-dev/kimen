// @spec:083-ki-button-group
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButtonGroup } from '../../../dist/components/ki-button-group.js';
import { defineCustomElement as defineKiButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as defineKiIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement as defineKiTooltip } from '../../../dist/components/ki-tooltip.js';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const browserCommands = commands as unknown as {
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (motion: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const tokens = document.createElement('style');
const chevron =
  '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor"/></svg>';

beforeAll(() => {
  defineKiButton();
  defineKiIconButton();
  defineKiTooltip();
  defineKiButtonGroup();
  tokens.textContent = tokensCss;
  document.head.append(tokens);
});

afterEach(async () => {
  document.body.replaceChildren();
  await browserCommands.emulateForcedColors(null);
  await browserCommands.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  tokens.remove();
});

function mount(markup: string): HTMLElement {
  const fixture = document.createElement('main');
  fixture.style.cssText = 'padding: 48px; background-color: var(--ki-surface-s0);';
  fixture.innerHTML = markup;
  document.body.append(fixture);
  return fixture;
}

function requireElement(root: ParentNode | null, selector: string): HTMLElement {
  const element = root?.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing fixture element: ${selector}`);
  return element;
}

function controlOf(root: ParentNode, selector: string): HTMLElement {
  return requireElement(requireElement(root, selector).shadowRoot, '[part="button"]');
}

function focusedControl(): Element | null {
  const focused = document.activeElement;
  return focused?.shadowRoot?.activeElement ?? focused;
}

async function expectFocus(name: string): Promise<void> {
  const control = page.getByRole('button', { name, exact: true });
  await expect.element(control).toBeVisible();
  await expect.poll(focusedControl).toBe(control.element());
}

function gapBetween(first: Element, second: Element): number {
  return second.getBoundingClientRect().left - first.getBoundingClientRect().right;
}

function history(attributes = '', children = ''): string {
  return `<ki-button-group label="History" ${attributes}>
    <ki-button type="button" variant="primary" size="sm">Undo</ki-button>
    <ki-icon-button label="Redo" variant="secondary" size="lg">${chevron}</ki-icon-button>
    ${children}
  </ki-button-group>`;
}

async function mountToolbar(attributes = '', entries = ''): Promise<HTMLElement> {
  const fixture = mount(`
    <button>Before</button>
    <ki-button-group toolbar label="Formatting" ${attributes}>
      ${
        entries ||
        `
        <ki-button type="button">Bold</ki-button>
        <ki-icon-button label="Italic" disabled>${chevron}</ki-icon-button>
        <ki-button type="button" hidden>Underline</ki-button>
        <ki-icon-button label="Link">${chevron}</ki-icon-button>
      `
      }
    </ki-button-group>
    <button>After</button>
  `);
  await expect.element(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Bold' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Link' })).toBeVisible();
  return fixture;
}

async function enterToolbar(fixture: HTMLElement): Promise<void> {
  requireElement(fixture, 'button').focus();
  await userEvent.keyboard('{Tab}');
  await expectFocus('Bold');
}

describe('ki-button-group', () => {
  it('S1 spaces its actions and leaves each action independently operable', async () => {
    const fixture = mount(history());
    const undo = page.getByRole('button', { name: 'Undo' });
    const redo = page.getByRole('button', { name: 'Redo' });
    await expect.element(undo).toBeVisible();
    await expect.element(redo).toBeVisible();
    expect(gapBetween(undo.element(), redo.element())).toBeGreaterThan(0);

    const onUndo = vi.fn();
    const onRedo = vi.fn();
    requireElement(fixture, 'ki-button').addEventListener('click', onUndo);
    requireElement(fixture, 'ki-icon-button').addEventListener('click', onRedo);
    await undo.click();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
    await redo.click();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it.each(['ltr', 'rtl'])(
    'S2 joins the inner edges and aligns the attached appearance in %s',
    async (direction) => {
      const fixture = mount(history(`attached dir="${direction}"`));
      const undo = page.getByRole('button', { name: 'Undo' });
      const redo = page.getByRole('button', { name: 'Redo' });
      await expect.element(undo).toBeVisible();
      await expect.element(redo).toBeVisible();
      const first = undo.element();
      const last = redo.element();

      await expect
        .poll(() =>
          Math.abs(first.getBoundingClientRect().height - last.getBoundingClientRect().height),
        )
        .toBeLessThan(1);
      const firstStyle = getComputedStyle(first);
      const lastStyle = getComputedStyle(last);
      await expect.poll(() => lastStyle.backgroundColor).toBe(firstStyle.backgroundColor);
      expect(firstStyle.borderStartEndRadius).toBe('0px');
      expect(firstStyle.borderEndEndRadius).toBe('0px');
      expect(lastStyle.borderStartStartRadius).toBe('0px');
      expect(lastStyle.borderEndStartRadius).toBe('0px');
      expect(Number.parseFloat(firstStyle.borderStartStartRadius)).toBeGreaterThan(0);
      expect(Number.parseFloat(lastStyle.borderStartEndRadius)).toBeGreaterThan(0);
      const [left, right] = direction === 'rtl' ? [last, first] : [first, last];
      expect(Math.abs(gapBetween(left, right))).toBeLessThanOrEqual(1.5);

      requireElement(fixture, 'ki-button-group').removeAttribute('attached');
      await expect
        .poll(() =>
          Math.abs(first.getBoundingClientRect().height - last.getBoundingClientRect().height),
        )
        .toBeGreaterThan(1);
    },
  );

  it('S3 applies an explicit size to both button types and restores authored sizes when cleared', async () => {
    const fixture = mount(history('size="xl"'));
    const group = requireElement(fixture, 'ki-button-group');
    const undo = requireElement(fixture, 'ki-button');
    const redo = requireElement(fixture, 'ki-icon-button');
    await expect
      .poll(() => [undo.getAttribute('size'), redo.getAttribute('size')])
      .toEqual(['xl', 'xl']);

    group.removeAttribute('size');

    await expect
      .poll(() => [undo.getAttribute('size'), redo.getAttribute('size')])
      .toEqual(['sm', 'lg']);
  });

  it('S4 keeps the primary action separate from the authored menu trigger', async () => {
    const fixture = mount(`
      <ki-button-group attached label="Save options">
        <ki-button type="button" variant="primary">Save</ki-button>
        <ki-icon-button label="More save options" variant="primary"
          aria-haspopup="menu" aria-expanded="false">${chevron}</ki-icon-button>
      </ki-button-group>
      <div id="save-options" role="menu" aria-label="Save as" popover="manual">
        <button role="menuitem">Save a copy</button>
      </div>
    `);
    const save = page.getByRole('button', { name: 'Save', exact: true });
    const more = page.getByRole('button', { name: 'More save options' });
    const menu = page.getByRole('menu', { name: 'Save as', includeHidden: true });
    const onSave = vi.fn();
    requireElement(fixture, 'ki-button').addEventListener('click', onSave);
    const trigger = requireElement(fixture, 'ki-icon-button');
    trigger.addEventListener('click', () => {
      requireElement(fixture, '#save-options').showPopover();
      requireElement(fixture, '[role="menuitem"]').focus();
      trigger.setAttribute('aria-expanded', 'true');
    });

    await expect.element(more).toHaveAttribute('aria-haspopup', 'menu');
    await expect.element(more).toHaveAttribute('aria-expanded', 'false');
    await save.click();
    expect(onSave).toHaveBeenCalledTimes(1);
    await expect.element(menu).not.toBeVisible();

    controlOf(fixture, 'ki-button').focus();
    await userEvent.keyboard('{Tab}');
    await expectFocus('More save options');
    await userEvent.keyboard('{Enter}');
    await expect.element(menu).toBeVisible();
    await expect.element(more).toHaveAttribute('aria-expanded', 'true');
    expect(focusedControl()).toBe(page.getByRole('menuitem', { name: 'Save a copy' }).element());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('S5 uses one Tab stop and remembers the last focused button on reentry', async () => {
    const fixture = await mountToolbar();

    await enterToolbar(fixture);
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus('Link');
    await userEvent.keyboard('{Tab}');
    await expectFocus('After');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expectFocus('Link');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expectFocus('Before');
  });

  it.each([
    ['ltr', '{ArrowRight}', '{ArrowLeft}'],
    ['rtl', '{ArrowLeft}', '{ArrowRight}'],
  ])(
    'S6 moves in the visual direction and wraps past unavailable actions in %s',
    async (direction, next, previous) => {
      const fixture = await mountToolbar(
        `dir="${direction}"`,
        `
        <ki-button type="button">Bold</ki-button>
        <ki-icon-button label="Italic" disabled>${chevron}</ki-icon-button>
        <ki-button type="button" hidden>Underline</ki-button>
        <ki-icon-button label="Link">${chevron}</ki-icon-button>
        <ki-button type="button">Clear formatting</ki-button>
      `,
      );

      await enterToolbar(fixture);
      await userEvent.keyboard(next);
      await expectFocus('Link');
      await userEvent.keyboard(next);
      await expectFocus('Clear formatting');
      await userEvent.keyboard(next);
      await expectFocus('Bold');
      await userEvent.keyboard(previous);
      await expectFocus('Clear formatting');
    },
  );

  it('S7 Home and End focus the first and last eligible actions', async () => {
    const fixture = await mountToolbar(
      '',
      `
      <ki-icon-button label="Previous" disabled>${chevron}</ki-icon-button>
      <ki-button type="button">Bold</ki-button>
      <ki-button type="button">Italic</ki-button>
      <ki-icon-button label="Link">${chevron}</ki-icon-button>
      <ki-button type="button" hidden>Underline</ki-button>
    `,
    );

    await enterToolbar(fixture);
    await userEvent.keyboard('{ArrowRight}{End}');
    await expectFocus('Link');
    await userEvent.keyboard('{Home}');
    await expectFocus('Bold');
  });

  it('S8 restores the ordinary Tab order when toolbar mode is removed', async () => {
    const fixture = await mountToolbar(
      '',
      `
      <ki-button type="button">Bold</ki-button>
      <ki-button type="button" tabindex="-1">Italic</ki-button>
      <ki-icon-button label="Link">${chevron}</ki-icon-button>
    `,
    );
    await enterToolbar(fixture);
    requireElement(fixture, 'ki-button-group').removeAttribute('toolbar');
    await expect.element(page.getByRole('group', { name: 'Formatting' })).toBeVisible();

    await userEvent.keyboard('{Tab}');
    await expectFocus('Link');
    await userEvent.keyboard('{Tab}');
    await expectFocus('After');
    expect(requireElement(fixture, 'ki-button[tabindex]').getAttribute('tabindex')).toBe('-1');
  });

  it('S9 exposes the named group and toolbar roles and passes axe', async () => {
    const fixture = mount(`
      ${history('attached')}
      <ki-button-group toolbar label="Formatting">
        <ki-button type="button">Bold</ki-button>
        <ki-button type="button">Italic</ki-button>
      </ki-button-group>
    `);

    const group = page.getByRole('group', { name: 'History' });
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await expect.element(group).toBeVisible();
    await expect.element(toolbar).toBeVisible();
    await expectAccessible(fixture);
  });

  it('S10 exposes the icon action name, tooltip and authored pressed state', async () => {
    const fixture = await mountToolbar(
      '',
      `
      <ki-tooltip label="Bold">
        <ki-icon-button label="Bold" aria-pressed="false">${chevron}</ki-icon-button>
      </ki-tooltip>
      <ki-icon-button label="Link">${chevron}</ki-icon-button>
    `,
    );
    const bold = page.getByRole('button', { name: 'Bold' });
    const icon = requireElement(fixture, 'ki-icon-button');
    icon.addEventListener('click', () => {
      icon.setAttribute('aria-pressed', 'true');
    });
    await expect.element(bold).toHaveAttribute('aria-pressed', 'false');

    await enterToolbar(fixture);
    await expect.element(page.getByRole('tooltip', { name: 'Bold' })).toBeVisible();
    await userEvent.keyboard(' ');
    await expect.element(page.getByRole('button', { name: 'Bold', pressed: true })).toBeVisible();
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus('Link');
  });

  it('S11 paints a framed toolbar and takes the authored divider colour', async () => {
    const fixture = await mountToolbar(
      'style="--ki-button-group-bg: rgb(235, 236, 240); --ki-button-group-divider: rgb(47, 51, 61)"',
      `
        <ki-button type="button">Bold</ki-button>
        <span role="separator" aria-orientation="vertical"></span>
        <ki-icon-button label="Link">${chevron}</ki-icon-button>
      `,
    );
    const frame = page.getByRole('toolbar', { name: 'Formatting' }).element();
    const separator = page.getByRole('separator');

    await expect.element(separator).toBeVisible();
    const frameStyle = getComputedStyle(frame);
    expect(frameStyle.backgroundColor).toBe('rgb(235, 236, 240)');
    expect(Number.parseFloat(frameStyle.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(Number.parseFloat(frameStyle.borderStartStartRadius)).toBeGreaterThan(0);
    expect(getComputedStyle(separator.element()).backgroundColor).toBe('rgb(47, 51, 61)');

    await enterToolbar(fixture);
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus('Link');
  });

  it('moves toolbar focus and shows an icon label without motion when reduced motion is requested', async () => {
    await browserCommands.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const fixture = await mountToolbar(
      '',
      `
      <ki-button type="button">Bold</ki-button>
      <ki-tooltip label="Link"><ki-icon-button label="Link">${chevron}</ki-icon-button></ki-tooltip>
    `,
    );

    await enterToolbar(fixture);
    await userEvent.keyboard('{ArrowRight}');
    await expectFocus('Link');

    const tooltip = page.getByRole('tooltip', { name: 'Link' });
    await expect.element(tooltip).toBeVisible();
    const bubble = getComputedStyle(tooltip.element());
    expect(bubble.transitionDuration).toBe('0s');
    expect(bubble.animationName).toBe('none');
    expect(getComputedStyle(controlOf(fixture, 'ki-icon-button')).transitionDuration).toBe('0s');
  });

  it('keeps a visible frame and keyboard focus under forced colours', async (context) => {
    await browserCommands.emulateForcedColors('active');
    if (
      !navigator.userAgent.includes('Chrome/') &&
      !matchMedia('(forced-colors: active)').matches
    ) {
      context.skip(`${navigator.userAgent} cannot emulate forced colours`);
    }
    await expect.poll(() => matchMedia('(forced-colors: active)').matches).toBe(true);

    const fixture = await mountToolbar();
    await enterToolbar(fixture);
    const frame = page.getByRole('toolbar', { name: 'Formatting' }).element();
    const frameStyle = getComputedStyle(frame);
    const focusStyle = getComputedStyle(controlOf(fixture, 'ki-button'));

    expect(Number.parseFloat(frameStyle.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(frameStyle.borderBlockStartColor).not.toBe(frameStyle.backgroundColor);
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
  });
});
