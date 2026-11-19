// @spec:064-theme-fonts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('S3 the exported font stylesheets resolve and bundled faces include their licences', async () => {
  const onmars = new URL(import.meta.resolve('@kimen/tokens/css/onmars-fonts.css'));
  const material3 = new URL(import.meta.resolve('@kimen/tokens/css/material3-fonts.css'));
  const css = await readFile(onmars, 'utf8');

  for (const name of ['InstrumentSans', 'Newsreader']) {
    const asset = `../fonts/${name}Variable.woff2`;
    assert.ok(css.includes(`url('${asset}')`), `onmars stylesheet references ${asset}`);
    const font = await readFile(new URL(asset, onmars));
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
    const licence = await readFile(new URL(`../fonts/${name}-OFL.txt`, onmars), 'utf8');
    assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
  }
  assert.doesNotMatch(await readFile(material3, 'utf8'), /\burl\(/);
});
