export type ComboboxFilter = 'contains' | 'starts-with' | 'none';

export function labelMatcher(query: string, filter: ComboboxFilter) {
  const text = query.trim();
  if (filter === 'none' || text === '') {
    return () => [0, 0] as const;
  }

  const needle = text.toLowerCase();
  return (label: string): readonly [number, number] | null => {
    const folded = label.toLowerCase();
    const start = folded.indexOf(needle);
    if (start < 0 || (filter === 'starts-with' && start !== 0)) return null;
    const end = start + needle.length;
    if (folded.length === label.length) return [start, end];

    // If folding expands a letter, map each highlight boundary back to
    // the original character rather than slicing the folded string.
    let offset = 0;
    let index = 0;
    let first = 0;
    for (const character of label) {
      if (offset <= start) first = index;
      offset += character.toLowerCase().length;
      index += character.length;
      if (offset >= end) break;
    }
    return [first, index];
  };
}

function stringsFromAttribute(text: string): string[] {
  if (text.trimStart().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed;
      }
    } catch {
      // An ordinary string value may also start with a bracket.
    }
  }
  return text === '' ? [] : [text];
}

export function normalizedValues(
  value: string | string[] | undefined,
  multiple: boolean,
): string[] {
  if (!multiple) {
    const first = Array.isArray(value) ? value[0] : value;
    return first ? [first] : [];
  }
  const values = typeof value === 'string' ? stringsFromAttribute(value) : (value ?? []);
  return [...new Set(values)];
}

export function offerCustom(
  query: string,
  options: readonly { label: string; value: string }[],
  selected: readonly string[],
): string | null {
  const value = query.trim();
  if (value === '') return null;
  const folded = value.toLowerCase();
  const known = options.some(
    (option) => option.label.toLowerCase() === folded || option.value.toLowerCase() === folded,
  );
  return known || selected.some((selection) => selection.toLowerCase() === folded) ? null : value;
}

export function sameSelection(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
