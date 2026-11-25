// @spec:166-tokens-core-and-component-sheets
//
// What a component reads and renders, as the per-tag token sheets see it
// (scripts/lib/component-token-usage.mjs). A missed render loses a child's
// tokens on a split page; S2's browser sweep is the end-to-end proof.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readComponentTokenUsage } from '../lib/component-token-usage.mjs';

async function components(files) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-token-usage-'));
  for (const [path, source] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), source);
  }
  return root;
}

const tsx = (tag, body, styleUrl = `${tag}.css`) =>
  `@Component({ tag: '${tag}', styleUrl: '${styleUrl}', shadow: true })\nexport class X {\n${body}\n}\n`;

test('S1 a component reads the tokens of its styles and of its inline styles', async () => {
  const root = await components({
    'ki-alpha/ki-alpha.tsx': tsx(
      'ki-alpha',
      "render() { return <div style={{ gap: `var(--ki-layout-spacing-${'md'})`, color: 'var(--ki-alpha-fg)' }} />; }",
    ),
    'ki-alpha/ki-alpha.css': ':host { background: var(--ki-alpha-bg); }',
    'ki-alpha/ki-alpha.spec.ts': "const ignored = 'var(--ki-test-only)';",
  });
  try {
    const usage = await readComponentTokenUsage({ componentsRoot: root });
    assert.deepEqual([...usage.get('ki-alpha').tokens].sort(), [
      '--ki-alpha-bg',
      '--ki-alpha-fg',
      '--ki-layout-spacing-',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('S3 a component renders the tags it names in JSX, h() and createElement()', async () => {
  const root = await components({
    'ki-alpha/ki-alpha.tsx': tsx(
      'ki-alpha',
      "render() { return [<ki-icon name='x' />, h('ki-counter', {}), document.createElement('ki-spinner')]; }",
    ),
    'ki-icon/ki-icon.tsx': tsx('ki-icon', ''),
    'ki-counter/ki-counter.tsx': tsx('ki-counter', ''),
    'ki-spinner/ki-spinner.tsx': tsx('ki-spinner', ''),
  });
  try {
    const usage = await readComponentTokenUsage({ componentsRoot: root });
    assert.deepEqual([...usage.get('ki-alpha').renders].sort(), [
      'ki-counter',
      'ki-icon',
      'ki-spinner',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('S3 an assembled tag counts only where it is rendered, not where it is recognised', async () => {
  const root = await components({
    'ki-alpha/ki-alpha.tsx': [
      "const tooltipTag = ['ki', 'tooltip'].join('-');",
      "const buttonTag = ['ki', 'button'].join('-');",
      "function childTag(name: 'link' | 'note'): string { return ['ki', name].join('-'); }",
      tsx(
        'ki-alpha',
        [
          'isButton(item) { return item.localName === buttonTag; }',
          'render() {',
          '  return [h(\n    tooltipTag, {}),',
          "    h(note ? childTag('note') : 'p'), h(childTag('link'))];",
          '}',
        ].join('\n'),
      ),
    ].join('\n'),
    'ki-tooltip/ki-tooltip.tsx': tsx('ki-tooltip', ''),
    'ki-button/ki-button.tsx': tsx('ki-button', ''),
    'ki-link/ki-link.tsx': tsx('ki-link', ''),
    'ki-note/ki-note.tsx': tsx('ki-note', ''),
  });
  try {
    const usage = await readComponentTokenUsage({ componentsRoot: root });
    assert.deepEqual([...usage.get('ki-alpha').renders].sort(), [
      'ki-link',
      'ki-note',
      'ki-tooltip',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a component never counts itself, and a tag that is not a component is left out', async () => {
  const root = await components({
    'ki-tree/ki-tree.tsx': tsx('ki-tree', 'render() { return [<ki-tree />, <ki-unknown />]; }'),
  });
  try {
    const usage = await readComponentTokenUsage({ componentsRoot: root });
    assert.deepEqual([...usage.get('ki-tree').renders], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
