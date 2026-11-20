import { describe, expect, it } from 'vitest';

import { normalizeSuggestionTitle } from './ki-suggestion.title';

describe('normalizeSuggestionTitle', () => {
  it('collapses incidental HTML whitespace', () => {
    expect(normalizeSuggestionTitle(' \tDraft\n  release\r\nnotes\f ')).toBe('Draft release notes');
  });

  it('preserves nonbreaking spaces and punctuation', () => {
    expect(normalizeSuggestionTitle('What happened on\u00a0Tuesday?')).toBe(
      'What happened on\u00a0Tuesday?',
    );
  });

  it('returns no title for HTML whitespace alone', () => {
    expect(normalizeSuggestionTitle(' \t\r\n')).toBe('');
  });
});
