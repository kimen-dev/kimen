export function parseDelay(value: string): number {
  const trimmed = value.trim();
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/u.exec(trimmed);

  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return match[2] === 's' ? amount * 1000 : amount;
}
