import { resolveOverlayPosition } from '../../utils/anchored-overlay-position';

export { resolveAnchorCorrection } from '../../utils/anchored-overlay-position';

export type KiTooltipPlacement = 'top' | 'bottom' | 'start' | 'end';
type KiTooltipDirection = 'ltr' | 'rtl';

export interface KiTooltipRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface KiTooltipViewport {
  width: number;
  height: number;
}

export interface KiTooltipPositionInput {
  placement: string | undefined;
  dir: KiTooltipDirection;
  triggerRect: KiTooltipRect;
  tooltipRect: KiTooltipRect;
  viewport: KiTooltipViewport;
  /**
   * Main-axis gap (px) between trigger and bubble — the CSS
   * `calc(100% + --ki-tooltip-offset)`. The bubble consumes `size + offset`
   * of room, so the flip decision must reserve it or the bubble overflows the
   * preferred edge by up to the offset near a viewport boundary.
   */
  offset?: number;
}

export interface KiTooltipPosition {
  effectivePlacement: KiTooltipPlacement;
  crossAxisShift: number;
}

const placements = new Set<KiTooltipPlacement>(['top', 'bottom', 'start', 'end']);

export function normalizePlacement(placement: string | undefined): KiTooltipPlacement {
  return placements.has(placement as KiTooltipPlacement)
    ? (placement as KiTooltipPlacement)
    : 'top';
}

export function resolveTooltipPosition(input: KiTooltipPositionInput): KiTooltipPosition {
  const { effectivePlacement, crossAxisShift } = resolveOverlayPosition({
    placement: normalizePlacement(input.placement),
    dir: input.dir,
    triggerRect: input.triggerRect,
    popupRect: input.tooltipRect,
    viewport: input.viewport,
    offset: input.offset ?? 0,
  });

  return { effectivePlacement: normalizePlacement(effectivePlacement), crossAxisShift };
}
