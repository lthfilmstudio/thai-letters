export function speak(text, lang = "th-TH") {
  if (!("speechSynthesis" in window)) return null;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.7;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
  return utter;
}
