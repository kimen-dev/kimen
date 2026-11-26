// Spec 166: which tokens go in the core sheet and which in each tag's sheet.
// Pure functions over name -> expression maps; ../build.mjs supplies the
// Style Dictionary sources and the component usage, and writes the files.
//
// A token belongs to a COMPONENT SOURCE when its base definition lives in
// `tokens/component/<name>.tokens.json` (the file name, not the token name:
// `code-block` declares `--ki-code-*`). Every other token belongs to the core,
// except the `--ki-foundation-*` tokens, which no split sheet carries (spec 166
// D1): no onmars token reads them, and material3 inlines the ones it reads.
//
// A tag's sheet is self-contained (D2): every component source whose tokens
// the tag reads, those its tokens alias (`fab-menu` reads `fab`) in any theme,
// scheme or mode, and the sources of every tag it renders, transitively. So a
// page imports one sheet per tag it uses, and a component's internal
// composition never leaks into the page's imports.

const COMPONENT_SOURCE =
  /(?:^|\/)tokens\/component\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.material3)?\.tokens\.json$/u;
const REFERENCE = /var\((--_?ki-[a-z0-9-]+)\)/gu;

/** The component source a token file path belongs to, or null for the core. */
export function componentSourceOf(filePath) {
  return COMPONENT_SOURCE.exec(String(filePath).replaceAll('\\', '/'))?.[1] ?? null;
}

/** A foundation token: carried by the full sheet only (spec 166 D1). */
export function isFoundation(name) {
  return name.startsWith('--ki-foundation-');
}

/**
 * The foundations the full sheet still declares: the onmars v1 glass images
 * a page selects to keep the legacy dialog and tooltip colours (spec 062 S4,
 * docs/migrations/deprecated-tokens.md), until their stops are removed at
 * 1.0.0. Every other foundation is private: no sheet declares it, and a theme
 * that reads one carries its expression instead (approved by the founder on
 * 2026-11-26 with the weight report's step 2).
 */
export const PUBLISHED_FOUNDATIONS = Object.freeze([
  '--ki-foundation-onmars-v1-dialog-bg-image',
  '--ki-foundation-onmars-v1-tooltip-arrow-end',
  '--ki-foundation-onmars-v1-tooltip-arrow-start',
  '--ki-foundation-onmars-v1-tooltip-bg-image',
]);

/** A foundation no sheet declares: every one but the published ones. */
export function isPrivateFoundationToken(name) {
  return isFoundation(name) && !PUBLISHED_FOUNDATIONS.includes(name);
}

/**
 * `declarations` with every `var()` of a name `expand` accepts replaced by
 * that name's expression in `source`, followed through the names it reads in
 * turn. A theme that must not read a token keeps its value this way, literal
 * or not. A cycle, or a name `source` lacks, fails.
 */
export function expandReferences(declarations, source, expand) {
  const expanded = new Map();
  const expansionOf = (name, path) => {
    if (expanded.has(name)) return expanded.get(name);
    if (path.includes(name)) throw new Error(`${[...path, name].join(' -> ')} is a cycle`);
    if (!source.has(name)) throw new Error(`${path.at(-1)} reads ${name}, which is not declared`);
    const expression = substitute(source.get(name), [...path, name]);
    expanded.set(name, expression);
    return expression;
  };
  const substitute = (expression, path) =>
    expression.replaceAll(/var\((--ki-[a-z0-9-]+)\)/gu, (part, name) =>
      expand(name) ? expansionOf(name, path) : part,
    );
  return new Map(
    [...declarations].map(([name, expression]) => [name, substitute(expression, [name])]),
  );
}

const referencesOf = (expression) => [...expression.matchAll(REFERENCE)].map((match) => match[1]);

/**
 * The component sources each tag's sheet carries, sorted.
 *
 * - `usage`: tag -> { tokens, renders }, where a token ending in `-` is a
 *   prefix (a name a template literal completes at runtime).
 * - `sourceOf`: token name -> component source, for component tokens only.
 * - `expressions`: every composition the sheets serve (each theme and scheme,
 *   with its mode values), as name -> expression maps, so an alias that only
 *   one theme introduces still pulls its source in.
 */
export function tagSources({ usage, sourceOf, expressions }) {
  const names = [...sourceOf.keys()];
  const sourcesOfNames = (tokens) => {
    const found = new Set();
    for (const token of tokens) {
      const matches = token.endsWith('-')
        ? names.filter((name) => name.startsWith(token))
        : [token];
      for (const name of matches) {
        const source = sourceOf.get(name);
        if (source !== undefined) found.add(source);
      }
    }
    return found;
  };

  // Component source -> the other component sources its tokens alias.
  const aliases = new Map();
  for (const composition of expressions) {
    for (const [name, expression] of composition) {
      const source = sourceOf.get(name);
      if (source === undefined) continue;
      const targets = aliases.get(source) ?? new Set();
      for (const target of sourcesOfNames(referencesOf(expression))) {
        if (target !== source) targets.add(target);
      }
      aliases.set(source, targets);
    }
  }
  const withAliases = (sources) => {
    const result = new Set();
    const queue = [...sources];
    while (queue.length > 0) {
      const source = queue.pop();
      if (result.has(source)) continue;
      result.add(source);
      queue.push(...(aliases.get(source) ?? []));
    }
    return result;
  };

  // Every tag a tag renders, itself included, followed through the render
  // graph breadth-first, so a cycle (a tree item rendering tree items) ends.
  const reached = (tag) => {
    const seen = new Set([tag]);
    const queue = [tag];
    while (queue.length > 0) {
      const current = queue.shift();
      const entry = usage.get(current);
      if (entry === undefined) throw new Error(`a component renders ${current}, which is not one`);
      for (const rendered of entry.renders) {
        if (!seen.has(rendered)) {
          seen.add(rendered);
          queue.push(rendered);
        }
      }
    }
    return seen;
  };
  return new Map(
    [...usage.keys()].sort().map((tag) => {
      const sources = new Set();
      for (const current of reached(tag)) {
        for (const source of sourcesOfNames(usage.get(current).tokens)) sources.add(source);
      }
      return [tag, [...withAliases(sources)].sort()];
    }),
  );
}

/** The declarations of `declarations` whose names `keep` accepts, in order. */
export function pick(declarations, keep) {
  return new Map([...declarations].filter(([name]) => keep(name)));
}

/** The modes, each limited to the tokens `keep` accepts. */
export function pickModes(modes, keep) {
  return modes.map(({ mode, declarations }) => ({ mode, declarations: pick(declarations, keep) }));
}

/** Every custom property a rendered sheet reads that `declared` lacks. */
export function unresolvedReferences(css, declared) {
  return [...new Set([...css.matchAll(REFERENCE)].map((match) => match[1]))].filter(
    (name) => !declared.has(name),
  );
}

/** Every custom property a rendered sheet declares. */
export function declaredNames(css) {
  return new Set([...css.matchAll(/^\s*(--_?ki-[a-z0-9-]+):/gmu)].map((match) => match[1]));
}
