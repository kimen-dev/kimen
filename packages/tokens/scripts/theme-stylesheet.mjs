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
//     rule above, so repeating it would only repeat bytes.
//
//   @media (<preference>) { <token roots> { ...mode... } }
//   <token roots carrying, or inside one carrying, the declaration> { ...mode... }
//     A MODE (specs 043/044) reassigns part of the token set on top of
//     whatever theme is active: reduced transparency, more contrast. It is
//     emitted twice with the same declarations — once for the person's
//     preference, once for the page's own declaration — and only on token
//     roots (`:root` and `[data-ki-theme]`), because those are the elements
//     that redeclare every alias: a mode set anywhere else would change a
//     token and leave every alias of it holding the old value.
//
//     Precedence never depends on stylesheet order: a default-theme mode rule
//     has the specificity of the default rule (`:where()` around the
//     declaration) and follows it in the same sheet, so a theme override
//     still outranks it; the theme then re-asserts, after its own rule and in
//     its own sheet, exactly the mode values its overrides displaced. A mode
//     only ever switches ON: there is no declaration that removes it against
//     the person's preference.
import { createPropertyFormatter } from 'style-dictionary/utils';

const THEME_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// The only colour shapes the Kimen value transforms emit (#rrggbb for opaque
// colours, rgba() for translucent ones) plus the CSS-wide transparent keyword.
const COLOUR_LITERAL = /^(?:#[0-9a-f]{3,8}|rgba?\([^()]*\)|transparent)$/iu;
const REFERENCE = /^var\((--[a-z0-9-]+)\)$/u;

/**
 * Read one composition out of a Style Dictionary platform dictionary: for each
 * custom property, the expression to emit (references kept as `var()`) and the
 * fully resolved value. Token descriptions are not emitted: the stylesheet is
 * the runtime artefact, and the token reference is generated separately from
 * the same sources.
 */
export function compositionDeclarations(dictionary) {
  const formatProperty = createPropertyFormatter({
    outputReferences: true,
    dictionary,
    format: 'css',
    usesDtcg: true,
    formatting: { commentStyle: 'none', indentation: '' },
  });
  const declarations = new Map();
  for (const token of dictionary.allTokens) {
    const name = `--${token.name}`;
    const line = formatProperty(token);
    const prefix = `${name}: `;
    if (!line.startsWith(prefix) || !line.endsWith(';') || line.includes('\n')) {
      throw new Error(`${name} did not format as a single CSS declaration: ${line}`);
    }
    if (declarations.has(name)) {
      throw new Error(`${name} is produced by more than one token`);
    }
    declarations.set(name, {
      expression: line.slice(prefix.length, -1),
      resolved: String(token.$value),
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

function rule(selectors, declarations) {
  return [
    `${selectors.join(',\n')} {`,
    ...declarations.map(([property, value]) => `  ${property}: ${value};`),
    '}',
    '',
  ].join('\n');
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

/**
 * What a mode has to declare on top of a cascade: the tokens whose target
 * expression differs from the one the layers below produce (each layer a
 * partial map, the first one complete; the last layer that declares a token
 * wins, as in the stylesheet).
 */
export function layeredOverrides({ target, layers }) {
  const [base] = layers;
  for (const name of base.keys()) {
    if (!target.has(name)) throw new Error(`the mode does not define ${name}`);
  }
  for (const name of target.keys()) {
    if (!base.has(name)) {
      throw new Error(`the mode defines ${name}, which the base layer does not`);
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
 * One mode for the default theme (no `theme`) or re-asserted by a theme: the
 * media-query block and the declaration block, with the same declarations.
 */
export function renderModeRules(mode, declarations, theme) {
  if (declarations.size === 0) return '';
  const activation = mode.activations.join(', ');
  const preference = theme
    ? [`:root[data-ki-theme='${theme}']`, `[data-ki-theme='${theme}']`]
    : [':root', ':where([data-ki-theme])'];
  const declared = theme
    ? [
        `:root[data-ki-theme='${theme}']:where(${activation})`,
        `[data-ki-theme='${theme}']:where(${activation})`,
        `[data-ki-theme='${theme}']:where(:is(:root, [data-ki-theme]):is(${activation}) *)`,
      ]
    : [
        `:root:where(${activation})`,
        `:where([data-ki-theme]:is(${activation}))`,
        `:where(:is(:root, [data-ki-theme]):is(${activation}) [data-ki-theme])`,
      ];
  return [
    `@media ${mode.media} {`,
    indented(rule(preference, [...declarations])).trimEnd(),
    '}',
    '',
    rule(declared, [...declarations]),
  ].join('\n');
}

function modeRules(modes, theme) {
  return modes.map(({ mode, declarations }) => renderModeRules(mode, declarations, theme));
}

/** The default theme: the colour-scheme contract, every token, then each mode. */
export function renderBaseStylesheet(declarations, modes = []) {
  if (declarations.size === 0) throw new Error('the base theme has no tokens to declare');
  return [
    rule([':where(:root)'], [['color-scheme', 'light dark']]),
    rule(["[data-ki-color-scheme='light']"], [['color-scheme', 'light']]),
    rule(["[data-ki-color-scheme='dark']"], [['color-scheme', 'dark']]),
    rule([':root', ':where([data-ki-theme])'], [...declarations]),
    ...modeRules(modes),
  ]
    .filter((block) => block !== '')
    .join('\n');
}

/**
 * An opt-in theme: its overrides, for a themed document and for a themed
 * subtree, then the mode values those overrides displaced.
 */
export function renderThemeStylesheet(theme, declarations, modes = []) {
  if (!THEME_NAME.test(theme)) throw new Error(`unsupported theme name ${JSON.stringify(theme)}`);
  if (declarations.size === 0) {
    throw new Error(`theme ${theme} does not differ from the base theme`);
  }
  return [
    rule([`:root[data-ki-theme='${theme}']`, `[data-ki-theme='${theme}']`], [...declarations]),
    ...modeRules(modes, theme),
  ]
    .filter((block) => block !== '')
    .join('\n');
}
