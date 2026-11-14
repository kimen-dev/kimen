/**
 * Kimen deterministic layer: Stylelint (constitution Art. VI, IV, X).
 * - declaration-strict-value: every visual value resolves from a token (CSS var).
 * - plugin-use-logical: physical direction properties fail (RTL by construction).
 */

/**
 * The CSS system colours (CSS Color 4, section 6.2), accepted wherever a token
 * is otherwise required.
 *
 * They are not hardcoded values and they are not an escape from Art. VI: a
 * system colour resolves to the palette the USER chose — in practice a Windows
 * Contrast theme — which is the one palette a component may not replace with
 * its own. Under `forced-colors: active` the browser repaints every author
 * background as Canvas and drops every gradient and shadow, so a state drawn
 * only with a fill (the dot of a checked radio, the filled part of a progress
 * bar) vanishes unless the stylesheet names the system colour that should
 * carry it. No design token can stand in: a token is a brand value, and the
 * forced palette discards brand values by definition.
 *
 * Their place is inside `@media (forced-colors: active)`. Stylelint cannot
 * scope an allowlist to an at-rule, so that part is convention: outside that
 * block a system colour would freeze a value no theme could restyle.
 *
 * Matched case-insensitively — CSS keywords are — so both the CamelCase the
 * specification writes and a lowercased form pass.
 */
const systemColors = [
  'AccentColor',
  'AccentColorText',
  'ActiveText',
  'ButtonBorder',
  'ButtonFace',
  'ButtonText',
  'Canvas',
  'CanvasText',
  'Field',
  'FieldText',
  'GrayText',
  'Highlight',
  'HighlightText',
  'LinkText',
  'Mark',
  'MarkText',
  'SelectedItem',
  'SelectedItemText',
  'VisitedText',
];

export default {
  ignoreFiles: ['**/dist/**', '**/node_modules/**', '**/storybook-static/**'],
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-declaration-strict-value', 'stylelint-use-logical'],
  rules: {
    // Art. VI: zero hardcoded visual values — tokens only
    'scale-unlimited/declaration-strict-value': [
      [
        '/color$/i',
        'fill',
        'stroke',
        'background',
        'background-color',
        'border-color',
        'outline-color',
        'box-shadow',
        'font-family',
        'font-size',
        'line-height',
        'border-radius',
        '/^margin/',
        '/^padding/',
        'gap',
        'row-gap',
        'column-gap',
      ],
      {
        ignoreValues: [
          'currentColor',
          'inherit',
          'initial',
          'unset',
          'transparent',
          'none',
          'auto',
          '0',
          '100%',
          '1',
          '/^var\\(--ki-/',
          `/^(?:${systemColors.join('|')})$/i`,
        ],
        disableFix: true,
      },
    ],
    // Art. IV: logical properties only
    'csstools/use-logical': 'always',
    // Custom properties in components must come from the token namespace
    'custom-property-pattern': '^(ki|_)[a-z0-9-]*$',
    // Shadow DOM friendliness
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['host', 'host-context'] }],
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['part', 'slotted'] }],
  },
};
