// Turn-by-turn navigation — voice guidance via the Web Speech API.
// No React. Safe to import in SSR (guards window access).
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md

/** Preferred voice locale for our Roman-script Hinglish cues. */
export const DEFAULT_VOICE_LOCALE = 'en-IN';

/** localStorage key for the persisted mute preference. */
const MUTE_KEY = 'dhg:nav:muted';

let muted = false;
let muteLoaded = false;

/** SSR-safe accessor for the browser SpeechSynthesis engine. */
function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

/** Load the persisted mute preference once (best-effort). */
function loadMute(): void {
  if (muteLoaded) return;
  muteLoaded = true;
  if (typeof window === 'undefined') return;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
}

/** True when this browser can speak. */
export function isVoiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * Pick the best available voice for a locale: exact match first, then any
 * voice whose language shares the primary subtag (e.g. "en-IN" -> "en-*").
 * Pure function; returns null when nothing matches.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string
): SpeechSynthesisVoice | null {
  const target = locale.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === target);
  if (exact) return exact;

  const base = target.split('-')[0];
  const prefix = voices.find((v) =>
    v.lang.toLowerCase().split('-')[0] === base
  );
  return prefix ?? null;
}

export interface SpeakOptions {
  /** BCP-47 locale; defaults to DEFAULT_VOICE_LOCALE. */
  locale?: string;
  /** Cancel any in-flight utterance before speaking (default true). */
  interrupt?: boolean;
}

/** Speak a cue. No-op when empty, muted, or unsupported. Best-effort. */
export function speak(text: string, options: SpeakOptions = {}): void {
  const message = text.trim();
  if (!message) return;

  loadMute();
  if (muted) return;

  const engine = synth();
  if (!engine || !isVoiceSupported()) return;

  const { locale = DEFAULT_VOICE_LOCALE, interrupt = true } = options;

  try {
    if (interrupt) engine.cancel();

    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.lang = locale;

    const voice = pickVoice(engine.getVoices(), locale);
    if (voice) utterance.voice = voice;

    utterance.rate = 1;
    utterance.pitch = 1;

    engine.speak(utterance);
  } catch {
    // Voice is a nicety; never let it break navigation.
  }
}

/** Stop any in-flight speech. */
export function cancelSpeech(): void {
  try {
    synth()?.cancel();
  } catch {
    // ignore
  }
}

/** Current mute state (loads the persisted preference on first call). */
export function isMuted(): boolean {
  loadMute();
  return muted;
}

/** Set and persist the mute preference; muting also cancels speech. */
export function setMuted(next: boolean): void {
  muted = next;
  muteLoaded = true;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
      // ignore storage failures
    }
  }
  if (next) cancelSpeech();
}
