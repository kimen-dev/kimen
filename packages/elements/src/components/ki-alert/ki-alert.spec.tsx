import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { resolveDismissFocusTarget } from './ki-alert.focus';
import { liveExposureForTone } from './ki-alert.tone';

// @spec:011-ki-alert
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-alert', () => {
  it('S2 renders a strong heading before the message without document heading semantics', async () => {
    const { root } = await render(<ki-alert heading="Update available">Restart soon</ki-alert>);
    const heading = root.shadowRoot?.querySelector('[part="heading"]');
    const message = root.shadowRoot?.querySelector('[part="message"]');
    const documentHeading = root.shadowRoot?.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]');

    expect(heading?.tagName).toBe('STRONG');
    expect(heading).toHaveTextContent('Update available');
    expect(message).toHaveTextContent('Restart soon');
    expect(documentHeading).toBeNull();
    expect(heading?.compareDocumentPosition(message ?? heading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('S2 omits the heading element when heading is absent or empty', async () => {
    const absent = await render(<ki-alert>Message</ki-alert>);
    const empty = await render(<ki-alert heading="">Message</ki-alert>);

    expect(absent.root.shadowRoot?.querySelector('[part="heading"]')).toBeNull();
    expect(empty.root.shadowRoot?.querySelector('[part="heading"]')).toBeNull();
  });

  it('S5 falls back to the neutral live exposure and anatomy for an unknown tone', async () => {
    const { root } = await render(<ki-alert tone="banana">Fallback message</ki-alert>);
    const alert = root.shadowRoot?.querySelector('[part="alert"]');
    const live = root.shadowRoot?.querySelector('.live');
    const message = root.shadowRoot?.querySelector('[part="message"]');

    expect(root.getAttribute('tone')).toBe('banana');
    expect(alert).toBeInstanceOf(HTMLDivElement);
    expect(live?.getAttribute('role')).toBe('status');
    expect(live?.getAttribute('part')).toBeNull();
    expect(message).toHaveTextContent('Fallback message');
    expect(root.shadowRoot?.querySelector('[part="dismiss"]')).toBeNull();
    expect(
      [...(root.shadowRoot?.querySelectorAll('[part]') ?? [])].map((node) => node.part.value),
    ).toEqual(['alert', 'message']);
  });

  it('S5 keeps the live wrapper scoped to heading and message only', async () => {
    const { root } = await render(
      <ki-alert heading="Update available" dismissible>
        Restart soon
      </ki-alert>,
    );
    const live = root.shadowRoot?.querySelector('.live');

    expect([...(live?.children ?? [])].map((node) => node.getAttribute('part'))).toEqual([
      'heading',
      'message',
    ]);
  });

  it('S3 renders an empty shadow tree when dismissed is reflected', async () => {
    const { root } = await render(<ki-alert dismissed>Backup completed</ki-alert>);

    expect(root.shadowRoot?.childElementCount).toBe(0);
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
    inside.focus();

    expect(resolveDismissFocusTarget(host)).toBe(after);
  });

  it('S16 resolves the previous focusable element when none follows', () => {
    const { after, before, host, inside } = fixture();
    after.remove();
    inside.focus();

    expect(resolveDismissFocusTarget(host)).toBe(before);
  });

  it('S16 resolves body as the last resort', () => {
    const { after, before, host, inside } = fixture();
    before.remove();
    after.remove();
    inside.focus();

    expect(resolveDismissFocusTarget(host)).toBe(document.body);
  });

  it('S16 returns null when focus is outside the alert', () => {
    const { before, host } = fixture();
    before.focus();

    expect(resolveDismissFocusTarget(host)).toBeNull();
  });
});
