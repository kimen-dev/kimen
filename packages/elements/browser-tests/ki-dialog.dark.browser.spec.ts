// @spec:012-ki-dialog
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-dialog.js';

type KiDialogElement = HTMLElement & {
  open: boolean;
  show: () => Promise<void>;
};

const STYLE_ID = 'ki-dialog-dark-token-style';
const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), message).toBe(true);
}

async function mountDialog(parent: ParentNode): Promise<KiDialogElement> {
  ensureTokens();
  const el = document.createElement('ki-dialog') as KiDialogElement;
  el.setAttribute('heading', 'Delete account?');
  el.innerHTML = '<p>This action permanently deletes your account.</p>';
  parent.appendChild(el);
  await customElements.whenDefined('ki-dialog');
  await waitFor(() => Boolean(el.shadowRoot?.querySelector('dialog')), 'ki-dialog rendered');
  return el;
}

function internalDialog(el: KiDialogElement): HTMLDialogElement {
  const dialog = el.shadowRoot?.querySelector('dialog');
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('ki-dialog did not render an internal native dialog');
  }
  return dialog;
}

function readToken(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-dialog under the dark scheme', () => {
  it('S12 forced dark resolves onmars dark surface and backdrop values with zero axe violations', async () => {
    cleanup();
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const main = document.createElement('main');
    document.body.append(main);
    const el = await mountDialog(main);

    await el.show();
    await waitFor(() => el.open && internalDialog(el).open, 'dialog opened');
    const dialog = internalDialog(el);

    expect(getComputedStyle(dialog).backgroundColor).toBe(readToken('--ki-dialog-bg'));
    expect(getComputedStyle(dialog, '::backdrop').backgroundColor).toBe(
      readToken('--ki-dialog-backdrop-bg'),
    );
    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });
});
