// What each ki-* component reads from the token sheet, and which ki-* tags it
// renders itself (spec 166). @kimen/tokens builds one self-contained token
// sheet per tag from this: the component sources of every token the tag reads,
// and those of every tag it renders, transitively.
//
// The styles are the ones the CEM CSS-property contract is derived from
// (readComponentCss), so the two can never disagree about what a component
// reads. The component's own scripts add the tokens it names in inline
// styles and the tags it renders: in JSX, with `h('ki-…')` or
// `document.createElement`, or from a tag name it assembles to stay out of
// Stencil's registration graph.
// Naming a tag only to query it (`closest`, `localName`) adds that tag's
// sources too: a slightly larger sheet, never a missing token.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readComponentCss } from './token-inventory.mjs';

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

// A read token: `var(--ki-…)`. A name that ends in `-` was cut by a template
// literal (`var(--ki-layout-spacing-${gap})`) and stands for every token with
// that prefix.
const READ_TOKEN = /var\(\s*(--ki-[a-z0-9-]+)/gu;
const RENDERED_TAG =
  /<(ki-[a-z0-9]+(?:-[a-z0-9]+)*)[\s/>]|(?:createElement|\bh)\(\s*['"](ki-[a-z0-9]+(?:-[a-z0-9]+)*)['"]/gu;
// A child kept out of Stencil's registration graph names its tag in pieces,
// `['ki', 'tooltip'].join('-')`, in a constant or in a function over a typed
// union (`childTag(name: 'link' | 'note')`). A constant's tag is rendered only
// where it is the tag argument of `h()` or `createElement()`; every name such
// a helper builds is rendered (it exists for nothing else). A component that
// assembles a name to recognise a slotted child (`localName === tag`) does
// not render it, and the page imports that child's sheet itself.
const PIECES = String.raw`\[\s*'ki'\s*,\s*((?:'[a-z0-9-]+'\s*,?\s*)+)\]\.join\(\s*'-'\s*\)`;
const RENDER_CALL = String.raw`(?:\bh|createElement)\(\s*`;
const JOINED_RENDER = new RegExp(RENDER_CALL + PIECES, 'gu');
const JOINED_CONSTANT = new RegExp(String.raw`\b(?:const|let)\s+(\w+)\s*=\s*` + PIECES, 'gu');
const JOINED_FUNCTION =
  /function\s+(\w+)\s*\(\s*(\w+)\s*:\s*(?:'[a-z0-9-]+'\s*\|?\s*)+\)[^{]*\{\s*return\s*\[\s*'ki'\s*,\s*\2\s*\]\.join\(\s*'-'\s*\)/gu;
const literals = (list) => [...list.matchAll(/'([a-z0-9-]+)'/gu)].map((match) => match[1]);

function renderedTags(script) {
  const tags = [
    ...[...script.matchAll(RENDERED_TAG)].map((match) => match[1] ?? match[2]),
    ...[...script.matchAll(JOINED_RENDER)].map((match) => ['ki', ...literals(match[1])].join('-')),
  ];
  for (const [, name, pieces] of script.matchAll(JOINED_CONSTANT)) {
    if (new RegExp(`${RENDER_CALL}${name}\\b`, 'u').test(script)) {
      tags.push(['ki', ...literals(pieces)].join('-'));
    }
  }
  for (const [, name] of script.matchAll(JOINED_FUNCTION)) {
    // A helper that only builds tag names: every name it builds is rendered.
    const calls = new RegExp(`\\b${name}\\(\\s*'([a-z0-9-]+)'`, 'gu');
    for (const [, piece] of script.matchAll(calls)) tags.push(`ki-${piece}`);
  }
  return tags;
}
const SCRIPT = /\.tsx?$/u;
// Tests, stories, galleries and declarations are not the component.
const NOT_THE_COMPONENT = /(?:\.spec|\.e2e|\.stories|\.d)\.tsx?$|(?:^|[\\/])gallery\.ts$/u;

async function scriptsBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scriptsBelow(path)));
    } else if (entry.isFile() && SCRIPT.test(entry.name) && !NOT_THE_COMPONENT.test(path)) {
      files.push(path);
    }
  }
  return files.sort(compareText);
}

/**
 * Every tag under `componentsRoot`, sorted, with the token names (or name
 * prefixes ending in `-`) its styles and scripts read and the other tags it
 * renders.
 */
export async function readComponentTokenUsage({ componentsRoot }) {
  const cssByTag = await readComponentCss({ componentsRoot });
  const usage = new Map();
  for (const tag of Object.keys(cssByTag).sort(compareText)) {
    const scripts = await Promise.all(
      (await scriptsBelow(join(componentsRoot, tag))).map((path) => readFile(path, 'utf8')),
    );
    const text = [cssByTag[tag], ...scripts].join('\n');
    const renders = new Set(scripts.flatMap(renderedTags));
    renders.delete(tag);
    usage.set(tag, {
      tokens: new Set([...text.matchAll(READ_TOKEN)].map((match) => match[1])),
      renders: new Set([...renders].filter((rendered) => Object.hasOwn(cssByTag, rendered))),
    });
  }
  return usage;
}
