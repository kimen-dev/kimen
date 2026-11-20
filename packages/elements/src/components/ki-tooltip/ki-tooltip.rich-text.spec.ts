import { describe, expect, it } from 'vitest';
import { readRichTooltipText } from './ki-tooltip.rich-text.js';

const text = (textContent: string) => ({ nodeName: '#text', textContent });

describe('readRichTooltipText', () => {
  it('joins direct text nodes and omits interactive descendants and comments', () => {
    const body = readRichTooltipText([
      text('  Deleted projects '),
      { nodeName: 'A', textContent: 'Learn more' },
      { nodeName: '#comment', textContent: 'Template marker' },
      text(' stay restorable\nfor 30 days. '),
    ]);

    expect(body).toBe('Deleted projects stay restorable for 30 days.');
  });

  it('handles heading-only markup with a blank body', () => {
    expect(readRichTooltipText([text('\n  '), { nodeName: 'B', textContent: 'Other' }])).toBe('');
  });

  it('preserves a nonbreaking space in author text', () => {
    expect(readRichTooltipText([text('30\u00a0days')])).toBe('30\u00a0days');
  });
});
