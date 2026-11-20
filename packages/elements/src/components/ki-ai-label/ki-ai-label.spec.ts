import { describe, expect, it } from 'vitest';
import { provenanceText } from './ki-ai-label.provenance';

describe('provenance text', () => {
  it.each([undefined, null, '', ' \n\t '])('treats %s as absent', (text) => {
    expect(provenanceText(text)).toBe('');
  });

  it('trims outer whitespace while keeping the supplied text intact', () => {
    expect(provenanceText('  Written from <incident> reports.\nSecond line.  ')).toBe(
      'Written from <incident> reports.\nSecond line.',
    );
    expect(provenanceText('  2026-11-19T10:32+01:00  ')).toBe('2026-11-19T10:32+01:00');
  });
});
