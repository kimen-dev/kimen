// The contract for the position rules. The red tests require their runtime implementation.
export declare function leadingLimit(count: number, view: number): number;
export declare function normalizeIndex(value: number, limit: number): number;
export declare function movementTarget(
  current: number,
  step: number,
  limit: number,
  loop: boolean,
): number;
