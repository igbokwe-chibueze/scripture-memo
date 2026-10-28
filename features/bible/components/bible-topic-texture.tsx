/** Decorative reusable paper/pigment layer. Browser-cached SVG paints the same
 * texture over any theme colour; fixed ID offsets give packs slight variation
 * without render-time randomness, image generation, new assets per pack or DB IO.
 */
export function BibleTopicTexture({
  topicId,
}: {
  topicId: string;
}): React.ReactNode {
  const offset = Array.from(topicId).reduce(
    (value, character) => value + (character.codePointAt(0) ?? 0),
    0,
  );
  return (
    <span
      aria-hidden="true"
      data-bible-topic-texture
      className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-80"
      style={{
        backgroundImage: "url('/images/bible/topic-paper-texture.svg')",
        backgroundSize: "256px 256px",
        backgroundRepeat: "repeat",
        backgroundPosition: `${(offset * 17) % 256}px ${(offset * 31) % 256}px`,
      }}
    />
  );
}
