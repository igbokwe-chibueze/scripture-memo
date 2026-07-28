"use client";

import { useEffect } from "react";

/** Returns the browser's Web Audio constructor, including Safari's alias. */
function getAudioContextConstructor(): typeof AudioContext | undefined {
  return window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
}

/**
 * Plays a quiet synthesized flame bed while a streak celebration is visible.
 *
 * A filtered looping noise layer supplies the burn while brief randomized
 * crackles add texture. Synthesis avoids an unlicensed sample, honors the
 * synchronized audio preference, and guarantees cleanup when the modal closes.
 */
export function useFlameAmbience(active = true): void {
  useEffect(() => {
    if (!active) return;
    if (document.documentElement.dataset.audioEnabled === "false") return;
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    let context: AudioContext | null = null;
    let crackleTimer: number | null = null;
    let fireSource: AudioBufferSourceNode | null = null;
    let masterGain: GainNode | null = null;

    try {
      context = new AudioContextConstructor();
      void context.resume();
      const sampleCount = Math.ceil(context.sampleRate * 1.5);
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }

      fireSource = context.createBufferSource();
      const lowPass = context.createBiquadFilter();
      const bandPass = context.createBiquadFilter();
      masterGain = context.createGain();
      fireSource.buffer = buffer;
      fireSource.loop = true;
      lowPass.type = "lowpass";
      lowPass.frequency.value = 760;
      bandPass.type = "bandpass";
      bandPass.frequency.value = 310;
      bandPass.Q.value = 0.55;
      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(
        0.055,
        context.currentTime + 0.35,
      );
      fireSource.connect(lowPass);
      lowPass.connect(bandPass);
      bandPass.connect(masterGain);
      masterGain.connect(context.destination);
      fireSource.start();

      crackleTimer = window.setInterval(() => {
        if (!context || context.state === "closed" || !masterGain) return;
        const startedAt = context.currentTime;
        const crackle = context.createOscillator();
        const crackleGain = context.createGain();
        crackle.type = "square";
        crackle.frequency.value = 900 + Math.random() * 1_200;
        crackleGain.gain.setValueAtTime(0.018, startedAt);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.035);
        crackle.connect(crackleGain);
        crackleGain.connect(masterGain);
        crackle.start(startedAt);
        crackle.stop(startedAt + 0.04);
      }, 320);
    } catch {
      // WHY: Optional ambience must never block or invalidate celebration UI.
    }

    return () => {
      if (crackleTimer !== null) window.clearInterval(crackleTimer);
      if (!context) return;
      try {
        masterGain?.gain.cancelScheduledValues(context.currentTime);
        masterGain?.gain.setValueAtTime(
          Math.max(masterGain.gain.value, 0.0001),
          context.currentTime,
        );
        masterGain?.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.08,
        );
        fireSource?.stop(context.currentTime + 0.09);
        window.setTimeout(() => void context?.close(), 120);
      } catch {
        void context.close();
      }
    };
  }, [active]);
}
