// One-off: render the app icons from public/icon.svg.  Run: node scripts-icons.mjs
import sharp from 'sharp'
const svg = 'public/icon.svg'
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0a0a0a"/><circle cx="256" cy="256" r="104" fill="none" stroke="#fff" stroke-width="35"/><circle cx="256" cy="256" r="27" fill="#fff"/></svg>`
await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(Buffer.from(square), { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-maskable.png')
await sharp(Buffer.from(square), { density: 300 }).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
console.log('icons written')
