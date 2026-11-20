// @spec:130-ki-markdown

import { describe, expect, it } from 'vitest';

import {
  decodeMarkdownText,
  headingLevel,
  markdownDestination,
  parseMarkdown,
} from './ki-markdown.behavior';

const base = new URL('https://app.example/inbox');

describe('Markdown source', () => {
  it.each([
    [1, undefined, 3],
    [1, 0, 1],
    [4, 5, 6],
    [3, -1, 5],
    [2, 1.5, 4],
    [1, Number.NaN, 3],
  ])('S1 maps heading %i with offset %s to level %i', (depth, offset, expected) => {
    expect(headingLevel(depth, offset)).toBe(expected);
  });

  it('S4 recognizes an unterminated fence as code', () => {
    expect(parseMarkdown('\x60\x60\x60ts\nconst size = 3;', true)).toMatchObject([
      { type: 'code', lang: 'ts', text: 'const size = 3;' },
    ]);
  });

  it.each(['|', '| :-', '| --- | --- |'])(
    'S4 waits for the trailing delimiter %j to be complete',
    (delimiter) => {
      expect(parseMarkdown(`| Name | Count |\n${delimiter}`, true)).toMatchObject([
        { type: 'paragraph', tokens: [{ type: 'text', text: '| Name | Count |' }] },
      ]);
    },
  );

  it('S4 retains the columns of a confirmed table as a row arrives', () => {
    expect(parseMarkdown('| Name | Count |\n| --- | --- |\n| Desk', true)).toMatchObject([
      { type: 'table', rows: [[[{ type: 'text', text: 'Desk' }], []]] },
    ]);
  });

  it('renders a complete table whose delimiter ends the final answer', () => {
    expect(parseMarkdown('| Name | Count |\n| --- | --- |', false)).toMatchObject([
      { type: 'table', rows: [] },
    ]);
  });

  it('stops table rows at a following blockquote that contains a pipe', () => {
    expect(parseMarkdown('| A | B |\n| - | - |\n| 1 | 2 |\n> Next | Quote', false)).toMatchObject([
      { type: 'table', rows: [[[{ type: 'text', text: '1' }], [{ type: 'text', text: '2' }]]] },
      {
        type: 'blockquote',
        tokens: [{ type: 'paragraph', tokens: [{ type: 'text', text: 'Next | Quote' }] }],
      },
    ]);
  });

  it('preserves reference links, escaped inline code and nested CommonMark lists', () => {
    const source = '3. Use [guide][docs] and `<field>`\n   - **Save**\n\n[docs]: /guide';
    expect(parseMarkdown(source, false)).toMatchObject([
      {
        type: 'list',
        start: 3,
        items: [
          {
            tokens: [
              {
                tokens: [
                  { type: 'text', text: 'Use ' },
                  { type: 'link', href: '/guide' },
                  { type: 'text', text: ' and ' },
                  { type: 'codespan', text: '<field>' },
                ],
              },
              { type: 'list' },
            ],
          },
        ],
      },
    ]);
  });

  it('S13 keeps character references literal inside code spans', () => {
    expect(parseMarkdown('Use \x60&lt;tag&gt;\x60 as written.', false)).toMatchObject([
      {
        type: 'paragraph',
        tokens: [
          { type: 'text', text: 'Use ' },
          { type: 'codespan', text: '&lt;tag&gt;' },
          { type: 'text', text: ' as written.' },
        ],
      },
    ]);
  });

  it('recognizes hard breaks, nested emphasis and balanced link destinations', () => {
    expect(parseMarkdown('Use ***both***.  \n[Guide](/manual(v2) "Upgrade")', false)).toMatchObject(
      [
        {
          type: 'paragraph',
          tokens: [
            { type: 'text', text: 'Use ' },
            { type: 'em', tokens: [{ type: 'strong', tokens: [{ text: 'both' }] }] },
            { type: 'text', text: '.' },
            { type: 'br' },
            { type: 'link', href: '/manual(v2)', title: 'Upgrade', tokens: [{ text: 'Guide' }] },
          ],
        },
      ],
    );
  });

  it('keeps HTML block contents literal and does not register fenced definitions', () => {
    expect(
      parseMarkdown(
        '<!-- description\n\n[Example](/hidden)\n-->\n\n~~~text\n[example]: /bad\n~~~\n\n[example]',
        false,
      ),
    ).toMatchObject([
      { type: 'literal', raw: '<!-- description\n\n[Example](/hidden)\n-->' },
      { type: 'code', lang: 'text', text: '[example]: /bad' },
      { type: 'paragraph', tokens: [{ type: 'text', text: '[example]' }] },
    ]);
  });

  it('decodes the supported named and numeric references and preserves unfamiliar names', () => {
    expect(decodeMarkdownText('&amp; &copy; &#65; &#x42; &CounterClockwiseContourIntegral;')).toBe(
      '& © A B &CounterClockwiseContourIntegral;',
    );
  });
});

describe('Markdown destinations', () => {
  it.each([
    'data:text/plain,blocked',
    'blob:https://app.example/untrusted',
    'java&#x09;script&colon;',
  ])('S2 rejects the unsupported destination %j after entity decoding', (url) => {
    expect(markdownDestination(url, base, base.origin)).toBeNull();
  });

  it.each([
    ['/guide?a=one&amp;b=two', '/guide?a=one&b=two', false],
    ['#section', '#section', false],
    ['https://app.example/topic', 'https://app.example/topic', false],
    ['//docs.example/start', '//docs.example/start', true],
  ])(
    'resolves %j with the native base and reports whether it is external',
    (source, url, external) => {
      expect(markdownDestination(source, base, base.origin)).toEqual({ url, external });
    },
  );

  it.each([
    '/guide',
    '//docs.example/guide',
    'https://other.example',
    'https://docs.example@other.example',
  ])('S3 suppresses %j when it cannot be tied to the permitted origin', (url) => {
    expect(markdownDestination(url, base, base.origin, ['https://docs.example'])).toBeNull();
  });

  it('S3 accepts an absolute destination from the permitted origin', () => {
    const url = 'https://docs.example:443/guide';
    expect(markdownDestination(url, base, base.origin, ['https://docs.example'])).toEqual({
      url,
      external: true,
    });
  });
});
