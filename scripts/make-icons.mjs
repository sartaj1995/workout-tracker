// Generates the PWA icons so there are no binary assets to keep in the repo.
// Run with: npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolour with alpha
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

function icon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const bg = hex('#151a21')
  const bar = hex('#e8edf4')
  const plate = hex('#4c8dff')

  const put = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = 255
  }

  // Rounded square background, so the icon looks right even unmasked.
  const radius = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(radius - x, 0, x - (size - radius))
      const dy = Math.max(radius - y, 0, y - (size - radius))
      if (Math.hypot(dx, dy) <= radius) put(x, y, bg)
    }
  }

  const rect = (x0, x1, y0, y1, color) => {
    for (let y = Math.round(y0 * size); y < Math.round(y1 * size); y++) {
      for (let x = Math.round(x0 * size); x < Math.round(x1 * size); x++) {
        if (x >= 0 && y >= 0 && x < size && y < size) put(x, y, color)
      }
    }
  }

  rect(0.2, 0.8, 0.465, 0.535, bar) // the bar
  rect(0.25, 0.32, 0.33, 0.67, plate) // inner plates
  rect(0.68, 0.75, 0.33, 0.67, plate)
  rect(0.15, 0.21, 0.395, 0.605, plate) // outer plates
  rect(0.79, 0.85, 0.395, 0.605, plate)

  return png(size, size, buf)
}

mkdirSync(OUT, { recursive: true })
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(resolve(OUT, name), icon(size))
  console.log('wrote', name)
}
