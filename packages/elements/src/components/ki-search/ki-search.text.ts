interface Segment {
  text: string;
  match: boolean;
}

function fold(value: string): string {
  // Keep dotted capital I intact because its lowercase form expands the source.
  return value
    .split('İ')
    .map((part) => part.toLowerCase().replaceAll('ς', 'σ'))
    .join('İ');
}

export function highlightSegments(text: string, query: string): Segment[] {
  const term = fold(query.trim());
  if (!term) return [{ text, match: false }];

  const segments: Segment[] = [];
  const title = fold(text);
  let offset = 0;
  for (let index = title.indexOf(term); index !== -1; index = title.indexOf(term, offset)) {
    if (index > offset) segments.push({ text: text.slice(offset, index), match: false });
    offset = index + term.length;
    segments.push({ text: text.slice(index, offset), match: true });
  }
  if (offset < text.length || segments.length === 0) {
    segments.push({ text: text.slice(offset), match: false });
  }
  return segments;
}
