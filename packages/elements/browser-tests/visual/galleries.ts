// Deterministic per-component state galleries for the visual-regression
// suite (Art. X). One gallery composes every static state worth guarding
// (variants, tones, sizes, disabled, slots, programmatic focus-visible) so
// each component x theme costs exactly one PNG. Hover and animated states
// stay out of v1: the capture mechanism cannot make them deterministic.
// ASCII-only content: any glyph outside the vendored font fixtures (Inter
// for onmars, Roboto for material3) would resolve through platform font
// fallback and reintroduce runner-image drift.

export interface VisualGallery {
  /**
   * Press Tab once after mount so the FIRST interactive element in DOM order
   * shows :focus-visible. Only set where keyboard focus is deterministic and
   * caret-free (no text fields: a blinking caret never stabilizes).
   */
  focusFirst?: boolean;
  html: string;
  /** Extra block size so top-layer or popup content stays inside the capture. */
  minHeight?: number;
  /** Deterministic post-mount setup (opening popups, setting rich props). */
  prepare?: (wrapper: HTMLElement) => Promise<void>;
  /** Capture width in CSS px (default 640). */
  width?: number;
}

import { componentFixtures } from 'virtual:kimen-component-fixtures';

export type VisualComponent = `ki-${string}`;

export function fixtureFor(component: VisualComponent): ComponentFixture {
  const fixture = componentFixtures[component];
  if (fixture === undefined) throw new Error(`Missing component fixtures for ${component}`);
  return fixture;
}

export interface ComponentFixture {
  gallery: VisualGallery;
  barePage: { keyboardPressed: boolean };
  pointer: { hoverWitness: boolean };
}
