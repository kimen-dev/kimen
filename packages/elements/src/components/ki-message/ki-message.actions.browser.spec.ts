// @spec:131-message-actions
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { actionsOpacity, showTranscript } from '../../../browser-tests/ki-message-actions.fixture';
import { defineCustomElement as defineConversation } from '../../../dist/components/ki-conversation.js';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement as defineMessage } from '../../../dist/components/ki-message.js';

const fixture = document.createElement('main');
const style = document.createElement('style');
const button = (name: string) => page.getByRole('button', { name, exact: true });

beforeAll(() => {
  defineConversation();
  defineIconButton();
  defineMessage();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

async function expectFocus(element: Element): Promise<void> {
  const root = element.getRootNode();
  await expect
    .poll(
      () =>
        (root instanceof ShadowRoot || root instanceof Document) && root.activeElement === element,
    )
    .toBe(true);
}

async function reply(options = '') {
  fixture.innerHTML = `
    <ki-message id="reply" actions-label="Reply actions" ${options}>
      Choose the JSON format.
      <button type="button" slot="actions">Copy</button>
      <ki-icon-button slot="actions" label="Regenerate" variant="ghost" size="sm"
        data-message-action="regenerate"></ki-icon-button>
      <ki-icon-button slot="actions" label="Good response" variant="ghost" size="sm"
        data-message-action="good"></ki-icon-button>
      <ki-icon-button slot="actions" label="Bad response" variant="ghost" size="sm"
        data-message-action="bad"></ki-icon-button>
      <button type="button" slot="actions">More actions</button>
    </ki-message>
  `;
  await expect.element(page.getByRole('toolbar', { name: 'Reply actions' })).toBeVisible();
  const message = fixture.querySelector<HTMLKiMessageElement & { branchIndex: number }>(
    'ki-message',
  );
  if (!message) throw new Error('Missing reply');
  return message;
}

it('keeps both reply toolbars visible on a device without hover', async (test) => {
  if (!matchMedia('(hover: none)').matches) {
    test.skip('This light project has a hovering pointer');
  }
  await showTranscript(fixture);

  await expect
    .poll(
      () =>
        actionsOpacity(fixture, '#earlier') === '1' && actionsOpacity(fixture, '#latest') === '1',
    )
    .toBe(true);
});

it('S3 emits one regenerate request from a slotted icon action', async () => {
  const message = await reply();
  const regenerate = vi.fn();
  fixture.addEventListener('ki-regenerate', regenerate, { once: true });
  const onMessage = vi.fn();
  message.addEventListener('ki-regenerate', onMessage);

  await button('Regenerate').click();

  expect(regenerate).toHaveBeenCalledOnce();
  expect(onMessage).toHaveBeenCalledOnce();
});

it('S4 requests the next branch and waits for the app to update the index', async () => {
  const message = await reply('branch-index="2" branch-count="3"');
  const change = vi.fn();
  message.addEventListener('ki-branch-change', change);

  await button('Next response').click();

  expect(change).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ detail: { index: 3 } }));
  expect(message.branchIndex).toBe(2);
  await expect.element(page.getByText('2 / 3', { exact: true })).toBeVisible();
});

it('S5 does not request a branch past the final response', async () => {
  const message = await reply('branch-index="3" branch-count="3"');
  const change = vi.fn();
  message.addEventListener('ki-branch-change', change);
  const next = button('Next response');
  await expect.element(next).toHaveAttribute('aria-disabled', 'true');

  (next.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');

  expect(change).not.toHaveBeenCalled();
  await expect.element(page.getByText('3 / 3', { exact: true })).toBeVisible();
});

it('S6 leaves custom slotted actions visible without toolbar opt-in', async () => {
  fixture.innerHTML = `
    <ki-conversation label="Project chat">
      <ki-message id="earlier">
        First reply.
        <button type="button" slot="actions">Show source</button>
      </ki-message>
      <ki-message>Second reply.</ki-message>
    </ki-conversation>
  `;

  await expect.element(button('Show source')).toBeVisible();
  expect(actionsOpacity(fixture, '#earlier')).toBe('1');
});

it('S7 enters an earlier toolbar and leaves it on the next Tab', async () => {
  await showTranscript(fixture);
  (button('Before').element() as HTMLElement).focus();
  await userEvent.tab();
  await expectFocus(page.getByRole('log').element());
  await userEvent.tab();
  await expect.element(button('Copy earlier')).toHaveFocus();

  await userEvent.tab();

  await expect.element(button('Copy latest')).toHaveFocus();
});

it('S8 uses horizontal arrows and Home to move across actions and branch controls', async () => {
  await reply('branch-index="2" branch-count="3"');
  (button('More actions').element() as HTMLElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expectFocus(button('Previous response').element());
  await userEvent.keyboard('{Home}');
  await expect.element(button('Copy')).toHaveFocus();
});

it('S9 exposes mutually exclusive pressed states and reports bad feedback immediately', async () => {
  const message = await reply('feedback="good"');
  const feedback = vi.fn();
  message.addEventListener('ki-feedback', feedback);
  const good = button('Good response');
  const bad = button('Bad response');
  await expect.element(good).toHaveAttribute('aria-pressed', 'true');

  await bad.click();

  await expect.element(bad).toHaveAttribute('aria-pressed', 'true');
  await expect.element(good).toHaveAttribute('aria-pressed', 'false');
  expect(feedback).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { value: 'bad' } }),
  );
});

it('S10 updates the polite branch status and keeps focus at the boundary', async () => {
  const message = await reply('branch-index="2" branch-count="3"');
  const next = button('Next response');
  const focused = next.element() as HTMLElement;
  focused.focus();
  await expectFocus(focused);

  message.branchIndex = 3;

  await expect
    .element(page.getByText('Response 3 of 3', { exact: true }))
    .toHaveAttribute('role', 'status');
  await expect.element(next).toHaveAttribute('aria-disabled', 'true');
  await expectFocus(focused);
});

it('S11 places the previous control at the inline start in RTL', async () => {
  await reply('dir="rtl" branch-index="2" branch-count="3"');
  const previous = button('Previous response');
  const next = button('Next response');
  await expect.element(previous).toBeVisible();

  expect(previous.element().getBoundingClientRect().left).toBeGreaterThan(
    next.element().getBoundingClientRect().right,
  );
});
