// @spec:106-ki-sidebar
import tokens from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const fixture = document.createElement('main');
fixture.id = 'sidebar-group-fixture';
const style = document.createElement('style');
const { ariaSnapshot } = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
};

beforeAll(() => {
  defineAllComponents();
  style.textContent = tokens;
  document.head.append(style);
  document.body.append(fixture);
});
afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});
afterAll(() => {
  style.remove();
  fixture.remove();
});

it('S3 exposes one named landmark, a labelled group list and a current page', async () => {
  fixture.innerHTML = `<ki-sidebar label="Main">
    <ki-sidebar-item href="#home">Home</ki-sidebar-item>
    <ki-sidebar-group label="Workspace">
      <ki-sidebar-item href="#members" current>Members</ki-sidebar-item>
    </ki-sidebar-group>
  </ki-sidebar>`;
  const members = page.getByRole('link', { name: 'Members' });
  await expect.element(members).toHaveAttribute('aria-current', 'page');
  await expect.element(members).toHaveAttribute('href', '#members');
  await expect.element(page.getByRole('navigation')).toHaveLength(1);
  await expect.element(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect.element(page.getByRole('list', { name: 'Workspace' })).toBeVisible();
  const snapshot = await ariaSnapshot('#sidebar-group-fixture');
  expect(snapshot).toMatch(/- navigation "Main":/);
  expect(snapshot).toMatch(/- heading "Workspace" \[level=2\]/);
  expect(snapshot).toMatch(/- list "Workspace":\n\s+- listitem:\n\s+- link "Members"/);
  await expectAccessible(fixture);
});
