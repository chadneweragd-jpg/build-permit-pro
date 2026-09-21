'use client';

import {
  speakWithSelectedVoice,
  stopSpeaking,
  getAvailableVoices,
  saveSelectedVoice,
  VOICE_STORAGE_KEY,
  VoiceOption
} from '@/lib/audio/voice';

export {
  speakWithSelectedVoice,
  stopSpeaking,
  getAvailableVoices,
  saveSelectedVoice,
  VOICE_STORAGE_KEY
};
export type { VoiceOption };

/**
 * Speaks text using the user-preferred voice with natural cadence (rate: 1.02, pitch: 1.0).
 */
export function speakNatural(text: string, overrideVoiceName?: string) {
  if (overrideVoiceName) {
    saveSelectedVoice(overrideVoiceName);
  }
  speakWithSelectedVoice(text);
}

/**
 * Tests the selected voice with the prompt: "Navigation voice ready."
 */
export function testVoice(voiceName?: string) {
  if (voiceName) {
    saveSelectedVoice(voiceName);
  }
  speakWithSelectedVoice('Navigation voice ready.');
}

