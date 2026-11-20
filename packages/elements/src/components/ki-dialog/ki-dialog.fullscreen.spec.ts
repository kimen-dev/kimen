// @spec:126-fullscreen-dialog
import { expect, it } from 'vitest';
import { usesFullscreen } from './ki-dialog.fullscreen';

it('S1 applies compact only when the viewport is compact', () => {
  expect(usesFullscreen('compact', true)).toBe(true);
  expect(usesFullscreen('compact', false)).toBe(false);
});

it('S2 applies always at either viewport size', () => {
  expect(usesFullscreen('always', true)).toBe(true);
  expect(usesFullscreen('always', false)).toBe(true);
});

it('S3 uses the centered layout by default and for unrecognized values', () => {
  expect(usesFullscreen('never', true)).toBe(false);
  expect(usesFullscreen(undefined, true)).toBe(false);
  expect(usesFullscreen('fullscreen', true)).toBe(false);
});
