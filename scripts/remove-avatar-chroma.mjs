/**
 * Converts generated avatar chroma sources into transparent, web-sized PNGs.
 *
 * Usage:
 *   node scripts/remove-avatar-chroma.mjs
 *
 * Inputs and outputs:
 *   Reads `public/images/avatars/<animal>-source.png` and writes the matching
 *   `public/images/avatars/<animal>.png`. Source images are retained until the
 *   caller visually verifies the transparent results.
 *
 * WHY: The portraits contain fur, feathers, whiskers, and antialiased edges.
 * Removing every green-looking pixel globally could damage valid eye and color
 * detail. The flood fill below only removes chroma pixels connected to an outer
 * edge, protecting enclosed portrait pixels and producing a soft silhouette.
 * Sharp is already installed, so this utility adds no production dependency.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const assetDirectory = path.join(projectRoot, "public", "images", "avatars");
const avatarNames = [
  "lion",
  "dove",
  "deer",
  "bull",
  "owl",
  "donkey",
  "rabbit",
  "fox",
  "panda",
  "elephant",
  "giraffe",
  "otter",
];

/** Measures how far one source pixel is from the bright green backdrop. */
function chromaDistance(red, green, blue) {
  return Math.sqrt(
    (red * red) +
      ((255 - green) * (255 - green) * 1.35) +
      (blue * blue),
  );
}

/** Removes edge-connected chroma while preserving the portrait interior. */
async function removeBackground(name) {
  const inputPath = path.join(assetDirectory, `${name}-source.png`);
  const outputPath = path.join(assetDirectory, `${name}.png`);
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    queue[queueEnd] = index;
    queueEnd += 1;
  };

  // Seed all four boundaries so background removal works around ears, antlers,
  // whiskers, and other portrait features extending toward different edges.
  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue(((info.height - 1) * info.width) + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue((y * info.width) + info.width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    const channelIndex = pixelIndex * 4;
    const distance = chromaDistance(
      data[channelIndex],
      data[channelIndex + 1],
      data[channelIndex + 2],
    );

    // Portrait pixels stop the flood fill. The alpha ramp keeps soft fur and
    // feather edges instead of replacing them with a visibly jagged outline.
    if (distance > 185) continue;
    data[channelIndex + 3] = Math.round(
      Math.max(0, Math.min(255, ((distance - 100) / 85) * 255)),
    );

    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < info.width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - info.width);
    if (y + 1 < info.height) enqueue(pixelIndex + info.width);
  }

  // 512px is ample for profile and leaderboard use while remaining economical
  // on mobile connections. Lossless PNG retains the delicate alpha silhouette.
  await sharp(data, { raw: info })
    .resize(512, 512, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

for (const avatarName of avatarNames) {
  await removeBackground(avatarName);
}
