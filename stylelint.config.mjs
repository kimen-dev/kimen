/**
 * Kimen deterministic layer: Stylelint (constitution Art. VI, IV, X).
 * - declaration-strict-value: every visual value resolves from a token (CSS var).
 * - plugin-use-logical: physical direction properties fail (RTL by construction).
 */
export default {
  ignoreFiles: ['**/dist/**', '**/node_modules/**'],
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
