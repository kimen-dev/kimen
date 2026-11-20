// @spec:116-ki-prompt-input
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

interface Composer extends HTMLElement {
  status: 'idle' | 'submitted' | 'streaming';
  value: string;
}

const tokens = document.createElement('style');
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  tokens.textContent = tokensCss;
  document.head.append(tokens);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.style.removeProperty('--ki-surface-s1');
  await parkPointer();
});

afterAll(() => {
  tokens.remove();
});

async function mount(attributes = '', wrapper = '<main>CONTENT</main>'): Promise<Composer> {
  document.body.innerHTML = wrapper.replace(
    'CONTENT',
    `<ki-prompt-input label="Message Kimen Assistant" ${attributes}></ki-prompt-input>`,
  );
  await expect
    .element(page.getByRole('textbox', { name: 'Message Kimen Assistant' }))
    .toBeVisible();
  const host = document.querySelector<Composer>('ki-prompt-input');
  if (!host) throw new Error('Missing composer');
  return host;
}

function requiredElement<K extends keyof HTMLElementTagNameMap>(name: K): HTMLElementTagNameMap[K] {
  const element = document.querySelector(name);
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (element === null || element === undefined) throw new Error(`Missing part ${name}`);
  return element;
}

function textbox(host: Composer): HTMLTextAreaElement {
  const control = part(host, 'textarea');
  if (!(control instanceof HTMLTextAreaElement)) throw new Error('Expected a native textarea');
  return control;
}

function file(name = 'incidents.csv', size = 3, type = 'text/csv'): File {
  return new File(['a'.repeat(size)], name, { type });
}

function files(...entries: File[]): DataTransfer {
  const transfer = new DataTransfer();
  for (const entry of entries) transfer.items.add(entry);
  return transfer;
}

function drop(host: Composer, ...entries: File[]): void {
  part(host, 'field').dispatchEvent(
    new DragEvent('drop', { dataTransfer: files(...entries), bubbles: true, cancelable: true }),
  );
}

function paste(host: Composer, clipboardData: DataTransfer): ClipboardEvent {
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
  // Firefox can drop files when a drag DataTransfer passes through the clipboard constructor.
  Object.defineProperty(event, 'clipboardData', { value: clipboardData });
  textbox(host).dispatchEvent(event);
  return event;
}

function requests(host: Composer, name: 'ki-submit' | 'ki-stop' = 'ki-submit') {
  const listener = vi.fn<(event: Event) => void>();
  host.addEventListener(name, listener);
  return listener;
}

function expectDraft(event: Event | undefined, text: string, entries: File[] = []): void {
  expect(event).toBeInstanceOf(CustomEvent);
  expect((event as CustomEvent<unknown>).detail).toEqual({ text, files: entries });
}

const removeFile = (name = 'incidents.csv') => page.getByRole('button', { name: `Remove ${name}` });
const sendButton = () => page.getByRole('button', { name: 'Send', exact: true });
const stopButton = () => page.getByRole('button', { name: 'Stop generating' });

it('S1 sends the original text and files, clears the draft and focuses the textarea', async () => {
  const host = await mount('accept=".csv" value=" Summarise the incidents "');
  const attached = file();
  drop(host, attached);
  await expect.element(removeFile()).toBeVisible();
  const sent = requests(host);
  const input = vi.fn(() => host.value);
  host.addEventListener('input', input);
  await userEvent.click(sendButton());
  expect(sent).toHaveBeenCalledTimes(1);
  expectDraft(sent.mock.calls[0]?.[0], ' Summarise the incidents ', [attached]);
  expect(input).toHaveReturnedWith('');
  await expect.poll(() => textbox(host).value).toBe('');
  await expect.poll(() => host.shadowRoot?.activeElement).toBe(textbox(host));
  await expect.element(removeFile()).not.toBeInTheDocument();
});

it('S2 grows for multiple lines and scrolls at the token-backed height cap', async () => {
  const host = await mount('value="Hello"');
  const control = textbox(host);
  const initial = control.getBoundingClientRect().height;
  host.value = 'One\nTwo\nThree\nFour\nFive';
  await expect.poll(() => control.getBoundingClientRect().height).toBeGreaterThan(initial);
  host.style.setProperty('--ki-prompt-input-max-height', '8rem');
  host.value = 'Line of text\n'.repeat(40);
  await expect.poll(() => Math.abs(control.getBoundingClientRect().height - 128)).toBeLessThan(0.5);
  expect(control.scrollHeight).toBeGreaterThan(control.clientHeight);
  control.scrollTop = control.scrollHeight;
  expect(control.scrollTop).toBeGreaterThan(0);
});

it.each(['picker', 'drop', 'paste'])('S3 accepts CSV files using %s', async (source) => {
  const host = await mount('accept=".csv" max-size="10"');
  const entry = file();
  if (source === 'picker') {
    const picker = host.shadowRoot?.querySelector<HTMLInputElement>('input[type=file]');
    if (!picker) throw new Error('Missing file picker');
    const open = vi.fn((event: MouseEvent) => {
      event.preventDefault();
    });
    picker.addEventListener('click', open);
    const attach = page.getByRole('button', { name: 'Attach files' });
    await userEvent.click(attach);
    expect(open).toHaveBeenCalledTimes(1);
    expect(picker.accept).toBe('.csv');
    picker.files = files(entry).files;
    picker.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (source === 'drop') {
    drop(host, entry);
  } else {
    expect(paste(host, files(entry)).defaultPrevented).toBe(true);
    const mixed = files(file('notes.csv'));
    mixed.setData('text/plain', 'Preserve ordinary paste');
    expect(paste(host, mixed).defaultPrevented).toBe(false);
    await expect.element(removeFile('notes.csv')).toBeVisible();
  }
  await expect.element(page.getByRole('list', { name: 'Attachments' })).toBeVisible();
  await expect.poll(() => part(host, 'attachments').textContent).toContain(entry.name);
});

it('S4 reports type, byte and count failures while keeping valid files from the same batch', async () => {
  const host = await mount('accept=".csv" max-files="2" max-size="10"');
  drop(host, file());
  await expect.element(removeFile()).toBeVisible();
  drop(
    host,
    file('photo.png', 2, 'image/png'),
    file('oversized.csv', 11),
    file('second.csv'),
    file('third.csv'),
  );
  await expect.element(removeFile('second.csv')).toBeVisible();
  await expect.poll(() => part(host, 'feedback').textContent).toMatch(/photo\.png.*file type/i);
  expect(part(host, 'feedback').textContent).toMatch(/oversized\.csv.*size/i);
  expect(part(host, 'feedback').textContent).toMatch(/third\.csv.*maximum number/i);
  expect(part(host, 'feedback').getAttribute('aria-live')).toBe('polite');
  expect(part(host, 'attachments').querySelectorAll('li')).toHaveLength(2);
});

it('S5 emits Stop while streaming, preserving the next draft', async () => {
  const host = await mount('status="streaming" value="Next message"');
  const stopped = requests(host, 'ki-stop');
  const sent = requests(host);
  await userEvent.click(stopButton());
  expect(stopped).toHaveBeenCalledTimes(1);
  expect(sent).not.toHaveBeenCalled();
  expect(textbox(host).value).toBe('Next message');
  await expect.element(sendButton()).not.toBeInTheDocument();
});

it('S6 prevents repeated sends while submitted', async () => {
  const host = await mount('status="submitted" value="Next message"');
  const sent = requests(host);
  await expect.element(sendButton()).toBeDisabled();
  textbox(host).focus();
  await userEvent.keyboard('{Enter}');
  expect(sent).not.toHaveBeenCalled();
  expect(textbox(host).value).toBe('Next message');
});

it('S7 hides attachment controls when accepted types are empty', async () => {
  const host = await mount();
  drop(host, file());
  await expect.element(page.getByRole('button', { name: 'Attach files' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('list', { name: 'Attachments' })).not.toBeInTheDocument();
});

it('S7 removes selected files when the accept attribute is removed', async () => {
  const host = await mount('accept=".csv"');
  drop(host, file());
  await expect.element(removeFile()).toBeVisible();
  host.removeAttribute('accept');
  await expect.element(page.getByRole('list', { name: 'Attachments' })).not.toBeInTheDocument();
  await expect.element(sendButton()).toBeDisabled();
});

it('supports the tools and attachments slots with caller-owned content', async () => {
  const host = await mount('accept=".csv"');
  host.innerHTML =
    '<button type="button" slot="tools">Model: Standard</button><li slot="attachments">Context.csv</li>';
  await expect.element(page.getByRole('button', { name: 'Model: Standard' })).toBeVisible();
  await expect.element(page.getByRole('list', { name: 'Attachments' })).toBeVisible();
  const attachment = page.getByText('Context.csv', { exact: true });
  await expect.element(attachment).toBeVisible();
  expect(attachment.element().assignedSlot?.parentElement).toBe(part(host, 'attachments'));
});

it('sends attachment-only drafts and disables empty or whitespace-only drafts', async () => {
  const host = await mount('accept=".csv" value=" "');
  const sent = requests(host);
  await expect.element(sendButton()).toBeDisabled();
  const entry = file();
  drop(host, entry);
  await userEvent.click(sendButton());
  expectDraft(sent.mock.calls[0]?.[0], ' ', [entry]);
});

it('S8 Enter sends without adding a newline', async () => {
  const host = await mount('value="Hello"');
  const sent = requests(host);
  textbox(host).focus();
  await userEvent.keyboard('{Enter}');
  expect(sent).toHaveBeenCalledTimes(1);
  expectDraft(sent.mock.calls[0]?.[0], 'Hello');
});

it.each([
  ['enter', '{Shift>}{Enter}{/Shift}'],
  ['mod-enter', '{Enter}'],
  ['mod-enter', '{Shift>}{Enter}{/Shift}'],
])('S9 %s keeps %s as a newline', async (mode, keys) => {
  const host = await mount(`submit-on="${mode}" value="Hello"`);
  const sent = requests(host);
  const control = textbox(host);
  control.focus();
  control.setSelectionRange(5, 5);
  await userEvent.keyboard(keys);
  expect(control.value).toBe('Hello\n');
  expect(host.value).toBe('Hello\n');
  expect(sent).not.toHaveBeenCalled();
});

it.each(['Control', 'Meta'])('S10 %s+Enter sends in modifier mode', async (modifier) => {
  const host = await mount('submit-on="mod-enter" value="Hello"');
  const sent = requests(host);
  textbox(host).focus();
  await userEvent.keyboard(`{${modifier}>}{Enter}{/${modifier}}`);
  expect(sent).toHaveBeenCalledTimes(1);
  expectDraft(sent.mock.calls[0]?.[0], 'Hello');
});

it('leaves composition and repeated Enter events to the native editor without submitting', async () => {
  const host = await mount('value="Hello"');
  const sent = requests(host);
  for (const options of [{ isComposing: true }, { repeat: true }]) {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      ...options,
    });
    textbox(host).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(sent).not.toHaveBeenCalled();
});

it('S11 removes a file with Space and returns focus to the textarea', async () => {
  const host = await mount('accept=".csv"');
  drop(host, file());
  await expect.element(removeFile()).toBeVisible();
  (removeFile().element() as HTMLButtonElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(removeFile()).not.toBeInTheDocument();
  expect(host.shadowRoot?.activeElement).toBe(textbox(host));
});

it('S12 exposes named controls, a list and a persistent polite live region', async () => {
  const host = await mount('accept=".csv" value="Text"');
  drop(host, file());
  await expect.element(sendButton()).toBeEnabled();
  const live = part(host, 'status');
  expect(live.getAttribute('role')).toBe('status');
  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(live.textContent).toBe('');
  host.status = 'streaming';
  await expect.element(stopButton()).toBeEnabled();
  await expect
    .element(page.getByRole('textbox', { name: 'Message Kimen Assistant' }))
    .toBeVisible();
  await expect.element(page.getByRole('list', { name: 'Attachments' })).toBeVisible();
  await expect.element(removeFile()).toBeEnabled();
  expect(part(host, 'status')).toBe(live);
  expect(live.textContent).toBe('Writing…');
  await expectAccessible(requiredElement('main'));
});

describe('form participation', () => {
  const form = () => requiredElement('form');
  const wrap = '<main><form><fieldset>CONTENT</fieldset></form></main>';

  it('S13 contributes current text under name and Send leaves the enclosing form alone', async () => {
    const host = await mount('name="message" accept=".csv"', wrap);
    await userEvent.fill(page.getByRole('textbox'), 'Edited');
    drop(host, file());
    await expect.element(removeFile()).toBeVisible();
    expect(new FormData(form()).getAll('message')).toEqual(['Edited']);
    const submitted = vi.fn((event: Event) => {
      event.preventDefault();
    });
    form().addEventListener('submit', submitted);
    await userEvent.click(sendButton());
    expect(submitted).not.toHaveBeenCalled();
  });

  it('S14 resets to default text and clears files', async () => {
    const host = await mount('name="message" value="Hello" accept=".csv"', wrap);
    drop(host, file());
    await expect.element(removeFile()).toBeVisible();
    await userEvent.fill(page.getByRole('textbox'), 'Edited');
    form().reset();
    await expect.poll(() => textbox(host).value).toBe('Hello');
    expect(new FormData(form()).get('message')).toBe('Hello');
    await expect.element(removeFile()).not.toBeInTheDocument();
  });

  it('S15 a disabled fieldset disables controls and omits the value', async () => {
    await mount('name="message" value="Hello"', wrap);
    const fieldset = requiredElement('fieldset');
    fieldset.disabled = true;
    await expect.element(page.getByRole('textbox')).toBeDisabled();
    await expect.element(sendButton()).toBeDisabled();
    expect(new FormData(form()).has('message')).toBe(false);
    fieldset.disabled = false;
    await expect.element(sendButton()).toBeEnabled();
  });
});

it('S16 uses the surrounding raised surface token', async () => {
  const host = await mount();
  document.documentElement.style.setProperty('--ki-surface-s1', 'rgb(222, 231, 238)');
  await expect
    .poll(() => getComputedStyle(part(host, 'field')).backgroundColor)
    .toBe('rgb(222, 231, 238)');
});

it('S17 mirrors attachment and send positions in RTL without overflow', async () => {
  const host = await mount('accept=".csv" value="Text"');
  host.style.inlineSize = '220px';
  host.value = 'LongDraft'.repeat(20);
  drop(host, file(`${'LongFilename'.repeat(12)}.csv`));
  await expect.element(page.getByRole('list', { name: 'Attachments' })).toBeVisible();
  const attach = part(host, 'attach');
  const send = part(host, 'send');
  expect(attach.getBoundingClientRect().x).toBeLessThan(send.getBoundingClientRect().x);
  host.dir = 'rtl';
  await expect
    .poll(() => attach.getBoundingClientRect().x > send.getBoundingClientRect().x)
    .toBe(true);
  const field = part(host, 'field');
  expect(getComputedStyle(textbox(host)).direction).toBe('rtl');
  expect(field.scrollWidth - field.clientWidth).toBeLessThanOrEqual(0.5);
});

it('S19 keeps the border and keyboard focus visible in forced colours', async ({ skip }) => {
  const host = await mount();
  const field = part(host, 'field');
  const control = textbox(host);
  await userEvent.tab();
  const normal = getComputedStyle(control).outlineColor;
  try {
    await media.emulateForcedColors('active');
    const forcedColors = matchMedia('(forced-colors: active)');
    if (!navigator.userAgent.includes('Chrome/') && !forcedColors.matches) {
      skip('This engine does not emulate forced colours');
      return;
    }
    await expect.poll(() => forcedColors.matches).toBe(true);
    expect(host.shadowRoot?.activeElement).toBe(control);
    expect(getComputedStyle(field).borderBlockStartStyle).toBe('solid');
    expect(getComputedStyle(control).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(control).outlineWidth)).toBeGreaterThan(0);
    expect(getComputedStyle(control).outlineColor).not.toBe(normal);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S20 exposes writing in reduced motion without animating the state change', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const host = await mount();
    host.status = 'streaming';
    await expect.element(stopButton()).toBeVisible();
    expect(part(host, 'status').textContent).toBe('Writing…');
    expect(part(host, 'field').getAnimations({ subtree: true })).toEqual([]);
    expect((stopButton().element() as HTMLButtonElement).getAnimations()).toEqual([]);
  } finally {
    await media.emulateReducedMotion(null);
  }
});
