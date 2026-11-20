import { describe, expect, it } from 'vitest';
import { resolveSegmentSelection } from './ki-segmented-control.selection';

const day = { value: 'day', disabled: false };
const week = { value: 'week', disabled: false };
const month = { value: 'month', disabled: false };

describe('segment selection', () => {
  it('selects the enabled option that owns the requested value', () => {
    expect(resolveSegmentSelection([day, week, month], 'month')).toEqual({
      available: [true, true, true],
      selectedIndex: 2,
      ownsRequest: true,
    });
  });

  it('uses the first enabled option while an unknown request is pending', () => {
    expect(resolveSegmentSelection([{ ...day, disabled: true }, week], 'month')).toEqual({
      available: [false, true],
      selectedIndex: 1,
      ownsRequest: false,
    });
  });

  it('reserves the value of a disabled first owner and excludes blank values', () => {
    expect(
      resolveSegmentSelection(
        [{ ...day, disabled: true }, day, { value: ' ', disabled: false }, week],
        'day',
      ),
    ).toEqual({ available: [false, false, false, true], selectedIndex: 3, ownsRequest: true });
  });

  it.each([{ options: [] }, { options: [{ ...day, disabled: true }] }])(
    'has no selection when there is no enabled option (%j)',
    ({ options }) => {
      expect(resolveSegmentSelection(options, '').selectedIndex).toBe(-1);
    },
  );
});
