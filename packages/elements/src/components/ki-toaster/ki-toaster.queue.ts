/** Where the toaster places its stack; `end` follows the writing direction. */
export type KiToasterPlacement = 'top-center' | 'top-end' | 'bottom-center' | 'bottom-end';

/** How many toasts a toaster shows at once when `max` is not usable. */
export const KI_TOASTER_DEFAULT_MAX = 3;

/** A whole maximum of one or more, else the default (spec 049 edge cases). */
export function normalizeMax(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : KI_TOASTER_DEFAULT_MAX;
}

/**
 * Which toasts wait (FR-015, I-1): the toaster shows its newest `max` toasts
 * that have not left, in document order, and queues the older ones. A toast
 * that has left is never queued: it is simply gone.
 */
export function queuedFlags(dismissed: readonly boolean[], max: number): boolean[] {
  let shown = 0;
  const flags = dismissed.map(() => false);
  for (let index = dismissed.length - 1; index >= 0; index -= 1) {
    if (dismissed[index] === true) {
      continue;
    }
    shown += 1;
    flags[index] = shown > max;
  }
  return flags;
}
