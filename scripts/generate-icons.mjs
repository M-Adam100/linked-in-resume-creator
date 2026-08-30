#!/usr/bin/env node
/**
 * Renders the extension icons from the vector description below into
 * public/icons/icon{16,32,48,128}.png.
 *
 * Icons are generated rather than committed as opaque binaries so the design
 * can be reviewed and tweaked in a diff. Shapes are sampled with 4x4
 * supersampling for antialiasing, which is all this simple mark needs.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIZES = [16, 32, 48, 128];
const OUT_DIR = resolve(import.meta.dirname, '../public/icons');

const INDIGO = [79, 70, 229];
const INDIGO_DARK = [67, 56, 202];
const WHITE = [255, 255, 255];

/** All geometry is expressed in a 0..1 unit square and scaled per size. */
const SHEET = { x: 0.24, y: 0.16, w: 0.52, h: 0.68, r: 0.06 };
const LINES = [
  { x: 0.33, y: 0.31, w: 0.28, h: 0.055 },
  { x: 0.33, y: 0.44, w: 0.34, h: 0.055 },
  { x: 0.33, y: 0.57, w: 0.34, h: 0.055 },
  { x: 0.33, y: 0.7, w: 0.18, h: 0.055 },
];

function insideRoundedRect(px, py, { x, y, w, h, r }) {
  if (px < x || px > x + w || py < y || py > y + h) return false;

  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;

  return dx * dx + dy * dy <= r * r;
}

/** Returns the colour at a unit-square point, or null for transparent. */
function sample(px, py) {
  const background = { x: 0.02, y: 0.02, w: 0.96, h: 0.96, r: 0.22 };
  if (!insideRoundedRect(px, py, background)) return null;

  if (insideRoundedRect(px, py, SHEET)) {
    for (const line of LINES) {
      if (
        insideRoundedRect(px, py, {
          ...line,
          r: line.h / 2,
        })
      ) {
        // The first line is the "name" on the resume; make it read as accent.
        return line === LINES[0] ? INDIGO : INDIGO_DARK;
      }
    }
    return WHITE;
  }

  return INDIGO;
}

function renderPixels(size) {
  const samples = 4;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = (x + (sx + 0.5) / samples) / size;
          const py = (y + (sy + 0.5) / samples) / size;
          const colour = sample(px, py);
          if (colour) {
            r += colour[0];
            g += colour[1];
            b += colour[2];
            a += 255;
          }
        }
      }

      const total = samples * samples;
      const offset = (y * size + x) * 4;
      // Un-premultiply so edge pixels keep their colour at partial alpha.
      const coverage = a / (total * 255);
      pixels[offset] = coverage ? Math.round(r / (total * coverage)) : 0;
      pixels[offset + 1] = coverage ? Math.round(g / (total * coverage)) : 0;
      pixels[offset + 2] = coverage ? Math.round(b / (total * coverage)) : 0;
      pixels[offset + 3] = Math.round(a / total);
    }
  }

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type (0 = none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const png = encodePng(size, renderPixels(size));
  writeFileSync(resolve(OUT_DIR, `icon${size}.png`), png);
  console.log(`icon${size}.png (${png.length} bytes)`);
}
