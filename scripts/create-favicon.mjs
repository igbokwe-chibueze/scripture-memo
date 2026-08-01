/**
 * Builds a multi-resolution ICO favicon from Luna's transparent square avatar.
 *
 * Usage:
 *   node scripts/create-favicon.mjs <input.png> <output.ico>
 *
 * Required inputs and assumptions:
 * - The source is a square transparent PNG with sufficient padding for a small
 *   browser icon.
 * - `sharp` is already supplied by the Next.js installation. No network access,
 *   environment variables, or additional packages are required.
 * - The output may replace the existing favicon because this script is intended
 *   for an explicit brand-asset update. Git remains the recovery mechanism.
 *
 * ICO permits PNG-compressed frames. Embedding several crisp PNG sizes avoids
 * palette loss and lets browsers select the closest representation rather than
 * scaling one large bitmap at runtime. The writer validates all required paths
 * before producing the final file and writes only after every frame succeeds.
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error(
    "Expected input and output paths: node scripts/create-favicon.mjs <input.png> <output.ico>",
  );
}

/** Common browser and pinned-interface sizes kept in one ICO container. */
const sizes = [16, 32, 48, 64];
const frames = await Promise.all(
  sizes.map((size) =>
    sharp(inputPath)
      .resize(size, size, {
        fit: "contain",
        // WHY: Lanczos preserves Luna's eyes, ears, and wool silhouette when the
        // high-resolution portrait is reduced to browser-tab dimensions.
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);

const headerSize = 6;
const directoryEntrySize = 16;
const directorySize = directoryEntrySize * frames.length;
const header = Buffer.alloc(headerSize + directorySize);

header.writeUInt16LE(0, 0); // Reserved by the ICO format.
header.writeUInt16LE(1, 2); // Resource type 1 identifies an icon.
header.writeUInt16LE(frames.length, 4);

let imageOffset = header.length;
frames.forEach((frame, index) => {
  const entryOffset = headerSize + index * directoryEntrySize;
  const size = sizes[index];

  header.writeUInt8(size === 256 ? 0 : size, entryOffset);
  header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
  header.writeUInt8(0, entryOffset + 2); // PNG frames do not use a color table.
  header.writeUInt8(0, entryOffset + 3);
  header.writeUInt16LE(1, entryOffset + 4); // One color plane.
  header.writeUInt16LE(32, entryOffset + 6); // RGBA color depth.
  header.writeUInt32LE(frame.length, entryOffset + 8);
  header.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += frame.length;
});

await writeFile(outputPath, Buffer.concat([header, ...frames]));
process.stdout.write(
  `Created ${outputPath} with ${sizes.join(", ")}px Luna frames.\n`,
);
