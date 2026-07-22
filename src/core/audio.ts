/** Prononciation via Web Speech API (hors-ligne, voix système en-US). */

let cached: SpeechSynthesisVoice | null = null;

export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(): SpeechSynthesisVoice | null {
  const all = speechSynthesis.getVoices();
  const us = all.filter((v) => v.lang.replace('_', '-').startsWith('en-US'));
  return (
    us.find((v) => /Samantha|Google US English/i.test(v.name)) ??
    us[0] ??
    all.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { cached = null; };
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  cached ??= pickVoice();
  if (cached) u.voice = cached;
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
