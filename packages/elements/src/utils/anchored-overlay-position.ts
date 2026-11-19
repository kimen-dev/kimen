type Side = 'top' | 'bottom' | 'start' | 'end';
type Alignment = 'start' | 'end';
export type OverlayPlacement = Side | `${Side}-${Alignment}`;
type PhysicalSide = 'top' | 'right' | 'bottom' | 'left';
type Direction = 'ltr' | 'rtl';

export type OverlayRect = Pick<
  DOMRectReadOnly,
  'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'
>;

interface Viewport {
  width: number;
  height: number;
}

interface PositionInput {
  placement: OverlayPlacement;
  dir: Direction;
  triggerRect: OverlayRect;
  popupRect: OverlayRect;
  viewport: Viewport;
  offset?: number;
}

interface OverlayPosition {
  effectivePlacement: OverlayPlacement;
  x: number;
  y: number;
  crossAxisShift: number;
}

const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', start: 'end', end: 'start' };

function physicalSide(side: Side, dir: Direction): PhysicalSide {
  if (side === 'start') {
    return dir === 'rtl' ? 'right' : 'left';
  }
  if (side === 'end') {
    return dir === 'rtl' ? 'left' : 'right';
  }
  return side;
}

function isVertical(side: PhysicalSide): boolean {
  return side === 'top' || side === 'bottom';
}

function availableRoom(side: PhysicalSide, rect: OverlayRect, viewport: Viewport): number {
  switch (side) {
    case 'top':
      return rect.top;
    case 'right':
      return viewport.width - rect.right;
    case 'bottom':
      return viewport.height - rect.bottom;
    case 'left':
      return rect.left;
  }
}

function crossAxisStart(
  start: number,
  anchorSize: number,
  popupSize: number,
  alignment?: Alignment,
) {
  switch (alignment) {
    case 'start':
      return start;
    case 'end':
      return start + anchorSize - popupSize;
    default:
      return start + anchorSize / 2 - popupSize / 2;
  }
}

/** Clamp the start coordinate. An oversized box starts at the viewport edge. */
function clamp(start: number, size: number, limit: number): number {
  return Math.min(Math.max(start, 0), Math.max(0, limit - size));
}

/** Keep alignment on flip. On each axis the measured box is shifted into the viewport. */
export function resolveOverlayPosition({
  placement,
  dir,
  triggerRect,
  popupRect,
  viewport,
  offset = 0,
}: PositionInput): OverlayPosition {
  const [side, alignment] = placement.split('-') as [Side, Alignment?];
  const preferred = physicalSide(side, dir);
  const fallback = physicalSide(opposite[side], dir);
  const vertical = isVertical(preferred);
  const requiredRoom = (vertical ? popupRect.height : popupRect.width) + offset;
  const preferredRoom = availableRoom(preferred, triggerRect, viewport);
  const flipped =
    preferredRoom < requiredRoom && availableRoom(fallback, triggerRect, viewport) > preferredRoom;
  const effectiveSide = flipped ? opposite[side] : side;
  const effectivePlacement: OverlayPlacement = alignment
    ? `${effectiveSide}-${alignment}`
    : effectiveSide;
  const paintedSide = flipped ? fallback : preferred;
  const inlineAlignment =
    alignment && dir === 'rtl' ? (alignment === 'start' ? 'end' : 'start') : alignment;
  const desiredX = vertical
    ? crossAxisStart(triggerRect.left, triggerRect.width, popupRect.width, inlineAlignment)
    : paintedSide === 'left'
      ? triggerRect.left - popupRect.width - offset
      : triggerRect.right + offset;
  const desiredY = vertical
    ? paintedSide === 'top'
      ? triggerRect.top - popupRect.height - offset
      : triggerRect.bottom + offset
    : crossAxisStart(triggerRect.top, triggerRect.height, popupRect.height, alignment);

  const x = clamp(desiredX, popupRect.width, viewport.width);
  const y = clamp(desiredY, popupRect.height, viewport.height);
  return { effectivePlacement, x, y, crossAxisShift: vertical ? x - desiredX : y - desiredY };
}

/** Below half a pixel the engine and the visual box agree within layout rounding. */
const ANCHOR_TOLERANCE = 0.5;

/**
 * Difference between the CSS-resolved box and the transformed box at the
 * midpoint of the edge used by a centered placement (such as a tooltip).
 */
export function resolveAnchorCorrection(
  placement: Side,
  dir: Direction,
  resolvedAnchor: OverlayRect,
  visualAnchor: OverlayRect,
): { x: number; y: number } {
  const side = physicalSide(placement, dir);
  const vertical = isVertical(side);
  const x = vertical
    ? visualAnchor.left + visualAnchor.width / 2 - (resolvedAnchor.left + resolvedAnchor.width / 2)
    : visualAnchor[side] - resolvedAnchor[side];
  const y = vertical
    ? visualAnchor[side] - resolvedAnchor[side]
    : visualAnchor.top + visualAnchor.height / 2 - (resolvedAnchor.top + resolvedAnchor.height / 2);
  if (Math.abs(x) < ANCHOR_TOLERANCE && Math.abs(y) < ANCHOR_TOLERANCE) {
    return { x: 0, y: 0 };
  }
  return { x, y };
}
