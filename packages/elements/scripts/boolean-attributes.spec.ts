import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { booleanAttributes, kimenBooleanAttributes } from './boolean-attributes.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(packageRoot, 'package.json'));
const runtimeSource = (): Promise<string> =>
  readFile(require.resolve('@stencil/core/internal/client'), 'utf8');

describe('boolean attributes in the Stencil runtime', () => {
  it('reads attr="false" as false on form-associated components too, line for line', async () => {
    const source = await runtimeSource();
    const rewritten = kimenBooleanAttributes(source);

    expect(source).toContain('newValue === "false" && !isFormAssociated');
    expect(rewritten).not.toMatch(/formAssociated && isFormAssociated && typeof propValue/u);
    expect(rewritten).not.toContain('newValue === "false" && !isFormAssociated');
    expect(rewritten).toContain(
      'newValue = newValue === null ? defaultValue : newValue !== "false";',
    );
    expect(rewritten).toContain('isFormAssociated && attrName === "disabled"');
    expect(rewritten).toContain('"ki-toast/dismissible":1');
    expect(rewritten.split('\n')).toHaveLength(source.split('\n').length);
  });

  it('refuses a runtime whose branches changed shape, and transforms only the runtime', async () => {
    const source = await runtimeSource();
    expect(() => kimenBooleanAttributes('const a = 1;')).toThrow(
      /expected one form-associated boolean parse in Stencil's client runtime, found 0/u,
    );
    expect(() =>
      kimenBooleanAttributes(source.replace('newValue === "false" && !isFormAssociated', 'x')),
    ).toThrow(/expected one form-associated boolean attribute .*found 0/u);
    const runtime = '/r/node_modules/@stencil/core/internal/client/index.js';
    expect(booleanAttributes.transform(source, `${runtime}?app-data=conditional`)).toEqual({
      code: kimenBooleanAttributes(source),
      map: null,
    });
    expect(
      booleanAttributes.transform(source, '/r/src/components/ki-search/ki-search.tsx'),
    ).toBeNull();
  });
});
