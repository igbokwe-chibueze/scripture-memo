/**
 * Converts the generated Concept Luna chroma-key sources into transparent PNGs.
 *
 * Run this script after replacing or regenerating an image inside
 * `public/images/mascot/luna-concept/sources`. The generated sources use a
 * deliberately uniform green background because the image generator does not
 * guarantee a reliable alpha channel. Keeping those originals makes this asset
 * pipeline reproducible without modifying the approved production Luna set.
 *
 * Inputs and assumptions:
 * - `sharp` is installed by the application and can decode every source PNG.
 * - Background pixels are strongly green-dominant; Luna herself contains no
 *   saturated green artwork.
 * - Source files remain in version control for future visual refinements.
 *
 * Outputs and safe failure behavior:
 * - Concept PNGs are written beside this collection's README, never over their
 *   source images. The separately requested production bust is the sole output
 *   written to the production Luna directory.
 * - The process stops on a missing or unreadable source so a partial asset set
 *   cannot silently appear complete.
 * - A silhouette is derived from the processed avatar alpha mask, ensuring its
 *   outline matches this exact character concept.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const collectionDirectory = path.join(
  projectRoot,
  "public",
  "images",
  "mascot",
  "luna-concept",
);
const sourceDirectory = path.join(collectionDirectory, "sources");
const productionDirectory = path.join(
  projectRoot,
  "public",
  "images",
  "mascot",
  "luna",
);

/**
 * Maps each chroma source to its public transparent counterpart.
 *
 * Keeping this list explicit prevents a stray reference image from becoming a
 * public application asset merely because it was copied into the source folder.
 */
const assetNames = [
  "avatar",
  "bust",
  "guide",
  "celebrate",
  "encourage",
  "loading",
  "retry",
  "reward",
  "worried",
  "disappointed",
  "angry",
  "notification-worried",
  "notification-disappointed",
  "notification-angry",
];

/** Clamps a computed alpha value to the valid eight-bit PNG range. */
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Removes the green screen while preserving a soft anti-aliased character edge.
 *
 * A hard equality check would leave a bright green fringe around cream wool.
 * Instead, green dominance becomes a gradual alpha ramp, and partly transparent
 * pixels are de-spilled so their remaining colour blends cleanly on both themes.
 */
async function removeChromaBackground(sourcePath, outputPath) {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const sourceAlpha = data[offset + 3];
    const greenDominance = green - Math.max(red, blue);

    // WHY: Highly green-dominant pixels are background; ambiguous edge pixels
    // receive a smooth ramp between fully transparent and fully opaque.
    const chromaAlpha = clampByte(((82 - greenDominance) / 58) * 255);
    const finalAlpha = clampByte((sourceAlpha * chromaAlpha) / 255);

    if (finalAlpha < 255) {
      // WHY: Reducing excess green prevents a chroma halo when cream wool is
      // composited over the application's dark game surfaces.
      data[offset + 1] = Math.min(green, Math.max(red, blue) + 18);
    }

    data[offset + 3] = finalAlpha;
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

/**
 * Resolves the stable public filename for a Concept Luna role.
 *
 * The avatar originally contained an upper-body portrait. Its corrected
 * head-only artwork therefore receives a new URL so Next/Image and browser
 * caches cannot continue serving the former bust under the old avatar URL.
 */
function getConceptOutputName(assetName) {
  return assetName === "avatar"
    ? "luna-concept-head-avatar.png"
    : `luna-concept-${assetName}.png`;
}

/** Creates the reserved Concept Luna mark from the avatar's final alpha mask. */
async function createSilhouette() {
  const avatarPath = path.join(collectionDirectory, "luna-concept-avatar.png");
  const silhouettePath = path.join(
    collectionDirectory,
    "luna-concept-silhouette.png",
  );
  const { data, info } = await sharp(avatarPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < data.length; offset += info.channels) {
    // WHY: Preserve only the avatar alpha while replacing visible colour with a
    // near-black mark that remains softer than absolute black on light screens.
    data[offset] = 10;
    data[offset + 1] = 15;
    data[offset + 2] = 20;
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(silhouettePath);
}

for (const assetName of assetNames) {
  await removeChromaBackground(
    path.join(sourceDirectory, `luna-concept-${assetName}-source.png`),
    path.join(collectionDirectory, getConceptOutputName(assetName)),
  );
}

await createSilhouette();

// WHY: The project owner requested a matching bust for the approved Current
// Luna collection. Processing it here reuses the exact same alpha and despill
// rules while keeping the original chroma generation available for later edits.
await removeChromaBackground(
  path.join(productionDirectory, "sources", "luna-bust-chroma.png"),
  path.join(productionDirectory, "luna-bust.png"),
);

console.log(
  `Processed ${assetNames.length + 1} Concept Luna assets and 1 Current Luna bust.`,
);
