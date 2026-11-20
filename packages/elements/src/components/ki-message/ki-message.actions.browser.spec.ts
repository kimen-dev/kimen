// @spec:131-message-actions
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
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

function actionsOpacity(id: string): string {
  const actions = fixture.querySelector(id)?.shadowRoot?.querySelector('[part="actions"]');
  return actions ? getComputedStyle(actions).opacity : '';
}

async function transcript(): Promise<void> {
  fixture.innerHTML = `
    <button type="button" tabindex="0">Before</button>
    <ki-conversation label="Project chat">
      <ki-message id="earlier" author="First answer" actions-label="First reply actions">
        Start with the export guide.
        <button type="button" slot="actions">Copy earlier</button>
        <button type="button" slot="actions" data-message-action="regenerate">Retry earlier</button>
      </ki-message>
      <ki-message id="latest" author="Second answer" actions-label="Second reply actions">
        Choose the JSON format.
        <button type="button" slot="actions">Copy latest</button>
      </ki-message>
      <ki-message message-role="user">Thanks.</ki-message>
    </ki-conversation>
    <button type="button" tabindex="0">After</button>
  `;
  await expect.element(page.getByRole('toolbar', { name: 'Second reply actions' })).toBeVisible();
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

it('S1 shows the latest assistant toolbar even after a user turn', async () => {
  await transcript();

  await expect.poll(() => actionsOpacity('#earlier')).toBe('0');
  expect(actionsOpacity('#latest')).toBe('1');
});

it('S2 reveals the earlier reply toolbar when the reply is hovered', async () => {
  await transcript();
  await expect.poll(() => actionsOpacity('#earlier')).toBe('0');

  await userEvent.hover(page.getByRole('article', { name: 'First answer' }).element());

  await expect.poll(() => actionsOpacity('#earlier')).toBe('1');
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
  expect(actionsOpacity('#earlier')).toBe('1');
});

it('S7 reveals an earlier toolbar on keyboard entry and leaves on the next Tab', async () => {
  await transcript();
  (button('Before').element() as HTMLElement).focus();
  await userEvent.tab();
  await expect.element(page.getByRole('log')).toHaveFocus();
  await userEvent.tab();
  await expect.element(button('Copy earlier')).toHaveFocus();
  await expect.poll(() => actionsOpacity('#earlier')).toBe('1');

  await userEvent.tab();

  await expect.element(button('Copy latest')).toHaveFocus();
  await expect.poll(() => actionsOpacity('#earlier')).toBe('0');
});

it('S8 uses horizontal arrows and Home to move across actions and branch controls', async () => {
  await reply('branch-index="2" branch-count="3"');
  (button('More actions').element() as HTMLElement).focus();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(button('Previous response')).toHaveFocus();
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
  (next.element() as HTMLElement).focus();

  message.branchIndex = 3;

  await expect
    .element(page.getByText('Response 3 of 3', { exact: true }))
    .toHaveAttribute('role', 'status');
  await expect.element(next).toHaveAttribute('aria-disabled', 'true');
  await expect.element(next).toHaveFocus();
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
