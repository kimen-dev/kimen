import { describe, expect, it } from 'vitest';
import {
  type KiTooltipRect,
  normalizePlacement,
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
