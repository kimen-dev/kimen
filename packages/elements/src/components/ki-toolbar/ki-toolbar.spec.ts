import { describe, expect, it } from 'vitest';
import { toolbarScrollState } from './ki-toolbar.scroll';

describe('toolbar scroll visibility', () => {
  it.each([
    { from: 0, hidden: false, to: 20, focused: false, position: 20, result: true },
    { from: 20, hidden: true, to: 20, focused: false, position: 20, result: true },
    { from: 20, hidden: true, to: 10, focused: false, position: 10, result: false },
    { from: 0, hidden: false, to: 20, focused: true, position: 20, result: false },
    { from: 20, hidden: true, to: 20, focused: true, position: 20, result: false },
    { from: 20, hidden: true, to: -10, focused: false, position: 0, result: false },
    { from: 100, hidden: true, to: 120, focused: false, position: 100, result: true },
    { from: 0, hidden: false, to: -10, focused: false, position: 0, result: false },
  ])('tracks $from to $to with prior hidden=$hidden and focus=$focused', (row) => {
    expect(
      toolbarScrollState({ position: row.from, hidden: row.hidden }, row.to, 100, row.focused),
    ).toEqual({ position: row.position, hidden: row.result });
  });
});
