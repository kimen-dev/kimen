// @spec:131-message-actions
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { actionsOpacity, showTranscript } from '../../../browser-tests/ki-message-actions.fixture';
import { defineCustomElement as defineConversation } from '../../../dist/components/ki-conversation.js';
import { defineCustomElement as defineMessage } from '../../../dist/components/ki-message.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};
const fixture = document.createElement('main');
const style = document.createElement('style');

beforeAll(() => {
  defineConversation();
  defineMessage();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

beforeEach(parkPointer);

afterEach(async () => {
  fixture.replaceChildren();
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

async function restOpacity(): Promise<'0' | '1'> {
  // CDP can disable touch emulation, but a headless engine can still report
  // no hovering device. Check the actual media query in either case.
  const emulated = await browserCommands.emulateHoverCapability('hover');
  expect(emulated).toBe(navigator.userAgent.includes('Chrome/'));
  await showTranscript(fixture);
  return matchMedia('(hover: hover)').matches ? '0' : '1';
}

it('S1 shows the latest assistant toolbar even after a user turn', async () => {
  const resting = await restOpacity();

  await expect
    .poll(
      () =>
        actionsOpacity(fixture, '#latest') === '1' &&
        actionsOpacity(fixture, '#earlier') === resting,
    )
    .toBe(true);
});

it('S2 reveals an earlier toolbar on hover when the device supports it', async () => {
  const resting = await restOpacity();
  await expect.poll(() => actionsOpacity(fixture, '#earlier') === resting).toBe(true);

  const article = page.getByRole('article', { name: 'First answer' }).element();
  await userEvent.hover(article);

  await expect
    .poll(
      () =>
        (resting === '1' || article.matches(':hover')) &&
        actionsOpacity(fixture, '#earlier') === '1',
    )
    .toBe(true);
  await parkPointer();
  await expect.poll(() => actionsOpacity(fixture, '#earlier') === resting).toBe(true);
});

it('S7 reveals the earlier toolbar while keyboard focus stays in it', async () => {
  const resting = await restOpacity();
  await expect.poll(() => actionsOpacity(fixture, '#earlier') === resting).toBe(true);
  const log = page.getByRole('log').element() as HTMLElement;
  log.focus();

  await userEvent.tab();

  await expect.element(page.getByRole('button', { name: 'Copy earlier' })).toHaveFocus();
  await expect.poll(() => actionsOpacity(fixture, '#earlier')).toBe('1');
  await userEvent.tab();
  await expect.poll(() => actionsOpacity(fixture, '#earlier') === resting).toBe(true);
});

it('keeps both toolbars visible with an emulated touch pointer', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    expect(navigator.userAgent.includes('Chrome/')).toBe(false);
    test.skip('This engine cannot emulate a touch pointer');
  }
  await expect.poll(() => matchMedia('(hover: none)').matches).toBe(true);
  await showTranscript(fixture);

  await expect
    .poll(
      () =>
        actionsOpacity(fixture, '#latest') === '1' && actionsOpacity(fixture, '#earlier') === '1',
    )
    .toBe(true);
});
