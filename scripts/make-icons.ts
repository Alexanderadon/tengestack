/** Иконки PWA из логотипа: sharp растрит SVG → PNG 192/512 + maskable. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const LOGO = path.join(process.cwd(), "src", "app", "icon.svg");
// maskable: логотип занимает 80% холста, фон — золото (safe-zone маски)
const MASKABLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" fill="#F0B441"/>
  <path transform="translate(8 8)" d="M17 16h30v7H17zM17 27.5h30v7H17zM28.5 34.5h7V50a3.5 3.5 0 0 1-7 0z" fill="#1A1405"/>
</svg>`;

async function main() {
  const outDir = path.join(process.cwd(), "public", "icons");
  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(LOGO);

  await sharp(svg, { density: 300 }).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(svg, { density: 300 }).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(Buffer.from(MASKABLE), { density: 300 })
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, "maskable-512.png"));
  console.log("Иконки: public/icons/{icon-192,icon-512,maskable-512}.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
