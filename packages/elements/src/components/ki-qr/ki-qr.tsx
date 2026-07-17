import { Component, Host, h, Prop } from '@stencil/core';

import { encodeQr } from './qr-encoder';

/**
 * The code's internal coordinate space: one module measures 8 units, so the
 * shape tokens (`--ki-qr-module-radius`, `--ki-qr-finder-radius`) resolve on
 * the real radius scale — half a module is 4px in this space (design
 * extraction, specs/026-ki-qr/design-extraction.md).
 */
const MODULE = 8;

/**
 * A machine-scannable QR code that hands a declared value — a link, a
 * pairing payload — from the screen to a nearby camera, encoded locally
 * and restyled entirely through tokens.
 *
 * @whenToUse hand a URL or machine-readable payload from the screen to a
 * nearby camera device: login pairing, tickets and passes, "continue on
 * mobile" links, Wi-Fi sharing. Declare `value` (encoded verbatim, always
 * locally) and a purpose-stating `label` ("Open onmars.dev on your phone"),
 * and always offer the same payload through an accessible alternative next
 * to the code — a visible link or copyable text — because a QR code is only
 * useful to someone who can point a second device's camera at the screen.
 * @whenNotToUse data the person must read on this same screen (render text
 * or a link), one-dimensional barcodes (out of scope), anything interactive
 * (a QR code is not a button — pair it with a real control instead), secret
 * values (anyone who can photograph the screen can decode them), or as the
 * sole carrier of the payload (the accessible alternative is mandatory
 * guidance). An always-empty ki-qr and a value beyond the ~2,331-byte
 * capacity are authoring mistakes: both render nothing, silently.
 *
 * @part code - The code tile: size, tile background and corners, quiet zone, module and finder shape/color.
 */
@Component({
  tag: 'ki-qr',
  styleUrl: 'ki-qr.css',
  shadow: true,
})
export class KiQr {
  /**
   * The exact text the code encodes — the single source of the content,
   * encoded locally as one UTF-8 byte segment at error-correction level M
   * (non-ASCII text additionally carries the UTF-8 ECI designator, so real
   * scanners decode the declared string rather than an ISO-8859-1
   * misreading), so an independent decoder recovers it byte-for-byte,
   * including non-ASCII text (FR-001), and no network request is ever made — the value is
   * data, never behavior: the component never interprets, resolves,
   * navigates to or fetches it (FR-002). Changes re-encode in place. When
   * absent, empty or beyond the capacity of the densest symbol (~2,331
   * bytes at level M), nothing renders and nothing errors (FR-003).
   * @default undefined
   */
  @Prop() value?: string;

  /**
   * Accessible name stating the code's purpose ("Open onmars.dev on your
   * phone"). The component exposes exactly one non-interactive image named
   * by it, falling back to the encoded value when absent (FR-005) — never
   * an unnamed graphic. The label is never rendered visually, and naming
   * the purpose is what tells assistive-technology users to look for the
   * accessible alternative carrying the same payload (documented catalog
   * guidance, FR-013).
   * @default undefined
   */
  @Prop() label?: string;

  render() {
    const value = this.value ?? '';
    // Encoding is local and pure (FR-002): a render-time derivation of the
    // declared value. Overflow returns null — the same clean non-render as
    // the empty state (FR-003, S3/S12).
    const matrix = value === '' ? null : encodeQr(new TextEncoder().encode(value));
    if (matrix === null) {
      return <Host aria-hidden="true"></Host>;
    }

    const units = matrix.size * MODULE;
    const finders: readonly (readonly [number, number])[] = [
      [0, 0],
      [matrix.size - 7, 0],
      [0, matrix.size - 7],
    ];
    const inFinder = (x: number, y: number): boolean =>
      finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);

    // Data, timing, alignment and format modules render as one rect per
    // dark module; the three finders render as dedicated ring + center
    // rects so the theme's finder-radius token shapes them as continuous
    // rounded rings (the MarsUI Type=round anatomy), never as dots.
    const modules = [];
    for (let y = 0; y < matrix.size; y++) {
      for (let x = 0; x < matrix.size; x++) {
        if (matrix.get(x, y) && !inFinder(x, y)) {
          modules.push(
            <rect class="module" x={x * MODULE} y={y * MODULE} width={MODULE} height={MODULE} />,
          );
        }
      }
    }

    // One named non-interactive image (FR-004, FR-005): graphics semantics
    // on the host, everything below it presentational. The SVG scales
    // without rasterizing (FR-008) and never mirrors: its coordinate space
    // is direction-agnostic, so RTL costs zero direction code (FR-009).
    // An absent OR empty label falls back to the encoded value (S7).
    const name = this.label !== undefined && this.label !== '' ? this.label : value;
    return (
      <Host role="img" aria-label={name}>
        {/* The private ratio hands the stylesheet the symbol's module count:
            padding of size×4/(modules+8) is exactly four modules of quiet
            zone once the border-box subtracts itself (ISO/IEC 18004 scanner
            floor), and the stylesheet takes the larger of it and the
            theme's quiet-zone token (`--_ki-` privates stay outside the
            token surface, ki-progress precedent). */}
        <svg
          part="code"
          viewBox={`0 0 ${String(units)} ${String(units)}`}
          aria-hidden="true"
          style={{ '--_ki-qr-quiet-ratio': String(4 / (matrix.size + 8)) }}
        >
          {finders.map(([fx, fy]) => [
            <rect
              class="finder"
              x={fx * MODULE + MODULE / 2}
              y={fy * MODULE + MODULE / 2}
              width={6 * MODULE}
              height={6 * MODULE}
              stroke-width={MODULE}
            />,
            <rect
              class="finder-center"
              x={(fx + 2) * MODULE}
              y={(fy + 2) * MODULE}
              width={3 * MODULE}
              height={3 * MODULE}
            />,
          ])}
          {modules}
        </svg>
      </Host>
    );
  }
}
