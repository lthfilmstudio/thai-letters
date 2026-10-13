// 拼字盤：老師目前教到的中字音 × 母音（還沒教聲調符號）。
// 讀音照老師投影片寫法（ḅ ḍ、短 ะ å、ˇ 低聲調、ā 長音）；投影片還沒出現的母音是照同一套規則推的。
// 音檔是 Aom 念的 audio/aom/<音節>.mp3（scripts/gen-aom-audio.py 產生）。
export const COMBO_CONSONANTS = [
  { c: "ก", roma: "g" }, { c: "จ", roma: "j" }, { c: "ด", roma: "ḍ" },
  { c: "ต", roma: "d" }, { c: "ฎ", roma: "ḍ" }, { c: "ฏ", roma: "d" },
  { c: "บ", roma: "ḅ" }, { c: "ป", roma: "b" }, { c: "อ", roma: "" }
];

export const COMBO_VOWELS = [
  { v: "◌ะ", roma: "åˇ" }, { v: "◌า", roma: "ā" },
  { v: "◌ิ", roma: "iˇ" }, { v: "◌ี", roma: "ī" },
  { v: "เ◌ะ", roma: "eˇ" }, { v: "เ◌", roma: "ē" },
  { v: "◌อ", roma: "ɔ̄" }, { v: "เ◌าะ", roma: "ɔˇ" },
  { v: "ไ◌", roma: "ai" }, { v: "ใ◌", roma: "ai" },
  { v: "เ◌า", roma: "ao" }, { v: "◌ำ", roma: "am" }
];

// 本身就是常用單字的音節（查證來源見 docs/combo-words.md）
export const COMBO_WORDS = {
  "กะ": "和／估計",
  "กา": "烏鴉／水壺",
  "กอ": "一叢",
  "เกาะ": "島",
  "เกา": "抓癢",
  "กำ": "握",
  "จะ": "將要",
  "เจ": "齋菜",
  "จอ": "螢幕",
  "เจาะ": "鑽孔",
  "ใจ": "心",
  "จำ": "記得",
  "ดี": "好",
  "ใด": "哪個",
  "ดำ": "黑",
  "เดา": "猜",
  "เดาะ": "顛球",
  "ตา": "眼睛／外公",
  "ติ": "批評",
  "ตี": "打",
  "เตะ": "踢",
  "ตอ": "樹墩",
  "ไต": "腎臟",
  "เตา": "爐子",
  "ตำ": "搗",
  "เบะ": "撇嘴",
  "เบาะ": "座墊",
  "ใบ": "葉子／張",
  "เบา": "輕",
  "ปะ": "補",
  "ปา": "丟",
  "ปี": "年",
  "ไป": "去",
  "อา": "叔叔／姑姑",
  "ไอ": "咳嗽",
  "เอา": "拿／要",
  "อำ": "唬弄"
};

// 發音完全相同、共用音檔（Aom 念單獨的 ใก 會念錯）
const SAME_AUDIO = { "ใก": "ไก" };

export function comboRow(c) {
  const con = COMBO_CONSONANTS.find(x => x.c === c);
  return COMBO_VOWELS.map(({ v, roma }) => {
    const syl = v.replace("◌", c);
    return { syl, roma: con.roma + roma, audio: "aom/" + (SAME_AUDIO[syl] || syl) + ".mp3", zh: COMBO_WORDS[syl] || "" };
  });
}

export function allCombos() {
  return COMBO_CONSONANTS.flatMap(({ c }) => comboRow(c));
}
