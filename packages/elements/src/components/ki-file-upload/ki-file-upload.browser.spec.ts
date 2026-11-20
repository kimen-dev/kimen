// @spec:109-ki-file-upload
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-file-upload.js';

interface FileRow {
  name: string;
  size: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
  file?: File;
}

interface FileUpload extends HTMLElement {
  files: FileRow[];
}

interface MountOptions {
  attributes?: string;
  disabledFieldset?: boolean;
  initial?: FileRow[];
  direction?: 'ltr' | 'rtl';
}

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateForcedColors: (mode: 'active' | null) => Promise<void>;
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss + material3Css;
  document.head.append(styles);
  fixture.style.maxInlineSize = '360px';
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

const group = () => page.getByRole('group', { name: 'Upload files' });
const browse = () => page.getByRole('button', { name: 'Browse files' });
const remove = (name: string) => page.getByRole('button', { name: `Remove ${name}` });
const cancel = (name: string) => page.getByRole('button', { name: `Cancel upload of ${name}` });
const list = () => page.getByRole('list', { name: 'Files' });

async function mount(options: MountOptions = {}) {
  const { attributes = '', disabledFieldset = false, direction = 'ltr', initial } = options;
  const form = document.createElement('form');
  form.dir = direction;
  const markup = `<ki-file-upload name="attachments" ${attributes}></ki-file-upload>`;
  // Explicit tab stops include the fixture controls in macOS WebKit's tab order.
  form.innerHTML = `
    <button type="button" tabindex="0">Before upload</button>
    ${disabledFieldset ? `<fieldset disabled>${markup}</fieldset>` : markup}
    <button type="submit" tabindex="0">Submit attachments</button>
  `;
  const upload = form.querySelector<FileUpload>('ki-file-upload');
  if (!upload) throw new Error('Expected the file upload control');
  if (initial !== undefined) upload.files = initial;
  const submissions: FormData[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions.push(new FormData(form));
  });
  fixture.append(form);
  await expect.element(browse()).toBeVisible();
  return { form, upload, submissions };
}

function part(upload: FileUpload, name: string): HTMLElement {
  const element = upload.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Expected the ${name} part`);
  return element;
}

function fileInput(upload: FileUpload): HTMLInputElement {
  const input = part(upload, 'input');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a native file input');
  return input;
}

function aFile(name: string, type = 'text/csv', contents = '1,2'): File {
  return new File([contents], name, { type });
}

function transfer(files: File[]): DataTransfer {
  const data = new DataTransfer();
  files.forEach((file) => data.items.add(file));
  return data;
}

function drag(target: HTMLElement, event: 'dragenter' | 'dragleave' | 'drop', files: File[]): void {
  target.dispatchEvent(
    new DragEvent(event, {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer(files),
    }),
  );
}

function pick(upload: FileUpload, files: File[]): void {
  const input = fileInput(upload);
  input.files = transfer(files).files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function details<T>(target: EventTarget, name: string): T[] {
  const received: T[] = [];
  target.addEventListener(name, (event) => received.push((event as CustomEvent<T>).detail));
  return received;
}

async function expectFocus(element: Element): Promise<void> {
  const root = element.getRootNode();
  await expect.poll(() => root instanceof ShadowRoot && root.activeElement === element).toBe(true);
}

it('S1 appends dropped files and emits their queued originals once', async () => {
  const { form, upload } = await mount({ attributes: 'multiple accept=".csv,.pdf"' });
  const added = details<{ files: FileRow[] }>(form, 'ki-files-add');
  const csv = aFile('incidents.csv');
  const pdf = aFile('runbook.pdf', 'application/pdf');

  drag(part(upload, 'drop-zone'), 'drop', [csv, pdf]);

  await expect.element(list().getByText('incidents.csv', { exact: true })).toBeVisible();
  await expect.element(list().getByText('runbook.pdf', { exact: true })).toBeVisible();
  expect(added).toHaveLength(1);
  expect(added[0]?.files.map(({ file }) => file)).toEqual([csv, pdf]);
  expect(upload.files.map(({ name, status }) => [name, status])).toEqual([
    ['incidents.csv', 'queued'],
    ['runbook.pdf', 'queued'],
  ]);
});

it('S2 lists each rejection reason and offers only accepted files to the host', async () => {
  const { form, upload } = await mount({
    attributes: 'multiple accept=".csv" max-size="4B" max-files="1"',
  });
  const added = details<{ files: FileRow[] }>(form, 'ki-files-add');
  const allowed = aFile('incidents.csv');

  drag(part(upload, 'drop-zone'), 'drop', [
    aFile('video.mov', 'video/quicktime'),
    aFile('large.csv', 'text/csv', '12345'),
    allowed,
    aFile('extra.csv'),
  ]);

  await expect.element(remove('video.mov')).toBeVisible();
  const rows = list().getByRole('listitem');
  await expect.element(rows.nth(0).getByText('video.mov', { exact: true })).toBeVisible();
  await expect
    .element(rows.nth(0).getByRole('paragraph'))
    .toHaveTextContent('This file type is not allowed.');
  await expect.element(rows.nth(1).getByText('large.csv', { exact: true })).toBeVisible();
  await expect
    .element(rows.nth(1).getByRole('paragraph'))
    .toHaveTextContent('This file is too large.');
  await expect.element(rows.nth(3).getByText('extra.csv', { exact: true })).toBeVisible();
  await expect.element(rows.nth(3).getByRole('paragraph')).toHaveTextContent('Too many files.');
  expect(upload.files.map(({ name, status }) => [name, status])).toEqual([
    ['video.mov', 'error'],
    ['large.csv', 'error'],
    ['incidents.csv', 'queued'],
    ['extra.csv', 'error'],
  ]);
  expect(added.map(({ files }) => files.map(({ file }) => file))).toEqual([[allowed]]);
});

it('S2 removing the accepted file restores single-file capacity for a later picker selection', async () => {
  const { form, upload } = await mount({ attributes: 'accept=".pdf"' });
  const added = details<{ files: FileRow[] }>(form, 'ki-files-add');
  const initial = aFile('guide.pdf', 'application/pdf');
  const rejected = aFile('map.pdf', 'application/pdf');
  const replacement = aFile('appendix.pdf', 'application/pdf');
  pick(upload, [initial]);
  await expect.element(remove(initial.name)).toBeVisible();
  pick(upload, [rejected]);
  await expect.element(list().getByText('Too many files.')).toBeVisible();
  await remove(initial.name).click();

  pick(upload, [replacement]);

  await expect.element(remove(replacement.name)).toBeVisible();
  expect(added.map(({ files }) => files.map(({ name }) => name))).toEqual([
    [initial.name],
    [replacement.name],
  ]);
  expect(upload.files.map(({ status }) => status)).toEqual(['error', 'queued']);
});

it('S3 follows host progress and emits a cancellation request without removing the file', async () => {
  const file = aFile('incidents.csv');
  const uploading: FileRow = {
    name: file.name,
    size: file.size,
    status: 'uploading',
    progress: 62,
    file,
  };
  const done: FileRow = { name: 'stockroom.pdf', size: 300, status: 'done' };
  const { form, upload } = await mount({ initial: [uploading, done] });
  const cancelled = details<{ file: FileRow }>(form, 'ki-file-cancel');
  const removed = details<{ file: FileRow }>(form, 'ki-file-remove');
  await expect
    .element(page.getByRole('progressbar', { name: 'Uploading incidents.csv' }))
    .toHaveAttribute('aria-valuenow', '62');

  await cancel(file.name).click();

  expect(cancelled).toEqual([{ file: uploading }]);
  expect(removed).toEqual([]);
  expect(upload.files).toEqual([uploading, done]);
  upload.files = [{ ...uploading, status: 'done' }, done];
  await expect.element(remove(file.name)).toBeVisible();
  await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
});

it.each(['{Enter}', ' '])(
  'S4 activates the native picker from the browse button with %j',
  async (key) => {
    const { upload } = await mount({ attributes: 'accept=".pdf" multiple' });
    const input = fileInput(upload);
    const activations: Event[] = [];
    input.addEventListener('click', (event) => {
      event.preventDefault(); // Observe native input activation without opening a dialog in CI.
      activations.push(event);
    });
    const button = browse().element();
    expect(button).toBeInstanceOf(HTMLButtonElement);
    button.setAttribute('tabindex', '0');
    page.getByRole('button', { name: 'Before upload' }).element().focus();
    await userEvent.tab();
    await expectFocus(button);
    expect(button.matches(':focus-visible')).toBe(true);

    await userEvent.keyboard(key);

    expect(activations).toHaveLength(1);
    expect(input.type).toBe('file');
    expect(input.accept).toBe('.pdf');
    expect(input.multiple).toBe(true);
  },
);

it('S5 removes the focused row with the keyboard and returns focus to Browse files', async () => {
  const file = aFile('incidents.csv');
  const queued: FileRow = { name: file.name, size: file.size, status: 'queued', file };
  const { form, upload } = await mount({ initial: [queued] });
  const removed = details<{ file: FileRow }>(form, 'ki-file-remove');
  const action = remove(file.name).element();
  action.setAttribute('tabindex', '0');
  browse().element().focus();
  await userEvent.tab();
  await expectFocus(action);

  await userEvent.keyboard('{Enter}');

  await expect.element(remove(file.name)).not.toBeInTheDocument();
  await expectFocus(browse().element());
  expect(removed).toEqual([{ file: queued }]);
  expect(upload.files).toEqual([]);
  expect(new FormData(form).has('attachments')).toBe(false);
});

it.each(['onmars', 'material3'])(
  'S6 provides names, descriptions, progress, and polite terminal updates with axe in %s',
  async (theme) => {
    document.documentElement.dataset.kiTheme = theme;
    const uploading: FileRow = {
      name: 'incidents.csv',
      size: 800,
      status: 'uploading',
      progress: 62,
    };
    const waiting: FileRow = { name: 'runbook.pdf', size: 1000, status: 'uploading', progress: 30 };
    const { upload } = await mount({
      attributes: 'label="Upload files" help-text="CSV or PDF"',
      initial: [uploading, waiting],
    });
    await expect.element(group()).toHaveAccessibleDescription('CSV or PDF');
    await expect.element(cancel(uploading.name)).toBeVisible();
    await expect.element(cancel(waiting.name)).toBeVisible();
    await expect
      .element(page.getByRole('progressbar', { name: 'Uploading incidents.csv' }))
      .toHaveAttribute('aria-valuenow', '62');

    upload.files = [
      { ...uploading, status: 'done' },
      { ...waiting, status: 'error', error: 'Upload failed. Try again.' },
    ];

    const announcement = page.getByRole('status');
    await expect.element(announcement).toBeInTheDocument();
    await expect
      .poll(() => announcement.element().textContent)
      .toMatch(/incidents\.csv.*Uploaded|Uploaded.*incidents\.csv/iu);
    await expect
      .poll(() => announcement.element().textContent)
      .toMatch(/runbook\.pdf.*Upload failed|Upload failed.*runbook\.pdf/iu);
    await expect.element(remove(uploading.name)).toBeVisible();
    await expect
      .element(page.getByText('Upload failed. Try again.', { exact: true }))
      .toBeVisible();
    // axe mistakes Stencil's host getter for a ShadowRoot when passed the element.
    await expectAccessible('ki-file-upload');
  },
);

it('S7 submits accepted originals as repeated files and omits rejected selections', async () => {
  const { form, upload, submissions } = await mount({ attributes: 'multiple accept=".csv"' });
  const added = details<{ files: FileRow[] }>(form, 'ki-files-add');
  const march = aFile('march.csv', 'text/csv', 'march');
  const april = aFile('april.csv', 'text/csv', 'april');
  pick(upload, [march, aFile('image.png', 'image/png'), april]);
  await expect.element(remove(april.name)).toBeVisible();
  expect(added.map(({ files }) => files.map(({ name }) => name))).toEqual([
    ['march.csv', 'april.csv'],
  ]);

  await page.getByRole('button', { name: 'Submit attachments' }).click();

  expect(submissions).toHaveLength(1);
  const submitted = submissions[0]?.getAll('attachments') ?? [];
  expect(submitted).toHaveLength(2);
  expect(submitted[0]).toBeInstanceOf(File);
  expect(submitted[1]).toBeInstanceOf(File);
  expect(await Promise.all((submitted as File[]).map((file) => file.text()))).toEqual([
    'march',
    'april',
  ]);
  expect((submitted as File[]).map((file) => file.name)).toEqual(['march.csv', 'april.csv']);
});

it('S7 an authored field error blocks submission until cleared', async () => {
  const file = aFile('runbook.pdf', 'application/pdf');
  const message = 'Attachments are temporarily unavailable.';
  const { form, upload, submissions } = await mount({
    attributes: `error-text="${message}"`,
    initial: [{ name: file.name, size: file.size, file, status: 'queued' }],
  });
  const submit = page.getByRole('button', { name: 'Submit attachments' });
  await submit.click();
  await expect.element(page.getByText(message, { exact: true })).toBeVisible();
  expect(submissions).toEqual([]);

  upload.removeAttribute('error-text');

  await expect.poll(() => form.checkValidity()).toBe(true);
  await submit.click();
  expect(submissions).toHaveLength(1);
});

it('S8 resets selected files and required validity without emitting file actions', async () => {
  const { form, upload, submissions } = await mount({ attributes: 'required accept=".pdf"' });
  const file = aFile('runbook.pdf', 'application/pdf');
  const submit = page.getByRole('button', { name: 'Submit attachments' });
  await submit.click();
  expect(submissions).toEqual([]);
  pick(upload, [aFile('invalid.csv')]);
  await expect.element(remove('invalid.csv')).toBeVisible();
  expect(form.checkValidity()).toBe(false);
  pick(upload, [file]);
  await expect.element(remove(file.name)).toBeVisible();
  expect(form.checkValidity()).toBe(true);
  const added = details(form, 'ki-files-add');
  const removed = details(form, 'ki-file-remove');
  const cancelled = details(form, 'ki-file-cancel');

  form.reset();

  await expect.element(remove(file.name)).not.toBeInTheDocument();
  expect(upload.files).toEqual([]);
  expect(form.checkValidity()).toBe(false);
  expect(new FormData(form).getAll('attachments')).toEqual([]);
  expect([added, removed, cancelled]).toEqual([[], [], []]);
});

it('S9 a disabled fieldset skips the control, ignores a drop, and omits file values', async () => {
  const file = aFile('incidents.csv');
  const queued: FileRow = { name: file.name, size: file.size, status: 'queued', file };
  const { form, upload } = await mount({ disabledFieldset: true, initial: [queued] });
  const added = details<{ files: FileRow[] }>(form, 'ki-files-add');
  await expect.element(browse()).toBeDisabled();
  await expect.element(remove(file.name)).toBeDisabled();
  page.getByRole('button', { name: 'Before upload' }).element().focus();
  await userEvent.tab();
  await expect.element(page.getByRole('button', { name: 'Submit attachments' })).toHaveFocus();

  drag(part(upload, 'drop-zone'), 'drop', [aFile('extra.csv')]);

  expect(added).toEqual([]);
  expect(upload.files).toEqual([queued]);
  expect(new FormData(form).getAll('attachments')).toEqual([]);
});

it('S10 repaints the resting and active drop surface from host token overrides', async () => {
  const { upload } = await mount();
  const dropZone = part(upload, 'drop-zone');
  upload.style.setProperty('--ki-file-upload-bg', 'rgb(244, 232, 224)');
  upload.style.setProperty('--ki-file-upload-active-bg', 'rgb(220, 238, 255)');
  await expect.poll(() => getComputedStyle(dropZone).backgroundColor).toBe('rgb(244, 232, 224)');
  const file = aFile('incidents.csv');

  drag(dropZone, 'dragenter', [file]);

  await expect.poll(() => getComputedStyle(dropZone).backgroundColor).toBe('rgb(220, 238, 255)');
  drag(dropZone, 'dragleave', [file]);
  await expect.poll(() => getComputedStyle(dropZone).backgroundColor).toBe('rgb(244, 232, 224)');
});

it('S11 places row actions at inline end in a narrow RTL container', async () => {
  const file = aFile('incidents-with-a-long-filename-for-routing.csv');
  const { upload } = await mount({
    direction: 'rtl',
    initial: [{ name: file.name, size: file.size, status: 'queued', file }],
  });
  upload.style.inlineSize = '230px';
  const action = remove(file.name);
  await expect.element(action).toBeVisible();
  const name = part(upload, 'file-name');

  await expect
    .poll(
      () =>
        action.element().getBoundingClientRect().right <= name.getBoundingClientRect().left + 0.5,
    )
    .toBe(true);
  expect(upload.getBoundingClientRect().width).toBeLessThanOrEqual(230.5);
  expect(upload.scrollWidth).toBeLessThanOrEqual(231);
});

it('S11 keeps file error text and the drop-zone boundary distinct in forced colours', async ({
  skip,
}) => {
  const witness = document.createElement('span');
  witness.style.backgroundColor = 'rgb(1, 2, 3)';
  fixture.append(witness);
  try {
    await media.emulateForcedColors('active');
    const repaints = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(witness).backgroundColor !== 'rgb(1, 2, 3)';
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(repaints).toBe(true);
    } else if (!repaints()) {
      skip('This browser cannot repaint author colors with a forced palette.');
    }
    const { upload } = await mount({
      initial: [{ name: 'runbook.pdf', size: 1000, status: 'error', error: 'Upload failed.' }],
    });
    const error = list().getByText('Upload failed.', { exact: true });
    await expect.element(error).toBeVisible();
    const action = remove('runbook.pdf').element();
    action.setAttribute('tabindex', '0');
    browse().element().focus();
    await userEvent.tab();
    await expectFocus(action);
    const dropStyle = getComputedStyle(part(upload, 'drop-zone'));
    const focusStyle = getComputedStyle(action);
    const canvas = getComputedStyle(witness).backgroundColor;
    expect(dropStyle.borderInlineStartStyle).toBe('dashed');
    expect(dropStyle.borderInlineStartColor).not.toBe(dropStyle.backgroundColor);
    expect(action.matches(':focus-visible')).toBe(true);
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineColor).not.toBe(canvas);
    expect(getComputedStyle(error.element()).color).not.toBe(canvas);
  } finally {
    await media.emulateForcedColors(null);
  }
});

it('S11 changes active paint and file progress without a transition under reduced motion', async () => {
  try {
    await media.emulateReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const file: FileRow = { name: 'incidents.csv', size: 800, status: 'uploading', progress: 0 };
    const { upload } = await mount({ initial: [file] });
    const dropZone = part(upload, 'drop-zone');
    const initialColor = getComputedStyle(dropZone).backgroundColor;
    const progress = page.getByRole('progressbar', { name: 'Uploading incidents.csv' });
    await expect.element(progress).toHaveAttribute('aria-valuenow', '0');

    drag(dropZone, 'dragenter', [aFile('another.csv')]);
    upload.files = [{ ...file, progress: 62 }];

    await expect.poll(() => getComputedStyle(dropZone).backgroundColor).not.toBe(initialColor);
    await expect.element(progress).toHaveAttribute('aria-valuenow', '62');
    const indicator = progress.element().querySelector('[part="indicator"]');
    if (!indicator) throw new Error('Expected the progress indicator');
    expect(dropZone.getAnimations()).toEqual([]);
    expect(indicator.getAnimations()).toEqual([]);
    expect(getComputedStyle(dropZone).transitionDuration).toBe('0s');
    expect(getComputedStyle(indicator).transitionDuration).toBe('0s');
  } finally {
    await media.emulateReducedMotion(null);
  }
});
