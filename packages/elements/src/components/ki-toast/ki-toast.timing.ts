/** The five semantic tones of a toast (spec 049 FR-001). */
export type KiToastTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Why a toast left, carried by `ki-dismiss` (issue #353). */
export interface KiToastDismissDetail {
  reason: 'timeout' | 'button' | 'escape' | 'action';
}

/**
 * The time a toast without a `duration` gets before it leaves (issue #353).
 * A behavior constant, not a token: timing is an accessibility and
 * application decision, never a brand one.
 */
export const KI_TOAST_DEFAULT_DURATION = 5000;

/**
 * How long the toast stays before it leaves on its own, in milliseconds, or
 * `null` when it waits for the person (FR-003). A toast holding an action or
 * in the danger tone always waits, whatever its `duration` (WCAG 2.2.1).
 * Otherwise an explicit finite duration of zero or more wins, zero meaning
 * "wait"; anything else counts as unset and gets the default.
 */
export function effectiveDuration(
  duration: number | null | undefined,
  tone: string | undefined,
  hasAction: boolean,
): number | null {
  if (tone === 'danger' || hasAction) {
    return null;
  }
  if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0) {
    return duration === 0 ? null : duration;
  }
  return KI_TOAST_DEFAULT_DURATION;
}

/**
 * Live-region urgency per tone (issue #353): a danger toast interrupts,
 * every other value is polite.
 */
export function liveRoleForTone(tone: string | undefined): 'alert' | 'status' {
  return tone === 'danger' ? 'alert' : 'status';
}
