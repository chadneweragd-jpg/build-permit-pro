// lib/audio/voice.ts

export const VOICE_STORAGE_KEY = 'bpp_selected_voice';
export const LEGACY_VOICE_STORAGE_KEY = 'bpp_preferred_voice';

export interface VoiceOption {
  name: string;
  lang: string;
  isNatural: boolean;
}

/**
 * Speaks text using the user's saved navigation voice with a natural cadence.
 * Shares the exact same voice engine as turn-by-turn navigation and Scout Assistant.
 */
export function speakWithSelectedVoice(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // Stop any active audio
  const utterance = new SpeechSynthesisUtterance(text);

  const savedVoiceName =
    localStorage.getItem(VOICE_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_VOICE_STORAGE_KEY);
  const voices = window.speechSynthesis.getVoices();

  if (savedVoiceName) {
    const matchedVoice = voices.find((v) => v.name === savedVoiceName);
    if (matchedVoice) utterance.voice = matchedVoice;
  } else {
    // Default fallback to first natural English voice
    const naturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Premium') ||
            v.name.includes('Samantha') ||
            v.name.includes('Jenny') ||
            v.name.includes('Guy') ||
            v.name.includes('Aria'))
      ) || voices.find((v) => v.lang.startsWith('en'));
    if (naturalVoice) utterance.voice = naturalVoice;
  }

  utterance.rate = 1.02;
  utterance.pitch = 1.0;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

/**
 * Immediately cancels any ongoing speech synthesis across the application.
 */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Returns whether speech synthesis is currently active.
 */
export function isCurrentlySpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Returns prioritized list of English voices for voice selection.
 */
export function getAvailableVoices(): VoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

  const allVoices = window.speechSynthesis.getVoices();
  const enVoices = allVoices.filter((v) => v.lang.startsWith('en'));

  const isNaturalVoice = (name: string) =>
    name.includes('Natural') ||
    name.includes('Google') ||
    name.includes('Premium') ||
    name.includes('Samantha') ||
    name.includes('Jenny') ||
    name.includes('Guy') ||
    name.includes('Aria') ||
    name.includes('Online');

  return enVoices
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      isNatural: isNaturalVoice(v.name)
    }))
    .sort((a, b) => {
      if (a.isNatural && !b.isNatural) return -1;
      if (!a.isNatural && b.isNatural) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Saves the selected voice name to localStorage so all drives and Scout assistant share it.
 */
export function saveSelectedVoice(voiceName: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_STORAGE_KEY, voiceName);
  localStorage.setItem(LEGACY_VOICE_STORAGE_KEY, voiceName);
}

/**
 * Test voice playback helper.
 */
export function testVoice(voiceName?: string) {
  if (voiceName) {
    saveSelectedVoice(voiceName);
  }
  speakWithSelectedVoice('Scout navigation voice ready.');
}
