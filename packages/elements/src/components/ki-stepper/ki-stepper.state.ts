import type { KiStepState } from '../ki-step/ki-step';

export function resolveStepState(value: string | null, hasCurrent: boolean): KiStepState {
  switch (value) {
    case 'current':
      return hasCurrent ? 'upcoming' : 'current';
    case 'done':
    case 'error':
      return value;
    default:
      return 'upcoming';
  }
}

export function formatStepSummary(
  current: number,
  total: number,
  summaryLabel: string,
  countLabel: string,
): string {
  return (current ? summaryLabel : countLabel).replace(
    /\{(current|total)\}/gu,
    (_, field: string) => String(field === 'current' ? current : total),
  );
}
