export const DEFAULT_RATES = '0.75,1,1.25,1.5,2';

export function formatPlaybackTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.floor(Math.max(0, seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = String(total % 60).padStart(2, '0');

  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${String(minutes)}:${remainder}`;
}

export function parsePlaybackRates(rates: string): number[] {
  const parsed = new Set<number>();
  for (const entry of rates.split(',')) {
    const decimal = entry.trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(decimal)) continue;
    const rate = Number(decimal);
    if (rate >= 0.25 && rate <= 4) parsed.add(rate);
  }

  if (parsed.size === 0) return DEFAULT_RATES.split(',').map(Number);
  parsed.add(1);
  return [...parsed];
}
