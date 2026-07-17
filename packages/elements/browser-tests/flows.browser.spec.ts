// Composed end-to-end user flows (the E2E budget of the QA skill: a thin set
// of money-path journeys) running inside the existing Vitest browser mode —
// no separate Playwright harness. Each flow COMPOSES scenarios that the
// per-component suites already assert in isolation; what only this file can
// catch is the integration between components inside one real user journey
// (constraint validation across a mixed form, focus hand-off between page and
// modal, keyboard travel across a composite widget, live token re-resolution
// over a mounted tree).
//
// Deliberately UNMARKED for traceability: every composed scenario already has
// its S-ID asserted in the per-feature marked suites, and multi-@spec markers
// here would credit each bare S-ID to all eight features at once, diluting
// the gate (adversarial-review finding). The comment above each flow cites
// the scenarios it composes; those citations live in comments and this file
// carries no marker, so they are inert for the traceability gate, and the
// test titles themselves use prose without bare S-ID tokens.
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiCheckbox } from '../dist/components/ki-checkbox.js';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';

type KiInputElement = HTMLElement & { value: string };
type KiCheckboxElement = HTMLElement & { checked: boolean; value: string };
type KiSelectElement = HTMLElement & { value: string };
type KiRadioGroupElement = HTMLElement & { value: string };
type KiTabsElement = HTMLElement & { value: string };
type CloseReason = 'backdrop' | 'escape' | 'method';
type KiCloseEvent = CustomEvent<{ reason: CloseReason }>;
type KiDialogElement = HTMLElement & {
  close: () => Promise<void>;
  open: boolean;
  show: () => Promise<void>;
};

const STYLE_ID = 'flows-browser-token-style';
const MATERIAL3_STYLE_ID = 'flows-browser-material3-token-style';

beforeAll(() => {
  defineKiButton();
  defineKiCheckbox();
  defineKiDialog();
  defineKiInput();
  defineKiOption();
  defineKiRadio();
  defineKiRadioGroup();
  defineKiSelect();
  defineKiTab();
  defineKiTabPanel();
  defineKiTabs();
});

afterEach(() => {
  cleanup();
});

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await nextFrame();
  }
  expect(condition(), message).toBe(true);
}

async function mountTree(markup: string, tags: string[]): Promise<HTMLElement> {
  ensureTokens();
  const main = document.createElement('main');
  main.innerHTML = markup;
  document.body.append(main);
  for (const tag of tags) {
    await customElements.whenDefined(tag);
  }
  for (const tag of tags) {
    for (const host of main.querySelectorAll<HTMLElement>(tag)) {
      await waitFor(() => Boolean(host.shadowRoot?.hasChildNodes()), `${tag} hydrated`);
    }
  }
  await nextFrame();
  return main;
}

function requireHost(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  expect(el, selector).not.toBeNull();
  if (!el) {
    throw new Error(`missing ${selector}`);
  }
  return el;
}

function shadowInput(host: HTMLElement): HTMLInputElement {
  const input = host.shadowRoot?.querySelector('input');
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!input) {
    throw new Error(`${host.tagName.toLowerCase()} did not render an internal input`);
  }
  return input;
}

function shadowButton(host: HTMLElement): HTMLButtonElement {
  const button = host.shadowRoot?.querySelector('button');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error(`${host.tagName.toLowerCase()} did not render an internal button`);
  }
  return button;
}

function selectTrigger(el: KiSelectElement): HTMLButtonElement {
  const button = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error('ki-select did not render its trigger part');
  }
  return button;
}

function selectRow(el: KiSelectElement, index: number): HTMLElement {
  const rows = [...(el.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
  const row = rows[index];
  expect(row).toBeInstanceOf(HTMLElement);
  if (!row) {
    throw new Error(`missing option row ${String(index)}`);
  }
  return row;
}

function groupRadio(el: KiRadioGroupElement, index: number): HTMLInputElement {
  const radio = [...el.querySelectorAll('ki-radio')][index];
  if (!radio) {
    throw new Error(`missing ki-radio at index ${String(index)}`);
  }
  return shadowInput(radio);
}

function radiogroupPart(el: KiRadioGroupElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[role="radiogroup"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-radio-group did not render its radiogroup');
  }
  return part;
}

function internalDialog(el: KiDialogElement): HTMLDialogElement {
  const dialog = el.shadowRoot?.querySelector('dialog');
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('ki-dialog did not render an internal native dialog');
  }
  return dialog;
}

function activeElementDeep(root: Document | ShadowRoot = document): Element | null {
  const active = root.activeElement;
  if (active?.shadowRoot?.activeElement) {
    return activeElementDeep(active.shadowRoot);
  }
  return active;
}

function formEntries(form: HTMLFormElement, submitter: HTMLElement | null): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form, submitter)].map(([name, value]) => [
      name,
      value instanceof File ? value.name : value,
    ]),
  );
}

function readCustomProperty(name: string): string {
  const probe = document.createElement('div');
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(name).trim();
  probe.remove();
  return value;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

function rgbToHex(value: string): string {
  const rgbPattern = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/u;
  const match = rgbPattern.exec(value);

  if (!match) {
    return value.toLowerCase();
  }

  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('composed user flows in a real browser', () => {
  // Flow 1 — complete account form. Composes 003-ki-input S1 (typing syncs
  // value) + S14 (empty required blocks submission) + S21 (invalid appearance
  // only after a submission attempt) + S12 (FormData carries name and value);
  // 006-ki-checkbox S14 (required unchecked blocks) + S10 (checked value
  // submits); 005-ki-select S14 (required empty blocks, clears after commit)
  // + S13 (selected value submits); 007-ki-radio-group S13 (required group
  // blocks) + S23 (invalid exposed after block, cleared on selection) + S12
  // (selected value submits); 002-ki-button S7 (submit button submits the
  // form with its submitter data).
  it('flow: blocks an invalid mixed-form submit, surfaces every invalid state, then a corrected resubmit carries the full FormData', async () => {
    cleanup();
    const main = await mountTree(
      `
      <form>
        <ki-input label="Email" name="email" required></ki-input>
        <ki-checkbox name="terms" required value="accepted">Accept the terms</ki-checkbox>
        <ki-select label="Country" name="country" placeholder="Choose a country" required>
          <ki-option value="es">Spain</ki-option>
          <ki-option value="fr">France</ki-option>
        </ki-select>
        <ki-radio-group label="Contact preference" name="contact" required>
          <ki-radio value="email">Email</ki-radio>
          <ki-radio value="sms">SMS</ki-radio>
        </ki-radio-group>
        <ki-button name="intent" type="submit" value="save">Create account</ki-button>
      </form>
      `,
      [
        'ki-input',
        'ki-checkbox',
        'ki-select',
        'ki-option',
        'ki-radio-group',
        'ki-radio',
        'ki-button',
      ],
    );
    const form = requireHost(main, 'form') as HTMLFormElement;
    const email = requireHost(form, 'ki-input') as KiInputElement;
    const terms = requireHost(form, 'ki-checkbox') as KiCheckboxElement;
    const country = requireHost(form, 'ki-select') as KiSelectElement;
    const contact = requireHost(form, 'ki-radio-group') as KiRadioGroupElement;
    const submit = requireHost(form, 'ki-button');
    let submissions = 0;
    let submitted: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
      submitted = formEntries(form, event.submitter);
    });

    // Before any submission attempt no field advertises an invalid state.
    expect(email.matches(':state(user-invalid)')).toBe(false);
    expect(terms.matches(':state(user-invalid)')).toBe(false);
    expect(selectTrigger(country).hasAttribute('aria-invalid')).toBe(false);
    expect(radiogroupPart(contact).hasAttribute('aria-invalid')).toBe(false);

    // Submitting through the real submit control is blocked by constraint
    // validation while every required field is still empty.
    await userEvent.click(shadowButton(submit));
    await nextFrame();
    expect(submissions).toBe(0);
    await waitFor(() => email.matches(':state(user-invalid)'), 'input flagged user-invalid');
    await waitFor(() => terms.matches(':state(user-invalid)'), 'checkbox flagged user-invalid');
    await waitFor(
      () => selectTrigger(country).getAttribute('aria-invalid') === 'true',
      'select flagged aria-invalid',
    );
    await waitFor(
      () => radiogroupPart(contact).getAttribute('aria-invalid') === 'true',
      'radio group flagged aria-invalid',
    );

    // Correct every field the way a user would.
    await userEvent.type(shadowInput(email), 'ada@example.com');
    expect(email.value).toBe('ada@example.com');
    await userEvent.click(shadowInput(terms));
    await waitFor(() => terms.checked, 'checkbox checked after click');
    selectTrigger(country).click();
    await waitFor(
      () => selectTrigger(country).getAttribute('aria-expanded') === 'true',
      'select popup opened',
    );
    selectRow(country, 0).click();
    await waitFor(() => country.value === 'es', 'select committed Spain');
    await waitFor(
      () => selectTrigger(country).getAttribute('aria-expanded') === 'false',
      'select popup closed after commit',
    );
    await waitFor(
      () => !selectTrigger(country).hasAttribute('aria-invalid'),
      'select invalid affordance cleared by the commit',
    );
    await userEvent.click(groupRadio(contact, 1));
    await waitFor(() => contact.value === 'sms', 'radio group selected SMS');
    await waitFor(
      () => !radiogroupPart(contact).hasAttribute('aria-invalid'),
      'radio group invalid affordance cleared by the selection',
    );

    // The corrected form submits exactly once with every value on board.
    await userEvent.click(shadowButton(submit));
    await waitFor(() => submissions === 1, 'corrected form submitted once');
    expect(submitted).toEqual({
      contact: 'sms',
      country: 'es',
      email: 'ada@example.com',
      intent: 'save',
      terms: 'accepted',
    });
  });

  // Flow 2 — modal dialog journey. Composes 012-ki-dialog S1 (opens above an
  // inert page) + S6 (focus enters the dialog) + S9 (exposed as a named modal
  // dialog) + S8 (Escape closes with reason escape and focus returns to the
  // invoker).
  it('flow: opens a modal from its invoker, keeps the page inert, and Escape returns focus to the invoker', async () => {
    cleanup();
    const main = await mountTree(
      `
      <button id="opener" type="button">Delete project</button>
      <button id="behind" type="button">Background action</button>
      <ki-dialog heading="Delete project?">
        <p>This permanently deletes the project.</p>
        <div slot="footer">
          <ki-button id="cancel">Cancel</ki-button>
          <ki-button id="confirm" autofocus>Delete</ki-button>
        </div>
      </ki-dialog>
      `,
      ['ki-dialog', 'ki-button'],
    );
    const dialog = requireHost(main, 'ki-dialog') as KiDialogElement;
    const opener = requireHost(main, '#opener') as HTMLButtonElement;
    const behind = requireHost(main, '#behind') as HTMLButtonElement;
    const confirm = requireHost(dialog, '#confirm');
    let behindClicks = 0;
    behind.addEventListener('click', () => {
      behindClicks += 1;
    });
    opener.addEventListener('click', () => {
      void dialog.show();
    });

    // Open from the keyboard on the invoker.
    opener.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => dialog.open && internalDialog(dialog).open, 'dialog opened from invoker');
    expect(internalDialog(dialog).matches(':modal')).toBe(true);
    await expect.element(page.getByRole('dialog', { name: 'Delete project?' })).toBeInTheDocument();

    // Entry focus lands inside the autofocus footer action.
    await waitFor(
      () => Boolean(confirm.shadowRoot?.contains(activeElementDeep())),
      'entry focus reached the autofocus footer action',
    );

    // The page behind stays inert to pointer and programmatic focus.
    await userEvent.click(behind, { force: true }).catch(() => undefined);
    behind.focus();
    expect(behindClicks).toBe(0);
    expect(document.activeElement).not.toBe(behind);

    // Escape dismisses with the escape reason and hands focus back.
    const closed = new Promise<KiCloseEvent>((resolve) => {
      dialog.addEventListener(
        'ki-close',
        (event) => {
          resolve(event as KiCloseEvent);
        },
        { once: true },
      );
    });
    await userEvent.keyboard('{Escape}');
    const closeEvent = await closed;
    expect(closeEvent.detail.reason).toBe('escape');
    await waitFor(() => !dialog.open, 'dialog closed after Escape');
    expect(document.activeElement).toBe(opener);
  });

  // Flow 3 — keyboard travel across the tab group. Composes 014-ki-tabs S4
  // (arrow moves selection to the next tab, automatic activation) + S1
  // (selecting a tab reveals exactly its panel) + S6 (Tab leaves the strip
  // into the visible panel).
  it('flow: arrow keys auto-activate tabs revealing the matching panel and Tab exits into it', async () => {
    cleanup();
    const main = await mountTree(
      `
      <ki-tabs label="Project" value="overview">
        <ki-tab value="overview">Overview</ki-tab>
        <ki-tab value="details">Details</ki-tab>
        <ki-tab value="activity">Activity</ki-tab>
        <ki-tab-panel value="overview">Overview panel</ki-tab-panel>
        <ki-tab-panel value="details">Details panel</ki-tab-panel>
        <ki-tab-panel value="activity">Activity panel</ki-tab-panel>
      </ki-tabs>
      `,
      ['ki-tabs', 'ki-tab', 'ki-tab-panel'],
    );
    const tabs = requireHost(main, 'ki-tabs') as KiTabsElement;
    const tabOf = (value: string): HTMLElement => requireHost(tabs, `ki-tab[value="${value}"]`);
    const panelOf = (value: string): HTMLElement =>
      requireHost(tabs, `ki-tab-panel[value="${value}"]`);
    let changes = 0;
    tabs.addEventListener('ki-change', () => {
      changes += 1;
    });

    // Arrow travel activates each next tab automatically with visible focus.
    tabOf('overview').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tabOf('details'));
    expect(tabs.value).toBe('details');
    expect(panelOf('details').hasAttribute('hidden')).toBe(false);
    expect(panelOf('overview').hasAttribute('hidden')).toBe(true);
    expect(getComputedStyle(tabOf('details')).outlineStyle).not.toBe('none');

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tabOf('activity'));
    expect(tabs.value).toBe('activity');
    expect(panelOf('activity').hasAttribute('hidden')).toBe(false);
    expect(panelOf('details').hasAttribute('hidden')).toBe(true);
    expect(changes).toBe(2);

    // Tab leaves the strip into the visible panel's content.
    await userEvent.tab();
    expect(document.activeElement).toBe(panelOf('activity'));
  });

  // Flow 4 — hot theme swap over a mounted tree. Composes 001-tokens-theming
  // S5 (declaring material3 restyles the document) + S3 (a document can force
  // dark over a light system preference), observed as live token
  // re-resolution on components that never remount.
  it('flow: re-resolves brand, surface and component tokens on a live tree when theme and scheme change', async () => {
    cleanup();
    const main = await mountTree(
      `
      <ki-button>Save changes</ki-button>
      <ki-input label="Email"></ki-input>
      `,
      ['ki-button', 'ki-input'],
    );
    const button = requireHost(main, 'ki-button');
    const input = requireHost(main, 'ki-input') as KiInputElement;
    const field = (): HTMLElement => requireHost(input.shadowRoot ?? input, '[part="field"]');
    expect(rgbToHex(readCustomProperty('--ki-color-brand-500'))).toBe('#845abe');
    expect(rgbToHex(readCustomProperty('--ki-surface-s0'))).toBe('#ffffff');
    const onmarsButtonBg = getComputedStyle(shadowButton(button)).backgroundColor;
    const onmarsFieldBg = getComputedStyle(field()).backgroundColor;

    // Declare material3 with the tree mounted: tokens re-resolve in place.
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    await waitFor(
      () => rgbToHex(readCustomProperty('--ki-color-brand-500')) === '#6750a4',
      'material3 brand token resolved',
    );
    await waitFor(
      () => getComputedStyle(shadowButton(button)).backgroundColor !== onmarsButtonBg,
      'mounted button repainted from material3 tokens',
    );
    expect(getComputedStyle(field()).backgroundColor).toBe(readTokenColor('--ki-input-rest-bg'));
    expect(button.isConnected && input.isConnected).toBe(true);

    // Back to onmars, then force dark over the light preference: the same
    // mounted components repaint from the dark token values.
    document.documentElement.removeAttribute('data-ki-theme');
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    await waitFor(
      () => rgbToHex(readCustomProperty('--ki-surface-s0')) === '#0a0a0a',
      'forced dark surface token resolved',
    );
    await waitFor(
      () => getComputedStyle(field()).backgroundColor !== onmarsFieldBg,
      'mounted field repainted from dark tokens',
    );
    expect(getComputedStyle(field()).backgroundColor).toBe(readTokenColor('--ki-input-rest-bg'));
  });
});
