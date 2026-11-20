interface SegmentOption {
  value: string;
  disabled: boolean;
}

interface SegmentSelection {
  available: boolean[];
  selectedIndex: number;
  ownsRequest: boolean;
}

/** Resolves a requested value against the first owner of each nonblank value. */
export function resolveSegmentSelection(
  options: readonly SegmentOption[],
  requestedValue: string,
): SegmentSelection {
  const owners = new Set<string>();
  const available = options.map(({ value, disabled }) => {
    if (value.trim() === '' || owners.has(value)) {
      return false;
    }
    owners.add(value);
    return !disabled;
  });
  const requestedIndex = options.findIndex(
    ({ value }, index) => value === requestedValue && available[index],
  );
  return {
    available,
    selectedIndex: requestedIndex === -1 ? available.indexOf(true) : requestedIndex,
    ownsRequest: owners.has(requestedValue),
  };
}
