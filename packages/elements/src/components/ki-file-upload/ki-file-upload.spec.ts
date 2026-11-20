// @spec:109-ki-file-upload
import { describe, expect, it } from 'vitest';

import { acceptsFile, parseMaxSize, validateFileBatch } from './file-upload.validation';

const pdf = { name: 'report.PDF', type: 'application/pdf', size: 1000 };
const photo = { name: 'photo.png', type: 'image/png', size: 500 };
const archive = { name: 'archive.zip', type: 'application/zip', size: 600 };

describe('size limit parsing', () => {
  it.each([
    ['0 B', 0],
    ['900', 900],
    ['900 B', 900],
    ['1.5 kb', 1500],
    [' 10 MB ', 10_000_000],
    ['2GB', 2_000_000_000],
  ])('parses %s as %d bytes', (size, bytes) => {
    expect(parseMaxSize(size)).toBe(bytes);
  });

  it.each([undefined, '', '-1 MB', 'many', '10 PB', '1 MB extra'])(
    'treats %s as no size limit',
    (size) => {
      expect(parseMaxSize(size)).toBeUndefined();
    },
  );
});

describe('file type matching', () => {
  it.each([
    [pdf, ' .pdf , application/zip ', true],
    [pdf, 'APPLICATION/PDF', true],
    [photo, 'image/*', true],
    [archive, 'image/*, .pdf', false],
    [{ ...pdf, name: 'report.pdf.backup', type: '' }, '.pdf', false],
    [{ ...pdf, type: '' }, '.pdf', true],
    [{ ...pdf, type: '' }, 'application/pdf', false],
    [archive, '', true],
    [archive, undefined, true],
  ] as const)('%o with accept %s is allowed = %s', (file, accept, matches) => {
    expect(acceptsFile(file, accept)).toBe(matches);
  });
});

describe('batch validation', () => {
  it('counts accepted candidates only and preserves order and rejection causes', () => {
    const oversize = { ...pdf, name: 'large.pdf', size: 1001 };

    const result = validateFileBatch([archive, oversize, pdf, photo], {
      accept: '.pdf,image/*',
      maxSize: '1 KB',
      maxFiles: 2,
      multiple: true,
      selectedCount: 1,
    });

    expect(result).toEqual([
      { file: archive, rejection: 'type' },
      { file: oversize, rejection: 'size' },
      { file: pdf },
      { file: photo, rejection: 'count' },
    ]);
  });

  it('enforces single-file capacity across batches by default', () => {
    expect(validateFileBatch([pdf], { maxFiles: 3, selectedCount: 1 })).toEqual([
      { file: pdf, rejection: 'count' },
    ]);
  });

  it('honors a zero maximum file count', () => {
    expect(validateFileBatch([pdf], { maxFiles: 0, multiple: true, selectedCount: 0 })).toEqual([
      { file: pdf, rejection: 'count' },
    ]);
  });

  it.each([-1, 1.5, Infinity, NaN])('ignores invalid maximum file count %s', (maxFiles) => {
    expect(validateFileBatch([photo], { maxFiles, multiple: true, selectedCount: 2 })).toEqual([
      { file: photo },
    ]);
  });
});
