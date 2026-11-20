export type TreeCheck = 'true' | 'false' | 'mixed';

export function branchCheck(states: readonly TreeCheck[]): TreeCheck {
  throw new Error(`Selection for ${String(states.length)} children is not implemented`);
}
