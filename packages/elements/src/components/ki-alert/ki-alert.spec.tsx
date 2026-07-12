import { h } from '@stencil/core';
import { describe, expect, it, render, vi } from '@stencil/vitest';
import { resolveDismissFocusTarget } from './ki-alert.focus';
import { liveExposureForTone } from './ki-alert.tone';

// @spec:011-ki-alert
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-alert', () => {
  it('S1 S11 exposes the documented neutral tone and dismiss-label defaults', async () => {
    const { root } = await render(h('ki-alert', { dismissible: true }, 'Service notice'));
    const live = root.shadowRoot?.querySelector('.live');
    const dismiss = root.shadowRoot?.querySelector('[part="dismiss"]');

    expect(root.getAttribute('tone')).toBe('neutral');
    expect(live?.getAttribute('role')).toBe('status');
    expect(root.getAttribute('dismiss-label')).toBe('Dismiss');
    expect(dismiss?.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('S2 renders a strong heading before the message without document heading semantics', async () => {
    const { root } = await render(h('ki-alert', { heading: 'Update available' }, 'Restart soon'));
    const heading = root.shadowRoot?.querySelector('[part="heading"]');
    const message = root.shadowRoot?.querySelector('[part="message"]');
    const documentHeading = root.shadowRoot?.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]');

    expect(heading?.tagName).toBe('STRONG');
    expect(heading).toHaveTextContent('Update available');
    expect(message?.querySelector('slot')?.tagName).toBe('SLOT');
    expect(documentHeading).toBeNull();
    expect(
      [...(heading?.parentElement?.children ?? [])].map((node) => node.getAttribute('part')),
    ).toEqual(['heading', 'message']);
  });

  it('S2 omits the heading element when heading is absent or empty', async () => {
    const absent = await render(h('ki-alert', null, 'Message'));
    const empty = await render(h('ki-alert', { heading: '' }, 'Message'));

    expect(absent.root.shadowRoot?.querySelector('[part="heading"]')).toBeNull();
    expect(empty.root.shadowRoot?.querySelector('[part="heading"]')).toBeNull();
  });

  it('S2 trims surrounding heading whitespace before display', async () => {
    const { root } = await render(
      h('ki-alert', { heading: '  Update available  ' }, 'Restart soon'),
    );
    const heading = root.shadowRoot?.querySelector('[part="heading"]');

    expect(heading?.textContent).toBe('Update available');
  });

  it('S5 falls back to the neutral live exposure and anatomy for an unknown tone', async () => {
    const { root } = await render(h('ki-alert', { tone: 'banana' }, 'Fallback message'));
    const alert = root.shadowRoot?.querySelector('[part="alert"]');
    const live = root.shadowRoot?.querySelector('.live');
    const message = root.shadowRoot?.querySelector('[part="message"]');

    expect(root.getAttribute('tone')).toBe('banana');
    expect(alert?.tagName).toBe('DIV');
    expect(live?.getAttribute('role')).toBe('status');
    expect(live?.getAttribute('part')).toBeNull();
    expect(message?.querySelector('slot')?.tagName).toBe('SLOT');
    expect(root.shadowRoot?.querySelector('[part="dismiss"]')).toBeNull();
    expect(
      [...(root.shadowRoot?.querySelectorAll('[part]') ?? [])].map((node) =>
        node.getAttribute('part'),
      ),
    ).toEqual(['alert', 'message']);
  });

  it('S5 keeps the live wrapper scoped to heading and message only', async () => {
    const { root } = await render(
      h('ki-alert', { heading: 'Update available', dismissible: true }, 'Restart soon'),
    );
    const live = root.shadowRoot?.querySelector('.live');

    expect([...(live?.children ?? [])].map((node) => node.getAttribute('part'))).toEqual([
      'heading',
      'message',
    ]);
  });

  it('S3 renders an empty shadow tree when dismissed is reflected', async () => {
    const { root } = await render(h('ki-alert', { dismissed: true }, 'Backup completed'));

    expect(root.shadowRoot?.querySelector('[part]')).toBeNull();
  });

  it('S3 S16 user dismissal hides the alert, hands off focus, and emits once', async () => {
    const { root, spyOnEvent, waitForChanges } = await render(
      h('ki-alert', { dismissible: true }, 'Backup completed'),
    );
    const dismiss = root.shadowRoot?.querySelector<HTMLButtonElement>('[part="dismiss"]');
    const after = document.createElement('button');
    after.textContent = 'Save';
    document.body.append(after);
    const events = spyOnEvent('ki-dismiss');
    const focusAfter = vi.spyOn(after, 'focus');

    expect(dismiss).toBeInstanceOf(HTMLButtonElement);
    Object.defineProperty(root.shadowRoot, 'activeElement', {
      configurable: true,
      value: dismiss,
    });
    dismiss?.click();
    await waitForChanges();

    expect((root as HTMLElement & { dismissed: boolean }).dismissed).toBe(true);
    expect(root.shadowRoot?.querySelector('[part="alert"]')).toBeNull();
    expect(focusAfter).toHaveBeenCalledOnce();
    expect(events.length).toBe(1);
    expect(events.firstEvent?.detail).toBeNull();
  });
});

describe('liveExposureForTone', () => {
  it('S9 maps danger to alert semantics', () => {
    expect(liveExposureForTone('danger')).toBe('alert');
  });

  it('S17 maps warning to alert semantics', () => {
    expect(liveExposureForTone('warning')).toBe('alert');
  });

  it('S10 maps success to status semantics', () => {
    expect(liveExposureForTone('success')).toBe('status');
  });

  it('S18 maps neutral info unknown and absent tones to status semantics', () => {
    expect(liveExposureForTone('neutral')).toBe('status');
    expect(liveExposureForTone('info')).toBe('status');
    expect(liveExposureForTone('banana')).toBe('status');
    expect(liveExposureForTone(undefined)).toBe('status');
  });
});

describe('resolveDismissFocusTarget', () => {
  function fixture() {
    while (document.body.firstChild) {
      document.body.firstChild.remove();
    }
    const before = document.createElement('button');
    const host = document.createElement('ki-alert');
    const inside = document.createElement('button');
    const after = document.createElement('button');
    before.textContent = 'Before';
    inside.textContent = 'Dismiss';
    after.textContent = 'After';
    document.body.append(before, host, after);
    host.attachShadow({ mode: 'open' }).append(inside);
    return { after, before, host, inside };
  }

  it('S16 resolves the next focusable element after the alert', () => {
    const { after, host, inside } = fixture();
    Object.defineProperty(host.shadowRoot, 'activeElement', { value: inside, configurable: true });

    expect(resolveDismissFocusTarget(host)).toBe(after);
  });

  it('S16 resolves the previous focusable element when none follows', () => {
    const { after, before, host, inside } = fixture();
    after.remove();
    Object.defineProperty(host.shadowRoot, 'activeElement', { value: inside, configurable: true });

    expect(resolveDismissFocusTarget(host)).toBe(before);
  });

  it('S16 resolves body as the last resort', () => {
    const { after, before, host, inside } = fixture();
    before.remove();
    after.remove();
    Object.defineProperty(host.shadowRoot, 'activeElement', { value: inside, configurable: true });

    expect(resolveDismissFocusTarget(host)).toBe(document.body);
  });

  it('S16 returns null when focus is outside the alert', () => {
    const { before, host } = fixture();
    before.focus();

    expect(resolveDismissFocusTarget(host)).toBeNull();
  });

  it('S16/FR-013 hands focus to the following element in document order when nested', () => {
    while (document.body.firstChild) {
      document.body.firstChild.remove();
    }
    const main = document.createElement('main');
    const before = document.createElement('button');
    const section = document.createElement('section');
    const host = document.createElement('ki-alert');
    const inside = document.createElement('button');
    const after = document.createElement('button');
    before.textContent = 'Before';
    inside.textContent = 'Dismiss';
    after.textContent = 'After';
    // before → [ section → host(alert) ] → after, all under <main>
    section.append(host);
    main.append(before, section, after);
    document.body.append(main);
    host.attachShadow({ mode: 'open' }).append(inside);
    Object.defineProperty(host.shadowRoot, 'activeElement', { value: inside, configurable: true });

    // A body-children scan would miss the nested host and return `before`;
    // a real document-order walk returns `after`.
    expect(resolveDismissFocusTarget(host)).toBe(after);
  });
});
