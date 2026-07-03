/**
 * Generates placeholder PWA icons — a geometric flame on warm dark background.
 * Run once after npm install: `npm run gen-icons`
 * Replace the PNGs with final artwork before shipping.
 */
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '../public/icons')
await mkdir(iconsDir, { recursive: true })

const BG = '#18100a'
const EMBER = '#f26419'
const ORANGE = '#f97316'
const WARM = '#ffd580'

// Geometric flame drawn in a 100×100 viewBox.
// The 'scale' parameter shrinks the flame into a safe zone (used for maskable).
function iconSvg(px, safeScale = 1) {
  const r = safeScale < 1 ? 0 : Math.round(px * 0.18)  // no rounded corners for maskable
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${r}" fill="${BG}"/>
  <g transform="translate(50 50) scale(${safeScale}) translate(-50 -50)">
    <!-- outer flame body -->
    <path d="M50 87 C29 87 17 71 17 55 C17 37 29 23 37 13
             C37 27 43 36 50 41
             C50 27 57 13 65 4
             C78 20 83 39 83 55
             C83 73 71 87 50 87 Z"
          fill="${EMBER}"/>
    <!-- mid flame -->
    <path d="M50 79 C37 79 29 68 29 58 C29 47 37 39 44 34
             C43 43 47 50 50 54
             C54 46 56 38 59 31
             C67 42 71 53 71 61
             C71 71 62 79 50 79 Z"
          fill="${ORANGE}"/>
    <!-- core highlight -->
    <ellipse cx="50" cy="65" rx="10" ry="13" fill="${WARM}" opacity="0.5"/>
  </g>
</svg>`
}

const icons = [
  { file: 'icon-192.png',          size: 192, safe: 1    },
  { file: 'icon-512.png',          size: 512, safe: 1    },
  { file: 'icon-512-maskable.png', size: 512, safe: 0.72 },  // maskable safe zone = 80% → use 0.72 to be conservative
  { file: 'apple-touch-icon.png',  size: 180, safe: 1    },
]

for (const { file, size, safe } of icons) {
  const svg = iconSvg(size, safe)
  await sharp(Buffer.from(svg)).png().toFile(join(iconsDir, file))
  console.log(`✓  public/icons/${file}`)
}

console.log('\nDone. Drop final artwork here when ready.')
