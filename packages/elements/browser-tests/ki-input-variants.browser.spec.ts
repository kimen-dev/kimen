// @spec:112-input-variants
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from './axe';
import {
  contrast,
  installKimen,
  mount,
  over,
  parseColor,
  resetRoot,
  SCHEMES,
  surfaceOf,
  THEMES,
  themeDocument,
  uninstallKimen,
  unmountAll,
} from './modes';

type TextField = HTMLElement & {
  maxlength: number | undefined;
  minlength: number | undefined;
  readonly: boolean;
  showCount: boolean;
  validity: ValidityState;
  value: string;
};

const tags = ['ki-input', 'ki-textarea'] as const;
const appearances = ['outlined', 'filled'] as const;
const themesAndSchemes = THEMES.flatMap((theme) =>
  SCHEMES.map((scheme) => [theme, scheme] as const),
);

beforeAll(installKimen);
afterAll(uninstallKimen);

beforeEach(() => {
  themeDocument('onmars', 'light');
});

afterEach(async () => {
  await parkPointer();
  unmountAll();
  resetRoot();
});

function part(host: Element, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`${host.localName} did not render the ${name} part`);
  return element;
}

function ringOf(field: HTMLElement) {
  const { outlineColor, outlineOffset, outlineStyle, outlineWidth } = getComputedStyle(field);
  return { outlineColor, outlineOffset, outlineStyle, outlineWidth };
}

it.for(tags)('S1 keeps labels above the fields and paints each appearance on %s', async (tag) => {
  const fixture = await mount(`
    <${tag} label="Outlined name" appearance="outlined"></${tag}>
    <${tag} label="Filled name" appearance="filled"></${tag}>
  `);
  const [outlined, filled] = [...fixture.querySelectorAll(tag)];
  if (!outlined || !filled) throw new Error('Expected both appearances');
  const outlinedField = part(outlined, 'field');
  const filledField = part(filled, 'field');

  expect(part(outlined, 'label').getBoundingClientRect().bottom).toBeLessThanOrEqual(
    outlinedField.getBoundingClientRect().top,
  );
  expect(part(filled, 'label').getBoundingClientRect().bottom).toBeLessThanOrEqual(
    filledField.getBoundingClientRect().top,
  );
  expect(parseFloat(getComputedStyle(outlinedField).borderInlineStartWidth)).toBeGreaterThan(0);
  expect(parseFloat(getComputedStyle(outlinedField).borderBlockStartWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(filledField).borderInlineStartWidth).toBe('0px');
  expect(getComputedStyle(filledField).borderBlockStartWidth).toBe('0px');
  expect(parseFloat(getComputedStyle(filledField).borderBlockEndWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(filledField).borderEndStartRadius).toBe('0px');
});

it.for(tags)('S2 exposes an opt-in count at the logical end on %s, including RTL', async (tag) => {
  const fixture = await mount(`
    <div dir="rtl" style="inline-size: 12rem">
      <${tag} label="Workspace" help-text="Shown to members" maxlength="30" show-count></${tag}>
    </div>
  `);
  const host = fixture.querySelector<TextField>(tag);
  if (!host) throw new Error('Missing field');
  host.value = 'Kimen design';
  await expect.element(page.getByText('12 / 30')).toBeVisible();

  const count = part(host, 'count');
  const help = part(host, 'help');
  expect(count.getBoundingClientRect().right).toBeLessThanOrEqual(
    help.getBoundingClientRect().left + 0.5,
  );
  await expectAccessible(fixture);

  host.maxlength = undefined;
  await expect.element(page.getByText('12 / 30')).not.toBeInTheDocument();
  host.maxlength = 30;
  await expect.element(page.getByText('12 / 30')).toBeVisible();
  host.showCount = false;
  await expect.element(page.getByText('12 / 30')).not.toBeInTheDocument();
});

it.for(tags)('S2 shows an empty count after removing the value attribute on %s', async (tag) => {
  const fixture = await mount(`
    <${tag} label="Summary" value="Kimen" maxlength="10" show-count></${tag}>
  `);
  const host = fixture.querySelector(tag);
  if (!host) throw new Error('Missing field');
  const textbox = page.getByRole('textbox', { name: 'Summary' });
  await expect.element(textbox).toHaveAccessibleDescription('5 / 10');
  host.removeAttribute('value');
  await expect.element(textbox).toHaveValue('');
  await expect.element(textbox).toHaveAccessibleDescription('0 / 10');
});

it('S3 tabs to the native input and keeps its focus ring at the typing cap', async () => {
  const fixture = await mount(`
    <button tabindex="0" type="button">Start</button>
    <ki-input label="Code" appearance="outlined" maxlength="3"></ki-input>
  `);
  const host = fixture.querySelector('ki-input');
  if (!host) throw new Error('Missing input');
  fixture.querySelector('button')?.focus();
  await userEvent.tab();
  expect(host.shadowRoot?.activeElement).toBe(part(host, 'input'));
  expect(ringOf(part(host, 'field')).outlineStyle).toBe('solid');
  await userEvent.keyboard('ABCD');
  await expect.element(page.getByRole('textbox', { name: 'Code' })).toHaveValue('ABC');
});

it.for(tags)(
  'S4 exposes the live count in the description and announces thresholds on %s',
  async (tag) => {
    const fixture = await mount(`
    <${tag} label="Summary" help-text="Keep it short" appearance="filled" maxlength="3" show-count></${tag}>
  `);
    const textbox = page.getByRole('textbox', { name: 'Summary' });
    await expect.element(textbox).toHaveAccessibleDescription('Keep it short 0 / 3');
    const host = fixture.querySelector<TextField>(tag);
    const status = host?.shadowRoot?.querySelector('[role="status"]');
    if (!host || !status) throw new Error('Missing count announcement');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');
    expect(part(host, 'count').hasAttribute('aria-live')).toBe(false);

    await textbox.click();
    await userEvent.keyboard('AB');
    await expect.element(textbox).toHaveAccessibleDescription('Keep it short 2 / 3');
    expect(status.textContent).toBe('');
    await userEvent.keyboard('C');
    await expect.poll(() => status.textContent).toBe('3 / 3');

    if (tag === 'ki-textarea') {
      await userEvent.keyboard('D');
      await expect.poll(() => status.textContent).toBe('4 / 3');
      await userEvent.keyboard('E');
      await expect.element(textbox).toHaveAccessibleDescription('Keep it short 5 / 3');
      await expect.element(textbox).toHaveAttribute('aria-invalid', 'true');
      expect(status.textContent).toBe('4 / 3');
    }
  },
);

it('S5 keeps the complete textarea edit, blocks submission and clears the error on correction', async () => {
  const fixture = await mount(`
    <form>
      <ki-textarea name="bio" label="Bio" appearance="filled" maxlength="3" show-count></ki-textarea>
      <button type="submit">Save</button>
    </form>
  `);
  const form = fixture.querySelector('form');
  const host = fixture.querySelector<TextField>('ki-textarea');
  if (!form || !host) throw new Error('Missing textarea form');
  const submitted: FormData[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted.push(new FormData(form));
  });
  const textbox = page.getByRole('textbox', { name: 'Bio' });
  const count = part(host, 'count');
  const normalInk = getComputedStyle(count).color;
  await textbox.click();
  await userEvent.keyboard('ABCD');
  await expect.element(textbox).toHaveValue('ABCD');
  expect(host.validity.tooLong).toBe(true);
  await expect.poll(() => getComputedStyle(count).color).not.toBe(normalInk);
  form.requestSubmit();
  expect(submitted).toHaveLength(0);

  await userEvent.keyboard('{Backspace}');
  await expect.element(textbox).toHaveValue('ABC');
  expect(host.validity.tooLong).toBe(false);
  form.requestSubmit();
  expect(submitted.map((data) => data.get('bio'))).toEqual(['ABC']);
  form.reset();
  await expect.element(textbox).toHaveValue('');
  await expect.element(textbox).toHaveAccessibleDescription('0 / 3');
});

it('S5 validates assigned textarea values in the same task, using native newline normalization', async () => {
  const fixture = await mount(`
    <form><ki-textarea name="bio" label="Bio" maxlength="3"></ki-textarea></form>
  `);
  const host = fixture.querySelector<TextField>('ki-textarea');
  const form = fixture.querySelector('form');
  if (!form || !host) throw new Error('Missing textarea form');
  await expect.element(page.getByRole('textbox', { name: 'Bio' })).toBeVisible();
  host.value = 'A\r\nB';
  expect(form.checkValidity()).toBe(true);
  host.maxlength = 2;
  expect(host.validity.tooLong).toBe(true);
  expect(form.checkValidity()).toBe(false);
  host.readonly = true;
  expect(form.checkValidity()).toBe(true);
});

it.for(tags)('S6 forwards the native minimum length on %s', async (tag) => {
  const fixture = await mount(`
    <form><${tag} label="Code" name="code" minlength="3"></${tag}></form>
  `);
  const form = fixture.querySelector('form');
  const host = fixture.querySelector<TextField>(tag);
  if (!form || !host) throw new Error('Missing field form');
  const textbox = page.getByRole('textbox', { name: 'Code' });
  await textbox.click();
  expect(form.checkValidity()).toBe(true);
  await userEvent.keyboard('AB');
  expect(host.validity.tooShort).toBe(true);
  expect(form.checkValidity()).toBe(false);
  host.minlength = undefined;
  expect(form.checkValidity()).toBe(true);
});

it.for(themesAndSchemes)(
  'S7 keeps contrasting boundaries and equal focus rings in %s %s',
  async ([theme, scheme]) => {
    themeDocument(theme, scheme);
    const fixture = await mount(
      tags
        .flatMap((tag) =>
          appearances.map(
            (appearance) =>
              `<${tag} label="${tag} ${appearance}" appearance="${appearance}"></${tag}>`,
          ),
        )
        .join(''),
    );

    for (const tag of tags) {
      const rings = [];
      for (const appearance of appearances) {
        const host = fixture.querySelector(`${tag}[appearance="${appearance}"]`);
        if (!host) throw new Error('Missing variant');
        const field = part(host, 'field');
        const style = getComputedStyle(field);
        const canvas = surfaceOf(fixture);
        const fill = surfaceOf(field);
        const edge = parseColor(style.borderBlockEndColor);
        const restWidth = parseFloat(style.borderBlockEndWidth);
        expect(restWidth).toBeGreaterThan(0);
        expect(contrast(over(edge, canvas), canvas)).toBeGreaterThanOrEqual(3);
        expect(contrast(over(edge, fill), fill)).toBeGreaterThanOrEqual(3);

        part(host, tag === 'ki-input' ? 'input' : 'textarea').focus();
        const ring = ringOf(field);
        expect(ring.outlineStyle).toBe('solid');
        expect(parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
        expect(
          contrast(over(parseColor(ring.outlineColor), canvas), canvas),
        ).toBeGreaterThanOrEqual(3);
        expect(style.transitionDuration).toBe('0s');
        if (appearance === 'filled') {
          expect(parseFloat(style.borderBlockEndWidth)).toBeGreaterThan(restWidth);
          expect(style.borderBlockEndColor).toBe(ring.outlineColor);
        }
        rings.push(ring);
      }
      expect(rings[1]).toEqual(rings[0]);
    }
  },
);
