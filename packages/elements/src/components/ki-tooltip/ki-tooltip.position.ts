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
  const requiredRoom = mainAxisSize(preferredSide, input.tooltipRect);
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
