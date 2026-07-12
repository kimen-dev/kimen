// @spec:015-ki-progress
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-progress.js';

type KiProgressElement = HTMLElement & {
  indeterminate: boolean;
  label: string;
  shape: 'circular' | 'linear';
};

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(async () => {
  await browserCommands.emulateReducedMotion('reduce');
  defineCustomElement();

  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(shape: KiProgressElement['shape']): Promise<KiProgressElement> {
  const el = document.createElement('ki-progress') as KiProgressElement;
  el.label = 'Loading messages';
  el.indeterminate = true;
  el.shape = shape;
  document.body.append(el);
  await customElements.whenDefined('ki-progress');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function progressbar(el: KiProgressElement): HTMLElement {
  const base = el.shadowRoot?.querySelector('.base[role="progressbar"]');
  expect(base).toBeInstanceOf(HTMLElement);
  if (!(base instanceof HTMLElement)) {
    throw new Error('ki-progress did not render a progressbar');
  }
  return base;
}

function indicator(el: KiProgressElement): Element {
  const value = el.shadowRoot?.querySelector('[part="indicator"]');
  expect(value).toBeInstanceOf(Element);
  if (!(value instanceof Element)) {
    throw new Error('ki-progress did not render an indicator');
  }
  return value;
}

function runningInfiniteAnimations(el: Element): Animation[] {
  return el.getAnimations().filter((animation) => {
    const timing = animation.effect?.getComputedTiming();
    return animation.playState === 'running' && timing?.iterations === Number.POSITIVE_INFINITY;
  });
}

describe('ki-progress with reduced motion', () => {
  it.each([
    'linear',
    'circular',
  ] as const)('S6 renders indeterminate %s without running infinite animation under reduced motion', async (shape) => {
    const el = await mount(shape);

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(progressbar(el).hasAttribute('aria-valuenow')).toBe(false);
    expect(indicator(el).getBoundingClientRect().width).toBeGreaterThan(0);
    expect(runningInfiniteAnimations(indicator(el))).toHaveLength(0);
  });
});
