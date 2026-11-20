import { describe, expect, it } from 'vitest';
import { keyboardOccludesNavigation } from './ki-mobile-nav.keyboard';

const viewport = {
  editing: true,
  keyboardHeight: 0,
  layoutHeight: 800,
  baselineHeight: 800,
  visualHeight: 800,
  scale: 1,
};

describe('keyboard occlusion', () => {
  it.each([
    { name: 'focus alone', change: {}, obscured: false },
    { name: 'browser chrome', change: { visualHeight: 750 }, obscured: false },
    { name: 'occluded visual viewport', change: { visualHeight: 500 }, obscured: true },
    {
      name: 'visual and layout viewport resize together',
      change: { visualHeight: 500, layoutHeight: 500 },
      obscured: true,
    },
    { name: 'pinch zoom', change: { visualHeight: 500, scale: 1.6 }, obscured: false },
    {
      name: 'viewport resize without editing',
      change: { editing: false, visualHeight: 500 },
      obscured: false,
    },
    {
      name: 'reported keyboard bounds',
      change: { editing: false, keyboardHeight: 300 },
      obscured: true,
    },
  ])('handles $name', ({ change, obscured }) => {
    expect(keyboardOccludesNavigation({ ...viewport, ...change })).toBe(obscured);
  });
});
