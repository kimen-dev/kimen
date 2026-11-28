function buttonPaletteCss(states: string[], includeNeutral: boolean): string {
  const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'];
  const channels = states.flatMap((state) =>
    ['bg', 'fg', 'border'].map((role) => `${state}-${role}`),
  );
  return variants
    .flatMap((variant) => {
      // Neutral secondary already supplies the default palette.
      const tones =
        includeNeutral && variant !== 'secondary'
          ? ['neutral', 'success', 'danger']
          : ['success', 'danger'];
      return tones.map((tone) => {
        const paint = channels.map(
          (name) => `--_ki-button-${name}:var(--ki-button-${variant}-${tone}-${name})`,
        );
        return `:host([variant="${variant}"][tone="${tone}"]){${paint.join(';')}}`;
      });
    })
    .join('');
}

const palettes = new Map([
  ['ki-button.surface.css', { states: ['rest', 'hover'], includeNeutral: true }],
  ['ki-button.tones.css', { states: ['active', 'disabled'], includeNeutral: false }],
]);

// Stencil's CSS module returns a template literal. Reconstruct only the exact
// repeated palette block, so its source order and theme overrides stay intact.
export const compactButtonPalette = {
  name: 'kimen-compact-button-palette',
  transform(code: string, id: string) {
    const file = id.split('?')[0]?.split('/').pop() ?? '';
    const palette = palettes.get(file);
    if (!palette) return null;
    const { states, includeNeutral } = palette;
    const css = buttonPaletteCss(states, includeNeutral);
    if (!code.includes(css)) return null;
    const compacted = code.replace(
      css,
      `\${buttonPaletteCss(${JSON.stringify(states)},${includeNeutral})}`,
    );
    return { code: `${buttonPaletteCss.toString()}\n${compacted}`, map: { mappings: '' } };
  },
};
