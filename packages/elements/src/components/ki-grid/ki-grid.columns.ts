/** Fixed tracks require a positive integer that can be serialized exactly. */
export function fixedColumnCount(columns: number | undefined): number | undefined {
  return columns !== undefined && Number.isSafeInteger(columns) && columns > 0
    ? columns
    : undefined;
}
