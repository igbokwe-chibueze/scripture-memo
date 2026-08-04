/**
 * Splits the generated Fellowship insignia atlas into production WebP assets.
 *
 * Run with `node scripts/slice-fellowship-insignias.mjs` after intentionally
 * replacing `public/images/fellowships/fellowship-insignias-v1.png`. The source
 * atlas must contain exactly four equal columns and three equal rows. `sharp`
 * is supplied by the installed Next.js toolchain.
 *
 * Each output filename uses a server-approved catalogue key. This script does
 * not accept command-line paths or user content, preventing accidental writes
 * outside the owned Fellowship image directory. Existing generated cells are
 * replaced deterministically; the atlas remains the editable source artifact.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const imageDirectory = path.join(projectRoot, "public", "images", "fellowships");
const atlasPath = path.join(imageDirectory, "fellowship-insignias-v1.png");
const insigniaKeys = [
  "word-star", "good-shepherd", "prayer", "fishers",
  "beacon", "ark", "covenant", "crowned-word",
  "lighthouse", "living-water", "calvary", "shield",
];

const metadata = await sharp(atlasPath).metadata();
if (!metadata.width || !metadata.height) {
  throw new Error("The Fellowship insignia atlas has no readable dimensions.");
}
if (metadata.width % 4 !== 0 || metadata.height % 3 !== 0) {
  throw new Error("The Fellowship insignia atlas must divide evenly into a 4×3 grid.");
}

const cellWidth = metadata.width / 4;
const cellHeight = metadata.height / 3;
const horizontalInset = 12;
const extractedWidth = cellWidth - (horizontalInset * 2);
const verticalTopInset = 10;
const verticalBottomInset = 6;
const extractedHeight = cellHeight - verticalTopInset - verticalBottomInset;
const insigniaContentSize = 330;
const insigniaCanvasSize = 362;
const insigniaPadding = (insigniaCanvasSize - insigniaContentSize) / 2;

await Promise.all(insigniaKeys.map(async (key, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const outputPath = path.join(imageDirectory, `insignia-${key}.webp`);

  // Materialize the atlas cell before trim/resize. Sharp may otherwise reorder
  // geometry operations for optimization, causing trim to change the coordinate
  // space before the atlas-level extraction is evaluated.
  const cell = await sharp(atlasPath)
    // The generated paint extends a few pixels across mathematical cell edges.
    // Small edge insets remove those fragments; `contain` restores a square
    // canvas while retaining the complete central medallion and its padding.
    .extract({ left: (column * cellWidth) + horizontalInset, top: (row * cellHeight) + verticalTopInset, width: extractedWidth, height: extractedHeight })
    .png()
    .toBuffer();

  // WebP reduces the one-time mobile download while quality 92 preserves the
  // small gold highlights and beveled frame edges.
  await sharp(cell)
    // Grid cells are mathematically centered, but generated painted bounds are
    // not. Trimming the uniform navy field finds the visible medallion itself;
    // contain + equal extension then centers that artwork on every final canvas.
    .trim({ background: "#060817", threshold: 24 })
    .resize(insigniaContentSize, insigniaContentSize, { fit: "contain", background: "#060817" })
    .extend({ top: insigniaPadding, bottom: insigniaPadding, left: insigniaPadding, right: insigniaPadding, background: "#060817" })
    .webp({ quality: 92 })
    .toFile(outputPath);
}));

console.log(`Created ${insigniaKeys.length} Fellowship insignia assets.`);
