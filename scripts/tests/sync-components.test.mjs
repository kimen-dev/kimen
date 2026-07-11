import assert from 'node:assert/strict';
import test from 'node:test';

import {
  augmentDirectDeclaration,
  renderDirectTypeExports,
} from '../../packages/elements/scripts/sync-components.mjs';

test('direct type augmentation includes source and frozen auxiliary types without runtime exports', () => {
  const component = {
    tag: 'ki-alert',
    moduleExports: { values: ['KiAlert'], types: [] },
  };
  const rootContract = {
    values: [
      {
        name: 'KiAlert',
        from: './components/ki-alert/ki-alert.js',
        replacement: '@kimen/elements/ki-alert',
      },
    ],
    namedTypes: [
      {
        name: 'KiAlertTone',
        from: './components/ki-alert/ki-alert.tone.js',
        replacement: '@kimen/elements/ki-alert',
      },
    ],
    typeStars: [],
  };

  assert.equal(
    renderDirectTypeExports(component, rootContract),
    [
      '// <kimen:direct-types>',
      "export type { KiAlertTone } from '../types/components/ki-alert/ki-alert.tone.js';",
      '// </kimen:direct-types>',
      '',
    ].join('\n'),
  );
});

test('direct type augmentation sorts adjacent source types and does not duplicate auxiliary names', () => {
  const component = {
    tag: 'ki-button',
    moduleExports: {
      values: ['KiButton'],
      types: ['KiButtonVariant', 'KiButtonSize'],
    },
  };
  const rootContract = {
    values: [],
    namedTypes: [
      {
        name: 'KiButtonSize',
        from: './components/ki-button/ki-button.js',
        replacement: '@kimen/elements/ki-button',
      },
    ],
    typeStars: [],
  };

  assert.equal(
    renderDirectTypeExports(component, rootContract),
    [
      '// <kimen:direct-types>',
      "export type { KiButtonSize } from '../types/components/ki-button/ki-button.js';",
      "export type { KiButtonVariant } from '../types/components/ki-button/ki-button.js';",
      '// </kimen:direct-types>',
      '',
    ].join('\n'),
  );
});

test('direct type augmentation preserves the historical exported component interface', () => {
  const component = {
    tag: 'ki-alert',
    className: 'KiAlert',
    moduleExports: { values: ['KiAlert'], types: [] },
  };
  const rootContract = { values: [], namedTypes: [], typeStars: [] };
  const source = [
    'import type { Components } from "../types/components";',
    '',
    'interface KiAlert extends Components.KiAlert, HTMLElement {}',
    'export const KiAlert: { prototype: KiAlert; new (): KiAlert };',
    '',
  ].join('\n');

  const augmented = augmentDirectDeclaration(source, component, rootContract);

  assert.match(augmented, /^export interface KiAlert extends/mu);
  assert.equal(augmentDirectDeclaration(augmented, component, rootContract), augmented);
});
