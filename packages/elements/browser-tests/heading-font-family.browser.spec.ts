// @spec:065-heading-font-family
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';

type Theme = 'onmars' | 'material3';
type Scheme = 'light' | 'dark';

beforeAll(() => {
  defineKiAlert();
  defineKiDialog();

  const style = document.createElement('style');
  style.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(style);
});

afterEach(() => {
  document.body.replaceChildren();
});

async function mountHeadings(theme: Theme = 'onmars', scheme: Scheme = 'light') {
  const region = document.createElement('section');
  region.setAttribute('data-ki-theme', theme);
  region.setAttribute('data-ki-color-scheme', scheme);

  const dialog = document.createElement('ki-dialog');
  dialog.setAttribute('heading', 'Delete account?');
  dialog.setAttribute('open', '');
  dialog.textContent = 'This action is permanent.';

  const alert = document.createElement('ki-alert');
  alert.setAttribute('heading', 'Heads up');
  alert.textContent = 'Changes could not be saved.';

  region.append(dialog, alert);
  document.body.append(region);
  await expect.poll(() => dialog.shadowRoot?.querySelector('dialog[open]')).toBeTruthy();
  await expect.poll(() => alert.shadowRoot?.querySelector('[part="heading"]')).toBeTruthy();

  return {
    region,
    dialog,
    alert,
    dialogHeading: partStyle(dialog, 'heading'),
    dialogBody: partStyle(dialog, 'body'),
    alertHeading: partStyle(alert, 'heading'),
    alertMessage: partStyle(alert, 'message'),
  };
}

function partStyle(host: HTMLElement, name: string): CSSStyleDeclaration {
  const part = host.shadowRoot?.querySelector(`[part="${name}"]`);
  if (!part) {
    throw new Error(`Missing ${host.localName} part "${name}"`);
  }
  return getComputedStyle(part);
}

describe('component heading typography', () => {
  it.each([
    ['onmars', 'light'],
    ['onmars', 'dark'],
    ['material3', 'light'],
    ['material3', 'dark'],
  ] as const)('S1: default heading typography in %s %s', async (theme, scheme) => {
    const { dialogHeading, dialogBody, alertHeading, alertMessage } = await mountHeadings(
      theme,
      scheme,
    );

    // The Calma dialog links the display family, while Material 3 uses body.
    if (theme === 'onmars') {
      expect(dialogHeading.fontFamily).toMatch(/^["']?Newsreader["']?, Georgia, serif$/u);
      expect(dialogHeading.fontWeight).toBe('500');
    } else {
      expect(dialogHeading.fontFamily).toBe(dialogBody.fontFamily);
    }
    expect(alertHeading.fontFamily).toBe(alertMessage.fontFamily);
    expect(['normal', '0px']).toContain(dialogHeading.letterSpacing);
  });

  it('S2: the shared heading family restyles both headings', async () => {
    const { region, dialogHeading, dialogBody, alertHeading, alertMessage } =
      await mountHeadings('material3');
    const bodyFamily = dialogBody.fontFamily;
    const messageFamily = alertMessage.fontFamily;

    region.style.setProperty('--ki-typography-family-heading', 'serif');

    expect(dialogHeading.fontFamily).toBe('serif');
    expect(alertHeading.fontFamily).toBe('serif');
    expect(dialogBody.fontFamily).toBe(bodyFamily);
    expect(alertMessage.fontFamily).toBe(messageFamily);
  });

  it('S3: component heading families take precedence over the shared family', async () => {
    const { region, dialog, alert, dialogHeading, dialogBody, alertHeading, alertMessage } =
      await mountHeadings();
    const bodyFamily = dialogBody.fontFamily;
    const messageFamily = alertMessage.fontFamily;
    region.style.setProperty('--ki-typography-family-heading', 'sans-serif');

    dialog.style.setProperty('--ki-dialog-heading-font-family', 'serif');
    alert.style.setProperty('--ki-alert-heading-font-family', 'serif');

    expect(dialogHeading.fontFamily).toBe('serif');
    expect(alertHeading.fontFamily).toBe('serif');
    expect(dialogBody.fontFamily).toBe(bodyFamily);
    expect(alertMessage.fontFamily).toBe(messageFamily);
  });

  it('S4: dialog heading tracking is independent of body tracking', async () => {
    const { dialog, dialogHeading, dialogBody } = await mountHeadings();
    const bodyTracking = dialogBody.letterSpacing;

    dialog.style.setProperty('--ki-dialog-heading-letter-spacing', '2px');

    expect(dialogHeading.letterSpacing).toBe('2px');
    expect(dialogBody.letterSpacing).toBe(bodyTracking);
  });
});
