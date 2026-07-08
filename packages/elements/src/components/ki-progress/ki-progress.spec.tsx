import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';
import { clampValue, normalizeMax, resolveShape } from './ki-progress.math';

// @spec:015-ki-progress
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
function requireShadow(root: HTMLElement): ShadowRoot {
  const shadow = root.shadowRoot;
  expect(shadow).toBeInstanceOf(ShadowRoot);
  if (!shadow) {
    throw new Error('ki-progress did not attach a shadow root');
  }
  return shadow;
}

function requireElement(root: ParentNode, selector: string): Element {
  const el = root.querySelector(selector);
  expect(el).toBeInstanceOf(Element);
  if (!el) {
    throw new Error(`Missing ${selector}`);
  }
  return el;
}

describe('ki-progress', () => {
  it('S1 renders linear progress anatomy with a single progressbar base', async () => {
    const { root } = await render(<ki-progress label="Uploading report.pdf" value={40} />);
    const shadow = requireShadow(root);
    const base = requireElement(shadow, 'div.base[role="progressbar"]');
    const track = requireElement(base, 'div[part="track"]');
    const indicator = requireElement(track, 'div[part="indicator"]');

    expect(base.parentElement).toBeNull();
    expect(track.parentElement).toBe(base);
    expect(indicator.parentElement).toBe(track);
    expect(base.hasAttribute('part')).toBe(false);
    expect(base.hasAttribute('tabindex')).toBe(false);
    expect(root.getAttributeNames()).not.toContain('tabindex');
  });

  it('S2 renders circular progress anatomy with exactly two SVG parts', async () => {
    const { root } = await render(<ki-progress label="Uploading report.pdf" shape="circular" />);
    const shadow = requireShadow(root);
    const base = requireElement(shadow, 'div.base[role="progressbar"]');
    const svg = requireElement(base, 'svg[aria-hidden="true"]');
    const circles = [...svg.querySelectorAll('circle')];

    expect(svg.hasAttribute('part')).toBe(false);
    expect(circles).toHaveLength(2);
    expect(circles.map((circle) => circle.getAttribute('part'))).toEqual(['track', 'indicator']);
    expect(circles.every((circle) => circle.getAttribute('pathLength') === '100')).toBe(true);
    expect([...shadow.querySelectorAll('[part]')].map((el) => el.getAttribute('part'))).toEqual([
      'track',
      'indicator',
    ]);
  });

  it('S4 exposes clamped ARIA values and omits empty accessible names', async () => {
    const { root } = await render(<ki-progress value={250} max={100} />);
    const base = requireElement(requireShadow(root), 'div.base[role="progressbar"]');

    expect(base.getAttribute('aria-valuemin')).toBe('0');
    expect(base.getAttribute('aria-valuemax')).toBe('100');
    expect(base.getAttribute('aria-valuenow')).toBe('100');
    expect(base.hasAttribute('aria-label')).toBe(false);
  });

  it('S8 applies label as the internal progressbar aria-label only when present', async () => {
    const { root } = await render(<ki-progress label="Uploading report.pdf" />);
    const base = requireElement(requireShadow(root), 'div.base[role="progressbar"]');

    expect(base.getAttribute('aria-label')).toBe('Uploading report.pdf');
  });

  it('S5 falls back to linear markup for an unrecognized shape', async () => {
    const { root } = await render(h('ki-progress', { shape: 'banana' }));
    const shadow = requireShadow(root);

    expect(shadow.querySelector('div[part="track"] > div[part="indicator"]')).toBeInstanceOf(
      Element,
    );
    expect(shadow.querySelector('svg')).toBeNull();
  });

  it('S14 normalizes max and clamps value through pure helpers', () => {
    expect(clampValue(-10, normalizeMax(100))).toBe(0);
    expect(clampValue(Number.NaN, normalizeMax(100))).toBe(0);
    expect([clampValue(40, normalizeMax(0)), normalizeMax(0)]).toEqual([40, 100]);
    expect([clampValue(40, normalizeMax(-5)), normalizeMax(-5)]).toEqual([40, 100]);
    expect([clampValue(40, normalizeMax(Number.NaN)), normalizeMax(Number.NaN)]).toEqual([40, 100]);
    expect(clampValue(0, normalizeMax(100))).toBe(0);
    expect(clampValue(100, normalizeMax(100))).toBe(100);
    expect(clampValue(250, normalizeMax(100))).toBe(100);
    expect(normalizeMax(Number.POSITIVE_INFINITY)).toBe(100);
    expect(clampValue(Number.POSITIVE_INFINITY, normalizeMax(100))).toBe(0);
    expect(resolveShape('linear')).toBe('linear');
    expect(resolveShape('circular')).toBe('circular');
    expect(resolveShape('banana')).toBe('linear');
    expect(resolveShape(undefined)).toBe('linear');
  });

  it('S1 renders a bare progress as determinate at value 0 with no events or tabindex', async () => {
    const { root } = await render(<ki-progress />);
    const base = requireElement(requireShadow(root), 'div.base[role="progressbar"]');

    expect(base.getAttribute('aria-valuenow')).toBe('0');
    expect(base.getAttribute('aria-valuemax')).toBe('100');
    expect(base.hasAttribute('tabindex')).toBe(false);
    expect(root).not.toHaveAttribute('tabindex');
    expect(root).not.toHaveAttribute('onchange');
    expect(root).not.toHaveAttribute('onclick');
  });
});
