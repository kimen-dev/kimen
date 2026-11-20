export type TreeCheck = 'true' | 'false' | 'mixed';

/** Summarize the check states of a branch's enabled direct children. */
export function branchCheck(states: readonly TreeCheck[]): TreeCheck {
  const first = states[0] ?? 'false';
  return states.every((state) => state === first) ? first : 'mixed';
}
