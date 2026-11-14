import { describe, expect, it } from 'vitest';
import { buildPairing, resolveSelection, type TabRecord } from './ki-tabs.selection';

const tabs: TabRecord[] = [
  { value: 'email', disabled: false, duplicate: false },
  { value: 'billing', disabled: true, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: false },
  { value: 'notifications', disabled: false, duplicate: true },
];

// @spec:014-ki-tabs
describe('ki-tabs selection', () => {
  it('S3 resolves requested, unknown, disabled, duplicate and empty selections', () => {
    expect(resolveSelection(tabs, 'notifications')).toBe(2);
    expect(resolveSelection(tabs, 'missing')).toBe(0);
    expect(resolveSelection(tabs, 'billing')).toBe(0);
    expect(resolveSelection(tabs, '')).toBe(0);
    expect(
      resolveSelection([{ value: 'email', disabled: true, duplicate: false }], 'email'),
    ).toBeNull();
  });

  it('S3 builds first-owner tab and panel pairings', () => {
    expect(
      buildPairing(
        [
          { value: '', disabled: false, duplicate: false },
          { value: 'email', disabled: false, duplicate: false },
          { value: 'email', disabled: false, duplicate: true },
        ],
        [{ value: 'email' }, { value: 'email' }, { value: 'orphan' }],
      ),
    ).toEqual([
      { value: '', tabIndex: 0, panelIndex: null },
      { value: 'email', tabIndex: 1, panelIndex: 0 },
      { value: 'orphan', tabIndex: null, panelIndex: 2 },
    ]);
  });
});
