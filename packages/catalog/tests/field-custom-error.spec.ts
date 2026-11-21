// @spec:156-field-custom-error
// S14, the catalog half: an agent marks a generated field invalid through a
// live update. The live surface accepts `custom-error` as a declared string
// prop of the generated ki-number-input and writes it as the attribute; the
// elements half (packages/elements/browser-tests/field-custom-error.browser.spec.ts)
// proves that attribute shows the error next to the field and exposes it as
// invalid. The split follows the module boundary: @kimen/catalog never
// imports the elements.
import { beforeEach, describe, expect, it } from 'vitest';

import { createLiveSurface, type LiveSurface } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

function seatsSurface(): LiveSurface {
  const live = createLiveSurface({ actions: [], onAction: () => undefined, surface });
  const inserted = live.apply({
    ops: [
      {
        node: {
          component: 'ki-number-input',
          id: 'seats',
          props: { label: 'Seats', name: 'seats', value: 42 },
        },
        op: 'insert',
      },
    ],
  });
  expect(inserted.ok).toBe(true);
  return live;
}

const seats = (): HTMLElement => {
  const field = surface.querySelector<HTMLElement>('ki-number-input');
  if (field === null) {
    throw new Error('the Seats field is not on the surface');
  }
  return field;
};

describe('an agent marks a generated field invalid', () => {
  it('S14 a live update sets the custom error of a generated field', () => {
    const live = seatsSurface();
    const field = seats();

    const result = live.apply({
      ops: [{ id: 'seats', op: 'set', props: { 'custom-error': 'Only 40 seats left' } }],
    });

    expect(result).toMatchObject({ diagnostics: [], ok: true });
    expect(seats()).toBe(field);
    expect(field.getAttribute('custom-error')).toBe('Only 40 seats left');
  });

  it('S14 a live update that removes the custom error removes the attribute', () => {
    const live = seatsSurface();
    live.apply({
      ops: [{ id: 'seats', op: 'set', props: { 'custom-error': 'Only 40 seats left' } }],
    });

    const result = live.apply({
      ops: [{ id: 'seats', op: 'set', props: { 'custom-error': null } }],
    });

    expect(result.ok).toBe(true);
    expect(seats().hasAttribute('custom-error')).toBe(false);
  });
});
