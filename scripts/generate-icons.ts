// Generate PWA icons (192x192 and 512x512) as PNG from a simple SVG design.
import sharp from 'sharp'
import path from 'path'

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0e7490" rx="96"/>
  <!-- Building/house icon -->
  <g transform="translate(256, 280)" fill="none" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
    <!-- Main house outline -->
    <path d="M -120 100 L -120 -40 L 0 -140 L 120 -40 L 120 100 Z" fill="white" stroke="none"/>
    <!-- Roof accent -->
    <path d="M -140 -30 L 0 -160 L 140 -30" stroke="#0e7490" stroke-width="20"/>
    <!-- Door -->
    <rect x="-40" y="20" width="50" height="80" fill="#0e7490" stroke="none"/>
    <!-- Window -->
    <rect x="30" y="-20" width="50" height="40" fill="#0e7490" stroke="none"/>
    <!-- "EB" text below -->
  </g>
  <text x="256" y="470" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">EB</text>
</svg>`

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0e7490" rx="12"/>
  <g transform="translate(32, 36)" fill="white" stroke="none">
    <path d="M -16 12 L -16 -6 L 0 -18 L 16 -6 L 16 12 Z"/>
  </g>
  <text x="32" y="58" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">EB</text>
</svg>`

async function main() {
  const publicDir = path.join(process.cwd(), 'public')
  const svgBuffer = Buffer.from(ICON_SVG)
  const faviconBuffer = Buffer.from(FAVICON_SVG)

  await Promise.all([
    sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png')),
    sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png')),
    sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png')),
    sharp(faviconBuffer).png().toFile(path.join(publicDir, 'favicon.png')),
  ])
  console.log('Generated: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png')
}

main().catch(e => { console.error(e); process.exit(1) })
