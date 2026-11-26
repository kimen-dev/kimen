// Boolean attributes, read the way Kimen documents them (the elements build's
// scripts/boolean-attributes.mjs; founder decision of 2026-11-25: "false"
// significa false). Whether a definition came from a per-component module or
// from the lazy loader, a boolean property reads `attr="false"`, a removed
// attribute and the string "false" as false, and an empty attribute as true.
// Stencil's runtime would read every value but a missing attribute as true on
// a form-associated component, like a native `disabled`; these sweeps fail if
// that rule comes back (they fail on all 19 form-associated components
// without the plugin). The few exceptions below are each component's own
// approved contract, asserted as such.
import { expect } from 'vitest';

import docs from '../generated/docs.json';

interface DocsProp {
  readonly name: string;
  readonly type: string;
  readonly attr?: string;
}

export interface BooleanAttribute {
  readonly prop: string;
  readonly attr: string;
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
            .map(({ name, attr }) => ({ prop: name, attr: attr ?? '' })),
        ] as const,
    )
    .filter(([, attributes]) => attributes.length > 0),
);

// What a boolean property reads once each write has settled, in sweep order:
// authored `attr="false"`, then `attr=""`, `attr="false"`, the attribute
// removed, and the property set to the string "false".
type Reading = readonly [unknown, unknown, unknown, unknown, unknown];

const KIMEN: Reading = [false, true, false, false, false];
// Native presence semantics that approved component contracts keep
// (utils/boolean-presence.ts; "A boolean attribute written as \"false\" keeps
// presence semantics" in specs 005, 006, 007, 008 and 014): any present
// attribute is true, as on a native control.
const PRESENCE: Reading = [true, true, true, false, false];
// A property that defaults to true and returns to it without the attribute;
// `attr="false"` still turns it off.
const DEFAULT_ON: Reading = [false, true, false, true, false];

const presence = (...attributes: string[]) =>
  Object.fromEntries(attributes.map((attribute) => [attribute, PRESENCE]));

/** The exceptions to "false" means false, each owned by its component's contract. */
const READINGS: Readonly<Record<string, Readonly<Record<string, Reading>>>> = {
  'ki-checkbox': presence('checked', 'indeterminate', 'disabled', 'required'),
  'ki-checkbox-group': presence('disabled', 'label-hidden'),
  'ki-combobox': presence('disabled', 'required'),
  // `open` keeps presence for the authored attribute only, before the first render.
  'ki-dialog': { ...presence('close-on-backdrop'), open: [true, true, false, false, false] },
  'ki-file-upload': presence('disabled', 'required', 'multiple'),
  'ki-option': presence('disabled'),
  'ki-radio': presence('disabled'),
  'ki-radio-group': presence('disabled', 'required', 'label-hidden'),
  'ki-segment': presence('disabled'),
  'ki-select': presence('disabled', 'required'),
  'ki-slider': presence('disabled'),
  'ki-sources': presence('open'),
  'ki-switch': presence('checked', 'disabled'),
  'ki-tab': presence('disabled'),
  'ki-table': presence('selectable', 'sticky-header', 'loading'),
  'ki-drawer': { modal: DEFAULT_ON },
  'ki-note': { icon: DEFAULT_ON },
  // A popover without a trigger closes itself.
  'ki-popover': { arrow: DEFAULT_ON, open: [false, false, false, false, false] },
  'ki-skeleton': { animated: DEFAULT_ON },
  // A menu without actions refuses to open.
  'ki-fab-menu': { open: [false, false, false, false, false] },
  // Without the attribute the call's status decides whether it is open.
  'ki-tool-call': { open: [false, true, false, undefined, false] },
};

/** How `attr` of `tag` reads after each write of the sweep. */
const expectedReading = (tag: string, attr: string): Reading => READINGS[tag]?.[attr] ?? KIMEN;

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

// A component applies presence semantics from a MutationObserver, and its
// watchers may write back: read once both have run.
const settled = (): Promise<void> =>
  new Promise((resolve) =>
    requestAnimationFrame(() => {
      queueMicrotask(resolve);
    }),
  );

/** Mounts `tag` and asserts how each of its boolean attributes reads. */
export async function expectBooleanAttributes(
  tag: string,
  attributes: readonly BooleanAttribute[],
): Promise<void> {
  for (const { prop, attr } of attributes) {
    const host = document.createElement(tag);
    const props = host as unknown as Record<string, unknown>;
    const read: unknown[] = [];
    const write = async (change: () => void): Promise<void> => {
      change();
      await settled();
      read.push(props[prop]);
    };
    host.setAttribute(attr, 'false');
    document.body.append(host);
    await hydrated(host);
    await write(() => undefined);
    await write(() => {
      host.setAttribute(attr, '');
    });
    await write(() => {
      host.setAttribute(attr, 'false');
    });
    await write(() => {
      host.setAttribute(attr, '');
      host.removeAttribute(attr);
    });
    await write(() => {
      props[prop] = 'false';
    });
    host.remove();
    expect(read, `<${tag} ${attr}>: "false", "", "false", removed, .${prop} = "false"`).toEqual(
      expectedReading(tag, attr),
    );
  }
}

/** Every exception names a boolean attribute the component declares. */
export function unknownExceptions(): string[] {
  return Object.entries(READINGS).flatMap(([tag, readings]) =>
    Object.keys(readings)
      .filter((attr) => !booleanAttributesByTag.get(tag)?.some((entry) => entry.attr === attr))
      .map((attr) => `${tag} ${attr}`),
  );
}
