import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(dir, "../public/icons");
mkdirSync(out, { recursive: true });

const sources = [
  { svg: "icon.svg", name: "pwa-192x192.png", size: 192 },
  { svg: "icon.svg", name: "pwa-512x512.png", size: 512 },
  { svg: "maskable.svg", name: "maskable-512x512.png", size: 512 },
  { svg: "icon.svg", name: "apple-touch-icon.png", size: 180 }
];

for (const s of sources) {
  await sharp(path.resolve(dir, `../public/icons/${s.svg}`))
    .resize(s.size, s.size)
    .png()
    .toFile(path.join(out, s.name));
  console.log(`generated ${s.name}`);
}