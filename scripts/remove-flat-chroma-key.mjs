/**
 * Converts a generated flat-green chroma image into a transparent PNG.
 *
 * Usage:
 *   node scripts/remove-flat-chroma-key.mjs <input.png> <output.png>
 *
 * Inputs and assumptions:
 * - The source must be a PNG generated on a uniform #00ff00 background.
 * - `sharp` is supplied by the existing Next.js installation; this script does
 *   not download dependencies or access the network.
 * - The destination is replaced if it already exists so rerunning asset
 *   preparation is deterministic.
 *
 * The green-dominance matte keeps antialiased wool edges soft. Strongly green
 * pixels become transparent, subject-colored pixels remain opaque, and the
 * narrow transition band receives partial alpha. Green spill is reduced only
 * inside that transition band so Luna's cream, charcoal, amber, and gold palette
 * is preserved. Invalid input fails before an output is reported as complete.
 */
import sharp from "sharp";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error(
    "Expected an input PNG and output PNG: node scripts/remove-flat-chroma-key.mjs <input> <output>",
  );
}

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// WHY: Generated chroma fields can vary substantially from edge to center even
// when requested as flat color. Green dominance remains stable across that
// lighting variation and is safe here because Luna's approved palette contains
// no green. The transition range retains antialiased subject-edge coverage.
const opaqueDominance = 18;
const transparentDominance = 72;

for (let index = 0; index < data.length; index += info.channels) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const sourceAlpha = data[index + 3];
  const greenDominance = green - Math.max(red, blue);

  // WHY: A smooth transition avoids the jagged halo produced by replacing only
  // exact green pixels, especially around Luna's many soft wool curls.
  const matte = Math.max(
    0,
    Math.min(
      1,
      (transparentDominance - greenDominance) /
        (transparentDominance - opaqueDominance),
    ),
  );
  data[index + 3] = Math.round(sourceAlpha * matte);

  if (matte > 0 && matte < 1) {
    // WHY: Chroma illumination can leave a green fringe in partially opaque
    // pixels. Capping green against the other channels neutralizes that spill
    // without recoloring fully opaque illustration details.
    const neutralGreen = Math.max(red, blue);
    data[index + 1] = Math.round(
      neutralGreen + (green - neutralGreen) * matte,
    );
  }
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

process.stdout.write(
  `Created transparent PNG ${outputPath} (${info.width}x${info.height}).\n`,
);
