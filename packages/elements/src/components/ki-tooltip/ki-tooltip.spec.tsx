import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { parseDelay } from './ki-tooltip.delay';
import {
  normalizePlacement,
  resolveTooltipPosition,
  type KiTooltipRect,
} from './ki-tooltip.position';

// @spec:013-ki-tooltip
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-tooltip', () => {
  function shadowOf(root: HTMLElement): ShadowRoot {
    const shadow = root.shadowRoot;
    expect(shadow).toBeInstanceOf(ShadowRoot);
    if (!shadow) {
      throw new Error('Expected ki-tooltip to render a shadow root');
    }
    return shadow;
  }

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

  it('S1 renders the trigger slot and one hidden tooltip bubble with label text', async () => {
    const { root } = await render(
      <ki-tooltip label="Send immediately">
        <button>Send</button>
      </ki-tooltip>,
    );
    const shadow = shadowOf(root);
    const slot = shadow.querySelector('slot');
    const tooltip = shadow.querySelector('[part="tooltip"]');

    if (!slot) {
      throw new Error('Expected a default trigger slot');
    }
    if (!tooltip) {
      throw new Error('Expected a tooltip bubble');
    }
    expect(tooltip.nodeName).toBe('DIV');
    expect(slot.nodeName).toBe('SLOT');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.textContent).toBe('Send immediately');
    expect(tooltip.classList.contains('is-visible')).toBe(false);
  });

  it('S13 renders no tooltip bubble for a blank label', async () => {
    const { root } = await render(
      <ki-tooltip label="  ">
        <button>Send</button>
      </ki-tooltip>,
    );
    const shadow = shadowOf(root);

    expect(shadow.querySelector('[part="tooltip"]')).toBeNull();
  });

  it('S8 keeps the tooltip out of the tab order', async () => {
    const { root } = await render(
      <ki-tooltip label="Send immediately">
        <button>Send</button>
      </ki-tooltip>,
    );
    const shadow = shadowOf(root);

    expect(shadow.querySelector('[tabindex]')).toBeNull();
  });

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

  it('S1 parses tokenized show and hide delays', () => {
    expect(parseDelay('150ms')).toBe(150);
    expect(parseDelay('0.15s')).toBe(150);
    expect(parseDelay('')).toBe(0);
    expect(parseDelay('later')).toBe(0);
  });
});
