import { describe, expect, it } from 'vitest';
import {
  acceptsFile,
  selectAttachments,
  shouldSubmit,
  transferFiles,
} from './ki-prompt-input.files';

const file = (name: string, type = '', size = 3): File =>
  new File(['a'.repeat(size)], name, { type });

const csv = file('report.CSV');
const png = file('photo.png', 'image/png');
const pdf = file('guide.pdf', 'application/pdf');

it('uses the clipboard file list once when items also expose files', () => {
  expect(transferFiles({ files: [csv], items: [{ getAsFile: () => csv }] })).toEqual([csv]);
});

it('reads clipboard files from items when the file list is empty', () => {
  expect(
    transferFiles({ files: [], items: [{ getAsFile: () => null }, { getAsFile: () => csv }] }),
  ).toEqual([csv]);
});

it('matches extensions, exact MIME types and MIME wildcards without case sensitivity', () => {
  const accept = ' .csv , IMAGE/*, application/pdf ';
  expect([csv, png, pdf].map((entry) => acceptsFile(entry, accept))).toEqual([true, true, true]);
  expect(acceptsFile(file('photo.png'), 'image/*')).toBe(false);
  expect(acceptsFile(file('report.csv.exe'), '.csv')).toBe(false);
  expect(acceptsFile(csv, ' , ')).toBe(false);
});

it('validates batches in arrival order and explains type, size and count rejections', () => {
  const exactLimit = file('ok.csv', 'text/csv', 5);
  const tooLarge = file('large.csv', 'text/csv', 6);
  const extra = file('extra.csv');
  expect(selectAttachments([png, tooLarge, exactLimit, extra], '.csv', 1, 2, 5)).toEqual({
    accepted: [exactLimit],
    rejected: [
      { file: png, reason: 'type' },
      { file: tooLarge, reason: 'size' },
      { file: extra, reason: 'count' },
    ],
  });
});

it('honours zero and fractional count limits and treats other invalid limits as unrestricted', () => {
  expect(selectAttachments([csv], '.csv', 0, 0).rejected[0]?.reason).toBe('count');
  expect(selectAttachments([csv], '.csv', 0, 1, 0).rejected[0]?.reason).toBe('size');
  expect(selectAttachments([csv], '.csv', 1, 1.9).rejected[0]?.reason).toBe('count');
  expect(selectAttachments([csv], '.csv', 0, Number.NaN, -1).accepted).toEqual([csv]);
});

describe('submit shortcuts', () => {
  const enter = {
    key: 'Enter',
    keyCode: 13,
    isComposing: false,
    repeat: false,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };

  it('accepts plain Enter and the configured platform modifier shortcuts', () => {
    expect(shouldSubmit(enter, 'enter')).toBe(true);
    expect(shouldSubmit(enter, 'mod-enter')).toBe(false);
    expect(shouldSubmit({ ...enter, ctrlKey: true }, 'mod-enter')).toBe(true);
    expect(shouldSubmit({ ...enter, metaKey: true }, 'mod-enter')).toBe(true);
  });

  it('preserves composition, repeat, Shift and Alt editing keys', () => {
    for (const options of [
      { isComposing: true },
      { keyCode: 229 },
      { repeat: true },
      { shiftKey: true },
      { altKey: true },
      { key: 'Escape' },
    ]) {
      expect(shouldSubmit({ ...enter, ...options }, 'enter')).toBe(false);
      expect(shouldSubmit({ ...enter, ctrlKey: true, ...options }, 'mod-enter')).toBe(false);
    }
  });
});
