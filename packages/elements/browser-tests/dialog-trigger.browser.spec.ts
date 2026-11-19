// @spec:078-dialog-trigger
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineIconButton } from '../dist/components/ki-icon-button.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateForcedColors: (forcedColors: 'active' | null) => Promise<void>;
};

const trigger =
  '<ki-button id="opener" commandfor="delete" command="show-modal">Delete project…</ki-button>';
const dialog = `<ki-dialog id="delete" heading="Delete project?">
  Delete this project and its data for everyone.
  <ki-button slot="footer" commandfor="delete" command="close" autofocus>Cancel</ki-button>
</ki-dialog>`;

beforeAll(() => {
  defineButton();
  defineDialog();
  defineIconButton();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

let forcedColors = false;
afterEach(async () => {
  vi.unstubAllGlobals();
  document.body.querySelector('main')?.remove();
  await parkPointer();
  if (forcedColors) {
    forcedColors = false;
    await browserCommands.emulateForcedColors(null);
  }
});

async function mount(markup: string): Promise<HTMLElement> {
  const fixture = document.createElement('main');
  fixture.innerHTML = markup;
  document.body.append(fixture);
  await expect
    .poll(() =>
      Array.from(fixture.querySelectorAll('ki-button, ki-icon-button, ki-dialog')).every((host) =>
        Boolean(host.shadowRoot?.querySelector('button, dialog')),
      ),
    )
    .toBe(true);
  return fixture;
}

function dialogPart(fixture: ParentNode, selector = '#delete'): HTMLDialogElement {
  const part = fixture.querySelector(selector)?.shadowRoot?.querySelector('dialog');
  if (!part) {
    throw new Error(`Missing dialog part for ${selector}`);
  }
  return part;
}

function buttonPart(fixture: ParentNode, selector = '#opener'): HTMLButtonElement {
  const part = fixture.querySelector(selector)?.shadowRoot?.querySelector('button');
  if (!part) {
    throw new Error(`Missing button part for ${selector}`);
  }
  return part;
}

function watchClose(fixture: HTMLElement): string[] {
  const reasons: string[] = [];
  fixture.addEventListener('ki-close', (event) => {
    reasons.push((event as CustomEvent<{ reason: string }>).detail.reason);
  });
  return reasons;
}

async function openWithPointer(): Promise<void> {
  await page.getByRole('button', { name: 'Delete project…' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Delete project?' })).toBeVisible();
}

describe('dialog invoker commands', () => {
  it.each(['browser', 'fallback'])(
    'S1 opens by pointer with the %s command event',
    async (implementation) => {
      if (implementation === 'fallback') {
        vi.stubGlobal('CommandEvent', undefined);
      }
      const fixture = await mount(trigger + dialog);
      const button = buttonPart(fixture);
      expect(button.getAttribute('commandfor')).toBe('delete');
      expect(button.getAttribute('command')).toBe('show-modal');

      await openWithPointer();
      expect(dialogPart(fixture).matches(':modal')).toBe(true);
    },
  );

  it('S2 opens from a focused icon button with Enter', async () => {
    const fixture = await mount(`
      <ki-icon-button id="opener" label="Project details" commandfor="delete" command="show-modal">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
      </ki-icon-button>
      ${dialog.replace('Delete project?', 'Project details')}
    `);
    buttonPart(fixture).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('dialog', { name: 'Project details' })).toBeVisible();
  });

  it('S3 gives the native control dialog popup and live expanded state', async () => {
    const fixture = await mount(trigger + dialog);
    const button = buttonPart(fixture);
    await expect
      .element(page.getByRole('button', { name: 'Delete project…', expanded: false }))
      .toHaveAttribute('aria-haspopup', 'dialog');

    await openWithPointer();
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    await expect.element(page.getByRole('dialog', { name: 'Delete project?' })).toBeVisible();
  });

  it('S4 opens from the default button inside a form without submitting it', async () => {
    const fixture = await mount(`
      <form>
        <ki-button id="opener" commandfor="delete" command="show-modal">Preview</ki-button>
      </form>
      ${dialog.replace('Delete project?', 'Preview changes')}
    `);
    const submissions: Event[] = [];
    fixture.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions.push(event);
    });
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect.element(page.getByRole('dialog', { name: 'Preview changes' })).toBeVisible();
    expect(submissions).toHaveLength(0);
  });

  it('S5 exposes the modal and keyboard focus indicator in forced colors', async (context) => {
    forcedColors = true;
    await browserCommands.emulateForcedColors('active');
    const witness = document.createElement('span');
    witness.style.backgroundColor = 'rgb(1, 2, 3)';
    document.body.append(witness);
    const paletteApplies =
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
    witness.remove();
    if (!paletteApplies && !navigator.userAgent.includes('Chrome/')) {
      context.skip('The engine does not apply a forced palette under emulation');
      return;
    }
    expect(paletteApplies).toBe(true);

    const fixture = await mount(trigger + dialog);
    buttonPart(fixture).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('dialog', { name: 'Delete project?' })).toBeVisible();
    const cancel = buttonPart(fixture, '[slot="footer"]');
    await expect.poll(() => cancel.matches(':focus-visible')).toBe(true);
    const outline = getComputedStyle(cancel);
    expect(outline.outlineStyle).toBe('solid');
    expect(outline.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('S6 respects a canceled request-close and reports command when accepted', async () => {
    const fixture = await mount(
      trigger + dialog.replace('command="close"', 'command="request-close"'),
    );
    const part = dialogPart(fixture);
    const reasons = watchClose(fixture);
    const requests: Event[] = [];
    part.addEventListener(
      'cancel',
      (event) => {
        requests.push(event);
        event.preventDefault();
      },
      { once: true },
    );

    await openWithPointer();
    const cancel = page.getByRole('button', { name: 'Cancel' });
    await cancel.click();
    expect(requests).toHaveLength(1);
    expect(part.open).toBe(true);
    expect(reasons).toEqual([]);

    await cancel.click();
    await expect.poll(() => reasons).toEqual(['command']);
    expect(part.open).toBe(false);
  });

  it('S7 closes on Escape and restores the collapsed opener', async () => {
    const fixture = await mount(trigger + dialog);
    const reasons = watchClose(fixture);
    await openWithPointer();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => reasons).toEqual(['escape']);
    const opener = page.getByRole('button', { name: 'Delete project…', expanded: false });
    await expect.element(opener).toHaveFocus();
  });

  it('S8 refuses a second modal invoked from the open one', async () => {
    const fixture = await mount(`
      ${trigger}
      <ki-dialog id="delete" heading="Delete project?">
        <ki-button slot="footer" commandfor="details" command="show-modal">More details</ki-button>
      </ki-dialog>
      <ki-dialog id="details" heading="Project details">Details</ki-dialog>
    `);
    await openWithPointer();
    await page.getByRole('button', { name: 'More details' }).click();
    expect(dialogPart(fixture).matches(':modal')).toBe(true);
    expect(dialogPart(fixture, '#details').open).toBe(false);
  });

  it.each(['pointer', 'keyboard'])(
    'S9 closes from the footer by %s and restores the opener',
    async (input) => {
      const fixture = await mount(trigger + dialog);
      const reasons = watchClose(fixture);
      await openWithPointer();
      const cancel = page.getByRole('button', { name: 'Cancel' });
      if (input === 'keyboard') {
        await expect.element(cancel).toHaveFocus();
        await userEvent.keyboard(' ');
      } else {
        await cancel.click();
      }

      await expect.poll(() => reasons).toEqual(['command']);
      await expect
        .element(page.getByRole('button', { name: 'Delete project…', expanded: false }))
        .toHaveFocus();
      expect(dialogPart(fixture).open).toBe(false);
    },
  );

  it('ignores a repeated open command until the previous command close settles', async () => {
    const fixture = await mount(trigger + dialog);
    const reasons = watchClose(fixture);
    await openWithPointer();

    buttonPart(fixture, '[slot="footer"]').click();
    buttonPart(fixture).click();

    await expect.poll(() => reasons).toEqual(['command']);
    expect(dialogPart(fixture).open).toBe(false);
    await openWithPointer();
    expect(reasons).toEqual(['command']);
  });

  it('keeps lookup in the invoker tree and follows a late target', async () => {
    const fixture = await mount(dialog);
    const region = document.createElement('section');
    const shadow = region.attachShadow({ mode: 'open' });
    shadow.innerHTML = trigger;
    fixture.append(region);
    const opener = page.getByRole('button', { name: 'Delete project…' });
    await expect.element(opener).toBeVisible();
    await opener.click();
    expect(dialogPart(fixture).open).toBe(false);

    const inner = document.createElement('section');
    inner.innerHTML = dialog;
    shadow.append(inner);
    await expect
      .poll(() => Boolean(shadow.querySelector('#delete')?.shadowRoot?.firstChild))
      .toBe(true);
    await openWithPointer();
    expect(dialogPart(shadow).open).toBe(true);
    expect(dialogPart(fixture).open).toBe(false);
  });

  it.each(['loading', 'disabled'])('keeps a %s command button inactive', async (state) => {
    const fixture = await mount(trigger.replace('id="opener"', `id="opener" ${state}`) + dialog);
    buttonPart(fixture).click();
    expect(dialogPart(fixture).open).toBe(false);
  });
});
