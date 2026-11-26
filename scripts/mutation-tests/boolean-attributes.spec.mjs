import { describe, expect, it } from 'vitest';

import {
  booleanAttributes,
  kimenBooleanAttributes,
} from '../../packages/elements/scripts/boolean-attributes.mjs';

// How the elements build makes Stencil's runtime read boolean attributes.
const parse = [
  '    if (BUILD15.propBoolean && propType & 4 /* Boolean */) {',
  '      if (BUILD15.formAssociated && isFormAssociated && typeof propValue === "string") {',
  '        return propValue === "" || !!propValue;',
  '      } else {',
  '        return propValue === "false" ? false : propValue === "" || !!propValue;',
  '      }',
].join('\n');
const attribute =
  '            newValue = newValue === null || newValue === "false" && !isFormAssociated ? false : true;';
const runtime = `${parse}\n${attribute}\n`;

describe('boolean-attributes', () => {
  it('drops both form-associated exceptions and moves no line', () => {
    expect(kimenBooleanAttributes(runtime)).toBe(
      [
        '    if (BUILD15.propBoolean && propType & 4 /* Boolean */) {',
        '      if (false) {',
        '        return propValue === "" || !!propValue;',
        '      } else {',
        '        return propValue === "false" ? false : propValue === "" || !!propValue;',
        '      }',
        '            newValue = newValue === null || newValue === "false" ? false : true;',
        '',
      ].join('\n'),
    );
    expect(kimenBooleanAttributes(runtime.replace('BUILD15', 'BUILD'))).toContain('if (false) {');
  });

  it.each([
    ['no parse branch', attribute, 'form-associated boolean parse', 0],
    ['two parse branches', `${parse}\n${parse}\n${attribute}`, 'form-associated boolean parse', 2],
    ['no attribute branch', parse, 'form-associated boolean attribute', 0],
    [
      'two attribute branches',
      `${parse}\n${attribute}\n${attribute}`,
      'form-associated boolean attribute',
      2,
    ],
    [
      'a parse branch inside a name',
      runtime.replace('BUILD15.formAssociated', 'XBUILD15.formAssociated'),
      'form-associated boolean parse',
      0,
    ],
  ])('refuses %s', (_label, source, branch, found) => {
    expect(() => kimenBooleanAttributes(source)).toThrowError(
      `boolean-attributes: expected one ${branch} in Stencil's client runtime, found ${String(found)}`,
    );
  });

  it('transforms only the client runtime module, keeping its source map', () => {
    expect(booleanAttributes.name).toBe('kimen-boolean-attributes');
    const id = '/r/node_modules/@stencil/core/internal/client/index.js';
    for (const runtimeId of [id, `${id}?app-data=conditional`, id.replaceAll('/', '\\')]) {
      expect(booleanAttributes.transform(runtime, runtimeId)).toEqual({
        code: kimenBooleanAttributes(runtime),
        map: null,
      });
    }
    for (const other of [
      `${id}.map`,
      '/r/node_modules/@stencil/core/internal/hydrate/index.js',
      '/r/src/index.ts',
    ]) {
      expect(booleanAttributes.transform(runtime, other)).toBeNull();
    }
  });
});
