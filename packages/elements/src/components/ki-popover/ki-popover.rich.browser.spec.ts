// @spec:132-rich-tooltip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as definePopover } from '../../../dist/components/ki-popover.js';

const fixture = document.createElement('main');
const style = document.createElement('style');

beforeAll(() => {
  defineButton();
  definePopover();
  style.textContent = tokensCss;
  fixture.style.cssText = 'padding: 8rem; text-align: center; background: var(--ki-surface-s0);';
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.style.removeProperty('--ki-tooltip-rich-max-width');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

async function mount(
  content = '<ki-button variant="ghost" size="sm">Learn more</ki-button>',
  placement = 'bottom-start',
) {
  fixture.innerHTML = `
    <button id="contrast" type="button" tabindex="0">Contrast</button>
    <ki-popover for="contrast" label="About contrast mode" kind="toggletip" appearance="rich" placement="${placement}">
      <strong>Contrast mode</strong><p>Kimen follows the system setting.</p>${content}
    </ki-popover>
    <button type="button" tabindex="0">Next</button>
  `;
  const trigger = page.getByRole('button', { name: 'Contrast', exact: true });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  return {
    trigger,
    action: page.getByRole('button', { name: 'Learn more' }),
    next: page.getByRole('button', { name: 'Next' }),
    dialog: page.getByRole('dialog', { name: 'About contrast mode' }),
  };
}

it('S3 click opens the rich toggletip and focuses the action', async () => {
  const { trigger, dialog, action } = await mount();

  await trigger.click();

  await expect.element(dialog).toBeVisible();
  await action.findElement();
  await expect
    .poll(() => fixture.querySelector('ki-button')?.shadowRoot?.activeElement === action.element())
    .toBe(true);
});

it('S4 outside click dismisses and leaves focus on the outside control', async () => {
  const { trigger, next, dialog } = await mount();
  await trigger.click();

  await next.click();

  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(next).toHaveFocus();
});

it('S7 Enter from the trigger opens the rich toggletip and focuses its action', async () => {
  const { trigger, action } = await mount('<button type="button" tabindex="0">Learn more</button>');
  trigger.element().focus();

  await userEvent.keyboard('{Enter}');

  await expect.element(action).toHaveFocus();
});

it('S8 Escape closes the panel and restores trigger focus', async () => {
  const { trigger, action, dialog } = await mount(
    '<button type="button" tabindex="0">Learn more</button>',
  );
  await trigger.click();
  await expect.element(action).toHaveFocus();

  await userEvent.keyboard('{Escape}');

  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

it('S10 exposes a named non-modal dialog with available actions and passes axe', async () => {
  const { trigger, dialog, action } = await mount();

  await trigger.click();

  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect.element(dialog).toBeVisible();
  await expect.element(dialog).not.toHaveAttribute('aria-modal', 'true');
  await expect.element(action).toBeVisible();
  await expectAccessible(fixture);
});

it('S10 focuses the titled panel when no action is available', async () => {
  const { trigger, dialog } = await mount('');

  await trigger.click();

  const surface = await dialog.findElement();
  const root = surface.getRootNode();
  if (!(root instanceof ShadowRoot)) throw new Error('Expected the popover shadow root');
  await expect.poll(() => root.activeElement === surface).toBe(true);
});

it('S13 places rich inline-start on the right in RTL', async () => {
  fixture.dir = 'rtl';
  fixture.style.setProperty('--ki-tooltip-rich-max-width', '7rem');
  const { trigger, dialog } = await mount(undefined, 'start');

  await trigger.click();

  await expect.element(dialog).toBeVisible();
  await expect
    .poll(
      () =>
        dialog.element().getBoundingClientRect().left >
        trigger.element().getBoundingClientRect().right,
    )
    .toBe(true);
});
