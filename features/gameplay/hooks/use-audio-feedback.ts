"use client";

import { useCallback } from "react";

export type AudioFeedbackName =
  | "pick"
  | "drop"
  | "error"
  | "correct"
  | "day-complete"
  | "waypoint-complete"
  | "badge-unlock";

type VictorySound = "triumphant-chord" | "bright-fanfare" | "crowd-cheer";

/**
 * Extend this pool when new victory treatments are added.
 *
 * The names intentionally describe the experience rather than a numbered file,
 * making it safe to replace a synthesized treatment with a recorded asset later
 * without changing gameplay callers.
 */
const VICTORY_SOUND_POOL = [
  "triumphant-chord",
  "bright-fanfare",
  "crowd-cheer",
] as const satisfies readonly VictorySound[];

let lastVictorySoundIndex = -1;

/** Returns the browser's current Web Audio constructor, including Safari. */
function getAudioContextConstructor(): typeof AudioContext | undefined {
  return window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
}

/**
 * Randomly chooses a victory sound without immediately repeating the last one.
 *
 * Avoiding consecutive repetition preserves the requested variety while every
 * remaining pool member still has an equal chance of selection.
 */
function chooseVictorySound(): VictorySound {
  const availableIndexes = VICTORY_SOUND_POOL
    .map((_, index) => index)
    .filter((index) => index !== lastVictorySoundIndex);
  const randomValues = new Uint32Array(1);
  window.crypto.getRandomValues(randomValues);
  const selectedIndex = availableIndexes[
    (randomValues[0] ?? 0) % availableIndexes.length
  ] ?? 0;
  lastVictorySoundIndex = selectedIndex;
  return VICTORY_SOUND_POOL[selectedIndex] ?? "triumphant-chord";
}

/** Closes a short-lived context after every scheduled sound has finished. */
function closeAudioContextAfter(context: AudioContext, seconds: number): void {
  window.setTimeout(() => {
    void context.close();
  }, Math.ceil((seconds + 0.15) * 1_000));
}

/** Plays the quiet rising pickup and settling placement cues. */
function playInteractionTone(
  context: AudioContext,
  name: "pick" | "drop",
): void {
  const startedAt = context.currentTime;
  const duration = name === "pick" ? 0.07 : 0.1;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(name === "pick" ? 480 : 360, startedAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    name === "pick" ? 720 : 190,
    startedAt + duration,
  );
  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.gain.exponentialRampToValueAtTime(0.11, startedAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + duration);
  closeAudioContextAfter(context, duration);
}

/** Plays a short descending dissonance for incomplete or incorrect answers. */
function playErrorTone(context: AudioContext): void {
  const startedAt = context.currentTime;
  const duration = 0.28;
  const gain = context.createGain();

  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.gain.exponentialRampToValueAtTime(0.16, startedAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
  gain.connect(context.destination);
  [246.94, 220].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(
      130.81 - index * 18,
      startedAt + duration,
    );
    oscillator.connect(gain);
    oscillator.start(startedAt + index * 0.035);
    oscillator.stop(startedAt + duration);
  });
  closeAudioContextAfter(context, duration);
}

/** Plays a full major chord with a rising final note. */
function playTriumphantChord(context: AudioContext): void {
  const startedAt = context.currentTime;
  const duration = 0.78;
  const gain = context.createGain();

  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.gain.exponentialRampToValueAtTime(0.15, startedAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
  gain.connect(context.destination);
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, startedAt);
    oscillator.connect(gain);
    oscillator.start(startedAt + index * 0.065);
    oscillator.stop(startedAt + duration);
  });
  closeAudioContextAfter(context, duration);
}

/** Plays a quick sparkling arpeggio followed by a warm resolving chord. */
function playBrightFanfare(context: AudioContext): void {
  const startedAt = context.currentTime;
  const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51];
  const duration = 0.95;

  notes.forEach((frequency, index) => {
    const noteStart = startedAt + index * 0.1;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = index < 3 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.34);
  });
  closeAudioContextAfter(context, duration);
}

/**
 * Synthesizes a crowd-like cheer from filtered noise and rising human-range voices.
 *
 * This gives the project a usable cheer without embedding an unlicensed sample.
 * A recorded, licensed crowd asset can replace this treatment later while the
 * stable pool name and gameplay integration remain unchanged.
 */
function playCrowdCheer(context: AudioContext): void {
  const startedAt = context.currentTime;
  const duration = 1.25;
  const sampleCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const envelope = Math.sin(Math.PI * progress) ** 0.45;
    channel[index] = (Math.random() * 2 - 1) * envelope;
  }

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noise.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1_150, startedAt);
  filter.Q.setValueAtTime(0.7, startedAt);
  noiseGain.gain.setValueAtTime(0.0001, startedAt);
  noiseGain.gain.exponentialRampToValueAtTime(0.2, startedAt + 0.12);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(context.destination);
  noise.start(startedAt);

  [185, 215, 248, 278, 315].forEach((frequency, index) => {
    const voice = context.createOscillator();
    const voiceGain = context.createGain();
    const voiceStart = startedAt + index * 0.055;
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(frequency, voiceStart);
    voice.frequency.linearRampToValueAtTime(frequency + 90, voiceStart + 0.5);
    voiceGain.gain.setValueAtTime(0.0001, voiceStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.025, voiceStart + 0.08);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
    voice.connect(voiceGain);
    voiceGain.connect(context.destination);
    voice.start(voiceStart);
    voice.stop(startedAt + duration);
  });
  closeAudioContextAfter(context, duration);
}

/** Routes one randomly selected victory treatment through the shared pool. */
function playVictorySound(context: AudioContext): void {
  const sound = chooseVictorySound();
  if (sound === "bright-fanfare") {
    playBrightFanfare(context);
  } else if (sound === "crowd-cheer") {
    playCrowdCheer(context);
  } else {
    playTriumphantChord(context);
  }
}

/**
 * Plays optional feedback only when the synchronized user preference permits it.
 *
 * Core gameplay cues are synthesized immediately so missing placeholder MP3
 * files cannot make interactions silent. Later feature sounds retain their
 * file-based contract and fail safely until their dedicated phases add assets.
 */
export function useAudioFeedback(): (name: AudioFeedbackName) => void {
  return useCallback((name: AudioFeedbackName): void => {
    if (
      typeof document === "undefined" ||
      document.documentElement.dataset.audioEnabled === "false"
    ) {
      return;
    }

    if (name === "pick" || name === "drop" || name === "error" || name === "correct") {
      const AudioContextConstructor = getAudioContextConstructor();
      if (!AudioContextConstructor) return;
      try {
        const context = new AudioContextConstructor();
        if (name === "pick" || name === "drop") playInteractionTone(context, name);
        else if (name === "error") playErrorTone(context);
        else playVictorySound(context);
      } catch {
        // WHY: Feedback audio must never interrupt or invalidate gameplay.
      }
      return;
    }

    const audio = new Audio(`/audio/${name}.mp3`);
    void audio.play().catch(() => {
      // WHY: Planned audio assets fail silently until their feature phase.
    });
  }, []);
}
