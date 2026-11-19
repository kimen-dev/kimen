import { describe, expect, it } from 'vitest';
import {
  type OverlayPlacement,
  type OverlayRect,
  resolveOverlayPosition,
} from './anchored-overlay-position';

function rect(left: number, top: number, width: number, height: number): OverlayRect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

const viewport = { width: 300, height: 240 };
const popupRect = rect(0, 0, 100, 40);
const triggerRect = rect(120, 100, 40, 30);

describe('anchored overlay geometry', () => {
  it.each<{ placement: OverlayPlacement; x: number; y: number }>([
    { placement: 'bottom-start', x: 120, y: 138 },
    { placement: 'bottom-end', x: 60, y: 138 },
    { placement: 'top-start', x: 120, y: 52 },
    { placement: 'top-end', x: 60, y: 52 },
    { placement: 'end-start', x: 168, y: 100 },
    { placement: 'end-end', x: 168, y: 90 },
  ])('aligns $placement using the facing edges', ({ placement, x, y }) => {
    expect(
      resolveOverlayPosition({
        placement,
        dir: 'ltr',
        triggerRect,
        popupRect,
        viewport,
        offset: 8,
      }),
    ).toEqual({ effectivePlacement: placement, x, y, crossAxisShift: 0 });
  });

  it('mirrors inline alignment in RTL', () => {
    const position = resolveOverlayPosition({
      placement: 'bottom-start',
      dir: 'rtl',
      triggerRect,
      popupRect,
      viewport,
    });

    expect(position).toMatchObject({ effectivePlacement: 'bottom-start', x: 60, y: 130 });
  });

  it('flips the side when the gap would overflow and retains the alignment', () => {
    const position = resolveOverlayPosition({
      placement: 'bottom-end',
      dir: 'ltr',
      triggerRect: rect(120, 166, 40, 30),
      popupRect,
      viewport,
      offset: 8,
    });

    expect(position).toMatchObject({ effectivePlacement: 'top-end', x: 60, y: 118 });
  });

  it('shifts an aligned popup inside the viewport', () => {
    const position = resolveOverlayPosition({
      placement: 'bottom-start',
      dir: 'ltr',
      triggerRect: rect(275, 100, 20, 30),
      popupRect,
      viewport,
    });

    expect(position).toMatchObject({
      effectivePlacement: 'bottom-start',
      x: 200,
      crossAxisShift: -75,
    });
  });

  it('clamps measured coordinates on both axes when the popup cannot fit on either side', () => {
    const position = resolveOverlayPosition({
      placement: 'bottom-start',
      dir: 'ltr',
      triggerRect,
      popupRect: rect(0, 0, 400, 300),
      viewport,
    });

    expect(position).toMatchObject({ effectivePlacement: 'bottom-start', x: 0, y: 0 });
  });
});
