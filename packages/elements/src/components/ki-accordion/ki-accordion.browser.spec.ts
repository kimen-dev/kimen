// @spec:085-ki-details
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineAccordion } from '../../../dist/components/ki-accordion.js';
import { defineCustomElement as defineDetails } from '../../../dist/components/ki-details.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineDetails();
  defineAccordion();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

async function mount(html: string) {
  fixture.innerHTML = html;
  await expect
    .poll(() => fixture.querySelectorAll('ki-details > details').length)
    .toBe(fixture.querySelectorAll('ki-details').length);
}

function member(id: string) {
  const host = fixture.querySelector<HTMLKiDetailsElement>(`#${id}`);
  const panel = host?.querySelector('details');
  const summary = panel?.querySelector('summary');
  if (!host || !panel || !summary) throw new Error(`Missing disclosure ${id}`);
  return { host, panel, summary };
}

it('S4 uses the native name group and reports both changed members', async () => {
  await mount(`
    <ki-accordion exclusive>
      <ki-details id="permissions" summary="Permissions" open>Invite users.</ki-details>
      <ki-details id="exports" summary="Exports">Make a backup.</ki-details>
    </ki-accordion>
  `);
  const permissions = member('permissions');
  const exports = member('exports');
  await expect.poll(() => exports.panel.name).not.toBe('');
  expect(permissions.panel.name).toBe(exports.panel.name);
  const states: Record<string, boolean> = {};
  for (const { host } of [permissions, exports]) {
    host.addEventListener('ki-toggle', (event) => {
      states[host.id] = (event as CustomEvent<{ open: boolean }>).detail.open;
    });
  }

  await userEvent.click(exports.summary);
  await expect.poll(() => ({ ...states })).toEqual({ permissions: false, exports: true });
  expect(permissions.host.open).toBe(false);
  expect(exports.host.open).toBe(true);
  await expect.element(page.getByText('Invite users.')).not.toBeVisible();
  await expect.element(page.getByText('Make a backup.')).toBeVisible();
  await expectAccessible(fixture);
});

it('S4 reconciles initial and live exclusivity and follows a moved member', async () => {
  await mount(`
    <ki-accordion id="exclusive" exclusive>
      <ki-details id="first" open summary="First">First answer.</ki-details>
      <ki-details id="second" open summary="Second">Second answer.</ki-details>
    </ki-accordion>
    <ki-accordion exclusive>
      <ki-details id="other" open summary="Other">Other answer.</ki-details>
    </ki-accordion>
  `);
  const group = fixture.querySelector<HTMLKiAccordionElement>('#exclusive');
  if (!group) throw new Error('Missing accordion');
  const first = member('first');
  const second = member('second');
  const other = member('other');

  await expect.poll(() => second.host.open).toBe(false);
  expect(first.host.open).toBe(true);
  expect(other.panel.name).not.toBe(first.panel.name);

  group.exclusive = false;
  await expect.poll(() => second.panel.name).toBe('');
  await userEvent.click(second.summary);
  await expect.poll(() => second.host.open).toBe(true);
  expect(first.host.open).toBe(true);

  group.exclusive = true;
  await expect.poll(() => second.host.open).toBe(false);
  expect(first.host.open).toBe(true);

  fixture.append(second.host);
  await expect.poll(() => second.panel.name).toBe('');
  await userEvent.click(second.summary);
  await expect.poll(() => second.host.open).toBe(true);
  expect(first.host.open).toBe(true);
  expect(other.host.open).toBe(true);
});

it('S5 allows independent panels and keeps isolated groups open', async () => {
  await mount(`
    <ki-accordion>
      <ki-details id="permissions" open summary="Permissions">Invite users.</ki-details>
      <ki-details id="exports" summary="Exports">Make a backup.</ki-details>
    </ki-accordion>
    <ki-accordion exclusive>
      <ki-details id="billing" open summary="Billing">Update your card.</ki-details>
    </ki-accordion>
  `);
  await userEvent.click(member('exports').summary);
  await expect.poll(() => member('exports').host.open).toBe(true);
  expect(member('permissions').host.open).toBe(true);
  expect(member('billing').host.open).toBe(true);
});

it('S6 works as native HTML with scripting disabled', async () => {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.title = 'Native workspace FAQ';
  frame.srcdoc = `<!doctype html>
    <details name="faq" open><summary>Permissions</summary>Invite users.</details>
    <details name="faq"><summary>Exports</summary>Make a backup.</details>`;
  const loaded = new Promise<void>((resolve) => { frame.addEventListener('load', () => { resolve(); }, { once: true }); },
  );
  fixture.append(frame);
  await loaded;

  const panels = frame.contentDocument?.querySelectorAll('details');
  const first = panels?.[0];
  const second = panels?.[1];
  if (!first || !second) throw new Error('Missing the script-free native disclosures');
  second.querySelector('summary')?.click();
  expect(first.open).toBe(false);
  expect(second.open).toBe(true);
});
