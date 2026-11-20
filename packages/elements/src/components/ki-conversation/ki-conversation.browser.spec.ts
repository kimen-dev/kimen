// @spec:115-ki-conversation
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineConversation } from '../../../dist/components/ki-conversation.js';
import { defineCustomElement as defineMessage } from '../../../dist/components/ki-message.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const jump = page.getByRole('button', { name: 'Jump to latest' });
const log = page.getByRole('log', { name: 'Project chat' });

beforeAll(() => {
  defineConversation();
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

function message(text: string, streaming = false): HTMLElement {
  const element = document.createElement('ki-message');
  element.textContent = text;
  element.toggleAttribute('streaming', streaming);
  return element;
}

async function mount(follow = true, streaming = false) {
  const conversation = document.createElement('ki-conversation');
  conversation.setAttribute('label', 'Project chat');
  conversation.toggleAttribute('stick-to-bottom', follow);
  conversation.style.blockSize = '180px';
  const history = Array.from({ length: 12 }, (_, index) => message(`Reply ${String(index + 1)}`));
  const latest = message('Latest reply', streaming);
  conversation.append(...history, latest);
  fixture.append(conversation);
  await expect.element(log).toBeVisible();
  const viewport = conversation.shadowRoot?.querySelector<HTMLElement>('[part="log"]');
  if (!viewport) throw new Error('The conversation log part is missing');
  await expect.poll(() => viewport.scrollHeight > viewport.clientHeight).toBe(true);
  return { conversation, viewport, latest };
}

async function expectAtEnd(viewport: HTMLElement): Promise<void> {
  await expect
    .poll(() => Math.abs(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop))
    .toBeLessThanOrEqual(1);
}

async function pause(viewport: HTMLElement): Promise<void> {
  await expectAtEnd(viewport);
  viewport.scrollTop = 0;
  await expect.element(jump).toBeVisible();
}

it('S3 follows a message appended below the visible area', async () => {
  const { conversation, viewport } = await mount();
  await expectAtEnd(viewport);
  const before = viewport.scrollHeight;
  conversation.append(message('Reply appended'));
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(before);
  await expectAtEnd(viewport);
  await expect.element(jump).not.toBeInTheDocument();
});

it('S4 follows growth within an existing streaming reply', async () => {
  const { latest, viewport } = await mount(true, true);
  await expectAtEnd(viewport);
  const before = viewport.scrollHeight;
  const paragraphs = Array.from({ length: 8 }, () => {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'The assistant added more text.';
    return paragraph;
  });
  latest.append(...paragraphs);
  // The prior automatic scroll can notify after the next chunk changes layout.
  viewport.dispatchEvent(new Event('scroll'));
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(before);
  await expectAtEnd(viewport);
});

it('S5 preserves scrollback when another message arrives', async () => {
  const { conversation, viewport } = await mount();
  await pause(viewport);
  const before = viewport.scrollHeight;
  conversation.append(message('Reply appended'));
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(before);
  expect(viewport.scrollTop).toBe(0);
  await expect.element(jump).toBeVisible();
});

it('S6 leaves following disabled by default', async () => {
  const { conversation, viewport } = await mount(false);
  const before = viewport.scrollHeight;
  conversation.append(message('Reply appended'));
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(before);
  expect(viewport.scrollTop).toBe(0);
  await expect.element(jump).not.toBeInTheDocument();
});

it('S7 resumes following after the reader goes back to the end', async () => {
  const { conversation, viewport } = await mount();
  await pause(viewport);
  viewport.scrollTop = viewport.scrollHeight;
  await expect.element(jump).not.toBeInTheDocument();
  const before = viewport.scrollHeight;
  conversation.append(message('Reply appended'));
  await expect.poll(() => viewport.scrollHeight).toBeGreaterThan(before);
  await expectAtEnd(viewport);
});

it('S8 returns to the latest reply and restores log focus using the keyboard', async () => {
  const { conversation, viewport } = await mount();
  await pause(viewport);
  viewport.focus({ preventScroll: true });

  await userEvent.tab();
  await expect.element(jump).toBeVisible();
  const button = jump.element();
  const root = button.getRootNode();
  await expect.poll(() => root instanceof ShadowRoot && root.activeElement === button).toBe(true);
  await userEvent.keyboard('{Enter}');

  await expectAtEnd(viewport);
  await expect.element(jump).not.toBeInTheDocument();
  expect(conversation.shadowRoot?.activeElement).toBe(viewport);
});

it('S9 exposes a named polite log with named articles, separate from the composer', async () => {
  fixture.innerHTML = `
    <ki-conversation label="Project chat">
      <ki-message role="user">Where are the docs?</ki-message>
      <ki-message role="event">Searched the docs</ki-message>
      <ki-message role="assistant" author="Ava said">Here are the docs.</ki-message>
    </ki-conversation>
    <label>Compose a message <textarea></textarea></label>
  `;

  await expect.element(log).toHaveAttribute('aria-live', 'polite');
  await expect.element(page.getByRole('article', { name: 'You said' })).toBeVisible();
  await expect.element(page.getByRole('article', { name: 'System event' })).toBeVisible();
  await expect.element(page.getByRole('article', { name: 'Ava said' })).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Compose a message' })).toBeVisible();
  const slot = log.element().querySelector('slot');
  const messages = Array.from(fixture.querySelectorAll('ki-message'));
  expect(slot?.assignedElements()).toEqual(messages);
  expect(fixture.querySelector('ki-message[role]')).toBeNull();
  await expectAccessible(fixture);
});
