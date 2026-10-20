// 拼字盤：老師目前教到的中字音、高字音 × 母音（還沒教聲調符號）。
// 讀音照老師投影片寫法（ḅ ḍ、短 ะ å、ˇ 低聲調、ā 長音）；投影片還沒出現的母音是照同一套規則推的。
// 聲調：短母音（死音節）一律 ˇ 低聲調；長母音中字音不標、高字音加 ˊ 上聲（老師手畫的「/」）。
// 音檔是 Aom 念的 audio/aom/<音節>.mp3（scripts/gen-aom-audio.py 產生）。
export const COMBO_CONSONANTS = [
  { c: "ก", roma: "g" }, { c: "จ", roma: "j" }, { c: "ด", roma: "ḍ" },
  { c: "ต", roma: "d" }, { c: "ฎ", roma: "ḍ" }, { c: "ฏ", roma: "d" },
  { c: "บ", roma: "ḅ" }, { c: "ป", roma: "b" }, { c: "อ", roma: "" },
  { c: "ข", roma: "k", high: true }, { c: "ฐ", roma: "t", high: true },
  { c: "ถ", roma: "t", high: true }, { c: "ห", roma: "h", high: true }
];

export const COMBO_VOWELS = [
  { v: "◌ะ", roma: "å", dead: true }, { v: "◌า", roma: "ā" },
  { v: "◌ิ", roma: "i", dead: true }, { v: "◌ี", roma: "ī" },
  { v: "เ◌ะ", roma: "e", dead: true }, { v: "เ◌", roma: "ē" },
  { v: "◌อ", roma: "ɔ̄" }, { v: "เ◌าะ", roma: "ɔ", dead: true },
  { v: "ไ◌", roma: "ai" }, { v: "ใ◌", roma: "ai" },
  { v: "เ◌า", roma: "ao" }, { v: "◌ำ", roma: "am" },
  { v: "◌ุ", roma: "u", dead: true }, { v: "◌ู", roma: "ū" },
  { v: "โ◌ะ", roma: "o", dead: true }, { v: "โ◌", roma: "ō" }
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
  "อำ": "唬弄",
  "กุ": "捏造",
  "โก": "大哥",
  "จุ": "容納／很多",
  "ดุ": "兇／責罵",
  "ดู": "看",
  "ตุ": "發臭",
  "โต": "大／長大",
  "บุ": "襯裡／包覆",
  "โบ": "蝴蝶結",
  "ปุ": "噗（擬聲）／修補",
  "ปู": "螃蟹／鋪",
  "โปะ": "糊上／加碼",
  "โป": "骰寶／鼓起",
  "โอ": "哦／小碗",
  "ขา": "腿",
  "เข": "斜視",
  "ขอ": "請求／鉤子",
  "ไข": "脂肪／解開",
  "เขา": "他／山",
  "ขำ": "好笑",
  "โข": "很／非常",
  "ถะ": "中式佛塔",
  "ถา": "俯衝／撲向",
  "เถาะ": "兔年",
  "ไถ": "犁田／敲詐",
  "เถา": "藤蔓",
  "ถู": "擦",
  "โถ": "哎呀／有蓋罐",
  "หะ": "齊力吆喝聲",
  "หา": "找",
  "เห": "偏向",
  "หอ": "宿舍／樓閣",
  "เหาะ": "騰空飛行",
  "ไห": "罈子",
  "เหา": "頭蝨",
  "หู": "耳朵／把手"
};

// 發音完全相同、共用音檔（Aom 念單獨的 ใก 會念錯）
const SAME_AUDIO = { "ใก": "ไก", "ใข": "ไข", "ใถ": "ไถ", "ให": "ไห" };

// Aom 單念聲調一直念錯的音節：點了改念含這個音節的整個單字（查證來源見 docs/combo-words.md）
const CARRIER_WORDS = {
  "โข": { word: "มากโข", zh: "很多" },
  "เหะ": { word: "เมาเหะ", zh: "爛醉" },
  "เห": { word: "เหรัญญิก", zh: "出納（เห-รัน-ยิก）" },
  "ถู": { word: "ถูพื้น", zh: "拖地" },
  "เข": { word: "ตาเข", zh: "鬥雞眼" }
};

// 念不準、又找不到含這個音節的單字：點了不出聲（Nalin 2026-10-20 拍板）
const MUTED = new Set(["หะ", "หี", "โหะ", "โขะ"]);

export function comboRow(c) {
  const con = COMBO_CONSONANTS.find(x => x.c === c);
  return COMBO_VOWELS.map(({ v, roma, dead }) => {
    const syl = v.replace("◌", c);
    const tone = dead ? "ˇ" : con.high ? "ˊ" : "";
    // ฐ 跟 ถ 同音（送氣 t、高字音），Aom 念罕用的 ฐ 常念錯，整排用 ถ 的音檔
    const asThor = syl.replace("ฐ", "ถ");
    const spoken = SAME_AUDIO[asThor] || asThor;
    const carrier = CARRIER_WORDS[spoken];
    const audio = MUTED.has(spoken) ? null : "aom/" + (carrier ? carrier.word : spoken) + ".mp3";
    return { syl, roma: con.roma + roma + tone, audio,
             zh: COMBO_WORDS[syl] || "", carrier };
  });
}

export function allCombos() {
  return COMBO_CONSONANTS.flatMap(({ c }) => comboRow(c));
}
