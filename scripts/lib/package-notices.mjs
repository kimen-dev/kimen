// The NOTICE each published package carries, derived from the repository one.
//
// The repository NOTICE answers for everything in the tree: agent skills,
// test fonts, tooling. A published tarball contains a small part of that, and
// Apache-2.0 §4(d) asks a redistribution to carry the notices that pertain to
// it and none that do not. So the repository file stays the single place a
// notice is written, and each package gets its header plus the sections named
// here. The committed package files are checked against this derivation.
const RULE = '='.repeat(80);
const SECTION_START = new RegExp(`^${RULE}\\nThird-party notices: (.+)\\n${RULE}\\n`, 'gmu');

// What each tarball contains decides its list:
// - @kimen/elements ships the QR encoder adapted from Project Nayuki inside
//   ki-qr, and the Stencil client runtime inside its lazy-loading bundles
//   (dist/esm, dist/cjs, dist/kimen). Both are MIT, which requires the
//   copyright and permission notice in every copy.
// - @kimen/elements also ships Lucide ISC and Feather MIT icon modules.
// - @kimen/tokens ships Kimen's stylesheets and the optional onmars fonts.
// - The MCP Apps adapter and server embed the element runtime, QR encoder
//   and the stock Lucide icon in the packaged MCP Apps document.
const ELEMENT_BUNDLE_NOTICES = Object.freeze([
  'QR Code generator library (MIT)',
  'Stencil client runtime (MIT)',
  'Lucide 1.63.0 and Feather icons (ISC and MIT)',
]);

export const PACKAGE_NOTICE_SECTIONS = Object.freeze({
  '@kimen/elements': ELEMENT_BUNDLE_NOTICES,
  '@kimen/tokens': Object.freeze(['onmars theme fonts (SIL OFL 1.1)']),
  '@kimen/adapter-mcp-apps': ELEMENT_BUNDLE_NOTICES,
  '@kimen/mcp-server': ELEMENT_BUNDLE_NOTICES,
});

const withSingleTrailingNewline = (text) => `${text.trimEnd()}\n`;

export function noticeSections(text) {
  const starts = [...text.matchAll(SECTION_START)];
  const header = withSingleTrailingNewline(
    starts.length === 0 ? text : text.slice(0, starts[0].index),
  );
  const sections = new Map();
  for (const [index, match] of starts.entries()) {
    const title = match[1];
    if (sections.has(title)) {
      throw new Error(`NOTICE declares the section "${title}" twice`);
    }
    const end = index + 1 < starts.length ? starts[index + 1].index : text.length;
    sections.set(title, withSingleTrailingNewline(text.slice(match.index, end)));
  }
  return { header, sections };
}

export function derivePackageNotice(repositoryNotice, sectionTitles) {
  const { header, sections } = noticeSections(repositoryNotice);
  const parts = [header];
  for (const title of sectionTitles) {
    const section = sections.get(title);
    if (section === undefined) {
      throw new Error(`NOTICE has no "Third-party notices: ${title}" section to derive from`);
    }
    parts.push(section);
  }
  return parts.join('\n');
}
