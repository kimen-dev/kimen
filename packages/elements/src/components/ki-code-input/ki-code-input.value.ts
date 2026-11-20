export function normalizeCodeInputLength(length: number | undefined): number {
  return length ?? 6;
}

export const normalizeCode: (value: string | undefined, type: string, length: number) => string = (
  value,
) => value ?? '';
