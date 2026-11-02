import { SPEECH } from "../data/speech.js";

let current = null;

// Recorded audio (textbook CD, Aom for the rest). kind 0 = the letter, 1 = its name.
export function speak(c, kind = 0) {
  stopSpeaking();
  const src = SPEECH[c]?.[kind];
  if (!src) return null;
  return playFile(src);
}

// The lthfilmstudio.com zone makes browsers keep every clip 4 hours (Browser Cache TTL rewrites
// any cache-control, no-cache included). After re-recording clips, bump this so they refetch.
const AUDIO_REV = "3";

// src is a path under audio/
export function playFile(src) {
  stopSpeaking();
  const audio = current = new Audio("audio/" + src + "?v=" + AUDIO_REV);
  // A refused play() (not one we stopped ourselves) reports through the same error event
  audio.play().catch(err => { if (err.name !== "AbortError") audio.dispatchEvent(new Event("error")); });
  return audio;
}

export function stopSpeaking() {
  if (current) current.pause();
  current = null;
}
