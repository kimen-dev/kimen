function buttonPaletteCss(): string {
  const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'];
  const channels = ['rest-bg', 'rest-fg', 'rest-border', 'hover-bg', 'hover-fg', 'hover-border'];
  return variants
    .flatMap((variant) => {
      // Neutral secondary already supplies the default palette.
      const tones =
        variant === 'secondary' ? ['success', 'danger'] : ['neutral', 'success', 'danger'];
      return tones.map((tone) => {
        const paint = channels.map(
          (name) => `--_ki-button-${name}:var(--ki-button-${variant}-${tone}-${name})`,
        );
        return `:host([variant="${variant}"][tone="${tone}"]){${paint.join(';')}}`;
      });
    })
    .join('');
}

const palette = buttonPaletteCss();

// Stencil's CSS module returns a template literal. Reconstruct only the exact
// repeated palette block, so its source order and theme overrides stay intact.
export const compactButtonPalette = {
  name: 'kimen-compact-button-palette',
  transform(code: string, id: string) {
    if (!id.split('?')[0]?.endsWith('/ki-button.surface.css') || !code.includes(palette)) {
      return null;
    }
    const compacted = code.replace(palette, '${buttonPaletteCss()}');
    return { code: `${buttonPaletteCss.toString()}\n${compacted}`, map: { mappings: '' } };
  },
};
