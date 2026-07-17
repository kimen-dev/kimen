/*
 * QR Code encoder for ki-qr — a minimal byte-mode, fixed-level-M adaptation
 * of the reference "QR Code generator library (TypeScript)" by Project
 * Nayuki (MIT License).
 *
 * Upstream: https://www.nayuki.io/page/qr-code-generator-library
 *           https://github.com/nayuki/QR-Code-generator
 * Pinned reference: v1.8.0, typescript-javascript/qrcodegen.ts
 *   (sha256 c4749095a91bf9696e3a303998b9905e467094f53041e64393e65e6d887737fd)
 * Copyright (c) Project Nayuki. License: MIT — provenance and the full
 * license text are recorded in the repository NOTICE file (Art. X: small
 * auditable vendored code instead of a first runtime npm dependency).
 *
 * Kimen adaptations (also recorded in NOTICE):
 * - TypeScript namespace converted to an ES module exposing one entry point,
 *   `encodeQr(bytes)` — a single UTF-8 byte segment at error-correction
 *   level M with no ECC boosting and automatic mask selection, per the spec
 *   Assumptions of 026-ki-qr (numeric/alphanumeric/kanji/ECI segment kinds,
 *   the mask override and the boost flag of the reference are removed).
 * - Capacity overflow returns null instead of throwing DataTooLongException
 *   (FR-003 fail-soft contract).
 * - Tables trimmed to the MEDIUM rows; grids flattened to Uint8Array; code
 *   hardened for strict TypeScript (noUncheckedIndexedAccess).
 *
 * The algorithm itself — function patterns, Reed-Solomon ECC over
 * GF(2^8/0x11D), block interleaving, the zigzag codeword walk, the eight
 * mask patterns and their penalty scores, format/version bits — is
 * Nayuki's, implementing ISO/IEC 18004 (QR Code Model 2).
 */

/** The rendered symbol: an immutable square grid of dark (true) modules. */
export interface QrMatrix {
  /** Number of modules per side (21..177). */
  readonly size: number;
  /** True when the module at (x, y) is dark; false outside the grid. */
  get(x: number, y: number): boolean;
}

const MIN_VERSION = 1;
const MAX_VERSION = 40;

// MEDIUM rows of the reference tables (index = version; 0 pads).
const ECC_CODEWORDS_PER_BLOCK: readonly number[] = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
const NUM_ERROR_CORRECTION_BLOCKS: readonly number[] = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25,
  26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];
// Format-bits value of error-correction level M in the reference (Ecc.MEDIUM).
const FORMAT_BITS_MEDIUM = 0;

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

const at = (table: readonly number[], index: number): number => table[index] ?? 0;
const bitAt = (grid: Uint8Array, index: number): number => grid[index] ?? 0;
const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

// getNumRawDataModules(ver) of the reference.
function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

// getNumDataCodewords(ver, Ecc.MEDIUM) of the reference.
function getNumDataCodewords(version: number): number {
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    at(ECC_CODEWORDS_PER_BLOCK, version) * at(NUM_ERROR_CORRECTION_BLOCKS, version)
  );
}

// Byte-mode character-count field width (the only mode kept).
const byteCountBits = (version: number): number => (version <= 9 ? 8 : 16);

// reedSolomonMultiply of the reference: product in GF(2^8/0x11D).
function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

// reedSolomonComputeDivisor of the reference.
function reedSolomonComputeDivisor(degree: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i++) {
    result.push(0);
  }
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j] ?? 0, root);
      if (j + 1 < result.length) {
        result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
      }
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

// reedSolomonComputeRemainder of the reference.
function reedSolomonComputeRemainder(
  data: readonly number[],
  divisor: readonly number[],
): number[] {
  const result: number[] = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] = (result[i] ?? 0) ^ reedSolomonMultiply(coefficient, factor);
    });
  }
  return result;
}

// addEccAndInterleave of the reference, at level M.
function addEccAndInterleave(data: readonly number[], version: number): number[] {
  const numBlocks = at(NUM_ERROR_CORRECTION_BLOCKS, version);
  const blockEccLen = at(ECC_CODEWORDS_PER_BLOCK, version);
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) {
      dat.push(0);
    }
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  const firstBlock = blocks[0] ?? [];
  for (let i = 0; i < firstBlock.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(block[i] ?? 0);
      }
    });
  }
  return result;
}

/** Grid state shared by the drawing helpers (the reference's instance fields). */
interface Grid {
  readonly size: number;
  readonly modules: Uint8Array;
  readonly isFunction: Uint8Array;
}

function setFunctionModule(grid: Grid, x: number, y: number, isDark: boolean): void {
  grid.modules[y * grid.size + x] = isDark ? 1 : 0;
  grid.isFunction[y * grid.size + x] = 1;
}

// drawFinderPattern of the reference (center at (x, y), separator included).
function drawFinderPattern(grid: Grid, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx;
      const yy = y + dy;
      if (0 <= xx && xx < grid.size && 0 <= yy && yy < grid.size) {
        setFunctionModule(grid, xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }
}

// drawAlignmentPattern of the reference.
function drawAlignmentPattern(grid: Grid, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunctionModule(grid, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

// getAlignmentPatternPositions of the reference.
function getAlignmentPatternPositions(version: number, size: number): number[] {
  if (version === 1) {
    return [];
  }
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

// drawFormatBits of the reference, at level M (formatBits = 0).
function drawFormatBits(grid: Grid, mask: number): void {
  const data = (FORMAT_BITS_MEDIUM << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i++) {
    setFunctionModule(grid, 8, i, getBit(bits, i));
  }
  setFunctionModule(grid, 8, 7, getBit(bits, 6));
  setFunctionModule(grid, 8, 8, getBit(bits, 7));
  setFunctionModule(grid, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) {
    setFunctionModule(grid, 14 - i, 8, getBit(bits, i));
  }

  for (let i = 0; i < 8; i++) {
    setFunctionModule(grid, grid.size - 1 - i, 8, getBit(bits, i));
  }
  for (let i = 8; i < 15; i++) {
    setFunctionModule(grid, 8, grid.size - 15 + i, getBit(bits, i));
  }
  setFunctionModule(grid, 8, grid.size - 8, true);
}

// drawVersion of the reference (versions 7..40 only).
function drawVersion(grid: Grid, version: number): void {
  if (version < 7) {
    return;
  }
  let rem = version;
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const color = getBit(bits, i);
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(grid, a, b, color);
    setFunctionModule(grid, b, a, color);
  }
}

// drawFunctionPatterns of the reference.
function drawFunctionPatterns(grid: Grid, version: number): void {
  for (let i = 0; i < grid.size; i++) {
    setFunctionModule(grid, 6, i, i % 2 === 0);
    setFunctionModule(grid, i, 6, i % 2 === 0);
  }
  drawFinderPattern(grid, 3, 3);
  drawFinderPattern(grid, grid.size - 4, 3);
  drawFinderPattern(grid, 3, grid.size - 4);

  const alignPatPos = getAlignmentPatternPositions(version, grid.size);
  const numAlign = alignPatPos.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      if (
        !(
          (i === 0 && j === 0) ||
          (i === 0 && j === numAlign - 1) ||
          (i === numAlign - 1 && j === 0)
        )
      ) {
        drawAlignmentPattern(grid, alignPatPos[i] ?? 0, alignPatPos[j] ?? 0);
      }
    }
  }
  drawFormatBits(grid, 0); // Dummy mask value; overwritten after mask selection
  drawVersion(grid, version);
}

// drawCodewords of the reference (the zigzag walk over non-function modules).
function drawCodewords(grid: Grid, data: readonly number[]): void {
  let i = 0;
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    for (let vert = 0; vert < grid.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? grid.size - 1 - vert : vert;
        if (bitAt(grid.isFunction, y * grid.size + x) === 0 && i < data.length * 8) {
          grid.modules[y * grid.size + x] = getBit(data[i >>> 3] ?? 0, 7 - (i & 7)) ? 1 : 0;
          i++;
        }
      }
    }
  }
}

// applyMask of the reference (XOR; applying twice undoes the mask).
function applyMask(grid: Grid, mask: number): void {
  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      let invert: boolean;
      switch (mask) {
        case 0:
          invert = (x + y) % 2 === 0;
          break;
        case 1:
          invert = y % 2 === 0;
          break;
        case 2:
          invert = x % 3 === 0;
          break;
        case 3:
          invert = (x + y) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          break;
        case 5:
          invert = ((x * y) % 2) + ((x * y) % 3) === 0;
          break;
        case 6:
          invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
        default:
          invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
      }
      const index = y * grid.size + x;
      if (bitAt(grid.isFunction, index) === 0 && invert) {
        grid.modules[index] = bitAt(grid.modules, index) === 0 ? 1 : 0;
      }
    }
  }
}

// finderPenaltyAddHistory / CountPatterns / TerminateAndCount of the reference.
function finderPenaltyAddHistory(size: number, runLength: number, runHistory: number[]): void {
  let length = runLength;
  if ((runHistory[0] ?? 0) === 0) {
    length += size; // Add light border to initial run
  }
  runHistory.pop();
  runHistory.unshift(length);
}

function finderPenaltyCountPatterns(runHistory: readonly number[]): number {
  const n = runHistory[1] ?? 0;
  const core =
    n > 0 &&
    runHistory[2] === n &&
    runHistory[3] === n * 3 &&
    runHistory[4] === n &&
    runHistory[5] === n;
  return (
    (core && (runHistory[0] ?? 0) >= n * 4 && (runHistory[6] ?? 0) >= n ? 1 : 0) +
    (core && (runHistory[6] ?? 0) >= n * 4 && (runHistory[0] ?? 0) >= n ? 1 : 0)
  );
}

function finderPenaltyTerminateAndCount(
  size: number,
  currentRunColor: boolean,
  runLength: number,
  runHistory: number[],
): number {
  let length = runLength;
  if (currentRunColor) {
    finderPenaltyAddHistory(size, length, runHistory);
    length = 0;
  }
  length += size; // Add light border to final run
  finderPenaltyAddHistory(size, length, runHistory);
  return finderPenaltyCountPatterns(runHistory);
}

// getPenaltyScore of the reference.
function getPenaltyScore(grid: Grid): number {
  const { size } = grid;
  const dark = (x: number, y: number): boolean => bitAt(grid.modules, y * size + x) !== 0;
  let result = 0;

  for (let y = 0; y < size; y++) {
    let runColor = false;
    let runX = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (dark(x, y) === runColor) {
        runX++;
        if (runX === 5) {
          result += PENALTY_N1;
        } else if (runX > 5) {
          result++;
        }
      } else {
        finderPenaltyAddHistory(size, runX, runHistory);
        if (!runColor) {
          result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        }
        runColor = dark(x, y);
        runX = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(size, runColor, runX, runHistory) * PENALTY_N3;
  }
  for (let x = 0; x < size; x++) {
    let runColor = false;
    let runY = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (dark(x, y) === runColor) {
        runY++;
        if (runY === 5) {
          result += PENALTY_N1;
        } else if (runY > 5) {
          result++;
        }
      } else {
        finderPenaltyAddHistory(size, runY, runHistory);
        if (!runColor) {
          result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        }
        runColor = dark(x, y);
        runY = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(size, runColor, runY, runHistory) * PENALTY_N3;
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = dark(x, y);
      if (color === dark(x + 1, y) && color === dark(x, y + 1) && color === dark(x + 1, y + 1)) {
        result += PENALTY_N2;
      }
    }
  }

  let darkCount = 0;
  for (let i = 0; i < size * size; i++) {
    darkCount += bitAt(grid.modules, i);
  }
  const total = size * size;
  const k = Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1;
  result += k * PENALTY_N4;
  return result;
}

/**
 * Encodes the given bytes as one byte-mode segment at error-correction
 * level M — the encodeSegments flow of the reference with the version
 * search, terminator, padding, ECC interleaving, function patterns and
 * automatic mask selection intact. Returns null when the data exceeds the
 * capacity of the densest symbol (version 40 at level M), instead of
 * throwing (FR-003 fail-soft).
 */
export function encodeQr(data: Uint8Array): QrMatrix | null {
  // Version search: the smallest symbol whose data capacity fits the
  // single byte segment (4 mode bits + the count field + 8 bits per byte).
  let version = 0;
  let dataUsedBits = 0;
  for (let candidate = MIN_VERSION; candidate <= MAX_VERSION; candidate++) {
    const capacityBits = getNumDataCodewords(candidate) * 8;
    const usedBits = 4 + byteCountBits(candidate) + data.length * 8;
    if (usedBits <= capacityBits) {
      version = candidate;
      dataUsedBits = usedBits;
      break;
    }
  }
  if (version === 0) {
    return null;
  }

  // Bit assembly: mode indicator 0100 (byte), character count, the data
  // bytes, the terminator, bit padding and the 0xEC/0x11 pad codewords.
  const bits: number[] = [];
  const appendBits = (value: number, length: number): void => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((value >>> i) & 1);
    }
  };
  appendBits(4, 4); // Byte-mode indicator is 0b0100
  appendBits(data.length, byteCountBits(version));
  for (const byte of data) {
    appendBits(byte, 8);
  }
  const dataCapacityBits = getNumDataCodewords(version) * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bits.length));
  appendBits(0, (8 - (bits.length % 8)) % 8);
  for (let padByte = 0xec; bits.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
    appendBits(padByte, 8);
  }
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    const codewordIndex = i >>> 3;
    dataCodewords[codewordIndex] = ((dataCodewords[codewordIndex] ?? 0) << 1) | (bits[i] ?? 0);
  }
  if (dataUsedBits > dataCapacityBits) {
    return null; // Unreachable by construction; kept as a hard safety net.
  }

  // Grid construction: function patterns, interleaved codewords, then the
  // mask with the lowest penalty score (format bits follow the mask).
  const size = version * 4 + 17;
  const grid: Grid = {
    size,
    modules: new Uint8Array(size * size),
    isFunction: new Uint8Array(size * size),
  };
  drawFunctionPatterns(grid, version);
  drawCodewords(grid, addEccAndInterleave(dataCodewords, version));

  let bestMask = 0;
  let minPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(grid, mask);
    drawFormatBits(grid, mask);
    const penalty = getPenaltyScore(grid);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
    }
    applyMask(grid, mask); // Undo (XOR)
  }
  applyMask(grid, bestMask);
  drawFormatBits(grid, bestMask);

  const modules = grid.modules;
  return {
    size,
    get(x: number, y: number): boolean {
      return 0 <= x && x < size && 0 <= y && y < size && (modules[y * size + x] ?? 0) !== 0;
    },
  };
}
