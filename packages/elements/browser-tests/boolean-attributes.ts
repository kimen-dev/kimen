import { expect } from 'vitest';

import docs from '../generated/docs.json';

interface DocsProp {
  readonly name: string;
  readonly type: string;
  readonly attr?: string;
  readonly default?: string;
}

export interface BooleanAttribute {
  readonly prop: string;
  readonly attr: string;
  readonly defaultValue: boolean | undefined;
}

/** Every component that declares a boolean property with an attribute, and those properties. */
export const booleanAttributesByTag: ReadonlyMap<string, readonly BooleanAttribute[]> = new Map(
  (docs.components as readonly { tag: string; props: readonly DocsProp[] }[])
    .map(
      ({ tag, props }) =>
        [
          tag,
          props
            .filter(
              ({ type, attr }) =>
                /^boolean(?: \| undefined)?$/u.test(type) && typeof attr === 'string',
            )
            .map(({ name, attr, default: initial }) => ({
              prop: name,
              attr: attr ?? '',
              defaultValue: initial === undefined ? undefined : initial === 'true',
            })),
        ] as const,
    )
    .filter(([, attributes]) => attributes.length > 0),
);

const HYDRATION_DEADLINE_MS = 3000;

async function hydrated(host: HTMLElement): Promise<void> {
  await customElements.whenDefined(host.localName);
  await expect
    .poll(() => host.classList.contains('hydrated'), {
      message: `${host.localName} never hydrated`,
      timeout: HYDRATION_DEADLINE_MS,
    })
    .toBe(true);
}

// Read after component watchers and the render have settled.
const settled = (): Promise<void> =>
  new Promise((resolve) =>
    requestAnimationFrame(() => {
      queueMicrotask(resolve);
    }),
  );

export const booleanContractCases = [
  ['ki-select', ['disabled', 'required']],
  ['ki-option', ['disabled']],
  ['ki-checkbox', ['checked', 'indeterminate', 'disabled', 'required']],
  ['ki-radio-group', ['disabled', 'required', 'label-hidden']],
  ['ki-radio', ['disabled']],
  ['ki-switch', ['checked', 'disabled']],
  ['ki-dialog', ['open', 'close-on-backdrop']],
  ['ki-tab', ['disabled']],
  ['ki-checkbox-group', ['disabled', 'label-hidden']],
  ['ki-segment', ['disabled']],
  ['ki-combobox', ['disabled', 'required']],
  ['ki-table', ['selectable', 'sticky-header', 'loading']],
  ['ki-slider', ['disabled']],
  ['ki-file-upload', ['disabled', 'required', 'multiple']],
  ['ki-sources', ['open']],
] as const;

async function mountBoolean(tag: string, attr: string, value?: string): Promise<HTMLElement> {
  const template = document.createElement('template');
  template.innerHTML = `<${tag}${value === undefined ? '' : ` ${attr}="${value}"`}></${tag}>`;
  const host = template.content.firstElementChild;
  if (!(host instanceof HTMLElement)) throw new Error(`Missing ${tag} fixture`);
  if (tag === 'ki-select') {
    host.setAttribute('label', 'Country');
    host.innerHTML = '<ki-option value="es">Spain</ki-option>';
  }
  if (tag === 'ki-icon-button') host.setAttribute('label', 'More actions');
  document.body.append(host);
  await hydrated(host);
  await settled();
  return host;
}

export async function expectFalseAttributes(
  tag: string,
  attributes: readonly BooleanAttribute[],
): Promise<void> {
  for (const { prop, attr, defaultValue } of attributes) {
    const host = await mountBoolean(tag, attr, 'false');
    const props = host as unknown as Record<string, unknown>;
    const reads = [props[prop]];
    if (attr === 'disabled') expect.soft(host.matches(':disabled'), tag).toBe(false);
    host.setAttribute(attr, 'true');
    await settled();
    host.setAttribute(attr, 'false');
    await settled();
    reads.push(props[prop]);
    if (attr === 'disabled') expect.soft(host.matches(':disabled'), tag).toBe(false);
    if (defaultValue === true) {
      expect
        .soft(host.getAttribute(attr), `<${tag}> ${attr} keeps its false override`)
        .toBe('false');
    }
    // A default-on false override keeps its attribute so it can be removed.
    // Start default-off props from a present value before testing removal.
    if (defaultValue !== true) {
      host.setAttribute(attr, 'true');
      await settled();
    }
    host.removeAttribute(attr);
    await settled();
    expect.soft(props[prop], `<${tag}> ${attr} removed`).toBe(defaultValue);
    if (tag === 'ki-icon-button' && defaultValue === undefined) {
      expect
        .soft(host.shadowRoot?.querySelector('button')?.hasAttribute(`aria-${attr}`))
        .toBe(false);
    }
    props[prop] = 'false';
    await settled();
    expect.soft(props[prop], `<${tag}> .${prop} = "false"`).toBe(false);
    host.remove();
    expect
      .soft(reads, `<${tag}> ${attr}="false" in markup and after hydration`)
      .toEqual([false, false]);
  }
}

export async function expectBooleanContract(tag: string, names: readonly string[]): Promise<void> {
  for (const name of names) {
    const attribute = booleanAttributesByTag.get(tag)?.find(({ attr }) => attr === name);
    if (!attribute) throw new Error(`Missing boolean attribute ${tag} ${name} in the manifest`);
    const { prop, attr, defaultValue } = attribute;
    for (const initial of [undefined, '', 'true', 'false', 'FALSE']) {
      const host = await mountBoolean(tag, attr, initial);
      const props = host as unknown as Record<string, unknown>;
      const reads = [props[prop]];
      for (const next of ['', 'false', 'true', 'FALSE']) {
        host.setAttribute(attr, next);
        await settled();
        reads.push(props[prop]);
      }
      host.remove();
      expect
        .soft(
          reads,
          `<${tag}> ${attr} initially ${JSON.stringify(initial)}, then "", "false", "true", "FALSE"`,
        )
        .toEqual([
          initial === undefined ? defaultValue : initial !== 'false',
          true,
          false,
          true,
          true,
        ]);
    }
  }
}

export async function expectUncheckedReset(tag: 'ki-checkbox' | 'ki-switch'): Promise<void> {
  const form = document.createElement('form');
  form.innerHTML = `<fieldset><${tag} name="enabled" checked="false" disabled="false"></${tag}></fieldset>`;
  document.body.append(form);
  const fieldset = form.querySelector('fieldset');
  const host = form.querySelector(tag);
  if (!fieldset || !host) throw new Error(`Missing ${tag} form fixture`);
  await hydrated(host);
  await settled();
  expect.soft(host.matches(':disabled')).toBe(false);
  expect.soft(host.checked).toBe(false);
  expect.soft(new FormData(form).has('enabled')).toBe(false);

  host.disabled = true;
  await settled();
  host.setAttribute('disabled', 'false');
  await settled();
  expect.soft(host.matches(':disabled')).toBe(false);

  host.checked = true;
  await settled();
  expect.soft(new FormData(form).has('enabled')).toBe(true);

  fieldset.disabled = true;
  host.setAttribute('disabled', 'false');
  await settled();
  expect.soft(host.matches(':disabled')).toBe(true);
  expect.soft(new FormData(form).has('enabled')).toBe(false);
  fieldset.disabled = false;
  await settled();
  expect.soft(new FormData(form).has('enabled')).toBe(true);

  form.reset();
  await settled();
  expect.soft(host.checked).toBe(false);
  expect.soft(new FormData(form).has('enabled')).toBe(false);
}
