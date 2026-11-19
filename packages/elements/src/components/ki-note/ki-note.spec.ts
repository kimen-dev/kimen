import { describe, expect, it } from 'vitest';
import { noteIcon } from './ki-note.icons';

describe('default Note icons', () => {
  it.each([
    ['neutral', 'info'],
    ['primary', 'sparkles'],
    ['info', 'info'],
    ['success', 'circle-check'],
    ['warning', 'triangle-alert'],
    ['danger', 'circle-alert'],
    ['unknown', 'info'],
    ['constructor', 'info'],
  ])('uses the %s tone icon', (tone, icon) => {
    expect(noteIcon(tone)).toBe(icon);
  });
});
