// Element identity across renders, whichever key the build ships. Stencil's
// compiler inserts keys for eligible elements of a single-return render().
// The production build shortens those keys (scripts/short-vdom-keys.mjs).
// The vDOM matches siblings by tag and key, so the short keys must keep two
// elements of one render apart, and the keys the source writes must keep
// working as written. These checks fail if the build merges the compiler's
// keys (the drawer then turns its header into the swipe handle) or breaks the
// authored ones; they pass with Stencil's own 40-character keys too.
import { expect } from 'vitest';

type ButtonHost = HTMLElement & { href?: string | undefined };
type DrawerHost = HTMLElement & { placement: string };

async function mounted<T extends HTMLElement>(host: T, selector: string): Promise<T> {
  document.body.append(host);
  await customElements.whenDefined(host.localName);
  await expect.poll(() => host.shadowRoot?.querySelector(selector) ?? null).not.toBeNull();
  return host;
}

function part(host: HTMLElement, name: string): HTMLElement {
  const element = host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!element) throw new Error(`${host.localName} rendered no ${name} part`);
  return element;
}

/**
 * ki-button renders its control as `<a key="button">` with a destination and
 * `<button key="button">` without one: each change swaps the control for a
 * new element of the other tag, and the status region beside it stays.
 */
export async function expectButtonLinkSwap(): Promise<void> {
  const host = document.createElement('ki-button') as ButtonHost;
  host.textContent = 'Save';
  await mounted(host, '[part="button"]');
  const status = host.shadowRoot?.querySelector('.status');
  expect(status).toBeInstanceOf(HTMLElement);
  const button = part(host, 'button');
  expect(button.localName).toBe('button');

  host.href = '/start';
  await expect.poll(() => part(host, 'button').localName).toBe('a');
  const link = part(host, 'button');
  expect(link.getAttribute('href')).toBe('/start');
  expect(host.shadowRoot?.querySelectorAll('[part="button"]')).toHaveLength(1);
  expect(host.shadowRoot?.querySelector('button')).toBeNull();
  expect(host.shadowRoot?.querySelector('.status')).toBe(status);

  host.removeAttribute('href');
  host.href = undefined;
  await expect.poll(() => part(host, 'button').localName).toBe('button');
  const again = part(host, 'button');
  expect(again).not.toBe(button);
  expect(again.hasAttribute('href')).toBe(false);
  expect(host.shadowRoot?.querySelectorAll('[part="button"]')).toHaveLength(1);
  expect(host.shadowRoot?.querySelector('a')).toBeNull();
  expect(host.shadowRoot?.querySelector('.status')).toBe(status);
}

/**
 * ki-drawer renders its swipe handle, a `div` with a compiler key, only at
 * the bottom, before its header, another `div` with a compiler key. Moving
 * the drawer to the bottom and back adds and removes the handle; the header,
 * its close button and the other sections stay the same elements.
 */
export async function expectDrawerKeepsItsHeader(): Promise<void> {
  const host = document.createElement('ki-drawer') as DrawerHost;
  host.setAttribute('heading', 'Edit incident');
  await mounted(host, '[part="header"]');
  const names = ['header', 'heading', 'close', 'body', 'footer'];
  const before = names.map((name) => part(host, name));
  const handle = () => host.shadowRoot?.querySelector('[part="handle"]') ?? null;
  // Identity, not equality: toEqual would accept a rebuilt element.
  const expectKept = () => {
    for (const [index, name] of names.entries()) {
      expect(part(host, name), `the ${name} part`).toBe(before[index]);
    }
  };
  expect(handle()).toBeNull();

  host.placement = 'bottom';
  await expect.poll(handle).not.toBeNull();
  expect(before).not.toContain(handle());
  expectKept();

  host.placement = 'end';
  await expect.poll(handle).toBeNull();
  expectKept();
}
