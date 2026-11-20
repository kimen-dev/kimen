import { addons } from 'storybook/manager-api';
import { create, type ThemeVars } from 'storybook/theming';
import { type OnmarsScheme, onmarsPalette } from './onmars-palette';

// The workshop's chrome in kimen.dev's onmars "Calma" look: paper ground,
// white sheets, ink selections and the terracotta mark, in Instrument Sans
// (main.ts loads the face). The colors are the onmars tokens, resolved.

// The brand renders as HTML when brandImage is null: the Kimen mark (the
// site's own path) beside the name, so the link's accessible name is "Kimen".
function brandTitle(mark: string): string {
  return `<span style="display:inline-flex;align-items:center;gap:8px;font-size:17px;font-weight:600;letter-spacing:-0.01em">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="${mark}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v18M4 12h4l7-9h5L12.5 12 20 21h-5l-7-9"/></svg>Kimen</span>`;
}

function kimenTheme(scheme: OnmarsScheme): ThemeVars {
  const color = Object.fromEntries(
    Object.entries(onmarsPalette[scheme]).map(([name, { value }]) => [name, value]),
  ) as Record<keyof (typeof onmarsPalette)[OnmarsScheme], string>;
  return create({
    base: scheme,
    brandTitle: brandTitle(color.mark),
    brandUrl: '/',
    brandImage: null,
    brandTarget: '_self',
    colorPrimary: color.mark,
    // Selections are ink, as on the site. Storybook draws a selected item in
    // white text on a darkened colorSecondary, so the dark scheme's white ink
    // would vanish; there it takes the control outline (white on it ≈ 8:1).
    colorSecondary: scheme === 'dark' ? color.control : color.ink,
    appBg: color.paper,
    appContentBg: color.sheet,
    appPreviewBg: color.sheet,
    appBorderColor: color.hairline,
    appBorderRadius: 10,
    fontBase: "'Instrument Sans', system-ui, sans-serif",
    textColor: color.textHigh,
    textInverseColor: color.onInk,
    textMutedColor: color.textMed,
    barBg: color.paper,
    barTextColor: color.textMed,
    barSelectedColor: color.textHigh,
    barHoverColor: color.textHigh,
    buttonBg: color.sheet,
    buttonBorder: color.control,
    booleanBg: color.paper,
    booleanSelectedBg: color.sheet,
    inputBg: color.sheet,
    inputBorder: color.control,
    inputTextColor: color.textHigh,
    inputBorderRadius: 10,
  });
}

// Follow the visitor's system scheme, as the site's pages do on Auto.
const media = window.matchMedia('(prefers-color-scheme: dark)');
addons.setConfig({ theme: kimenTheme(media.matches ? 'dark' : 'light') });
