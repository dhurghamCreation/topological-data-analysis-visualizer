/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersistencePair } from '../types/tda';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function ensureAudioContext(): AudioContext | null {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setAudioMuted(muted: boolean) {
  isMuted = muted;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.3, audioCtx.currentTime);
  }
}

export function getIsAudioMuted(): boolean {
  return isMuted;
}

export function toggleAudioSonification(): boolean {
  setAudioMuted(!isMuted);
  return !isMuted;
}

export function isSonificationEnabled(): boolean {
  return !isMuted;
}

/**
 * Play a rich harmonic sonification tone for a persistence pair
 * H0: Sub-bass fundamental + warm 5th
 * H1: Crystal sine bell with harmonic overtones
 * H2: Ethereal ambient triad chord
 */
export function playPairSonification(pair: PersistencePair, volume = 0.35) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const lifetime = Math.max(0.02, pair.isInfinite ? 1.5 : pair.lifetime);
  const birth = Math.max(0, pair.birth);

  // Map birth & lifetime to musical frequency scale
  // Dimension-based base register:
  // H0: 110Hz - 220Hz (A2 - A3)
  // H1: 330Hz - 660Hz (E4 - E5)
  // H2: 587Hz - 1174Hz (D5 - D6)
  let baseFreq = 220;
  if (pair.dimension === 0) {
    baseFreq = 110 + (birth * 45) % 110;
  } else if (pair.dimension === 1) {
    baseFreq = 330 + (lifetime * 180) % 330;
  } else {
    baseFreq = 587 + (lifetime * 220) % 500;
  }

  const duration = Math.min(1.2, 0.2 + lifetime * 0.8);

  const gain = ctx.createGain();
  gain.connect(masterGain);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Oscillator 1: Fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = pair.dimension === 0 ? 'sine' : pair.dimension === 1 ? 'triangle' : 'sine';
  osc1.frequency.setValueAtTime(baseFreq, now);

  // Oscillator 2: Harmonic overtone / interval
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  const harmonicMult = pair.dimension === 0 ? 1.5 : pair.dimension === 1 ? 2.0 : 1.25; // Fifth, Octave, or Major 3rd
  osc2.frequency.setValueAtTime(baseFreq * harmonicMult, now);

  osc1.connect(gain);
  osc2.connect(gain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration + 0.05);
  osc2.stop(now + duration + 0.05);
}

/**
 * Play tactile button and interaction sound
 */
export function playSoundFeedback(
  type: 'click' | 'toggle' | 'step' | 'phase_transition' | 'export' | 'complete'
) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(masterGain);

  if (type === 'click') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.06);
  } else if (type === 'toggle') {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.09);
  } else if (type === 'step') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.04);
  } else if (type === 'phase_transition') {
    // Shimmering chime for Euler phase transitions
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const chimeGain = ctx.createGain();
      chimeGain.connect(masterGain!);
      chimeGain.gain.setValueAtTime(0.001, now + i * 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.04 + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.4);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.connect(chimeGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.45);
    });
  } else if (type === 'export' || type === 'complete') {
    // Ascending arpeggio
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      const expGain = ctx.createGain();
      expGain.connect(masterGain!);
      expGain.gain.setValueAtTime(0.001, now + i * 0.06);
      expGain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
      expGain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.3);

      osc.connect(expGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });
  }
}

/**
 * Play a resonant topological frequency when a simplex or cycle is selected in 3D
 */
export function playSimplexTone(dim: 0 | 1 | 2 | 'cycle', seed = 1) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const baseFreqs = {
    0: 587.33, // D5 (Point)
    1: 440.00, // A4 (1-Edge)
    2: 329.63, // E4 (2-Triangle)
    cycle: 659.25, // E5 (H1 Cycle)
  };

  const root = baseFreqs[dim] || 440;
  const freq = root * (1 + ((seed % 7) - 3) * 0.04);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = dim === 'cycle' ? 'triangle' : dim === 2 ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.38);
}

