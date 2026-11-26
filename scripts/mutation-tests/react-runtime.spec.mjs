// @vitest-environment happy-dom
/* global customElements, CustomEvent, document, HTMLElement */

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponent } from '../../packages/react/src/runtime.ts';

// Resolve the same React instance as the runtime through the wrapper package.
const require = createRequire(resolve(import.meta.dirname, '../../packages/react/package.json'));
const { createElement, createRef, StrictMode } = require('react');
const { flushSync } = require('react-dom');
const { createRoot } = require('react-dom/client');

const tagName = 'ki-runtime-test';
const changeEvent = 'ki-change';

class RuntimeElement extends HTMLElement {
  set payload(value) {
    this.assignedPayload = value;
    this.payloadAssignedWhileConnected = this.isConnected;
  }
}

const Wrapper = createComponent({
  tagName,
  elementClass: RuntimeElement,
  events: { __proto__: { 'data-state': 'ki-inherited' }, onChange: changeEvent },
  defineCustomElement: () => customElements.define(tagName, RuntimeElement),
});

let container;
let root;

function render(props, children) {
  flushSync(() => root.render(createElement(Wrapper, props, children)));
  return container.querySelector(tagName);
}

function unmount() {
  root.unmount();
  root = undefined;
}

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
});

afterEach(() => {
  root?.unmount();
  container.remove();
});

describe('React wrapper runtime in the DOM', () => {
  it('assigns element properties at commit and passes attributes, children and style to React', () => {
    const payload = { value: 'initial' };
    const host = render(
      {
        payload,
        id: 'notice',
        'data-state': 'ready',
        'defer-hydration': '',
        style: { display: 'block' },
      },
      createElement('span', null, 'Saved'),
    );

    expect(host).toBeInstanceOf(RuntimeElement);
    expect(host.assignedPayload).toBe(payload);
    expect(host.payloadAssignedWhileConnected).toBe(true);
    expect(host.hasAttribute('payload')).toBe(false);
    expect(host.id).toBe('notice');
    expect(host.getAttribute('data-state')).toBe('ready');
    expect(host.hasAttribute('defer-hydration')).toBe(false);
    expect(host.style.display).toBe('block');
    expect(host.querySelector('span').textContent).toBe('Saved');

    const updated = { value: 'updated' };
    expect(render({ payload: updated, id: 'next' })).toBe(host);
    expect(host.assignedPayload).toBe(updated);
    expect(host.id).toBe('next');
    expect(host.hasAttribute('data-state')).toBe(false);

    render({});
    expect(host.assignedPayload).toBeUndefined();
    expect(host.hasAttribute('payload')).toBe(false);
    expect(host.hasAttribute('id')).toBe(false);
  });

  it('adds, updates, removes and re-adds a mapped listener in registration order', () => {
    const calls = [];
    const first = vi.fn(() => calls.push('first'));
    const replacement = vi.fn(() => calls.push('replacement'));
    const host = render({ onChange: first });
    host.addEventListener(changeEvent, () => calls.push('native'));
    const event = new CustomEvent(changeEvent, { detail: 'changed' });

    host.dispatchEvent(event);
    expect(first).toHaveBeenCalledExactlyOnceWith(event);
    expect(calls.splice(0)).toEqual(['first', 'native']);

    render({ onChange: replacement });
    host.dispatchEvent(event);
    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledExactlyOnceWith(event);
    expect(calls.splice(0)).toEqual(['replacement', 'native']);

    render({});
    host.dispatchEvent(event);
    expect(calls.splice(0)).toEqual(['native']);

    render({ onChange: first });
    host.dispatchEvent(event);
    expect(calls).toEqual(['native', 'first']);
  });

  it('cleans up its listener and preserves a native registration of the same callback', () => {
    const callback = vi.fn();
    const ref = createRef();
    flushSync(() =>
      root.render(
        createElement(StrictMode, null, createElement(Wrapper, { onChange: callback, ref })),
      ),
    );
    const host = container.querySelector(tagName);
    expect(ref.current).toBe(host);
    host.addEventListener(changeEvent, callback);

    const event = new CustomEvent(changeEvent);
    host.dispatchEvent(event);
    expect(callback.mock.calls).toEqual([[event], [event]]);

    unmount();
    expect(ref.current).toBeNull();
    host.dispatchEvent(event);
    expect(callback).toHaveBeenCalledTimes(3);
    host.removeEventListener(changeEvent, callback);
  });

  it('updates wrapper classes alongside host classes and falls back to legacy class', () => {
    const host = render({ className: ' initial\t shared\n', class: 'legacy' });
    expect([...host.classList]).toEqual(['initial', 'shared']);
    host.classList.add('hydrated', 'external');

    render({ className: 'shared updated', class: 'legacy' });
    expect([...host.classList]).toEqual(['shared', 'hydrated', 'external', 'updated']);

    render({ className: null, class: 'legacy shared' });
    expect([...host.classList]).toEqual(['shared', 'hydrated', 'external', 'legacy']);

    render({ className: '', class: 'legacy' });
    expect([...host.classList]).toEqual(['hydrated', 'external']);

    render({ class: 'legacy' });
    expect([...host.classList]).toEqual(['hydrated', 'external', 'legacy']);
    render({});
    expect([...host.classList]).toEqual(['hydrated', 'external']);
  });

  it('keeps an active callback ref attached and detaches it when replaced', () => {
    const callback = vi.fn();
    const ref = createRef();
    const host = render({ ref: callback });
    expect(callback).toHaveBeenCalledExactlyOnceWith(host);

    render({ ref: callback, id: 'updated' });
    expect(callback).toHaveBeenCalledTimes(1);

    render({ ref });
    expect(callback.mock.calls).toEqual([[host], [null]]);
    expect(ref.current).toBe(host);

    unmount();
    expect(ref.current).toBeNull();
  });
});
