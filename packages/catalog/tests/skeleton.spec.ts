// @spec:084-ki-skeleton
import { expect, it } from 'vitest';

import {
  type Catalog,
  catalogData,
  createLiveSurface,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

const catalog: Catalog = catalogData;

it('S8 preserves explicit false for a default-on boolean in a catalog render', () => {
  const surface = document.createElement('div');
  const result = renderUiSpec(
    { version: 1, root: { component: 'ki-skeleton', props: { animated: false } } },
    { surface },
  );

  expect(result.ok).toBe(true);
  expect(surface.querySelector('ki-skeleton')?.getAttribute('animated')).toBe('false');
});

it('S8 removes the animation attribute when a live surface unsets the prop', () => {
  const surface = document.createElement('div');
  const live = createLiveSurface({ surface });
  const id = 'skeleton';
  const node = { component: 'ki-skeleton', id, props: { animated: false } };
  expect(live.apply({ ops: [{ op: 'insert', node }] }).ok).toBe(true);
  const placeholder = surface.querySelector('ki-skeleton');
  expect(placeholder?.getAttribute('animated')).toBe('false');

  const setAnimation = (animated: boolean | null) => {
    expect(live.apply({ ops: [{ op: 'set', id, props: { animated } }] }).ok).toBe(true);
    expect(surface.querySelector('ki-skeleton')).toBe(placeholder);
  };
  setAnimation(null);
  expect(placeholder?.getAttribute('animated')).toBeNull();
  setAnimation(false);
  expect(placeholder?.getAttribute('animated')).toBe('false');
  setAnimation(true);
  expect(placeholder?.getAttribute('animated')).toBe('');
});

it('generates a passive catalog entry with all six props and bounded lines', () => {
  const entry = catalog.components['ki-skeleton'];
  expect(entry?.props).toMatchObject({
    animated: { type: 'boolean', default: true },
    'block-size': { type: 'string' },
    'inline-size': { type: 'string' },
    lines: { type: 'number', default: 1, minimum: 1, maximum: 20 },
    shape: { type: 'enum', default: 'text' },
    size: { type: 'string' },
  });
  expect(new Set(entry?.props['shape']?.values)).toEqual(new Set(['text', 'circle', 'rect']));
  expect(entry?.events).toEqual({});
  expect(entry?.slots).toEqual({});

  const root = { component: 'ki-skeleton', props: { lines: 21 } };
  expect(validateUiSpec({ version: 1, root }).issues).toEqual([
    expect.objectContaining({ code: 'prop-out-of-range', path: 'root.props.lines' }),
  ]);
});
