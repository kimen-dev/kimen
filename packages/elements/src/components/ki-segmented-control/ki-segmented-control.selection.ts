interface SegmentOption {
  value: string;
  disabled: boolean;
}

interface SegmentSelection {
  available: boolean[];
  selectedIndex: number;
  ownsRequest: boolean;
}

export function resolveSegmentSelection(
  options: readonly SegmentOption[],
  requestedValue: string,
): SegmentSelection {
  return {
    available: options.map(() => false),
    selectedIndex: -1,
    ownsRequest: requestedValue === '',
  };
}
