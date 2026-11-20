export function normalizeSuggestionTitle(text: string): string {
  return text.replace(/[ \t\n\f\r]+/gu, ' ').replace(/^ | $/gu, '');
}
