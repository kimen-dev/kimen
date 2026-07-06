import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIN_RATIO = 4.5;
const THEMES = [
  { name: 'onmars', stylesheet: new URL('../dist/css/tokens.css', import.meta.url) },
  { name: 'material3', stylesheet: new URL('../dist/css/tokens.material3.css', import.meta.url) },
];
const CONTRAST_PAIRS = [
  { text: '--ki-text-high-em', surface: '--ki-surface-s0' },
  { text: '--ki-text-med-em', surface: '--ki-surface-s0' },
  { text: '--ki-text-high-em', surface: '--ki-surface-s1' },
  { text: '--ki-text-primary-on-primary', surface: '--ki-surface-primary-med-em' },
];

export function parseColor(value) {
  const color = value.trim().toLowerCase();
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/u);

  if (hex) {
    const raw = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1];
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = color.match(/^rgba?\(([^)]+)\)$/u);

  if (rgb) {
    const parts = rgb[1].split(',').map((part) => part.trim());
    return {
      r: Number(parts[0]),
      g: Number(parts[1]),
      b: Number(parts[2]),
      a: parts[3] === undefined ? 1 : Number(parts[3]),
    };
  }

  throw new Error(`Unsupported color value: ${value}`);
}

export function compositeOver(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);

  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: Math.round(
      (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    ),
    g: Math.round(
      (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    ),
    b: Math.round(
      (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    ),
    a: Number(alpha.toFixed(4)),
  };
}

export function relativeLuminance(color) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const opaqueForeground = foreground.a < 1 ? compositeOver(foreground, background) : foreground;
  const lighter = Math.max(relativeLuminance(opaqueForeground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(opaqueForeground), relativeLuminance(background));

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function resolveContrastPairs() {
  return CONTRAST_PAIRS;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//gu, '');
}

function mergeDeclarations(target, declarations) {
  for (const [name, value] of declarations) {
    target.set(name, value);
  }
}

function declarationsFromBlock(block) {
  const declarations = new Map();
  const declarationPattern = /(--ki-[\w-]+)\s*:\s*([^;]+);/gu;

  for (const match of block.matchAll(declarationPattern)) {
    declarations.set(match[1], match[2].trim());
  }

  return declarations;
}

function collectSchemeDeclarations(css) {
  const cleanCss = stripComments(css);
  const light = new Map();
  const dark = new Map();
  const blockPattern = /([^{}]+)\{([^{}]*)\}/gu;

  for (const match of cleanCss.matchAll(blockPattern)) {
    const selector = match[1].trim();
    const declarations = declarationsFromBlock(match[2]);

    if (declarations.size === 0) {
      continue;
    }

    if (selector.includes("data-ki-color-scheme='dark'")) {
      mergeDeclarations(dark, declarations);
    } else if (selector.includes(':root')) {
      mergeDeclarations(light, declarations);
    }
  }

  const mediaPattern =
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*([^{}]+)\{([^{}]*)\}\s*\}/gu;

  for (const match of cleanCss.matchAll(mediaPattern)) {
    mergeDeclarations(dark, declarationsFromBlock(match[2]));
  }

  return {
    light,
    dark: new Map([...light, ...dark]),
  };
}

function resolveCustomProperty(name, declarations, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Circular token reference: ${[...seen, name].join(' -> ')}`);
  }

  const raw = declarations.get(name);

  if (!raw) {
    throw new Error(`Missing token ${name}`);
  }

  const reference = raw.match(/^var\((--ki-[\w-]+)\)$/u);

  if (!reference) {
    return raw;
  }

  return resolveCustomProperty(reference[1], declarations, new Set([...seen, name]));
}

function evaluateStylesheet(theme, stylesheet) {
  const css = readFileSync(stylesheet, 'utf8');
  const schemes = collectSchemeDeclarations(css);
  const failures = [];

  for (const [scheme, declarations] of Object.entries(schemes)) {
    for (const pair of CONTRAST_PAIRS) {
      const text = parseColor(resolveCustomProperty(pair.text, declarations));
      const surface = parseColor(resolveCustomProperty(pair.surface, declarations));
      const ratio = contrastRatio(text, surface);

      if (ratio < MIN_RATIO) {
        failures.push(`${theme}/${scheme} ${pair.text} on ${pair.surface}: ${ratio}`);
      }
    }
  }

  return failures;
}

export function checkContrast() {
  const failures = [];

  for (const theme of THEMES) {
    if (!existsSync(theme.stylesheet)) {
      // A missing stylesheet is a failure, never a skip: FR-009 requires
      // every theme × scheme to be verified (clean-context review, round 1).
      failures.push(`${theme.name}: stylesheet missing at ${theme.stylesheet} — run the build first`);
      continue;
    }

    failures.push(...evaluateStylesheet(theme.name, theme.stylesheet));
  }

  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = checkContrast();

  if (failures.length > 0) {
    console.error(`Contrast check failed. Minimum ratio: ${MIN_RATIO}:1`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Contrast check passed. Minimum ratio: ${MIN_RATIO}:1`);
}
