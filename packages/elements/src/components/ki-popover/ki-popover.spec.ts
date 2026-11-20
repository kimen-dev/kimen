import { expect, it } from 'vitest';
import { normalizePopoverPlacement } from './ki-popover.placement';

it.each(['top', 'bottom-end', 'start-start', 'end-end'])(
  'preserves the supported placement %s',
  (placement) => {
    expect(normalizePopoverPlacement(placement)).toBe(placement);
  },
);

it.each(['', 'left', 'bottom-middle', 'top-start-end', undefined])(
  'uses bottom-start for unsupported placement %s',
  (placement) => {
    expect(normalizePopoverPlacement(placement)).toBe('bottom-start');
  },
);
