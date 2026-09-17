// Equity Lens - minimal QR encoder
//
// Written into the project rather than loaded from a CDN: the privacy notice
// states that the page pulls no third-party scripts, and a seat link is a
// credential, so it should not be handed to another server to be rendered.
//
// Byte mode, error-correction level M, versions 1-20. That covers a seat link
// (around 155 characters) with room to spare.

// --- tables ----------------------------------------------------------------

const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
];

// [ec codewords per block, number of blocks] for level M
const EC_M = [
  null, [10, 1], [16, 1], [26, 1], [18, 2], [24, 2], [16, 4], [18, 4], [22, 4],
  [22, 5], [26, 5], [30, 5], [22, 8], [22, 9], [24, 9], [24, 10], [28, 10],
  [28, 11], [26, 13], [26, 14], [26, 16],
];

const ALIGNMENT = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
  [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
];

// --- GF(256) arithmetic, primitive polynomial 0x11D -------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Generator polynomial for `degree` error-correction codewords.
function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

// --- BCH for format and version information ---------------------------------

function bch(value, generator, genBits) {
  let v = value << (genBits - 1);
  const genLen = generator.toString(2).length;
  while (v.toString(2).length >= genLen) {
    v ^= generator << (v.toString(2).length - genLen);
  }
  return v;
}

function formatBits(mask) {
  // Level M is 0b00; five data bits are level (2) followed by mask (3).
  const data = (0b00 << 3) | mask;
  const bits = ((data << 10) | bch(data, 0b10100110111, 11)) ^ 0b101010000010010;
  return bits;
}

function versionBits(version) {
  return (version << 12) | bch(version, 0b1111100100101, 13);
}

// --- bitstream --------------------------------------------------------------

function buildData(bytes, version) {
  const [ecPerBlock, blocks] = EC_M[version];
  const totalData = TOTAL_CODEWORDS[version] - ecPerBlock * blocks;

  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);                            // byte mode
  push(bytes.length, version <= 9 ? 8 : 16);  // character count
  for (const b of bytes) push(b, 8);

  // terminator, then pad to a whole byte
  for (let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  // alternating pad bytes, as the specification requires
  const PAD = [0xec, 0x11];
  let p = 0;
  while (codewords.length < totalData) codewords.push(PAD[p++ % 2]);

  // split into blocks: the longer blocks come last
  const shortCount = blocks - (totalData % blocks);
  const shortLen = Math.floor(totalData / blocks);

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < blocks; i++) {
    const len = i < shortCount ? shortLen : shortLen + 1;
    const block = codewords.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
  }

  // interleave
  const out = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return out;
}

// --- matrix -----------------------------------------------------------------

function buildMatrix(version, codewords) {
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const setF = (r, c, v) => { m[r][c] = v; reserved[r][c] = true; };

  // finder patterns and separators
  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setF(rr, cc, inRing || inCore ? 1 : 0);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    setF(6, i, i % 2 === 0 ? 1 : 0);
    setF(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment patterns. Only the three that would sit on a finder are omitted;
  // the ones crossing a timing line are real and overwrite it. Testing
  // "already reserved" instead would wrongly drop those from version 7 up.
  const centers = ALIGNMENT[version];
  const last = centers[centers.length - 1];
  for (const r of centers) {
    for (const c of centers) {
      if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setF(r + dr, c + dc, ring === 1 ? 0 : 1);
        }
      }
    }
  }

  // dark module
  setF(size - 8, 8, 1);

  // reserve format areas
  for (let i = 0; i <= 8; i++) {
    if (!reserved[8][i]) { m[8][i] = 0; reserved[8][i] = true; }
    if (!reserved[i][8]) { m[i][8] = 0; reserved[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][size - 1 - i]) { m[8][size - 1 - i] = 0; reserved[8][size - 1 - i] = true; }
    if (!reserved[size - 1 - i][8]) { m[size - 1 - i][8] = 0; reserved[size - 1 - i][8] = true; }
  }

  // reserve version areas
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        m[size - 11 + j][i] = 0; reserved[size - 11 + j][i] = true;
        m[i][size - 11 + j] = 0; reserved[i][size - 11 + j] = true;
      }
    }
  }

  // place data, zigzagging up and down two columns at a time
  const bitsAll = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bitsAll.push((cw >> i) & 1);

  let idx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;   // the vertical timing column is skipped entirely
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (reserved[row][c]) continue;
        m[row][c] = idx < bitsAll.length ? bitsAll[idx] : 0;
        idx++;
      }
    }
    upward = !upward;
  }

  return { m, reserved, size };
}

function maskFn(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function penalty(grid, size) {
  let score = 0;

  // rule 1: runs of five or more of the same colour
  for (let i = 0; i < size; i++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const cur = horizontal ? grid[i][j] : grid[j][i];
        const prev = horizontal ? grid[i][j - 1] : grid[j - 1][i];
        if (cur === prev) { run++; } else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }

  // rule 2: 2x2 blocks of one colour
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }

  // rule 3: finder-like patterns
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - 11; j++) {
      const row = [], col = [];
      for (let k = 0; k < 11; k++) { row.push(grid[i][j + k]); col.push(grid[j + k][i]); }
      for (const p of [p1, p2]) {
        if (row.every((v, k) => v === p[k])) score += 40;
        if (col.every((v, k) => v === p[k])) score += 40;
      }
    }
  }

  // rule 4: overall balance of dark modules
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += grid[r][c];
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function applyFormatAndVersion(grid, reserved, size, version, mask) {
  const fmt = formatBits(mask);
  // The bits are placed most-significant first: position 0 carries bit 14.
  for (let i = 0; i < 15; i++) {
    const bit = (fmt >> (14 - i)) & 1;
    // around the top-left finder
    if (i < 6) grid[8][i] = bit;
    else if (i === 6) grid[8][7] = bit;
    else if (i === 7) grid[8][8] = bit;
    else if (i === 8) grid[7][8] = bit;
    else grid[14 - i][8] = bit;
    // The duplicate copy: seven bits run up the bottom-left column, then eight
    // along the top-right row. The module at (size-8, 8) is not part of it --
    // it is the fixed dark module, and writing a format bit there costs the
    // code one bit and makes it undecodable.
    if (i < 7) grid[size - 1 - i][8] = bit;
    else grid[8][size - 15 + i] = bit;
  }
  grid[size - 8][8] = 1;   // dark module

  if (version >= 7) {
    const v = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = (v >> i) & 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      grid[size - 11 + c][r] = bit;
      grid[r][size - 11 + c] = bit;
    }
  }
}

// --- public API --------------------------------------------------------------

/**
 * Encode text as a QR matrix. Returns { size, modules } where modules is an
 * array of rows of 0/1, without the quiet zone.
 */
export function encodeQR(text) {
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = 0;
  for (let v = 1; v <= 20; v++) {
    const [ecPerBlock, blocks] = EC_M[v];
    const capacityBits = (TOTAL_CODEWORDS[v] - ecPerBlock * blocks) * 8;
    const needed = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
    if (needed <= capacityBits) { version = v; break; }
  }
  if (!version) throw new Error('Text too long for a version 20 QR code.');

  const codewords = buildData(bytes, version);
  const { m, reserved, size } = buildMatrix(version, codewords);

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const grid = m.map((row) => row.slice());
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && maskFn(mask, r, c)) grid[r][c] ^= 1;
      }
    }
    applyFormatAndVersion(grid, reserved, size, version, mask);
    const score = penalty(grid, size);
    if (!best || score < best.score) best = { score, grid };
  }

  return { size, modules: best.grid, version };
}

/** Render a QR matrix as a standalone SVG string, quiet zone included. */
export function qrToSVG(text, pixelSize = 4) {
  const { size, modules } = encodeQR(text);
  const quiet = 4;
  const dim = (size + quiet * 2) * pixelSize;

  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        path += `M${(c + quiet) * pixelSize} ${(r + quiet) * pixelSize}h${pixelSize}v${pixelSize}h-${pixelSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
         `viewBox="0 0 ${dim} ${dim}" role="img" aria-label="QR code for a seat link">` +
         `<rect width="${dim}" height="${dim}" fill="#ffffff"/>` +
         `<path d="${path}" fill="#000000"/></svg>`;
}
