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

function oppositePlacement(placement: KiTooltipPlacement): KiTooltipPlacement {
  switch (placement) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'start':
      return 'end';
    case 'end':
      return 'start';
  }
}

function physicalSide(
  placement: KiTooltipPlacement,
  dir: KiTooltipDirection,
): 'top' | 'right' | 'bottom' | 'left' {
  if (placement === 'start') {
    return dir === 'rtl' ? 'right' : 'left';
  }

  if (placement === 'end') {
    return dir === 'rtl' ? 'left' : 'right';
  }

  return placement;
}

function mainAxisRoom(
  side: 'top' | 'right' | 'bottom' | 'left',
  triggerRect: KiTooltipRect,
  viewport: KiTooltipViewport,
): number {
  switch (side) {
    case 'top':
      return triggerRect.top;
    case 'right':
      return viewport.width - triggerRect.right;
    case 'bottom':
      return viewport.height - triggerRect.bottom;
    case 'left':
      return triggerRect.left;
  }
}

function mainAxisSize(
  side: 'top' | 'right' | 'bottom' | 'left',
  tooltipRect: KiTooltipRect,
): number {
  return side === 'top' || side === 'bottom' ? tooltipRect.height : tooltipRect.width;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function crossAxisShift(
  placement: KiTooltipPlacement,
  triggerRect: KiTooltipRect,
  tooltipRect: KiTooltipRect,
  viewport: KiTooltipViewport,
): number {
  if (placement === 'top' || placement === 'bottom') {
    const desiredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const clampedLeft = clamp(desiredLeft, 0, Math.max(0, viewport.width - tooltipRect.width));
    return clampedLeft - desiredLeft;
  }

  const desiredTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
  const clampedTop = clamp(desiredTop, 0, Math.max(0, viewport.height - tooltipRect.height));
  return clampedTop - desiredTop;
}

export function resolveTooltipPosition(input: KiTooltipPositionInput): KiTooltipPosition {
  const preferred = normalizePlacement(input.placement);
  const opposite = oppositePlacement(preferred);
  const preferredSide = physicalSide(preferred, input.dir);
  const oppositeSide = physicalSide(opposite, input.dir);
  const preferredRoom = mainAxisRoom(preferredSide, input.triggerRect, input.viewport);
  const oppositeRoom = mainAxisRoom(oppositeSide, input.triggerRect, input.viewport);
  const requiredRoom = mainAxisSize(preferredSide, input.tooltipRect) + (input.offset ?? 0);
  const effectivePlacement =
    preferredRoom < requiredRoom && oppositeRoom > preferredRoom ? opposite : preferred;

  return {
    effectivePlacement,
    crossAxisShift: crossAxisShift(
      effectivePlacement,
      input.triggerRect,
      input.tooltipRect,
      input.viewport,
    ),
  };
}

export interface KiTooltipAnchorCorrection {
  x: number;
  y: number;
}

/** Below half a pixel the engine and the visual box agree: layout rounding. */
const ANCHOR_TOLERANCE = 0.5;

/**
 * How far the bubble has to move so that it sits against the trigger the
 * person sees. `resolvedAnchor` is the box anchor positioning resolved the
 * host to; `visualAnchor` is the host's transformed box (its bounding client
 * rect). CSS anchor positioning resolves against the transformed box, and
 * Chromium and WebKit do; Firefox resolves against the box without the
 * transforms of the host's ancestors, so under a translated or scaled
 * ancestor the bubble opened where the trigger would be without them. The
 * correction is measured at the point the placement attaches to: the middle
 * of the facing edge.
 */
export function resolveAnchorCorrection(
  placement: KiTooltipPlacement,
  dir: KiTooltipDirection,
  resolvedAnchor: KiTooltipRect,
  visualAnchor: KiTooltipRect,
): KiTooltipAnchorCorrection {
  const centerX = (box: KiTooltipRect): number => box.left + box.width / 2;
  const centerY = (box: KiTooltipRect): number => box.top + box.height / 2;
  let x: number;
  let y: number;
  switch (physicalSide(placement, dir)) {
    case 'top':
      x = centerX(visualAnchor) - centerX(resolvedAnchor);
      y = visualAnchor.top - resolvedAnchor.top;
      break;
    case 'bottom':
      x = centerX(visualAnchor) - centerX(resolvedAnchor);
      y = visualAnchor.bottom - resolvedAnchor.bottom;
      break;
    case 'left':
      x = visualAnchor.left - resolvedAnchor.left;
      y = centerY(visualAnchor) - centerY(resolvedAnchor);
      break;
    case 'right':
      x = visualAnchor.right - resolvedAnchor.right;
      y = centerY(visualAnchor) - centerY(resolvedAnchor);
      break;
  }
  if (Math.abs(x) < ANCHOR_TOLERANCE && Math.abs(y) < ANCHOR_TOLERANCE) {
    return { x: 0, y: 0 };
  }
  return { x, y };
}
