import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:007-ki-radio-group
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineRadioGroup } from '../dist/components/ki-radio-group.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { moveToNewParent } from './reconnect';

type KiRadioGroupElement = HTMLElement & {
  disabled: boolean;
  label: string;
  required: boolean;
  value: string;
  validationMessage: string;
};
type KiRadioElement = HTMLElement & { disabled: boolean };

const STYLE_ID = 'ki-radio-group-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-radio-group-browser-material3-token-style';

beforeAll(() => {
  defineRadioGroup();
  defineRadio();
  defineInput();
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

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function mount(
  attributes: Record<string, string | boolean> = {},
  parent: ParentNode = document.body,
): Promise<KiRadioGroupElement> {
  ensureTokens();
  const el = document.createElement('ki-radio-group') as unknown as KiRadioGroupElement;
  el.setAttribute('label', 'Contact preference');
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.innerHTML = `
    <ki-radio value="email">Email</ki-radio>
    <ki-radio value="sms">SMS</ki-radio>
    <ki-radio value="phone">Phone</ki-radio>
  `;
  parent.appendChild(el);
  await customElements.whenDefined('ki-radio-group');
  await customElements.whenDefined('ki-radio');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function radios(el: KiRadioGroupElement): HTMLInputElement[] {
  return [...el.querySelectorAll('ki-radio')].map((radio) => {
    const input = radio.shadowRoot?.querySelector('input');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!input) {
      throw new Error('ki-radio did not render an input');
    }
    return input;
  });
}

async function settleFrames(count = 3): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** What a radio's control actually paints, disabled or not. */
function controlPaint(radio: Element): string {
  const control = radio.shadowRoot?.querySelector('[part="control"]');
  if (!control) {
    throw new Error('ki-radio did not render a control');
  }
  const style = getComputedStyle(control);
  return [style.backgroundColor, style.borderColor, style.opacity, style.color].join('|');
}

function radioAt(el: KiRadioGroupElement, index: number): HTMLInputElement {
  const input = radios(el)[index];
  if (!input) {
    throw new Error(`Missing radio input at index ${String(index)}`);
  }
  return input;
}

describe('ki-radio-group in a real browser', () => {
  it('S1 selecting an option makes it the group single choice and emits input before change', async () => {
    cleanup();
    const el = await mount();
    const email = radioAt(el, 0);
    const events: string[] = [];
    el.addEventListener('input', (event) => {
      events.push(`input:${String(event.composed)}:${el.value}`);
    });
    el.addEventListener('change', (event) => {
      events.push(`change:${String(event.composed)}:${el.value}`);
    });

    await userEvent.click(email);

    expect(email.checked).toBe(true);
    expect(radios(el).filter((input) => input.checked)).toHaveLength(1);
    expect(el.value).toBe('email');
    expect(events).toEqual(['input:true:email', 'change:true:email']);
  });

  it('S27 a script click on an option selects it like a native radio, then reports one input and one change', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact' }, form);
    const [email, sms] = [...el.querySelectorAll<KiRadioElement>('ki-radio')];
    const events: string[] = [];
    for (const type of ['click', 'input', 'change']) {
      el.addEventListener(type, () => {
        events.push(`${type}:${el.value}`);
      });
    }

    sms?.click();

    expect(el.value).toBe('sms');
    expect(new FormData(form).get('contact')).toBe('sms');
    expect(events.filter((entry) => !entry.startsWith('click'))).toEqual([
      'input:sms',
      'change:sms',
    ]);
    expect(events.filter((entry) => entry.startsWith('click'))).toHaveLength(1);
    await expect.element(page.getByRole('radio', { name: 'SMS' })).toBeChecked();

    // Clicking the selected option again, as on a native radio, reports nothing.
    sms?.click();
    email?.click();

    expect(el.value).toBe('email');
    expect(events.filter((entry) => !entry.startsWith('click'))).toEqual([
      'input:sms',
      'change:sms',
      'input:email',
      'change:email',
    ]);
  });

  it('S27 a script click on a disabled option selects nothing and reports nothing', async () => {
    cleanup();
    const el = await mount();
    const sms = el.querySelectorAll<KiRadioElement>('ki-radio')[1];
    if (!sms) throw new Error('Missing SMS option');
    sms.disabled = true;
    await settleFrames();
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));

    sms.click();

    expect(el.value).toBe('');
    expect(events).toEqual([]);
  });

  it('S1 reports change in the same task as input, as a native radio does', async () => {
    cleanup();
    const el = await mount();
    const events: string[] = [];
    el.addEventListener('input', () => {
      events.push(`input:${el.value}`);
    });
    el.addEventListener('change', () => {
      events.push(`change:${el.value}`);
    });

    // Activation is synchronous: when click() returns, a native radio, a
    // ki-checkbox and a ki-switch have all dispatched both events.
    radioAt(el, 0).click();

    expect(events).toEqual(['input:email', 'change:email']);
    // And no second, deferred change follows.
    await settleFrames();
    expect(events).toEqual(['input:email', 'change:email']);
  });

  it('S2 selecting another option releases the previous option', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const sms = radioAt(el, 1);

    await userEvent.click(sms);

    expect(email.checked).toBe(false);
    expect(sms.checked).toBe(true);
    expect(el.value).toBe('sms');
  });

  it('S3 a disabled option cannot be selected and reselection emits nothing', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const phone = radioAt(el, 2);
    el.querySelectorAll('ki-radio')[2]?.setAttribute('disabled', '');
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    await userEvent.click(phone, { force: true }).catch(() => undefined);
    await userEvent.click(email);

    expect(email.checked).toBe(true);
    expect(phone.checked).toBe(false);
    expect(el.value).toBe('email');
    expect(eventCount).toBe(0);
  });

  it('S4 a value matching no option leaves the group unselected and operable', async () => {
    cleanup();
    const el = await mount({ value: 'postal' });
    const sms = radioAt(el, 1);

    expect(radios(el).some((input) => input.checked)).toBe(false);
    await userEvent.click(sms);

    expect(sms.checked).toBe(true);
    expect(el.value).toBe('sms');
  });

  it('S19 a disabled group ignores selection attempts and is exposed unavailable', async () => {
    cleanup();
    const el = await mount({ disabled: true, value: 'email' });
    const sms = radioAt(el, 1);
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    await userEvent.click(sms, { force: true }).catch(() => undefined);

    expect(el.value).toBe('email');
    expect(sms.checked).toBe(false);
    expect(eventCount).toBe(0);
    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('S1 programmatic value assignment updates display silently', async () => {
    cleanup();
    const el = await mount();
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    el.value = 'sms';
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(radios(el)[1]?.checked).toBe(true);
    expect(eventCount).toBe(0);
  });

  it('S10 exposes a named radiogroup and selected radio through the accessibility tree', async () => {
    cleanup();
    await mount({ value: 'email' });

    await expect
      .element(page.getByRole('radiogroup', { name: 'Contact preference' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('radio', { name: 'Email', checked: true }))
      .toBeInTheDocument();
  });

  it('S11 exposes a disabled option as an unavailable radio with no option-level ARIA', async () => {
    cleanup();
    const el = await mount();
    const phone = el.querySelectorAll('ki-radio')[2];
    phone?.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await expect
      .element(page.getByRole('radio', { name: 'Phone', disabled: true }))
      .toBeInTheDocument();
    const optionAria = [...el.querySelectorAll('ki-radio')].flatMap((radio) => [
      ...(radio.shadowRoot?.querySelectorAll('[aria-checked], [aria-disabled]') ?? []),
    ]);
    expect(optionAria).toEqual([]);
  });

  it('has zero axe violations (Art. V floor)', async () => {
    cleanup();
    const el = await mount();
    el.querySelectorAll('ki-radio')[2]?.setAttribute('disabled', '');
    await expectAccessible(el);
  });

  it('S5 Tab reaches the group as a single stop on the selected option with visible focus', async () => {
    cleanup();
    const before = document.createElement('button');
    before.tabIndex = 0;
    before.textContent = 'Before';
    document.body.append(before);
    const el = await mount({ value: 'sms' });
    const sms = radioAt(el, 1);
    before.focus();

    await userEvent.keyboard('{Tab}');

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(sms);
    const control = el
      .querySelectorAll('ki-radio')[1]
      ?.shadowRoot?.querySelector('[part="control"]');
    if (!control) {
      throw new Error('Missing focused radio control part');
    }
    const focused = getComputedStyle(control);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S25 Tab enters an unselected group on the first enabled option without selecting', async () => {
    cleanup();
    const before = document.createElement('button');
    before.tabIndex = 0;
    before.textContent = 'Before';
    document.body.append(before);
    const el = await mount();
    el.querySelectorAll('ki-radio')[0]?.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const sms = radioAt(el, 1);
    before.focus();

    await userEvent.keyboard('{Tab}');

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(sms);
    expect(radios(el).some((input) => input.checked)).toBe(false);
  });

  it('S6 ArrowDown moves focus and selection to the next option with one input and change', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const sms = radioAt(el, 1);
    const events: string[] = [];
    el.addEventListener('input', () => {
      events.push('input');
    });
    el.addEventListener('change', () => {
      events.push('change');
    });
    email.focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(sms);
    expect(sms.checked).toBe(true);
    expect(events).toEqual(['input', 'change']);
  });

  it('S7 Arrow navigation wraps and skips disabled options', async () => {
    cleanup();
    const el = await mount({ value: 'sms' });
    el.querySelectorAll('ki-radio')[2]?.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const sms = radioAt(el, 1);
    const email = radioAt(el, 0);
    sms.focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(el.querySelectorAll('ki-radio')[0]?.shadowRoot?.activeElement).toBe(email);
    expect(email.checked).toBe(true);
  });

  it('S8 Space selects the focused option when none is selected', async () => {
    cleanup();
    const el = await mount();
    const email = radioAt(el, 0);
    email.focus();

    await userEvent.keyboard(' ');

    expect(email.checked).toBe(true);
    expect(el.value).toBe('email');
  });

  it('S9 Tab leaves the group in a single step', async () => {
    cleanup();
    const after = document.createElement('button');
    after.tabIndex = 0;
    after.textContent = 'After';
    const el = await mount({ value: 'email' });
    document.body.append(after);
    radioAt(el, 0).focus();

    expect(el.querySelectorAll('ki-radio')[0]?.shadowRoot?.activeElement).toBe(radioAt(el, 0));
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
  });

  // The group pushes its disabled state onto its members as a marker, and a
  // marker is a claim of ownership: the moment a radio leaves the group, the
  // claim is void. The assertion is on paint rather than on the attribute
  // because the attribute is the mechanism and the appearance is the promise —
  // a radio that keeps the marker is a permanently disabled-looking control
  // its own `disabled` property can no longer explain.
  it('S19 a radio taken out of a disabled group stops looking disabled', async () => {
    cleanup();
    const group = await mount({ disabled: true });
    const departing = group.querySelector('ki-radio');
    expect(departing).not.toBeNull();
    if (departing === null) {
      return;
    }

    // Like for like: a radio that was never in a group, mounted from the same
    // markup, is the only honest reference for "not disabled".
    const reference = document.createElement('ki-radio');
    reference.setAttribute('value', 'email');
    reference.textContent = 'Email';
    document.body.append(reference);
    await settleFrames();

    document.body.append(departing);
    await settleFrames();

    expect(
      departing.hasAttribute('data-ki-group-disabled'),
      'the group kept its disabled marker on a radio it no longer owns',
    ).toBe(false);
    expect(
      controlPaint(departing),
      'a radio removed from a disabled group still paints disabled outside it',
    ).toBe(controlPaint(reference));
  });

  it('S20 Tab skips a disabled group entirely', async () => {
    cleanup();
    const after = document.createElement('button');
    after.tabIndex = 0;
    after.textContent = 'After';
    document.body.append(after);
    await mount({ disabled: true, value: 'email' });

    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
  });

  it('S21 ArrowLeft moves to the next option in RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount({ value: 'email' });
    const email = radioAt(el, 0);
    const sms = radioAt(el, 1);
    email.focus();

    await userEvent.keyboard('{ArrowLeft}');

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(sms);
    expect(sms.checked).toBe(true);
  });

  it('S12 submits the selected option value with the group name', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    await mount({ name: 'contact', value: 'email' }, form);

    const data = new FormData(form);

    expect(data.get('contact')).toBe('email');
  });

  it('S13 blocks submission for a required group with no selection', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', required: true }, form);

    expect(form.checkValidity()).toBe(false);
    expect(el.matches(':invalid')).toBe(true);
    expect(el.validationMessage.length).toBeGreaterThan(0);
  });

  it('S22 exposes required state to assistive technology', async () => {
    cleanup();
    const el = await mount({ required: true });

    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-required')).toBe(
      'true',
    );
  });

  it('S23 exposes invalid only after a blocked submission and clears on selection', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', required: true }, form);

    // Spec 042 D6: an explicit aria-invalid="false" until the error shows.
    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-invalid')).toBe(
      'false',
    );
    form.reportValidity();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    );

    await userEvent.click(radioAt(el, 0));

    await expect
      .element(page.getByRole('radiogroup', { name: 'Contact preference' }))
      .toHaveAttribute('aria-invalid', 'false');
  });

  it('S14 form reset restores the initial selection silently', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', value: 'email' }, form);
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });
    await userEvent.click(radioAt(el, 1));

    eventCount = 0;
    form.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(radioAt(el, 0).checked).toBe(true);
    expect(el.value).toBe('email');
    expect(eventCount).toBe(0);
  });

  it('S15 a disabled fieldset makes the group inert and contributes nothing', async () => {
    cleanup();
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset);
    document.body.append(form);
    const el = await mount({ name: 'contact', value: 'email' }, fieldset);

    await userEvent.click(radioAt(el, 1), { force: true }).catch(() => undefined);

    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(new FormData(form).has('contact')).toBe(false);
    expect(el.value).toBe('email');
  });

  it('S24 disabling the selected option withholds entry without blocking required submission', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', required: true, value: 'email' }, form);
    let eventCount = 0;
    el.addEventListener('input', () => {
      eventCount += 1;
    });
    el.addEventListener('change', () => {
      eventCount += 1;
    });

    el.querySelectorAll('ki-radio')[0]?.setAttribute('disabled', '');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.value).toBe('email');
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).has('contact')).toBe(false);
    expect(radioAt(el, 1).tabIndex).toBe(0);
    expect(eventCount).toBe(0);
  });

  // Review round 1 (FR-006): disabling the FOCUSED option at runtime must
  // move focus (not just the tab stop) to the group's new single tab stop,
  // so a keyboard user is never dropped to the body.
  it('S24 moving focus off a runtime-disabled option lands on the tab stop', async () => {
    cleanup();
    const el = await mount({ name: 'contact', value: 'email' });
    const hosts = [...el.querySelectorAll('ki-radio')];
    radioAt(el, 0).focus();
    // A slotted radio retargets focus to its host at document level.
    expect(document.activeElement).toBe(hosts[0]);

    el.querySelectorAll('ki-radio')[0]?.setAttribute('disabled', '');

    // The MutationObserver reconcile runs in a microtask; the focus restore is
    // deferred one further frame (after the browser blurs to <body>). Gate on
    // a condition that only becomes true AFTER the reconcile — the disabled
    // option leaving the tab order — so the anchor captured next is the new
    // one, never the stale pre-reconcile tab stop.
    await expect
      .poll(() => hosts[0]?.shadowRoot?.querySelector('input')?.tabIndex, {
        message: 'the disabled option must leave the tab order',
      })
      .toBe(-1);
    // Focus retargets to the ki-radio host at the group's shadow boundary; the
    // new tab stop is the input inside that host.
    const anchorHost = hosts.find(
      (radio) => radio.shadowRoot?.querySelector('input')?.tabIndex === 0,
    );
    expect(anchorHost, 'a new tab stop must exist').toBeTruthy();
    await expect
      .poll(() => document.activeElement, {
        message: 'focus must follow to the new tab stop, not fall to body',
      })
      .toBe(anchorHost);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('S17 honors a forced dark scheme: the option controls repaint', async () => {
    cleanup();
    const el = await mount({ label: 'Contact preference', value: 'email' });

    expect(await repaintedUnderForcedDark(el)).toContain('control');
  });

  it('S16 material3 repaints the selected dot and spaces the options with unchanged markup', async () => {
    cleanup();
    ensureMaterial3Tokens();
    const el = await mount({ value: 'email' });
    const options = [...el.querySelectorAll('ki-radio')];
    const selectedDot = (): string => {
      const control = options[0]?.shadowRoot?.querySelector('[part="control"]');
      if (!control) {
        throw new Error('Missing radio control');
      }
      return getComputedStyle(control, '::before').backgroundColor;
    };
    const gapBetweenOptions = (): number =>
      (options[1]?.getBoundingClientRect().top ?? 0) -
      (options[0]?.getBoundingClientRect().bottom ?? 0);
    const markup = el.outerHTML;
    const before = { dot: selectedDot(), gap: gapBetweenOptions() };

    document.documentElement.setAttribute('data-ki-theme', 'material3');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // The selected dot takes the theme's ink and the options spread apart.
    await expect.poll(selectedDot).not.toBe(before.dot);
    expect(gapBetweenOptions()).toBeGreaterThan(before.gap);
    expect(el.outerHTML).toBe(markup);
  });

  it('S18 option layout follows the document writing direction under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount();
    const radio = el.querySelector('ki-radio');
    const control = radio?.shadowRoot?.querySelector('[part="control"]');
    const label = radio?.shadowRoot?.querySelector('[part="label"]');
    if (!control || !label) {
      throw new Error('Missing radio parts for RTL geometry assertion');
    }

    expect(control.getBoundingClientRect().left).toBeGreaterThan(
      label.getBoundingClientRect().left,
    );
  });
});

// The group listens for `input` in the capture phase to learn of a selection
// before any application listener. Whatever else is composed inside it — the
// text field next to an "Other" option is the common case — owns its events:
// silencing them at the group would stop that control hearing its own input.
describe('ki-radio-group with another control composed inside it', () => {
  it('a text field inside the group still receives and publishes what the user types', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    const other = document.createElement('ki-input') as HTMLElement & { value: string };
    other.setAttribute('label', 'Other');
    el.append(other);
    await customElements.whenDefined('ki-input');
    await settleFrames(4);
    const field = other.shadowRoot?.querySelector('input');
    if (!field) {
      throw new Error('ki-input did not render an input');
    }
    const heard: (EventTarget | null)[] = [];
    const listen = (event: Event): void => {
      heard.push(event.target);
    };
    document.addEventListener('input', listen);

    await userEvent.type(field, 'Fax');
    document.removeEventListener('input', listen);

    expect(other.value).toBe('Fax');
    expect(heard).toEqual([other, other, other]);
    // The group's own selection is none of the text field's business either.
    expect(el.value).toBe('email');
    expect(radioAt(el, 0).checked).toBe(true);
  });
});

// Generated UI streams: the group can be in the document, already loaded,
// before any of its options exist. Selection re-derives from the declared
// value as options arrive (spec 007 edge case "Options inserted at runtime").
// A keyed reorder in a framework, a drag between lists or a portal takes the
// group out of the document and puts it back: one disconnect, one connect.
describe('ki-radio-group moved to another parent', () => {
  it('S2 still releases the previous option and reports the change', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    moveToNewParent(el);
    const events: string[] = [];
    el.addEventListener('input', () => {
      events.push(`input:${el.value}`);
    });
    el.addEventListener('change', () => {
      events.push(`change:${el.value}`);
    });

    await userEvent.click(radioAt(el, 1));

    expect(radios(el).map((input) => input.checked)).toEqual([false, true, false]);
    expect(el.value).toBe('sms');
    expect(events).toEqual(['input:sms', 'change:sms']);
  });

  it('S6 arrow keys still move focus and selection to the next option', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    moveToNewParent(el);
    radioAt(el, 0).focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(radioAt(el, 1));
    expect(radios(el).map((input) => input.checked)).toEqual([false, true, false]);
    expect(el.value).toBe('sms');
  });

  it('S12 submits the option chosen after the move', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', value: 'email' }, form);
    moveToNewParent(el);

    await userEvent.click(radioAt(el, 2));

    expect(new FormData(form).getAll('contact')).toEqual(['phone']);
  });

  it('S24 an option disabled after the move withholds its entry and yields the tab stop', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', value: 'email' }, form);
    moveToNewParent(el);

    el.querySelectorAll('ki-radio')[0]?.setAttribute('disabled', '');

    await expect.poll(() => new FormData(form).has('contact')).toBe(false);
    expect(el.value).toBe('email');
    expect(radioAt(el, 1).tabIndex).toBe(0);
  });
});

describe('ki-radio-group with options that arrive after the group', () => {
  async function mountEmpty(value: string): Promise<KiRadioGroupElement> {
    ensureTokens();
    const el = document.createElement('ki-radio-group') as unknown as KiRadioGroupElement;
    el.setAttribute('label', 'Plan');
    el.setAttribute('value', value);
    document.body.append(el);
    await customElements.whenDefined('ki-radio-group');
    await settleFrames(4);
    return el;
  }

  function appendOption(el: KiRadioGroupElement, value: string): HTMLElement {
    const option = document.createElement('ki-radio');
    option.setAttribute('value', value);
    option.textContent = `Plan ${value.toUpperCase()}`;
    el.append(option);
    return option;
  }

  function pageButton(label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    document.body.append(button);
    return button;
  }

  // The stop AFTER the group is a text field: every engine puts one in the
  // tab order, while WebKit on macOS leaves buttons out by default, so a
  // trailing button let Tab fall through to the body there.
  function pageField(label: string): HTMLInputElement {
    const field = document.createElement('input');
    field.setAttribute('aria-label', label);
    document.body.append(field);
    return field;
  }

  it('S5 options appended after load select the pending value and form a single tab stop', async () => {
    cleanup();
    const before = pageButton('Before');
    const el = await mountEmpty('b');
    const after = pageField('After');

    appendOption(el, 'a');
    const pending = appendOption(el, 'b');
    appendOption(el, 'c');
    await settleFrames(4);

    expect(el.value).toBe('b');
    expect(radios(el).map((input) => input.checked)).toEqual([false, true, false]);
    before.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(pending);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(after);
  });

  it('S4 the pending value waits for its option while the others arrive one at a time', async () => {
    cleanup();
    const el = await mountEmpty('b');

    appendOption(el, 'a');
    await settleFrames(4);
    expect(radios(el).map((input) => input.checked)).toEqual([false]);

    appendOption(el, 'b');
    await settleFrames(4);
    appendOption(el, 'c');
    await settleFrames(4);

    expect(el.value).toBe('b');
    expect(radios(el).map((input) => input.checked)).toEqual([false, true, false]);
    expect(radios(el).map((input) => input.tabIndex)).toEqual([-1, 0, -1]);
  });
});

// Boolean presence semantics (native HTML parity): a present attribute means
// true whatever its value. Stencil >= 4.45 removes a host attribute when it
// reflects a parsed `false`, so these run against the built output.
describe('ki-radio-group boolean presence in a real browser', () => {
  async function expectNoSelection(el: KiRadioGroupElement, index: number): Promise<void> {
    await userEvent.click(radioAt(el, index), { force: true }).catch(() => undefined);
    await settleFrames();
    expect(el.value).toBe('');
    expect(radioAt(el, index).checked).toBe(false);
  }

  it('S26 disabled="false" and required="false" in the markup keep the group disabled and required', async () => {
    cleanup();
    const el = await mount({ disabled: 'false', required: 'false' });
    await settleFrames();

    expect(radioAt(el, 1).disabled).toBe(true);
    expect(el.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('aria-required')).toBe(
      'true',
    );
    await expectNoSelection(el, 1);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
    expect(el.getAttribute('required')).toBe('');
  });

  it('S26 disabled="false" written after the first render disables the group', async () => {
    cleanup();
    const el = await mount();
    el.setAttribute('disabled', 'false');
    await settleFrames();

    expect(radioAt(el, 1).disabled).toBe(true);
    await expectNoSelection(el, 1);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('disabled')).toBe('');
  });

  it('S26 disabled="false" keeps an option unavailable in the markup and after the first render', async () => {
    cleanup();
    const el = document.createElement('ki-radio-group') as unknown as KiRadioGroupElement;
    el.setAttribute('label', 'Contact preference');
    el.innerHTML = `
      <ki-radio value="email">Email</ki-radio>
      <ki-radio value="sms" disabled="false">SMS</ki-radio>
      <ki-radio value="phone">Phone</ki-radio>
    `;
    document.body.append(el);
    await customElements.whenDefined('ki-radio-group');
    await customElements.whenDefined('ki-radio');
    await settleFrames(4);
    const options = [...el.querySelectorAll('ki-radio')];
    options[2]?.setAttribute('disabled', 'false');
    await settleFrames();

    expect(radioAt(el, 1).disabled).toBe(true);
    expect(radioAt(el, 2).disabled).toBe(true);
    await expectNoSelection(el, 1);
    await expectNoSelection(el, 2);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(options[1]?.getAttribute('disabled')).toBe('');
    expect(options[2]?.getAttribute('disabled')).toBe('');
  });

  // Presence semantics are about ATTRIBUTES. Framework wrappers (React, Vue,
  // Angular) assign PROPERTIES, so a group disabled while its data loads must
  // come back when the property is cleared: re-reading the attribute Stencil
  // has not un-reflected yet would pin the group disabled and required forever.
  it('S19 S13 clearing the disabled and required properties re-enables the group and lifts the requirement', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount({ name: 'contact', disabled: true, required: true }, form);

    el.disabled = false;
    el.required = false;
    await settleFrames();

    const group = el.shadowRoot?.querySelector('[role="radiogroup"]');
    expect(el.disabled).toBe(false);
    expect(el.required).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(group?.hasAttribute('aria-disabled')).toBe(false);
    expect(group?.hasAttribute('aria-required')).toBe(false);
    // No longer required: an unanswered group does not block the form.
    expect(form.checkValidity()).toBe(true);

    await userEvent.click(radioAt(el, 1));

    expect(el.value).toBe('sms');
    expect(new FormData(form).get('contact')).toBe('sms');
  });

  // The same race with a second attribute in play: `disabled` is still on the
  // host when `required` is written, and only the attribute that was written
  // may be read as present.
  it('S19 clearing the disabled property survives the required attribute written in the same tick', async () => {
    cleanup();
    const el = await mount({ disabled: true });

    el.disabled = false;
    el.setAttribute('required', '');
    await settleFrames();

    expect(el.disabled).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(radioAt(el, 1).disabled).toBe(false);
    expect(el.required).toBe(true);
  });

  it('S3 clearing the disabled property makes a disabled option selectable again', async () => {
    cleanup();
    const el = await mount();
    const sms = el.querySelectorAll<KiRadioElement>('ki-radio')[1];
    if (!sms) {
      throw new Error('Missing the SMS option');
    }
    sms.setAttribute('disabled', '');
    await settleFrames();
    expect(radioAt(el, 1).disabled).toBe(true);

    sms.disabled = false;
    await settleFrames();

    expect(sms.disabled).toBe(false);
    expect(sms.hasAttribute('disabled')).toBe(false);
    await userEvent.click(radioAt(el, 1));
    expect(el.value).toBe('sms');
  });
});

describe('ki-radio-group with options hidden by the hidden attribute', () => {
  async function tabInto(el: KiRadioGroupElement): Promise<void> {
    const before = document.createElement('button');
    before.textContent = 'Before';
    el.before(before);
    before.focus();
    await userEvent.keyboard('{Tab}');
  }

  it('S25 Tab enters an unselected group on the first visible option when the first one is hidden', async () => {
    cleanup();
    const el = await mount();
    el.querySelectorAll('ki-radio')[0]?.setAttribute('hidden', '');
    await settleFrames();

    await tabInto(el);

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(radioAt(el, 1));
    expect(radios(el).some((input) => input.checked)).toBe(false);
  });

  it('S5 Tab still reaches the group when its selected option is hidden, and the value is kept', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    el.querySelectorAll('ki-radio')[0]?.setAttribute('hidden', '');
    await settleFrames();

    await tabInto(el);

    expect(el.querySelectorAll('ki-radio')[1]?.shadowRoot?.activeElement).toBe(radioAt(el, 1));
    expect(el.value).toBe('email');
  });

  it('S7 Arrow navigation skips a hidden option', async () => {
    cleanup();
    const el = await mount({ value: 'email' });
    el.querySelectorAll('ki-radio')[1]?.setAttribute('hidden', '');
    await settleFrames();
    radioAt(el, 0).focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(el.querySelectorAll('ki-radio')[2]?.shadowRoot?.activeElement).toBe(radioAt(el, 2));
    expect(radioAt(el, 2).checked).toBe(true);
  });

  it('S25 an option revealed again becomes reachable in its place', async () => {
    cleanup();
    const el = await mount();
    const first = el.querySelectorAll('ki-radio')[0];
    first?.setAttribute('hidden', '');
    await settleFrames();
    first?.removeAttribute('hidden');
    await settleFrames();

    await tabInto(el);

    expect(first?.shadowRoot?.activeElement).toBe(radioAt(el, 0));
  });
});

interface AxNode {
  readonly role: string;
  readonly name: string;
}

const axCommands = commands as unknown as {
  accessibilityTree: () => Promise<AxNode[] | null>;
  ariaSnapshotByRole: (role: 'radiogroup', name: string) => Promise<string>;
};

// The engine's accessibility tree is read over CDP, which only Chromium
// exposes; Firefox and WebKit answer null. Headless Chromium reports
// `HeadlessChrome/`, hence no word boundary.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

/** Every node of the Chromium accessibility tree whose name contains `text`. */
async function nodesNaming(text: string): Promise<AxNode[]> {
  await settleFrames(2);
  const nodes = await axCommands.accessibilityTree();
  if (nodes === null) throw new Error('Chromium stopped answering its accessibility tree');
  return nodes.filter((node) => node.name.includes(text));
}

async function mountNamedFromPage(groupAttributes: string): Promise<KiRadioGroupElement> {
  ensureTokens();
  document.body.innerHTML = `<main>
    <h2 id="question">Which plan suits you?</h2>
    <h3 id="other">Billing period</h3>
    <ki-radio-group ${groupAttributes}>
      <ki-radio value="basic">Basic</ki-radio>
      <ki-radio value="pro">Pro</ki-radio>
    </ki-radio-group>
  </main>`;
  const el = document.querySelector('ki-radio-group') as unknown as KiRadioGroupElement;
  await customElements.whenDefined('ki-radio-group');
  await expect.poll(() => el.shadowRoot?.querySelector('[role="radiogroup"]')).toBeTruthy();
  await settleFrames();
  return el;
}

describe('ki-radio-group naming in a real browser', () => {
  it('S28 a hidden label is not displayed and names the group once', async () => {
    cleanup();
    const el = await mount({ label: 'Your answer', 'label-hidden': true });
    const label = el.shadowRoot?.querySelector<HTMLElement>('[part="label"]');

    expect(label?.getClientRects()).toHaveLength(0);
    await expect.element(page.getByRole('radiogroup', { name: 'Your answer' })).toBeVisible();
    if (IS_CHROMIUM) {
      // The name reaches assistive technology once: as the group's name, never
      // also as text read in passing before the options.
      expect((await nodesNaming('Your answer')).map(({ role }) => role)).toEqual(['radiogroup']);
    }
    await expectAccessible(el);
  });

  it('S28 label-hidden="false" still hides the label, as every boolean attribute does', async () => {
    cleanup();
    const el = await mount({ label: 'Your answer', 'label-hidden': 'false' });

    expect(el.shadowRoot?.querySelector('[part="label"]')?.getClientRects()).toHaveLength(0);
    await expect.element(page.getByRole('radiogroup', { name: 'Your answer' })).toBeVisible();
  });

  it('S29 a heading on the page names a group that has no label of its own', async () => {
    cleanup();
    const el = await mountNamedFromPage('aria-labelledby="question" name="plan"');

    expect(el.shadowRoot?.querySelector('[part="label"]')).toBeNull();
    if (IS_CHROMIUM) {
      // The engine's own tree: the heading reads the question and the group
      // carries it as its name; nothing else announces it. Chromium also
      // computes a name for the host, which keeps the author's attribute:
      // a generic node, whose name ARIA prohibits and screen readers skip,
      // as for any element without a role. Inline text boxes are the
      // heading's own text runs.
      const announced = (await nodesNaming('Which plan suits you?'))
        .map(({ role }) => role)
        .filter((role) => role !== 'generic' && role !== 'InlineTextBox');
      expect(announced.sort()).toEqual(['StaticText', 'heading', 'radiogroup']);
    }
    // Playwright's accessible-name computation in every engine. Vitest's own
    // role locators resolve id references only, never element references.
    expect(await axCommands.ariaSnapshotByRole('radiogroup', 'Which plan suits you?')).toMatch(
      /^- radiogroup "Which plan suits you\?":/u,
    );
    // After the snapshot, as aria-snapshot-reflection does: axe reads the
    // same reflected getter.
    await expectAccessible(el.closest('main') ?? document.body);
  });

  it('S29 the group follows a change of the referenced ids', async () => {
    cleanup();
    const el = await mountNamedFromPage('aria-labelledby="question"');

    el.setAttribute('aria-labelledby', 'other');

    expect(await axCommands.ariaSnapshotByRole('radiogroup', 'Billing period')).toMatch(
      /^- radiogroup "Billing period":/u,
    );
    el.removeAttribute('aria-labelledby');
    el.setAttribute('label', 'Plan');
    await expect.element(page.getByRole('radiogroup', { name: 'Plan', exact: true })).toBeVisible();
  });

  it('S30 the group own label follows the page heading in its name', async () => {
    cleanup();
    await mountNamedFromPage('aria-labelledby="question" label="Choose one"');

    expect(
      await axCommands.ariaSnapshotByRole('radiogroup', 'Which plan suits you? Choose one'),
    ).toMatch(/^- radiogroup "Which plan suits you\? Choose one":/u);
    await expect.element(page.getByText('Choose one')).toBeVisible();
  });
});
