// @spec:169-emitter-compact-prompt
import { createHash } from 'node:crypto';

import { catalogData, validateUiSpec } from '@kimen/catalog';
import { describe, expect, it } from 'vitest';

import { catalogPrompt } from '../src/index.js';

const demoComponents = [
  'ki-card',
  'ki-icon',
  'ki-button',
  'ki-input',
  'ki-select',
  'ki-option',
  'ki-textarea',
  'ki-table',
] as const;

function prompt(options: Parameters<typeof catalogPrompt>[1]): string {
  const result = catalogPrompt(catalogData, options);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.artifact;
}

// These lines are generated from structured catalog facts, independently of
// the description and layout that follow them.
const componentFacts = (guidance: string) =>
  guidance
    .split('## Components\n')[1]
    ?.split('## Example')[0]
    ?.match(
      /^### <[^>]+>$|^ {2}- `[^`]*` \([^\n]*?\)(?= —| \(default:|$)|^- Events \([^\n]+|^ {2}- `[^`]*` —[^\n]*/gmu,
    );

describe('compact catalog guidance', () => {
  it.each([{ components: undefined }, { components: demoComponents }])(
    'S1 uses at most 85% of the bytes for $components',
    ({ components }) => {
      const options = components === undefined ? {} : { components };
      const standard = prompt(options);
      const compact = prompt({ ...options, verbosity: 'compact' });
      expect(Buffer.byteLength(compact)).toBeLessThanOrEqual(Buffer.byteLength(standard) * 0.85);
      expect(componentFacts(compact)).toEqual(componentFacts(standard));
      const json = /\x60{3}json\n([\s\S]*?)\n\x60{3}/u.exec(compact)?.[1];
      expect(json).toBeDefined();
      const example = JSON.parse(json ?? 'null') as { root: { component: string } };
      expect(validateUiSpec(example).ok).toBe(true);
      if (components !== undefined) expect(components).toContain(example.root.component);
    },
  );

  it('S2 retains action, event, collection and choice composition rules', () => {
    const compact = prompt({ verbosity: 'compact' });
    expect(compact).toContain(
      'Every "action" you bind MUST appear in the top-level "actions" list',
    );
    expect(compact).toContain('Only listed events may be keys');
    expect(compact).toContain('Each bound event fires only when every collected field is valid');
    expect(compact).toContain('inside a `ki-select` or `ki-combobox`');
    expect(compact).toContain('Use the same label in both states.');
    expect(compact).toContain('Include {row} for the row header or key.');
  });

  it('S3 preserves the standard prompt with the current catalog guidance', () => {
    const standard = prompt({ components: ['ki-card', 'ki-button'] });
    // Normalize the elements version. Refresh the fixture for intentional
    // catalog guidance changes, such as the button slot sizing descriptions.
    const normalized = standard.replace(/; elements [^\n]+\.\n/u, '; elements 0.4.0.\n');
    expect(createHash('sha256').update(normalized).digest('hex')).toBe(
      '21576c2e6722dc8daa944f2e89278d2fdb96b8e8f316321dae1ea8c0fe05efe5',
    );
  });
});
