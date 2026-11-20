// @spec:101-input-action
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { expectAccessible, parkPointer } from './axe';

const textAction =
  '<ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>';
const iconAction = `<ki-icon-button slot="action" size="sm" variant="secondary" label="Search">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="7" cy="7" r="4"></circle><path d="m10 10 3 3"></path>
  </svg>
</ki-icon-button>`;
const endAffix = '<span slot="end" aria-hidden="true">Docs</span>';
const themeStyle = document.createElement('style');
const searchbox = () => page.getByRole('searchbox', { name: 'Search docs', exact: true });
const searchButton = () => page.getByRole('button', { name: 'Search', exact: true });

beforeAll(() => {
  defineKiInput();
  defineKiButton();
  defineKiIconButton();
  themeStyle.textContent = tokensCss + material3Css;
  document.head.append(themeStyle);
});

afterEach(async () => {
  await parkPointer();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
});

afterAll(() => { themeStyle.remove(); });

function mountSearch(content = textAction, attributes = 'value="tokens"'): HTMLFormElement {
  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  form.innerHTML = `<ki-input type="search" name="q" label="Search docs" ${attributes}>
    ${content}
  </ki-input>`;
  document.body.append(form);
  return form;
}

function collectSubmissions(form: HTMLFormElement): FormDataEntryValue[][] {
  const submissions: FormDataEntryValue[][] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions.push(new FormData(form).getAll('q'));
  });
  return submissions;
}

async function actionAndField(form: HTMLFormElement) {
  await expect.element(searchButton()).toBeVisible();
  const field = form.querySelector('ki-input')?.shadowRoot?.querySelector('[part="field"]');
  if (!field) {
    throw new Error('Search field did not render');
  }
  return { field, action: searchButton().element() };
}

describe('ki-input action', () => {
  it('S1 centers the action inside the field after the end adornment', async () => {
    const form = mountSearch(endAffix + textAction);
    const { field, action } = await actionAndField(form);
    const end = form.querySelector('[slot="end"]');
    if (!end) {
      throw new Error('Missing trailing adornment');
    }

    await expect
      .poll(() => {
        const enclosure = field.getBoundingClientRect();
        const button = action.getBoundingClientRect();
        return (
          button.left > end.getBoundingClientRect().right &&
          button.right < enclosure.right &&
          Math.abs((enclosure.top + enclosure.bottom - button.top - button.bottom) / 2) <= 0.5
        );
      })
      .toBe(true);
  });

  it('S2 tabs from the focused searchbox to the action', async () => {
    const form = mountSearch();
    const { action } = await actionAndField(form);
    const input = searchbox().element() as HTMLInputElement;
    input.focus();

    await userEvent.tab();

    expect(action.getRootNode()).toBeInstanceOf(ShadowRoot);
    await expect.poll(() => (action.getRootNode() as ShadowRoot).activeElement).toBe(action);
  });

  it('S3 names the icon action and the searchbox independently', async () => {
    mountSearch(iconAction);

    await expect.element(searchbox()).toBeVisible();
    await expect.element(searchButton()).toBeVisible();
    await expectAccessible(document.body);
  });

  it('S4 submits the current search query once when Enter is pressed in the entry', async () => {
    const form = mountSearch(textAction, 'value="draft"');
    await expect.element(searchButton()).toBeVisible();
    const submissions = collectSubmissions(form);
    await searchbox().fill('tokens');

    await userEvent.keyboard('{Enter}');

    expect(submissions).toEqual([['tokens']]);
  });

  it('S5 submits the search query once when the action is activated', async () => {
    const form = mountSearch();
    const submissions = collectSubmissions(form);

    await searchButton().click();

    expect(submissions).toEqual([['tokens']]);
  });

  it.each(['onmars', 'material3'])(
    'S6 applies the gap and inset overrides in %s',
    async (theme) => {
      document.documentElement.setAttribute('data-ki-theme', theme);
      const form = mountSearch(endAffix + textAction);
      const { field, action } = await actionAndField(form);
      const end = form.querySelector('[slot="end"]');
      if (!end) {
        throw new Error('Missing trailing adornment');
      }

      const gap = () => action.getBoundingClientRect().left - end.getBoundingClientRect().right;
      const inset = () =>
        field.getBoundingClientRect().right -
        Number.parseFloat(getComputedStyle(field).borderInlineEndWidth) -
        action.getBoundingClientRect().right;
      await expect.poll(() => Math.abs(gap() - 4)).toBeLessThanOrEqual(0.5);
      await expect.poll(() => Math.abs(inset() - 4)).toBeLessThanOrEqual(0.5);

      const host = form.querySelector<HTMLElement>('ki-input');
      host?.style.setProperty('--ki-input-action-gap', '9px');
      host?.style.setProperty('--ki-input-action-padding-end', '12px');

      await expect.poll(() => Math.abs(gap() - 9)).toBeLessThanOrEqual(0.5);
      await expect.poll(() => Math.abs(inset() - 12)).toBeLessThanOrEqual(0.5);
    },
  );

  it('S8 puts the action inside the left border after the RTL adornment', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const form = mountSearch(endAffix + textAction);
    const { field, action } = await actionAndField(form);
    const end = form.querySelector('[slot="end"]');
    if (!end) {
      throw new Error('Missing trailing adornment');
    }

    await expect
      .poll(() => {
        const button = action.getBoundingClientRect();
        return (
          button.right < end.getBoundingClientRect().left &&
          button.left > field.getBoundingClientRect().left
        );
      })
      .toBe(true);
  });

  it('S9 blocks Enter submission and exposes an invalid state on an empty required field', async () => {
    const form = mountSearch(textAction, 'required');
    await expect.element(searchButton()).toBeVisible();
    const submissions = collectSubmissions(form);
    await searchbox().click();

    await userEvent.keyboard('{Enter}');

    expect(submissions).toEqual([]);
    await expect.element(searchbox()).toHaveAttribute('aria-invalid', 'true');
  });
});
