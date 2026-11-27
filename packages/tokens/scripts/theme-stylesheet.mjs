// How @kimen/tokens turns its four token compositions (theme x scheme) into the
// two theme stylesheets it publishes. Pure functions over name -> expression
// maps; ../build.mjs supplies the Style Dictionary dictionaries and writes the
// files.
//
// The published shape, and why each part is the way it is:
//
//   :where(:root) { color-scheme: light dark }
//   [data-ki-color-scheme='light'|'dark'] { color-scheme: ... }
//     The scheme is ONE declaration. Scheme-dependent tokens are `light-dark()`
//     values, so the declaration that picks their branch is the same one that
//     tells the user agent which canvas, scrollbars and native controls to
//     paint: the two can no longer disagree. On any element, so a subtree can
//     force a scheme; it needs to redeclare nothing, because `light-dark()`
//     resolves where a token is USED, not where it was declared.
//
//     The document default is a DEFAULT: `:where()` gives it zero specificity,
//     so the `color-scheme` a host page declares for its own document —
//     `html { color-scheme: light }` — wins in either stylesheet order, and
//     the tokens follow it. A bare `:root` (0,1,0) outranked that `html`
//     (0,0,1) even when the page declared it last. The two attribute rules
//     keep their specificity on purpose: they are explicit Kimen declarations.
//
//   :root, :where([data-ki-theme]) { ...every token, once... }
//     A custom property that aliases another (`--a: var(--b)`) substitutes the
//     alias on the element that DECLARES it, and descendants inherit the
//     result. A subtree that reassigned `--b` alone would keep the page's
//     `--a`. So a themed subtree redeclares every token on its own root, which
//     recomputes every alias with that subtree's values. `:where()` keeps the
//     subtree selector at zero specificity: any theme override wins over it
//     regardless of stylesheet order, and an unknown theme name — or the
//     default theme's own — lands back on these base values.
//
//   :root[data-ki-theme='x'], [data-ki-theme='x'] { ...overrides only... }
//     A theme emits only the tokens whose expression differs from the base
//     theme. Everything else is already declared on the same element by the
//     rule above, so repeating it would only repeat bytes. That includes its
//     mode values: they are tokens like any other (below).
//
//   @media (<preference>) { <token roots> { --ki-x: var(--ki-<mode>-x) !important } }
//   <token roots carrying, or inside one carrying, the declaration> { ...same... }
//     A MODE (specs 043/044) reassigns part of the token set on top of
//     whatever theme is active: reduced transparency, more contrast. The
//     value a token takes under a mode is a token of its own, declared with
//     every other one (`--ki-contrast-more-outline-control`), so a theme sets
//     it like any other token. The mode only re-points each token it
//     reassigns to that value. It is emitted twice with the same declarations
//     — once for the person's preference, once for the page's own declaration
//     — and only on token roots (`:root` and `[data-ki-theme]`), because
//     those are the elements that redeclare every alias: a mode set anywhere
//     else would change a token and leave every alias of it holding the old
//     value.
//
//     The mode wins over any theme without the theme doing anything: its
//     declarations are `!important`, which outranks every normal declaration
//     on the same element whatever its specificity or stylesheet order. Only
//     the re-pointing is important, never a value, so a theme that wants other
//     mode values sets the mode tokens and never needs `!important` itself.
//     A mode only ever switches ON: there is no declaration that removes it
//     against the person's preference.
//
//   --ki-x: value; /* deprecated since 0.1.0, removed in 1.0.0: use --ki-y */
//     The only comment the stylesheets carry (spec 041): a deprecated token
//     keeps its value until it is removed, and says so where a consumer reads
//     it. Comments are outside the published value contract, and minifiers
//     drop them.
import { createPropertyFormatter, outputReferencesTransformed } from 'style-dictionary/utils';

import { deprecationComment } from './deprecation.mjs';

const THEME_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// The only colour shapes the Kimen value transforms emit (#rrggbb for opaque
// colours, rgba() for translucent ones) plus the CSS-wide transparent keyword.
const COLOUR_LITERAL = /^(?:#[0-9a-f]{3,8}|rgba?\([^()]*\)|transparent)$/iu;
const REFERENCE = /^var\((--[a-z0-9-]+)\)$/u;

/**
 * A private foundation literal is inlined where it is referenced and never
 * declared: `ki.foundation.onmars-v2.*`, `ki.foundation.keyword.*` and
 * `ki.foundation.material3.text-ink.*`.
 */
export function isPrivateFoundation([group, subgroup]) {
  return (
    group === 'onmars-v2' ||
    group === 'keyword' ||
    (group === 'material3' && subgroup === 'text-ink')
  );
}

/**
 * Read one composition out of a Style Dictionary platform dictionary: for each
 * custom property, the expression to emit (references kept as `var()`) and the
 * fully resolved value. Token descriptions are not emitted: the stylesheet is
 * the runtime artefact, and the token reference is generated separately from
 * the same sources.
 */
export function compositionDeclarations(dictionary) {
  // Calma's private literals keep the DTCG layers closed. Emit their values
  // at the referring token instead of publishing a second set of CSS names.
  // Material 3's text inks are private the same way: only its own semantic
  // overrides read them, so the default stylesheet never carries them.
  const inline = new Set(
    dictionary.allTokens
      .filter(({ path }) => path[1] === 'foundation' && isPrivateFoundation(path.slice(2)))
      .map(({ name }) => `--${name}`),
  );
  const formatProperty = createPropertyFormatter({
    // A typed shadow can normalize an alias to an untyped `none`. Emitting
    // that var() would undo the transform. Keep the usual aliases elsewhere.
    outputReferences: (token, options) =>
      token.$type !== 'shadow' ||
      typeof token.original.$value !== 'string' ||
      outputReferencesTransformed(token, options),
    dictionary,
    format: 'css',
    usesDtcg: true,
    formatting: { commentStyle: 'none', indentation: '' },
  });
  const declarations = new Map();
  for (const token of dictionary.allTokens) {
    const name = `--${token.name}`;
    if (inline.has(name)) continue;
    const line = formatProperty(token);
    const prefix = `${name}: `;
    if (!line.startsWith(prefix) || !line.endsWith(';') || line.includes('\n')) {
      throw new Error(`${name} did not format as a single CSS declaration: ${line}`);
    }
    if (declarations.has(name)) {
      throw new Error(`${name} is produced by more than one token`);
    }
    const expression = line.slice(prefix.length, -1);
    // A translucent ramp variant is a colour mix of its step (spec 001 S15).
    // The Style Dictionary config resolves the one shape it can compute
    // exactly; any other mix would publish a value no gate can measure.
    if (expression.startsWith('color-mix(') && !String(token.$value).startsWith('rgba(')) {
      throw new Error(
        `${name} is a colour mix the build cannot resolve exactly: ${expression}. ` +
          'Write color-mix(in srgb, {opaque.ramp.step} N%, transparent) with a whole percentage.',
      );
    }
    const reference = REFERENCE.exec(expression);
    declarations.set(name, {
      expression:
        reference !== null && inline.has(reference[1]) ? String(token.$value) : expression,
      resolved: String(token.$value),
      inherited: token.$extensions?.['dev.kimen']?.inherit === 'document',
    });
  }
  return declarations;
}

/**
 * Split an expression into its top-level components and the separators between
 * them (whitespace and commas), leaving function calls such as `rgba(0, 0, 0,
 * 0.5)` and `var(--x)` whole.
 */
function components(expression) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of expression) {
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if (depth === 0 && (character === ' ' || character === ',')) {
      if (current !== '') parts.push(current);
      parts.push(character);
      current = '';
    } else {
      current += character;
    }
  }
  if (current !== '') parts.push(current);
  return parts;
}

function isColour(component, composition) {
  if (COLOUR_LITERAL.test(component)) return true;
  const reference = REFERENCE.exec(component);
  if (reference === null) return false;
  const target = composition.get(reference[1]);
  return target !== undefined && COLOUR_LITERAL.test(target.resolved);
}

function schemeExpression(name, light, dark) {
  const lightToken = light.get(name);
  const darkToken = dark.get(name);
  if (lightToken.expression === darkToken.expression) return lightToken.expression;

  const lightParts = components(lightToken.expression);
  const darkParts = components(darkToken.expression);
  if (lightParts.length !== darkParts.length) {
    throw new Error(
      `${name} has a different shape in the light and dark schemes ` +
        `(${lightToken.expression} / ${darkToken.expression}); ` +
        'only its colours may depend on the colour scheme',
    );
  }
  return lightParts
    .map((lightPart, index) => {
      const darkPart = darkParts[index];
      if (lightPart === darkPart) return lightPart;
      // `light-dark()` is a <color>: it is the only scheme switch a custom
      // property can carry without a second declaration, and it cannot wrap a
      // length, a duration or a keyword. A token that needs one of those to
      // change with the scheme needs a mechanism this stylesheet does not have.
      if (!isColour(lightPart, light) || !isColour(darkPart, dark)) {
        throw new Error(
          `${name} depends on the colour scheme through ${lightPart} / ${darkPart}, ` +
            'which is not a colour; only colours may depend on the colour scheme',
        );
      }
      return `light-dark(${lightPart}, ${darkPart})`;
    })
    .join('');
}

/**
 * Merge the light and dark compositions of one theme into a single expression
 * per token. A token whose expression is the same in both schemes is emitted
 * unchanged; one that differs wraps each differing colour in `light-dark()`.
 */
export function combineSchemes({ light, dark }) {
  for (const name of light.keys()) {
    if (!dark.has(name)) {
      throw new Error(`${name} is defined in the light scheme but not in the dark scheme`);
    }
  }
  for (const name of dark.keys()) {
    if (!light.has(name)) {
      throw new Error(`${name} is defined in the dark scheme but not in the light scheme`);
    }
  }
  return new Map([...light.keys()].map((name) => [name, schemeExpression(name, light, dark)]));
}

/**
 * The tokens a theme has to declare: those whose expression differs from the
 * base theme. Both must expose exactly the same token names — a theme
 * reassigns the contract, it never widens or narrows it.
 */
export function themeOverrides({ base, theme }) {
  for (const name of base.keys()) {
    if (!theme.has(name)) throw new Error(`the theme does not define ${name}`);
  }
  for (const name of theme.keys()) {
    if (!base.has(name)) {
      throw new Error(`the theme defines ${name}, which the base theme does not`);
    }
  }
  return new Map([...theme].filter(([name, expression]) => base.get(name) !== expression));
}

function rule(selectors, declarations, deprecations = new Map(), { important = false } = {}) {
  const priority = important ? ' !important' : '';
  const line = ([property, value]) => {
    const deprecation = deprecations.get(property);
    const note = deprecation === undefined ? '' : ` /* ${deprecationComment(deprecation)} */`;
    return `  ${property}: ${value}${priority};${note}`;
  };
  return [`${selectors.join(',\n')} {`, ...declarations.map(line), '}', ''].join('\n');
}

/**
 * The modes, in cascade order. Each one is activated by a user-preference
 * media query or by one of its declarations; more contrast also activates
 * reduced transparency, because a contrast ratio over glass depends on
 * whatever is behind the glass and cannot be guaranteed.
 */
export const MODES = Object.freeze([
  Object.freeze({
    name: 'reduced-transparency',
    media: '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
    activations: Object.freeze(["[data-ki-transparency='reduce']", "[data-ki-contrast='more']"]),
  }),
  Object.freeze({
    name: 'contrast-more',
    media: '(prefers-contrast: more)',
    activations: Object.freeze(["[data-ki-contrast='more']"]),
  }),
]);

/** The token that holds `name`'s value under `mode`: `--ki-<mode>-<name>`. */
export function modeValueName(mode, name) {
  return `--ki-${mode.name}-${name.slice('--ki-'.length)}`;
}

const referencesOf = (expression) =>
  [...expression.matchAll(/var\((--[a-z0-9-]+)\)/gu)].map((match) => match[1]);

/**
 * What each mode reassigns, in `MODES` order: every token that has a value
 * for the mode (`modeValueName`) among `declarations`, re-pointed to it, in
 * declaration order. A mode value of a token that does not exist, of another
 * mode value or of a deprecated token (whose replacement carries the mode
 * instead) fails, and so does a mode value that leads back to its own token:
 * under the mode that would be a cycle, and the token would lose its value.
 */
export function modeReassignments(declarations, deprecations = new Map()) {
  const prefixes = MODES.map((mode) => [mode, `--ki-${mode.name}-`]);
  const isModeValue = (name) => prefixes.some(([, prefix]) => name.startsWith(prefix));
  const valued = new Map(MODES.map((mode) => [mode, new Set()]));
  for (const name of declarations.keys()) {
    const [mode, prefix] = prefixes.find(([, candidate]) => name.startsWith(candidate)) ?? [];
    if (mode === undefined) continue;
    const token = `--ki-${name.slice(prefix.length)}`;
    if (!declarations.has(token) || isModeValue(token)) {
      throw new Error(`${name} is the ${mode.name} value of ${token}, which is not a token`);
    }
    if (deprecations.has(token)) {
      throw new Error(`${name} is the ${mode.name} value of ${token}, which is deprecated`);
    }
    valued.get(mode).add(token);
  }
  const modes = MODES.map((mode) => ({
    mode,
    declarations: new Map(
      [...declarations.keys()]
        .filter((name) => valued.get(mode).has(name))
        .map((name) => [name, `var(${modeValueName(mode, name)})`]),
    ),
  }));
  for (const { mode } of modes) {
    // A mode's own declaration activates every mode that lists it.
    const active = modes.filter(({ mode: candidate }) =>
      candidate.activations.includes(mode.activations[0]),
    );
    const effective = new Map(declarations);
    for (const { declarations: reassigned } of active) {
      for (const [name, expression] of reassigned) effective.set(name, expression);
    }
    const done = new Set();
    const visit = (name, trail) => {
      if (done.has(name)) return;
      if (trail.includes(name)) {
        throw new Error(`under ${mode.name} ${[...trail, name].join(' -> ')} is a cycle`);
      }
      for (const reference of referencesOf(effective.get(name) ?? '')) {
        visit(reference, [...trail, name]);
      }
      done.add(name);
    };
    for (const { declarations: reassigned } of active) {
      for (const name of reassigned.keys()) visit(name, []);
    }
  }
  return modes;
}

/**
 * What a layer has to declare on top of a cascade: the tokens whose target
 * expression differs from the one the layers below produce (each layer a
 * partial map, the first one complete; the last layer that declares a token
 * wins, as in the stylesheet).
 */
export function layeredOverrides({ target, layers }) {
  const [base] = layers;
  for (const name of base.keys()) {
    if (!target.has(name)) throw new Error(`the target does not define ${name}`);
  }
  for (const name of target.keys()) {
    if (!base.has(name)) {
      throw new Error(`the target defines ${name}, which the base layer does not`);
    }
  }
  const effective = new Map(layers.flatMap((layer) => [...layer]));
  return new Map([...target].filter(([name, expression]) => effective.get(name) !== expression));
}

function indented(css) {
  return css
    .split('\n')
    .map((line) => (line === '' ? line : `  ${line}`))
    .join('\n');
}

/**
 * One mode: the media-query block and the declaration block, with the same
 * important declarations, on the root and on every theme root.
 */
export function renderModeRules(mode, declarations, deprecations) {
  if (declarations.size === 0) return '';
  const activation = mode.activations.join(', ');
  const preference = [':root', ':where([data-ki-theme])'];
  const declared = [
    `:root:where(${activation})`,
    `:where([data-ki-theme]:is(${activation}))`,
    `:where(:is(:root, [data-ki-theme]):is(${activation}) [data-ki-theme])`,
  ];
  const important = { important: true };
  return [
    `@media ${mode.media} {`,
    indented(rule(preference, [...declarations], deprecations, important)).trimEnd(),
    '}',
    '',
    rule(declared, [...declarations], deprecations, important),
  ].join('\n');
}

function modeRules(modes, deprecations) {
  return modes.map(({ mode, declarations }) => renderModeRules(mode, declarations, deprecations));
}

/** The density levels the stylesheet publishes, besides `default` (spec 045). */
export const DENSITIES = Object.freeze(['compact', 'touch']);

/**
 * The density rules, in declaration order: each level, then `default`. Every
 * rule declares every density token some level reassigns — a level that keeps
 * one at its default value says so — so the nearest declaration wins whatever
 * level it is nested in (spec 045 A1-D5): a touch region inside a compact one
 * is touch through and through, and `default` restores all of them. `levels`
 * holds what each level changes; `base` the default value of every token.
 */
export function densityRules(levels, base) {
  const names = [...new Set(levels.flatMap(({ declarations }) => [...declarations.keys()]))];
  const complete = (declarations) =>
    new Map(names.map((name) => [name, declarations.get(name) ?? base.get(name)]));
  return [
    ...levels.map(({ level, declarations }) => ({ level, declarations: complete(declarations) })),
    { level: 'default', declarations: complete(new Map()) },
  ];
}

/**
 * A document-inherited token (`$extensions['dev.kimen'].inherit: 'document'`)
 * is declared on `:root` alone and read where a component uses it, so a
 * declaration on any element reaches every component inside it and a theme
 * root nested in it does not reset it. That holds only while no other token
 * aliases it — an alias would freeze its value where the alias is declared —
 * and while no theme or mode reassigns it or a token it references: those
 * references resolve once, on `:root`.
 */
export function assertInheritedTokens({ declarations, inherited, overrides, label = 'a theme' }) {
  const pinned = new Set(inherited);
  for (const name of inherited) {
    const expression = declarations.get(name);
    if (expression === undefined) throw new Error(`${name} is not declared`);
    for (const reference of referencesOf(expression)) pinned.add(reference);
  }
  for (const [name, expression] of declarations) {
    for (const reference of referencesOf(expression)) {
      if (inherited.has(reference)) {
        throw new Error(`${name} aliases ${reference}, which is inherited from the document`);
      }
    }
  }
  for (const name of overrides?.keys() ?? []) {
    if (pinned.has(name)) {
      throw new Error(
        `${label} reassigns ${name}, which ${inherited.has(name) ? 'is' : 'a token'} inherited from the document ${inherited.has(name) ? '' : 'references'}`.trim(),
      );
    }
  }
}

/**
 * The default theme: the colour-scheme contract, every token, the
 * document-inherited tokens and each density level, then each mode.
 * `deprecations` (custom property name -> deprecation) annotates the
 * deprecated declarations.
 */
export function renderBaseStylesheet(
  declarations,
  { deprecations, modes = [], inherited = new Set(), densities = [] } = {},
) {
  if (declarations.size === 0) throw new Error('the base theme has no tokens to declare');
  const contextual = [...declarations].filter(([name]) => !inherited.has(name));
  const documentWide = [...declarations].filter(([name]) => inherited.has(name));
  return [
    rule([':where(:root)'], [['color-scheme', 'light dark']]),
    rule(["[data-ki-color-scheme='light']"], [['color-scheme', 'light']]),
    rule(["[data-ki-color-scheme='dark']"], [['color-scheme', 'dark']]),
    rule([':root', ':where([data-ki-theme])'], contextual, deprecations),
    documentWide.length === 0 ? '' : rule([':root'], documentWide, deprecations),
    ...densities.map(({ level, declarations: levelDeclarations }) =>
      rule([`[data-ki-density='${level}']`], [...levelDeclarations], deprecations),
    ),
    ...modeRules(modes, deprecations),
  ]
    .filter((block) => block !== '')
    .join('\n');
}

/**
 * The token roots of a per-tag sheet (spec 166 D4): the same elements as the
 * default stylesheet's token rule, at zero specificity. A bundler that splits
 * CSS per route inserts a tag sheet after the page's own stylesheet; at zero
 * specificity the page's `:root` or theme-root override still wins.
 */
const COMPONENT_TOKEN_ROOTS = Object.freeze([':where(:root)', ':where([data-ki-theme])']);

/**
 * One tag's component tokens (spec 166): every token of the component sources
 * the tag needs, on the zero-specificity token roots, then each mode's
 * re-pointing of those tokens exactly as the default stylesheet writes it. A
 * tag that needs no component token gets an empty sheet, so every tag has one.
 */
export function renderComponentStylesheet(declarations, { deprecations, modes = [] } = {}) {
  if (declarations.size === 0) return '';
  // In small tag sheets, keeping the palettes together improves compression.
  const modeValues = new Set(
    modes.flatMap(({ mode, declarations: overrides }) =>
      [...overrides.keys()].map((name) => modeValueName(mode, name)),
    ),
  );
  const entries = [...declarations];
  const ordered = [
    ...entries.filter(([name]) => !modeValues.has(name)),
    ...entries.filter(([name]) => modeValues.has(name)),
  ];
  return [rule(COMPONENT_TOKEN_ROOTS, ordered, deprecations), ...modeRules(modes, deprecations)]
    .filter((block) => block !== '')
    .join('\n');
}

/**
 * An opt-in theme: its overrides, its mode values among them, for a themed
 * document and for a themed subtree. The default stylesheet's modes re-point
 * the theme's tokens to them.
 */
export function renderThemeStylesheet(theme, declarations, { deprecations } = {}) {
  if (!THEME_NAME.test(theme)) throw new Error(`unsupported theme name ${JSON.stringify(theme)}`);
  if (declarations.size === 0) {
    throw new Error(`theme ${theme} does not differ from the base theme`);
  }
  return rule(
    [`:root[data-ki-theme='${theme}']`, `[data-ki-theme='${theme}']`],
    [...declarations],
    deprecations,
  );
}

// CSS custom property values retain whitespace during minification. Compact
// the generated values and substitute fixed private foundations while keeping
// their declarations and every reference to a public token.
//
// `transitive` also substitutes an inlined token whose value becomes a literal
// once the inlined tokens it reads are substituted (an elevation level built
// from two shadow colours). Material 3 uses it so it reads no foundation from
// the default sheet (spec 166 D1); the default sheet keeps the single pass.
export function compactTokenStylesheet(
  css,
  { declarations, modes, inline, foundationsLast, transitive = false },
) {
  const reassigned = new Set(modes.flatMap(({ declarations }) => [...declarations.keys()]));
  const inlinable = ([name]) => inline(name) && !reassigned.has(name);
  const isLiteral = (value) => !/\b(?:var|light-dark)\(/u.test(value);
  const literals = new Map(
    [...declarations].filter((entry) => inlinable(entry) && isLiteral(entry[1])),
  );
  for (let grew = transitive; grew; ) {
    grew = false;
    for (const [name, value] of declarations) {
      if (literals.has(name) || !inlinable([name])) continue;
      const substituted = value.replaceAll(
        /var\((--ki-[\w-]+)\)/gu,
        (part, reference) => literals.get(reference) ?? part,
      );
      if (isLiteral(substituted)) {
        literals.set(name, substituted);
        grew = true;
      }
    }
  }
  const compactValue = (value) =>
    value.replaceAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|, +/gu, (part) =>
      part.startsWith(',') ? ',' : part,
    );
  const compacted = css.replaceAll(
    /^( +)(--ki-[\w-]+): ([^\r\n;]+);/gmu,
    (_, indent, name, value) => {
      const inlined = value.replaceAll(
        /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|var\((--ki-[\w-]+)\)/gu,
        (part, reference) => literals.get(reference) ?? part,
      );
      return `${indent}${name}:${compactValue(inlined)};`;
    },
  );
  if (!foundationsLast) return compacted;

  // Keeping the opt-in theme's restored private values together compresses
  // better. Declaration order within each rule does not affect the cascade.
  return compacted.replaceAll(/(?:^ +--ki-[^\r\n]+\n)+/gmu, (block) => {
    const lines = block.trimEnd().split('\n');
    const isFoundation = (line) => line.trimStart().startsWith('--ki-foundation-');
    return `${[...lines.filter((line) => !isFoundation(line)), ...lines.filter(isFoundation)].join('\n')}\n`;
  });
}
