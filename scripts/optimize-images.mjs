// Gera AVIF e WebP responsivos das artes dos NFTs (T-100) e o manifesto usado por <ResponsiveImage>.
// Uso: npm run images  (idempotente; rode de novo ao trocar ou adicionar PNGs em public/images/nfts)
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_DIR = join(root, 'public/images/nfts')
const OUT_DIR = join(SOURCE_DIR, 'opt')
const PUBLIC_BASE = '/images/nfts'
const MANIFEST = join(root, 'src/lib/image/manifest.gen.ts')

// Larguras reais de exibição × DPR: miniaturas (52–100px), cards (~175–260px), detalhe (445px
// desktop, ~342px mobile) e hero (450px). 960 cobre o detalhe/hero em telas 2x.
const WIDTHS = [128, 256, 384, 640, 960]
const FORMATS = {
  avif: (image) => image.avif({ quality: 50, effort: 4 }),
  webp: (image) => image.webp({ quality: 75, effort: 5 }),
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })

const manifest = {}
let before = 0
let after = 0
for (const file of (await readdir(SOURCE_DIR)).filter((f) => extname(f) === '.png').sort()) {
  const input = join(SOURCE_DIR, file)
  const name = basename(file, '.png')
  const { width: originalWidth } = await sharp(input).metadata()
  before += (await stat(input)).size
  const widths = WIDTHS.filter((w) => w <= originalWidth)
  for (const width of widths) {
    for (const [format, encode] of Object.entries(FORMATS)) {
      const output = join(OUT_DIR, `${name}-${width}.${format}`)
      await encode(sharp(input).resize({ width })).toFile(output)
      after += (await stat(output)).size
    }
  }
  manifest[`${PUBLIC_BASE}/${file}`] = { base: `${PUBLIC_BASE}/opt/${name}`, widths }
}

await writeFile(
  MANIFEST,
  `// Gerado por scripts/optimize-images.mjs (npm run images). Não edite à mão.
export const IMAGE_MANIFEST: Record<string, { base: string; widths: readonly number[] }> = ${JSON.stringify(manifest, null, 2)}
`,
)
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`
console.log(`${Object.keys(manifest).length} imagens: PNG ${mb(before)} → AVIF+WebP (todas as larguras) ${mb(after)}`)
