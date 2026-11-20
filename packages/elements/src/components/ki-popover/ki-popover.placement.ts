import type { OverlayPlacement } from '../../utils/anchored-overlay-position';

const pattern = /^(top|bottom|start|end)(-(start|end))?$/u;
const DEFAULT_PLACEMENT = 'bottom-start';

export function normalizePopoverPlacement(placement?: string): OverlayPlacement {
  return placement && pattern.test(placement) ? (placement as OverlayPlacement) : DEFAULT_PLACEMENT;
}
