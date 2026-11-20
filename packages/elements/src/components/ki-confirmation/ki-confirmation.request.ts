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
