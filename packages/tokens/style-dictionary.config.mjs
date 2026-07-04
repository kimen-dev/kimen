// Kimen tokens: DTCG source → CSS custom properties (constitution Art. VI).
// Layers: primitive → semantic (components consume semantic/component only).
export default {
  source: ['tokens/*.tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
      ],
    },
  },
};
