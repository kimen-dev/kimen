export type ComboboxFilter = 'contains' | 'starts-with' | 'none';

export function labelMatcher(query: string, filter: ComboboxFilter) {
  const text = query.trim();
  if (filter === 'none' || text === '') {
    return () => [0, 0] as const;
  }

  // Use a literal pattern so match indices refer to the original label even
  // when lowercasing a preceding character would change its UTF-16 length.
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(filter === 'starts-with' ? `^${escaped}` : escaped, 'iu');
  return (label: string): readonly [number, number] | null => {
    const match = pattern.exec(label);
    return match ? [match.index, match.index + match[0].length] : null;
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
