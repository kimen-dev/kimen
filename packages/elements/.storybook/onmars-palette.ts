// The onmars "Calma" colors the Storybook manager theme (manager.ts) paints
// its chrome with. Storybook themes take literal colors (it derives hover and
// border shades from them) and @kimen/tokens publishes CSS only, so each
// entry is a resolved token value next to the token it comes from.
// browser-tests/storybook-theme.browser.spec.ts resolves every token in a
// real browser and fails when a value here no longer matches it.
export const onmarsPalette = {
  light: {
    paper: { value: '#f9f7f4', token: '--ki-surface-special-dark-s0-light-s1' },
    sheet: { value: '#ffffff', token: '--ki-surface-special-light-s0-dark-s1' },
    textHigh: { value: '#181613', token: '--ki-text-high-em' },
    textMed: { value: '#5e5953', token: '--ki-text-med-em' },
    hairline: { value: 'rgba(24, 22, 19, 0.1)', token: '--ki-outline-low-em' },
    control: { value: '#86827b', token: '--ki-outline-control' },
    ink: { value: '#0f0d0a', token: '--ki-surface-primary-high-em' },
    onInk: { value: '#ffffff', token: '--ki-text-primary-on-primary' },
    mark: { value: '#ad411c', token: '--ki-text-primary-high-em' },
  },
  dark: {
    paper: { value: '#1b1916', token: '--ki-surface-special-dark-s0-light-s1' },
    sheet: { value: '#22201d', token: '--ki-surface-special-light-s0-dark-s1' },
    textHigh: { value: '#edebe7', token: '--ki-text-high-em' },
    textMed: { value: '#bfbcb6', token: '--ki-text-med-em' },
    hairline: { value: 'rgba(255, 250, 240, 0.1)', token: '--ki-outline-low-em' },
    control: { value: '#7f7c77', token: '--ki-outline-control' },
    ink: { value: '#ffffff', token: '--ki-surface-primary-high-em' },
    onInk: { value: '#1b1916', token: '--ki-text-primary-on-primary' },
    mark: { value: '#dd9781', token: '--ki-text-primary-high-em' },
  },
} as const;

export type OnmarsScheme = keyof typeof onmarsPalette;
