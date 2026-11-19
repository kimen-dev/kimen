export function copySourceText(
  source: { textContent: string | null; value?: unknown } | null,
): string | undefined {
  throw new Error(`Copy source resolution is pending (source present: ${String(source !== null)})`);
}

export function feedbackTimeout(duration: number): number {
  throw new Error(`Feedback timing is pending (${String(duration)} ms)`);
}
