import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Reuse the image runtime already provided by @nuxt/image / ipx.
const require = createRequire(import.meta.url)
const imageRequire = createRequire(require.resolve('@nuxt/image'))
const ipxRequire = createRequire(imageRequire.resolve('ipx'))
const sharp = ipxRequire('sharp')
const source = fileURLToPath(
  new URL('../app/assets/css/img/logo/logo-vrsus.png', import.meta.url),
)
const output = (name) =>
  fileURLToPath(new URL(`../public/${name}`, import.meta.url))

await Promise.all([
  sharp(source).resize(192, 192).png().toFile(output('icons/icon-192.png')),
  sharp(source).resize(512, 512).png().toFile(output('icons/icon-512.png')),
  sharp(source)
    .resize(180, 180)
    .flatten({ background: '#08090d' })
    .png()
    .toFile(output('icons/apple-touch-icon.png')),
  sharp(source).resize(48, 48).png().toFile(output('favicon.png')),
])
const insetLogo = await sharp(source).resize(384, 384).png().toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#08090d' },
})
  .composite([{ input: insetLogo, gravity: 'centre' }])
  .png()
  .toFile(output('icons/icon-maskable-512.png'))
process.stdout.write(
  'VRSUS: favicon, Apple icon and PWA icons generated from the supplied logo.\n',
)
