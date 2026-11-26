import { createRequire } from 'node:module';

import { expect, it, vi } from 'vitest';

import { createComponent } from '../../packages/react/src/runtime.ts';

const require = createRequire(new URL('../../packages/react/package.json', import.meta.url));
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');

it('renders host markup in Node and defers element properties and listeners to the client', () => {
  const defineCustomElement = vi.fn();
  const setPayload = vi.fn();
  const onChange = vi.fn();
  const ref = vi.fn();
  const Wrapper = createComponent({
    tagName: 'ki-runtime-test',
    elementClass: {
      prototype: {
        set payload(value) {
          setPayload(value);
        },
      },
    },
    events: { onChange: 'ki-change' },
    defineCustomElement,
  });

  expect(defineCustomElement).toHaveBeenCalledTimes(1);
  expect(Wrapper.displayName).toBe('ki-runtime-test');
  expect(
    renderToString(
      createElement(
        Wrapper,
        { 'data-state': 'ready', payload: 'deferred', onChange, ref },
        'Saved',
      ),
    ),
  ).toBe('<ki-runtime-test data-state="ready">Saved</ki-runtime-test>');
  expect(setPayload).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  expect(ref).not.toHaveBeenCalled();
});
