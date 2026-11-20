interface DurationLabels {
  done: string;
  singular: string;
  plural: string;
}

export function formatElapsedTime(_duration: number | undefined, labels: DurationLabels): string {
  return labels.done;
}
