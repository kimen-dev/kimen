interface DurationLabels {
  done: string;
  singular: string;
  plural: string;
}

export function formatElapsedTime(duration: number | undefined, labels: DurationLabels): string {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    return labels.done;
  }

  const seconds = Math.round(duration / 1000);
  const template = seconds === 1 ? labels.singular : labels.plural;
  return template.replaceAll('{seconds}', String(seconds));
}
