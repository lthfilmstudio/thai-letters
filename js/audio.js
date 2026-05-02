export function speak(text) {
  if (!("speechSynthesis" in window)) return null;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "th-TH";
  utter.rate = 0.7;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
  return utter;
}
