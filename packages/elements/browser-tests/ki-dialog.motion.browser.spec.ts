import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:012-ki-dialog
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-dialog.js';

type KiDialogElement = HTMLElement & {
  heading: string;
  open: boolean;
  show: () => Promise<void>;
};

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(async () => {
  await browserCommands.emulateReducedMotion('reduce');
  defineCustomElement();

  const style = document.createElement('style');
  style.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(style);
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
});

async function mount(): Promise<KiDialogElement> {
  document.documentElement.setAttribute('data-ki-theme', 'material3');
  const el = document.createElement('ki-dialog') as KiDialogElement;
  el.heading = 'Delete account?';
  el.innerHTML = '<p>This action permanently deletes your account.</p>';
  document.body.append(el);
  await customElements.whenDefined('ki-dialog');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function internalDialog(el: KiDialogElement): HTMLDialogElement {
  const dialog = el.shadowRoot?.querySelector('dialog');
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('ki-dialog did not render a native dialog');
  }
  return dialog;
}

describe('ki-dialog with reduced motion', () => {
  it('S14 suppresses material3 open transitions under reduced motion', async () => {
    const el = await mount();

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await el.show();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const styles = getComputedStyle(internalDialog(el));
    expect(el.open).toBe(true);
    expect(styles.transitionDuration).toBe('0s');
    expect(styles.opacity).toBe('1');
  });
});
