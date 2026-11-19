import { describe, expect, it } from 'vitest';
import {
  type KiTooltipRect,
  normalizePlacement,
  resolveAnchorCorrection,
  resolveTooltipPosition,
} from './ki-tooltip.position';

function rect(x: number, y: number, width: number, height: number): KiTooltipRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
  };
}

// @spec:013-ki-tooltip
describe('ki-tooltip position', () => {
  it('S3 normalizes unknown placement values to top', () => {
    expect(normalizePlacement('top')).toBe('top');
    expect(normalizePlacement('bottom')).toBe('bottom');
    expect(normalizePlacement('start')).toBe('start');
    expect(normalizePlacement('end')).toBe('end');
    expect(normalizePlacement('sideways')).toBe('top');
    expect(normalizePlacement('')).toBe('top');
    expect(normalizePlacement(undefined)).toBe('top');
  });

  it('S14 flips each placement when the preferred viewport edge overflows', () => {
    const viewport = { width: 320, height: 240 };
    const tooltip = rect(0, 0, 80, 40);

    expect(
      resolveTooltipPosition({
        placement: 'top',
        dir: 'ltr',
        triggerRect: rect(120, 4, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('bottom');
    expect(
      resolveTooltipPosition({
        placement: 'bottom',
        dir: 'ltr',
        triggerRect: rect(120, 220, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('top');
    expect(
      resolveTooltipPosition({
        placement: 'start',
        dir: 'ltr',
        triggerRect: rect(2, 90, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('end');
    expect(
      resolveTooltipPosition({
        placement: 'end',
        dir: 'ltr',
        triggerRect: rect(300, 90, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('start');
  });

  it('S14 reserves the offset gap in the flip decision', () => {
    const viewport = { width: 320, height: 240 };
    const tooltip = rect(0, 0, 80, 40);
    // Trigger top edge sits 44px from the viewport top: the 40px bubble fits,
    // but the 40px bubble PLUS an 8px offset gap (48px) does not.
    const triggerRect = rect(120, 44, 40, 24);

    expect(
      resolveTooltipPosition({
        placement: 'top',
        dir: 'ltr',
        triggerRect,
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('top');
    expect(
      resolveTooltipPosition({
        placement: 'top',
        dir: 'ltr',
        triggerRect,
        tooltipRect: tooltip,
        viewport,
        offset: 8,
      }).effectivePlacement,
    ).toBe('bottom');
  });

  it('S11 maps start and end logically under LTR and RTL', () => {
    const viewport = { width: 320, height: 240 };
    const tooltip = rect(0, 0, 80, 40);

    expect(
      resolveTooltipPosition({
        placement: 'start',
        dir: 'ltr',
        triggerRect: rect(150, 100, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('start');
    expect(
      resolveTooltipPosition({
        placement: 'start',
        dir: 'rtl',
        triggerRect: rect(150, 100, 40, 24),
        tooltipRect: tooltip,
        viewport,
      }).effectivePlacement,
    ).toBe('start');
  });

  it('S14 clamps the cross-axis shift to keep the tooltip inside the viewport', () => {
    const position = resolveTooltipPosition({
      placement: 'top',
      dir: 'ltr',
      triggerRect: rect(2, 100, 24, 24),
      tooltipRect: rect(0, 0, 120, 32),
      viewport: { width: 320, height: 240 },
    });

    expect(position.effectivePlacement).toBe('top');
    expect(position.crossAxisShift).toBeGreaterThan(0);
  });
});

// @spec:013-ki-tooltip
describe('ki-tooltip anchor correction', () => {
  const visual = rect(260, 300, 60, 30);

  it('S1 needs no correction where the resolved anchor is the box the person sees', () => {
    expect(resolveAnchorCorrection('top', 'ltr', visual, visual)).toEqual({ x: 0, y: 0 });
    // Layout rounding below half a pixel is not a correction.
    expect(resolveAnchorCorrection('top', 'ltr', rect(260.3, 299.6, 60, 30), visual)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('S1 moves the bubble by a translated ancestor', () => {
    const untransformed = rect(200, 180, 60, 30);

    expect(resolveAnchorCorrection('top', 'ltr', untransformed, visual)).toEqual({ x: 60, y: 120 });
    expect(resolveAnchorCorrection('end', 'rtl', untransformed, visual)).toEqual({ x: 60, y: 120 });
  });

  it('S1 measures a scaled anchor at the edge the placement attaches to', () => {
    const unscaled = rect(120, 120, 40, 20);
    const scaled = rect(180, 180, 60, 30);

    // Above: the middle of the top edge.
    expect(resolveAnchorCorrection('top', 'ltr', unscaled, scaled)).toEqual({ x: 70, y: 60 });
    // Below: the middle of the bottom edge.
    expect(resolveAnchorCorrection('bottom', 'ltr', unscaled, scaled)).toEqual({ x: 70, y: 70 });
    // Start in left-to-right is the left edge, end the right one.
    expect(resolveAnchorCorrection('start', 'ltr', unscaled, scaled)).toEqual({ x: 60, y: 65 });
    expect(resolveAnchorCorrection('end', 'ltr', unscaled, scaled)).toEqual({ x: 80, y: 65 });
    // Right-to-left swaps them.
    expect(resolveAnchorCorrection('start', 'rtl', unscaled, scaled)).toEqual({ x: 80, y: 65 });
    expect(resolveAnchorCorrection('end', 'rtl', unscaled, scaled)).toEqual({ x: 60, y: 65 });
  });

  it('S1 corrects one axis when only that one is off', () => {
    expect(resolveAnchorCorrection('top', 'ltr', rect(260, 290, 60, 30), visual)).toEqual({
      x: 0,
      y: 10,
    });
  });
});
