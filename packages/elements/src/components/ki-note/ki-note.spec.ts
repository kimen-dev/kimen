import { describe, expect, it } from 'vitest';
import {
  circleAlertGlyph,
  circleCheckGlyph,
  infoGlyph,
  noteGlyph,
  sparklesGlyph,
  triangleAlertGlyph,
} from './ki-note.icons';

describe('default Note icons', () => {
  it.each([
    ['neutral', infoGlyph],
    ['primary', sparklesGlyph],
    ['info', infoGlyph],
    ['success', circleCheckGlyph],
    ['warning', triangleAlertGlyph],
    ['danger', circleAlertGlyph],
    ['unknown', infoGlyph],
    ['constructor', infoGlyph],
  ])('uses the %s tone icon', (tone, icon) => {
    expect(noteGlyph(tone)).toBe(icon);
  });
});
