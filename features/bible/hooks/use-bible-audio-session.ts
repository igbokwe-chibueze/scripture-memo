"use client";

/** One media element for the Bible workspace. Browsers can grant playback per
 * element, so replacing it after each asynchronous chapter load loses permission.
 */
import { useCallback, useEffect, useRef, type RefObject } from "react";

/** Prepare audio synchronously from an explicit chapter/fallback tap. A tiny
 * silent PCM clip preserves that user gesture while the real URL is loading.
 * Blob media is already permitted by our CSP; no request or DB write is needed.
 */
export function useBibleAudioSession(): {
  mediaRef: RefObject<HTMLAudioElement | null>;
  prepare: () => void;
} {
  const mediaRef = useRef<HTMLAudioElement>(null);
  const prepared = useRef(false);
  const primer = useRef<string | null>(null);
  const prepare = useCallback((): void => {
    const element = mediaRef.current;
    if (!element || prepared.current) return;
    if (!primer.current) {
      // 100ms of unsigned 8-bit mono silence at 8kHz, with a standard WAV header.
      const buffer = new ArrayBuffer(844);
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);
      const write = (offset: number, value: string): void => {
        for (let index = 0; index < value.length; index++) {
          view.setUint8(offset + index, value.charCodeAt(index));
        }
      };
      write(0, "RIFF");
      view.setUint32(4, 836, true);
      write(8, "WAVEfmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true);
      view.setUint32(28, 8000, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      write(36, "data");
      view.setUint32(40, 800, true);
      bytes.fill(128, 44);
      primer.current = URL.createObjectURL(
        new Blob([buffer], { type: "audio/wav" }),
      );
    }
    element.src = primer.current;
    // No await before play: the user's activation must still be current. The
    // actual recording reports any browser rejection through the visible player.
    void element
      .play()
      .then(() => {
        prepared.current = true;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const element = mediaRef.current;
    return () => {
      element?.pause();
      if (primer.current) {
        URL.revokeObjectURL(primer.current);
        primer.current = null;
      }
    };
  }, []);
  return { mediaRef, prepare };
}
