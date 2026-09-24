// Writes public/media/grain.png: a 512px tile of film grain used by the trailer.
// A pre-made tile is far cheaper to render than an SVG noise filter on every frame.

import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

const SIZE = 512;
let seed = 1978;
const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;

// Grey + alpha, one filter byte per row.
const raw = Buffer.alloc((SIZE * 2 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 2 + 1);
  for (let x = 0; x < SIZE; x++) {
    const v = rand();
    raw[row + 1 + x * 2] = v > 0.5 ? 255 : 0;
    raw[row + 2 + x * 2] = Math.round(Math.abs(v - 0.5) * 2 * 230);
  }
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 4; // grey + alpha
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
const out = new URL("../public/media/grain.png", import.meta.url);
writeFileSync(out, png);
console.log(`Wrote ${out.pathname} (${png.length} bytes)`);
