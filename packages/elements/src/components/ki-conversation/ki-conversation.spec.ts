// @spec:115-ki-conversation
import { describe, expect, it } from 'vitest';
import { isAtConversationEnd } from './ki-conversation.scroll';

describe('conversation bottom detection', () => {
  it.each([
    { scrollTop: 0, scrollHeight: 120, clientHeight: 120, expected: true },
    { scrollTop: 300, scrollHeight: 420, clientHeight: 120, expected: true },
    { scrollTop: 299.5, scrollHeight: 420, clientHeight: 120, expected: true },
    { scrollTop: 298.5, scrollHeight: 420, clientHeight: 120, expected: false },
    { scrollTop: 328, scrollHeight: 420, clientHeight: 120, expected: true },
  ])('S7 detects the end at $scrollTop of $scrollHeight with viewport $clientHeight', (data) => {
    expect(isAtConversationEnd(data.scrollTop, data.scrollHeight, data.clientHeight)).toBe(
      data.expected,
    );
  });
});
