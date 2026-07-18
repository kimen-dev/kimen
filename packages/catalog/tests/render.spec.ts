// @spec:028-guarded-renderer
// The guardrail as a security boundary: only catalog components render, only
// declared props and actions cross, no code path executes from spec data,
// budgets bound every render, and every rejection is observable inert data.
// The adversarial scenarios (S2, S3, S5-S9, S12, S13, S15, S16) are the
// evidence behind the guarded-renderer capability (FR-009).
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ActionEvent,
  createStreamingRenderer,
  DEFAULT_RENDER_BUDGETS,
  renderUiSpec,
  type UiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const payButton = (): UiSpec => ({
  version: 1,
  actions: ['submit-order'],
  root: {
    component: 'ki-card',
    slots: {
      '': [
        {
          component: 'ki-button',
          props: { variant: 'primary' },
          action: 'submit-order',
          slots: { '': ['Pay now'] },
        },
      ],
    },
  },
});

describe('renderUiSpec — only catalog components render', () => {
  it('S1 renders catalog components with their declared props', () => {
    const result = renderUiSpec(payButton(), { surface });
    expect(result.ok).toBe(true);
    const card = surface.querySelector('ki-card');
    const button = card?.querySelector('ki-button');
    expect(card).not.toBeNull();
    expect(button?.getAttribute('variant')).toBe('primary');
    expect(button?.textContent).toBe('Pay now');
  });

  it.each([
    'script',
    'iframe',
    'ki-not-in-catalog',
  ])('S2 never renders a component type "%s" outside the catalog', (type) => {
    const result = renderUiSpec({ version: 1, root: { component: type } }, { surface });
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('unknown-component');
    expect(diagnostic?.value).toBe(type);
    expect(diagnostic?.message).toContain(type);
  });
});

describe('renderUiSpec — only declared props and actions pass', () => {
  it('S3 rejects an undeclared prop fail-closed naming it', () => {
    const result = renderUiSpec(
      { version: 1, root: { component: 'ki-button', props: { onclick: 'alert(1)' } } },
      { surface },
    );
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('unknown-prop');
    expect(diagnostic?.message).toContain('onclick');
  });

  it('S4 dispatches only the declared action, once, with the data payload', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(payButton(), { surface, onAction });
    const button = surface.querySelector('ki-button');
    button?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onAction).toHaveBeenCalledTimes(1);
    const event = onAction.mock.calls[0]?.[0];
    expect(event?.action).toBe('submit-order');
    expect(event?.data).toEqual({ variant: 'primary' });
  });

  it('S4 dispatches only the innermost action when action-bound nodes nest', () => {
    const onAction = vi.fn<(event: ActionEvent) => void>();
    renderUiSpec(
      {
        version: 1,
        actions: ['card-action', 'button-action'],
        root: {
          component: 'ki-card',
          action: 'card-action',
          slots: {
            '': [{ component: 'ki-button', action: 'button-action', slots: { '': ['Go'] } }],
          },
        },
      },
      { surface, onAction },
    );
    surface
      .querySelector('ki-button')
      ?.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]?.action).toBe('button-action');
  });

  it('S4 neutralizes a form-submitting default on an action-bound button', () => {
    const form = document.createElement('form');
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault();
    });
    form.addEventListener('submit', onSubmit);
    surface.appendChild(form);
    renderUiSpec(payButton(), { surface: form, onAction: vi.fn() });
    // ki-button's documented default type is "submit"; the renderer pins an
    // action-bound button to type="button" so no native submission runs.
    expect(form.querySelector('ki-button')?.getAttribute('type')).toBe('button');
    form.querySelector('ki-button')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('re-render replaces prior content only after validation succeeds', () => {
    renderUiSpec(payButton(), { surface });
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
    // A valid re-render swaps the tree, never duplicates it.
    renderUiSpec(payButton(), { surface });
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
    // A rejected re-render leaves the previous content intact.
    const rejected = renderUiSpec({ version: 1, root: { component: 'iframe' } }, { surface });
    expect(rejected.ok).toBe(false);
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
  });

  it('S5 rejects a binding to an event the catalog does not declare', () => {
    // An invented component event surfaces as an undeclared prop on the node
    // (the neutral format has no free event-handler channel): rejected
    // naming it, exactly like S3.
    const result = renderUiSpec(
      { version: 1, root: { component: 'ki-button', props: { onPwn: 'submit-order' } } },
      { surface },
    );
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    expect(result.diagnostics[0]?.message).toContain('onPwn');
  });
});

describe('renderUiSpec — no code-execution path from spec data', () => {
  it('S6 renders markup inside spec text as inert text', () => {
    const result = renderUiSpec(
      {
        version: 1,
        root: { component: 'ki-alert', slots: { '': ['<img src=x onerror=alert(1)>'] } },
      },
      { surface },
    );
    expect(result.ok).toBe(true);
    const alert = surface.querySelector('ki-alert');
    expect(alert?.querySelector('img')).toBeNull();
    expect(alert?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('S7 rejects the executable URL value "%s" naming the prop and scheme', (value) => {
    const result = renderUiSpec(
      { version: 1, root: { component: 'ki-avatar', props: { src: value, label: 'A' } } },
      { surface },
    );
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('url-scheme');
    expect(diagnostic?.message).toContain('src');
    expect(diagnostic?.message).toContain(value.split(':')[0] ?? '');
  });

  it('S7 accepts http, https and relative URL references', () => {
    for (const src of ['https://cdn.example/a.png', 'http://example/a.png', '/local/a.png']) {
      surface.replaceChildren();
      const result = renderUiSpec(
        { version: 1, root: { component: 'ki-avatar', props: { src, label: 'A' } } },
        { surface },
      );
      expect(result.ok, src).toBe(true);
    }
  });

  it.each([
    ['props', '__proto__'],
    ['props', 'constructor'],
    ['props', 'prototype'],
  ])('S8 leaves the runtime untouched for a %s "%s" pollution key', (_object, key) => {
    const polluted = { polluted: undefined as unknown };
    const result = renderUiSpec(
      `{"version":1,"root":{"component":"ki-button","props":{${JSON.stringify(key)}:{"polluted":true}}}}`,
      { surface },
    );
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    expect(result.diagnostics[0]?.rule).toBe('forbidden-key');
    expect('polluted' in polluted ? polluted.polluted : undefined).toBeUndefined();
    expect({} as { polluted?: boolean }).not.toHaveProperty('polluted');
  });
});

describe('renderUiSpec — declared budgets bound every render', () => {
  const nested = (depth: number): UiSpec => {
    let node = { component: 'ki-card' } as Record<string, unknown>;
    for (let level = 1; level < depth; level += 1) {
      node = { component: 'ki-card', slots: { '': [node] } };
    }
    return { version: 1, root: node as UiSpec['root'] };
  };

  it('S9 rejects a spec one level beyond the depth budget before rendering', () => {
    const result = renderUiSpec(nested(5), { surface, budgets: { maxDepth: 4 } });
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    expect(result.diagnostics[0]?.rule).toBe('depth-budget');
  });

  it('S9 rejects a spec one node beyond the node-count budget', () => {
    const twoCards: UiSpec = {
      version: 1,
      root: { component: 'ki-card', slots: { '': [{ component: 'ki-badge' }] } },
    };
    const result = renderUiSpec(twoCards, { surface, budgets: { maxNodes: 1 } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('node-count-budget');
  });

  it('S9 rejects a spec one byte beyond the payload-size budget', () => {
    const spec = payButton();
    const bytes = new TextEncoder().encode(JSON.stringify(spec)).length;
    const result = renderUiSpec(spec, { surface, budgets: { maxBytes: bytes - 1 } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('size-budget');
  });

  it('S14 renders a spec exactly at every declared budget', () => {
    const spec = payButton();
    const bytes = new TextEncoder().encode(JSON.stringify(spec)).length;
    const result = renderUiSpec(spec, {
      surface,
      budgets: { maxBytes: bytes, maxDepth: 2, maxNodes: 2 },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    expect(surface.querySelector('ki-button')).not.toBeNull();
  });
});

describe('renderUiSpec — observability and version skew', () => {
  it('S10 pinpoints the offending node with path, rule and inert value', () => {
    const result = renderUiSpec(
      {
        version: 1,
        root: {
          component: 'ki-card',
          slots: {
            '': [{ component: 'ki-badge' }, { component: 'ki-badge' }, { component: 'iframe' }],
          },
        },
      },
      { surface },
    );
    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.path).toContain('[2]');
    expect(diagnostic?.rule).toBe('unknown-component');
    expect(diagnostic?.value).toBe('iframe');
  });

  it('S13 rejects an unsupported catalog schema version naming both versions', () => {
    const result = renderUiSpec(payButton(), { surface, catalogSchemaVersion: '99.0.0' });
    expect(result.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('unsupported-version');
    expect(diagnostic?.message).toContain('99.0.0');
    expect(diagnostic?.value).toBe('99.0.0');
  });

  it('S13 reads the catalog schema version the agent declares in the spec document', () => {
    // The neutral format is strict, so a declared version travels as a
    // top-level field the renderer reads and strips before validation.
    const unsupported = renderUiSpec(
      { catalogSchemaVersion: '99.0.0', version: 1, root: { component: 'ki-card' } },
      { surface },
    );
    expect(unsupported.ok).toBe(false);
    expect(unsupported.diagnostics[0]?.rule).toBe('unsupported-version');

    const supported = renderUiSpec(
      { catalogSchemaVersion: '1.0.0', version: 1, root: { component: 'ki-card' } },
      { surface },
    );
    expect(supported.ok).toBe(true);
    expect(surface.querySelector('ki-card')).not.toBeNull();
  });

  it('S10 preserves the offending value for a wrong-typed prop', () => {
    const result = renderUiSpec(
      { version: 1, root: { component: 'ki-button', props: { disabled: 'false' } } },
      { surface },
    );
    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('invalid-prop-type');
    expect(diagnostic?.value).toBe('false');
  });

  it('S16 keeps a hostile offending value inert inside its diagnostic', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const result = renderUiSpec(
      { version: 1, root: { component: 'ki-avatar', props: { src: `javascript:${hostile}` } } },
      { surface },
    );
    expect(result.ok).toBe(false);
    // The diagnostic value is data; a host that renders it via textContent
    // shows literal text and requests no image.
    const display = document.createElement('output');
    display.textContent = result.diagnostics[0]?.value ?? '';
    surface.appendChild(display);
    expect(display.querySelector('img')).toBeNull();
    expect(display.textContent).toContain(hostile);
  });
});

describe('createStreamingRenderer — progressive rendering without weakening the boundary', () => {
  it('S11 attaches a validated node while the stream stays open', () => {
    const stream = createStreamingRenderer({ surface });
    const result = stream.push({ component: 'ki-card', slots: { '': ['Streaming'] } });
    expect(result.ok).toBe(true);
    expect(surface.querySelector('ki-card')?.textContent).toBe('Streaming');
    // The stream is still open — no close() was called.
  });

  it('S12 halts fail-closed on an invalid mid-stream node while validated content remains', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push({ component: 'ki-card', slots: { '': ['first'] } }).ok).toBe(true);
    const bad = stream.push({ component: 'script' });
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0]?.rule).toBe('unknown-component');
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
    expect(surface.querySelector('script')).toBeNull();
    // The stream is halted: a subsequent valid push never attaches (FR-008).
    const after = stream.push({ component: 'ki-badge' });
    expect(after.ok).toBe(false);
    expect(surface.querySelector('ki-badge')).toBeNull();
  });

  it('S13 halts a stream declaring an unsupported catalog schema version', () => {
    const stream = createStreamingRenderer({ surface, catalogSchemaVersion: '99.0.0' });
    const result = stream.push({ component: 'ki-card' });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.rule).toBe('unsupported-version');
    expect(surface.querySelector('ki-card')).toBeNull();
  });

  it('rejects pushes after the stream is closed', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push({ component: 'ki-card' }).ok).toBe(true);
    stream.close();
    const after = stream.push({ component: 'ki-badge' });
    expect(after.ok).toBe(false);
    expect(surface.querySelector('ki-badge')).toBeNull();
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
  });

  it('S15 halts fail-closed when the accumulated stream trips the payload budget', () => {
    const chunk = { component: 'ki-card', slots: { '': ['padding text for the chunk'] } };
    const bytes = new TextEncoder().encode(JSON.stringify(chunk)).length;
    const stream = createStreamingRenderer({ surface, budgets: { maxBytes: bytes + 5 } });
    expect(stream.push(chunk).ok).toBe(true);
    const halted = stream.push(chunk);
    expect(halted.ok).toBe(false);
    expect(halted.diagnostics[0]?.rule).toBe('size-budget');
    // Once halted, further pushes stay rejected even without close().
    expect(stream.push({ component: 'ki-badge' }).ok).toBe(false);
    expect(surface.querySelectorAll('ki-card')).toHaveLength(1);
  });
});

describe('render defaults', () => {
  it('exposes safe default budgets a host may tighten', () => {
    expect(DEFAULT_RENDER_BUDGETS.maxDepth).toBeGreaterThan(0);
    expect(DEFAULT_RENDER_BUDGETS.maxNodes).toBeGreaterThan(0);
    expect(DEFAULT_RENDER_BUDGETS.maxBytes).toBeGreaterThan(0);
  });
});
