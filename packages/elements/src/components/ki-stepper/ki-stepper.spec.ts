import { expect, it } from 'vitest';
import { formatStepSummary, resolveStepState } from './ki-stepper.state';

it.each(['done', 'current', 'upcoming', 'error'] as const)('keeps the %s state', (state) => {
  expect(resolveStepState(state, false)).toBe(state);
});

it.each([null, 'unknown', ''])('uses upcoming for an unsupported state (%s)', (state) => {
  expect(resolveStepState(state, false)).toBe('upcoming');
});

it('keeps a single current position', () => {
  expect(resolveStepState('current', true)).toBe('upcoming');
  expect(resolveStepState('error', true)).toBe('error');
});

it('substitutes every placeholder in the order set by the author', () => {
  expect(formatStepSummary(3, 4, '{total} total · {current}/{total}', '')).toBe('4 total · 3/4');
});

it('leaves the missing current position out of the count label', () => {
  expect(formatStepSummary(0, 4, 'Step {current} of {total}', 'Steps ({total})')).toBe('Steps (4)');
});
