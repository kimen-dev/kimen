import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { encodeQr, type QrMatrix } from './qr-encoder';

// @spec:026-ki-qr
// Decode the public matrix with an independent reader. No golden matrices:
// different valid mask choices must continue to pass.
function decode(matrix: QrMatrix, damaged = false) {
  const scale = 3;
  const quietZone = 4;
  const side = (matrix.size + quietZone * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const moduleX = Math.floor(x / scale) - quietZone;
      const moduleY = Math.floor(y / scale) - quietZone;
      const corrupt =
        damaged &&
        moduleX >= matrix.size - 2 &&
        moduleX < matrix.size &&
        moduleY >= matrix.size - 2 &&
        moduleY < matrix.size;
      const dark = matrix.get(moduleX, moduleY) !== corrupt;
      const offset = (y * side + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = dark ? 0 : 255;
    }
  }
  return jsQR(pixels, side, side, { inversionAttempts: 'dontInvert' });
}

function requireMatrix(bytes: Uint8Array): QrMatrix {
  const matrix = encodeQr(bytes);
  expect(matrix).not.toBeNull();
  if (!matrix) throw new Error('Expected an encodable payload');
  return matrix;
}

describe('QR encoder interoperable output', () => {
  // ASCII byte capacities at level M, spanning versions 1 through 40, plus
  // empty/small payloads and transitions between the smallest symbols.
  it.each([
    0, 1, 14, 15, 26, 27, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504,
    560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722,
    1809, 1911, 1989, 2099, 2213, 2331,
  ])('S1 S12 round-trips %i ASCII bytes across symbol sizes and block counts', (length) => {
    const bytes = Uint8Array.from({ length }, (_, index) => 32 + ((index * 17) % 95));
    const decoded = decode(requireMatrix(bytes));
    expect(decoded).not.toBeNull();
    expect(decoded?.binaryData).toEqual(Array.from(bytes));
  });

  it.each(['Reunión mañana — Zúrich', 'こんにちは世界', 'Ticket 🎫 №42'])(
    'S1 declares UTF-8 and preserves the bytes of %s',
    (value) => {
      const bytes = new TextEncoder().encode(value);
      const decoded = decode(requireMatrix(bytes));
      expect(decoded?.binaryData).toEqual(Array.from(bytes));
      expect(decoded?.chunks).toContainEqual({ type: 'eci', assignmentNumber: 26 });
    },
  );

  it.each([14, 60, 180, 500])(
    'S1 error correction recovers %i bytes after four data modules are damaged',
    (length) => {
      const bytes = new TextEncoder().encode('x'.repeat(length));
      expect(decode(requireMatrix(bytes), true)?.binaryData).toEqual(Array.from(bytes));
    },
  );

  it('S12 fails soft beyond the maximum ASCII byte capacity', () => {
    expect(encodeQr(new TextEncoder().encode('x'.repeat(2332)))).toBeNull();
  });

  it('S1 treats coordinates outside every edge as light quiet-zone modules', () => {
    const matrix = requireMatrix(new TextEncoder().encode('Kimen'));
    expect(matrix.get(-1, 0)).toBe(false);
    expect(matrix.get(0, -1)).toBe(false);
    expect(matrix.get(matrix.size, 0)).toBe(false);
    expect(matrix.get(0, matrix.size)).toBe(false);
  });
});
