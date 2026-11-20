import { expect, it } from 'vitest';

import { branchCheck, type TreeCheck } from './ki-tree.selection';

const examples: { children: TreeCheck[]; expected: TreeCheck }[] = [
  { children: [], expected: 'false' },
  { children: ['false', 'false'], expected: 'false' },
  { children: ['true', 'true'], expected: 'true' },
  { children: ['true', 'false'], expected: 'mixed' },
  { children: ['mixed'], expected: 'mixed' },
];

it.each(examples)('summarizes $children as $expected', ({ children, expected }) => {
  expect(branchCheck(children)).toBe(expected);
});
