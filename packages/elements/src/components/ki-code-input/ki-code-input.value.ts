export function normalizeCodeInputLength(length: number | undefined): number {
  return length !== undefined && Number.isInteger(length) && length >= 4 && length <= 8
    ? length
    : 6;
}

export function normalizeCode(value: string | undefined, type: string, length: number): string {
  const disallowed = type === 'alphanumeric' ? /[^A-Za-z0-9]/g : /[^0-9]/g;
  return typeof value === 'string'
    ? value.replace(disallowed, '').slice(0, Math.max(length, 0))
    : '';
}
