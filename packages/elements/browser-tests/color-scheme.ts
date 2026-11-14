// Forced-dark measurement for the functional component specs.
//
// "The component honors a forced dark scheme" is a claim about what the
// browser paints, not about which token a rule names. This module reads the
// computed paint of every rendered piece of a component (the flat tree: light
// DOM, shadow parts, slotted content, the pseudo-elements it draws) under the
// light scheme and again with the page forcing dark, and names the pieces
// whose paint changed. It knows no token name, so a renamed token changes
// nothing here and a dark value that stops applying does.
//
// What this deliberately does NOT assert, because it is asserted once for all
// components elsewhere: that dark text is legible and the dark states pass the
// accessibility audit (contracts.browser.spec.ts, every component × theme ×
// scheme) and that the dark pixels match the design (the *.visual.dark
// galleries).
import { parkPointer, settleEntryMotion } from './axe';

const PAINT_PROPERTIES: readonly string[] = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-bottom-color',
  'border-left-color',
  'border-right-color',
  'box-shadow',
  'outline-color',
  'fill',
  'stroke',
];
const PSEUDO_ELEMENTS = ['::before', '::after', '::backdrop'] as const;
// A themed scrollbar is drawn by vendor pseudo-elements where they exist and
// by `scrollbar-color` elsewhere; both are reported as `<name>::scrollbar`.
const SCROLLBAR_PSEUDO_ELEMENTS = CSS.supports('selector(::-webkit-scrollbar)')
  ? ['::-webkit-scrollbar-thumb', '::-webkit-scrollbar-track']
  : [];
const FULLY_TRANSPARENT = /rgba\([^)]*,\s*0\)/gu;

interface Piece {
  element: Element;
  names: string[];
  pseudo: string | null;
  properties: readonly string[];
}

/** The public names of an element: its shadow `part` names, else its tag. */
function namesOf(element: Element, pseudo: string | null): string[] {
  const parts = element.getAttribute('part')?.split(/\s+/u).filter(Boolean) ?? [];
  return (parts.length > 0 ? parts : [element.localName]).map((name) => `${name}${pseudo ?? ''}`);
}

/** Every rendered piece under `root`: elements, shadow trees and drawn pseudo-elements. */
function piecesOf(root: Element): Piece[] {
  const pieces: Piece[] = [];
  const walk = (element: Element): void => {
    pieces.push({
      element,
      names: namesOf(element, null),
      properties: PAINT_PROPERTIES,
      pseudo: null,
    });
    for (const pseudo of PSEUDO_ELEMENTS) {
      const drawn =
        pseudo === '::backdrop'
          ? element instanceof HTMLDialogElement
          : getComputedStyle(element, pseudo).content !== 'none';
      if (drawn) {
        pieces.push({
          element,
          names: namesOf(element, pseudo),
          properties: PAINT_PROPERTIES,
          pseudo,
        });
      }
    }
    if (getComputedStyle(element).overflow !== 'visible') {
      const names = namesOf(element, '::scrollbar');
      pieces.push({ element, names, properties: ['scrollbar-color'], pseudo: null });
      for (const pseudo of SCROLLBAR_PSEUDO_ELEMENTS) {
        pieces.push({ element, names, properties: PAINT_PROPERTIES, pseudo });
      }
    }
    for (const child of element.shadowRoot?.children ?? []) {
      walk(child);
    }
    for (const child of element.children) {
      walk(child);
    }
  };
  walk(root);
  return pieces;
}

/** Computed paint, with every fully transparent colour spelled the same way. */
function paintOf({ element, properties, pseudo }: Piece): string[] {
  const style = getComputedStyle(element, pseudo);
  return properties.map((property) =>
    style.getPropertyValue(property).replace(FULLY_TRANSPARENT, 'transparent'),
  );
}

async function applyScheme(scheme: 'dark' | 'light'): Promise<void> {
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  // Paint transitions (hover lifts, tone crossfades) start on the scheme flip;
  // the resting paint of each scheme is what is compared.
  await settleEntryMotion();
}

/**
 * Names the rendered pieces of `root` that the component repaints when the
 * page forces dark: the `part` name of a shadow part, the tag name otherwise,
 * suffixed with the pseudo-element it draws (`track::before`) or with
 * `::scrollbar` for the scrollbar of a scroll container.
 *
 * A bare element changes too — the user agent flips its default text colour
 * with the scheme — so every property is compared against an unstyled probe
 * beside `root`, and a piece counts only where its own light/dark pair differs
 * from the probe's. The page's own scheme setting is restored on the way out.
 */
export async function repaintedUnderForcedDark(root: Element): Promise<string[]> {
  // A pointer resting on the fixture holds it in its hover paint, which is not
  // the scheme difference under test.
  await parkPointer();
  const previous = document.documentElement.getAttribute('data-ki-color-scheme');
  const probe = document.createElement('span');
  root.after(probe);
  const unstyled: Piece = {
    element: probe,
    names: [],
    properties: PAINT_PROPERTIES,
    pseudo: null,
  };

  await applyScheme('light');
  const pieces = piecesOf(root);
  const light = pieces.map(paintOf);
  const lightDefault = paintOf(unstyled);
  await applyScheme('dark');
  const darkDefault = paintOf(unstyled);
  const repainted = pieces.filter((piece, index) => {
    // The probe comparison is per paint property, so it only applies to
    // pieces read with the same property list.
    const comparable = piece.properties === PAINT_PROPERTIES;
    return paintOf(piece).some(
      (dark, property) =>
        dark !== light[index]?.[property] &&
        !(
          comparable &&
          dark === darkDefault[property] &&
          light[index]?.[property] === lightDefault[property]
        ),
    );
  });
  probe.remove();
  if (previous === null) {
    document.documentElement.removeAttribute('data-ki-color-scheme');
  } else {
    document.documentElement.setAttribute('data-ki-color-scheme', previous);
  }
  return [...new Set(repainted.flatMap(({ names }) => names))];
}
