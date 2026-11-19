import { describe, expect, it } from 'vitest';
import { highlightSegments } from './ki-search.text';

describe('highlightSegments', () => {
  it('preserves the original case and emphasizes every literal match', () => {
    expect(highlightSegments('DiAlog and dialogs', 'dia')).toEqual([
      { text: 'DiA', match: true },
      { text: 'log and ', match: false },
      { text: 'dia', match: true },
      { text: 'logs', match: false },
    ]);
  });

  it('treats punctuation in the query as ordinary text', () => {
    expect(highlightSegments('Use [a+b] for this', '[a+b]')).toEqual([
      { text: 'Use ', match: false },
      { text: '[a+b]', match: true },
      { text: ' for this', match: false },
    ]);
  });

  it.each(['', '   ', 'different'])('returns the title unchanged for %j', (query) => {
    expect(highlightSegments('Dialog', query)).toEqual([{ text: 'Dialog', match: false }]);
  });
});
