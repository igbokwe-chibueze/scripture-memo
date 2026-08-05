/**
 * Converts the generated league-emblem chroma sources into transparent PNGs.
 *
 * Usage:
 *   node scripts/remove-league-chroma.mjs
 *
 * Inputs:
 *   public/images/leagues/<league>-source.png for every league listed below.
 *
 * Outputs:
 *   public/images/leagues/<league>.png with transparent exterior pixels.
 *
 * WHY: Some emblems intentionally contain green enamel and leaves. A global
 * color replacement would erase those valid interior details. This script
 * flood-fills only green pixels connected to the outer image boundary, then
 * applies a short soft matte at the silhouette for clean antialiased edges.
 * Sharp is already installed by the application, so this maintenance helper
 * adds no production dependency and performs no network or database writes.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const assetDirectory = path.join(projectRoot, "public", "images", "leagues");
const leagueNames = [
  "traveler",
  "disciple",
  "messenger",
  "watchman",
  "teacher",
  "shepherd",
  "elder",
  "scribe",
  "saint",
];

/** Returns perceptual distance from the bright green production background. */
function chromaDistance(red, green, blue) {
  // Green receives extra weight because the generated backdrop varies mostly
  // in brightness, while real gold and blue edge pixels differ strongly in hue.
  return Math.sqrt(
    (red * red) +
      ((255 - green) * (255 - green) * 1.35) +
      (blue * blue),
  );
}

/** Removes only background pixels reachable from an image edge. */
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

  // Seed every boundary pixel. The flood fill can therefore remove background
  // in corners and around projecting wings without assuming a circular badge.
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

    // Pixels too far from chroma green are the emblem silhouette. They remain
    // opaque and stop the flood fill, protecting green details enclosed inside.
    if (distance > 185) continue;

    // A soft alpha ramp retains antialiasing while fully removing flat green.
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

  // 640px comfortably covers the largest in-app presentation while keeping
  // nine emblems inexpensive to download on mobile connections.
  await sharp(data, { raw: info })
    .resize(640, 640, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

for (const leagueName of leagueNames) {
  await removeBackground(leagueName);
}
