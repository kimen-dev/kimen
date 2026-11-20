interface Segment {
  text: string;
  match: boolean;
}

export function highlightSegments(text: string, query: string): Segment[] {
  const term = query.trim();
  const segments: Segment[] = [];
  let offset = 0;

  if (term) {
    const literal = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    for (const match of text.matchAll(new RegExp(literal, 'giu'))) {
      if (match.index > offset) {
        segments.push({ text: text.slice(offset, match.index), match: false });
      }
      segments.push({ text: match[0], match: true });
      offset = match.index + match[0].length;
    }
  }
  if (offset < text.length || segments.length === 0) {
    segments.push({ text: text.slice(offset), match: false });
  }
  return segments;
}
