// @spec:115-ki-conversation
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineConversation } from '../../../dist/components/ki-conversation.js';
import { defineCustomElement as defineMessage } from '../../../dist/components/ki-message.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

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

function part(selector: string, name: string): HTMLElement {
  const element = fixture
    .querySelector(selector)
    ?.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing ${name} part on ${selector}`);
  return element;
}

function transcript(dir = 'ltr'): void {
  fixture.innerHTML = `
    <ki-conversation dir="${dir}" label="Project chat">
      <ki-message id="question" message-role="user">Where are the docs?</ki-message>
      <ki-message id="event" message-role="event" icon-name="search">Search complete</ki-message>
      <ki-message id="reply" message-role="assistant" author="Ava said">Here are the docs.</ki-message>
    </ki-conversation>
  `;
}

async function showTranscript(dir = 'ltr'): Promise<void> {
  transcript(dir);
  await expect.element(page.getByRole('article', { name: 'Ava said' })).toBeVisible();
  await expect.element(page.getByRole('article', { name: 'You said' })).toBeVisible();
  await expect.element(page.getByRole('article', { name: 'System event' })).toBeVisible();
}

it('S1 distinguishes the question, event and assistant reply by layout', async () => {
  await showTranscript();
  const log = part('ki-conversation', 'log').getBoundingClientRect();
  const bubble = part('#question', 'message').getBoundingClientRect();
  const event = part('#event', 'content').getBoundingClientRect();
  const avatar = part('#reply', 'avatar').getBoundingClientRect();
  const reply = part('#reply', 'content').getBoundingClientRect();

  expect(bubble.right).toBeCloseTo(log.right, 0);
  expect(bubble.width).toBeLessThan(log.width);
  expect((event.left + event.right) / 2).toBeCloseTo((log.left + log.right) / 2, 0);
  expect(avatar.right).toBeLessThan(reply.left);
  await expect
    .poll(() =>
      part('#event', 'content').querySelector('ki-icon')?.shadowRoot?.querySelector('svg'),
    )
    .toBeInstanceOf(SVGElement);
});

it('S2 renders custom avatar, rich content and interactive actions in reading order', async () => {
  fixture.innerHTML = `
    <ki-message id="reply" author="Ava said">
      <span slot="avatar">AV</span>
      <strong>Start here</strong>
      <button type="button" slot="actions" tabindex="0">Copy</button>
    </ki-message>
  `;
  await expect.element(page.getByRole('article', { name: 'Ava said' })).toBeVisible();
  await expect.element(page.getByText('AV')).toBeVisible();
  await expect.element(page.getByText('Start here')).toBeVisible();

  const copy = page.getByRole('button', { name: 'Copy' });
  const click = expect.poll(() => fixture.querySelector('button')?.dataset.clicked);
  fixture.querySelector('button')?.addEventListener('click', (event) => {
    (event.currentTarget as HTMLButtonElement).dataset.clicked = 'true';
  });
  await userEvent.tab();
  await expect.element(copy).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await click.toBe('true');

  expect(part('#reply', 'actions').getBoundingClientRect().top).toBeGreaterThanOrEqual(
    part('#reply', 'content').getBoundingClientRect().bottom,
  );
});

it('S10 holds streamed updates atomically and clears busy when the reply completes', async () => {
  fixture.innerHTML = `
    <ki-conversation label="Project chat">
      <ki-message id="reply" streaming>Here</ki-message>
    </ki-conversation>
    <button type="button" tabindex="0">Composer control</button>
  `;
  const reply = page.getByRole('article', { name: 'Assistant said' });
  const composer = page.getByRole('button', { name: 'Composer control' });
  await expect.element(reply).toHaveAttribute('aria-busy', 'true');
  await expect.element(reply).toHaveAttribute('aria-atomic', 'true');
  expect(part('#reply', 'caret').getAttribute('aria-hidden')).toBe('true');

  fixture.querySelector('button')?.focus();
  const message = fixture.querySelector('#reply');
  message?.append(' are the docs.');
  await expect.element(reply).toHaveAttribute('aria-busy', 'true');
  message?.removeAttribute('streaming');

  await expect.element(reply).not.toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByText('Here are the docs.')).toBeVisible();
  await expect.element(composer).toHaveFocus();
  expect(message?.shadowRoot?.querySelector('[part~="caret"]')).toBeNull();
});

it('S11 paints the user bubble using its surface tokens', async () => {
  await showTranscript();
  const message = fixture.querySelector<HTMLElement>('#question');
  message?.style.setProperty('--ki-message-user-bg', 'rgb(235, 243, 255)');
  message?.style.setProperty('--ki-message-user-bg-image', 'linear-gradient(white, transparent)');
  message?.style.setProperty('--ki-message-user-backdrop-filter', 'blur(2px)');
  const bubble = part('#question', 'message');

  await expect.poll(() => getComputedStyle(bubble).backgroundColor).toBe('rgb(235, 243, 255)');
  expect(getComputedStyle(bubble).backgroundImage).toContain('linear-gradient');
  expect(getComputedStyle(bubble).backdropFilter).toBe('blur(2px)');
});

it('S12 mirrors the user bubble and assistant avatar under RTL', async () => {
  await showTranscript('rtl');
  const log = part('ki-conversation', 'log').getBoundingClientRect();
  const bubble = part('#question', 'message').getBoundingClientRect();
  const avatar = part('#reply', 'avatar').getBoundingClientRect();
  const reply = part('#reply', 'content').getBoundingClientRect();

  expect(bubble.left).toBeCloseTo(log.left, 0);
  expect(avatar.left).toBeGreaterThan(reply.right);
});

describe('system preferences', () => {
  afterEach(async () => {
    await browserCommands.emulateReducedMotion(null);
    await browserCommands.emulateForcedColors(null);
  });

  it('S13 leaves the streaming caret visible and static under reduced motion', async () => {
    await browserCommands.emulateReducedMotion('reduce');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    fixture.innerHTML = '<ki-message id="reply" streaming>Here</ki-message>';
    await expect.element(page.getByRole('article', { name: 'Assistant said' })).toBeVisible();

    const caret = part('#reply', 'caret');
    expect(getComputedStyle(caret).animationName).toBe('none');
    expect(caret.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('S14 preserves an outline and the caret under forced colors', async (test) => {
    await browserCommands.emulateForcedColors('active');
    if (!matchMedia('(forced-colors: active)').matches) {
      test.skip('this engine cannot activate forced colors');
    }
    await showTranscript();
    fixture.querySelector('#reply')?.setAttribute('streaming', '');

    await expect
      .poll(() => getComputedStyle(part('#question', 'message')).outlineStyle)
      .toBe('solid');
    await expect
      .poll(() => fixture.querySelector('#reply')?.shadowRoot?.querySelector('[part~="caret"]'))
      .toBeInstanceOf(HTMLElement);
    const caret = part('#reply', 'caret');
    expect(getComputedStyle(caret).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(caret.getBoundingClientRect().width).toBeGreaterThan(0);
  });
});
