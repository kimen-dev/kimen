import type { OverlayPlacement } from '../../utils/anchored-overlay-position';

export function normalizePopoverPlacement(placement?: string): OverlayPlacement {
  throw new Error(`Popover placement normalization is pending for ${placement ?? 'undefined'}`);
}
