interface DecisionRequest {
  state?: string | undefined;
  heading?: string | undefined;
  action?: string | undefined;
  approveLabel?: string | undefined;
  denyLabel?: string | undefined;
}

export function hasText(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}

export function warnIfDecisionLabelsMissing({
  state = 'pending',
  approveLabel,
  denyLabel,
}: DecisionRequest): void {
  if (
    process.env.NODE_ENV === 'development' &&
    state === 'pending' &&
    (!hasText(approveLabel) || !hasText(denyLabel))
  ) {
    console.warn('[Kimen] A pending ki-confirmation needs both approve-label and deny-label.');
  }
}

/** Validate the visible request before offering or reporting either decision. */
export function isDecisionAvailable({
  state = 'pending',
  heading,
  action,
  approveLabel,
  denyLabel,
}: DecisionRequest): boolean {
  return state === 'pending' && [heading, action, approveLabel, denyLabel].every(hasText);
}
