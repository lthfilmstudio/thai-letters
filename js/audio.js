import { SPEECH } from "../data/speech.js";

let current = null;

// Recorded audio (textbook CD, Aom for the rest). kind 0 = the letter, 1 = its name.
export function speak(c, kind = 0) {
  stopSpeaking();
  const src = SPEECH[c]?.[kind];
  if (!src) return null;
  return playFile(src);
}

// src is a path under audio/
export function playFile(src) {
  stopSpeaking();
  const audio = current = new Audio("audio/" + src);
  // A refused play() (not one we stopped ourselves) reports through the same error event
  audio.play().catch(err => { if (err.name !== "AbortError") audio.dispatchEvent(new Event("error")); });
  return audio;
}

export function stopSpeaking() {
  if (current) current.pause();
  current = null;
}
