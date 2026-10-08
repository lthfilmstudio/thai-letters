import { SPEECH } from "../data/speech.js";

let current = null;

// Recorded audio (textbook CD, Aom for the rest). kind 0 = the letter, 1 = its name.
export function speak(c, kind = 0) {
  stopSpeaking();
  const src = SPEECH[c]?.[kind];
  if (!src) return null;
  current = new Audio("audio/" + src);
  current.play().catch(() => {});
  return current;
}

export function stopSpeaking() {
  if (current) current.pause();
  current = null;
}
