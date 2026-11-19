interface RelativeTime {
  value?: number;
  unit?: Intl.RelativeTimeFormatUnit;
  nextDelay?: number;
}

export const describeRelativeTime: (delta: number, threshold?: number) => RelativeTime = () => ({});
