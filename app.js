/**
 * AI Ingliz tili ustozi
 *
 * Chat goes to /api/chat. The Groq key stays in the server environment.
 * Recent turns stay in memory. localStorage keeps the level, voice prefs, and the notebook only.
 */

const AVATAR_STATES = ["idle", "listening", "thinking", "speaking", "surprised"];

const STATUS_TEXT = {
  idle: "Kutmoqda",
  listening: "Tinglayapman",
  thinking: "O‘ylayapman",
  speaking: "Gapiryapman",
  surprised: "Hayronman",
};

const EMPTY_COPY = {
  user: "Hali gapirmadingiz.",
  analysis: "Maslahat shu yerda chiqadi.",
  reply: "Javob shu yerda chiqadi.",
  subtitle: "Bugun nima haqida gaplashamiz.",
};

const NOTEBOOK_KEY = "ai-tutor-notebook";
const MODE_KEY = "ai-tutor-level";
const HANDS_FREE_KEY = "ai-tutor-handsfree";
const RATE_KEY = "ai-tutor-rate";
const MAX_TURNS = 8;
const NOTEBOOK_LIMIT = 40;
const SURPRISE_MS = 900;
const VOICE_WAIT_MS = 800;
const LISTEN_LIMIT_MS = 12000;

const MESSAGES = {
  missingServerKey: "Serverda GROQ_API_KEY yo‘q. Render sozlamasiga kalitni qo‘ying.",
  offline: "Ustoz serveri topilmadi. Sahifani server manzili orqali oching.",
  badKey: "API kaliti yaroqsiz yoki muddati o‘tgan. Serverdagi Groq kalitini tekshiring.",
  quota: "Hozir navbat to‘lib qoldi. Bir zum kutib, qayta yubor.",
  network: "Tarmoq xatosi. Internetni tekshirib, qayta urinib ko‘ring.",
  timeout: "Javob kechikdi. Gapni yana bir marta yuboring.",
  server: "Ustoz hozir javob bermadi. Gapni yana bir marta yuboring.",
  malformed: "Ustoz javobi noto‘g‘ri formatda keldi. Qayta yuborib ko‘ring.",
  noReply: "Ustoz javobi kelmadi.",
  unsupportedMic:
    "Bu brauzer ovozni matnga aylantira olmaydi. Gapni yozib yuboring. Ayrim telefonlarda mikrofon faqat Chrome da ishlaydi.",
  micDenied: "Mikrofonga ruxsat berilmadi. Telefon sozlamasidan ruxsat bering yoki gapni yozing.",
  noSpeech: "Hech narsa eshitilmadi. Qayta gapiring yoki matn yozing.",
  noMic: "Mikrofon topilmadi. Qurilmangizni tekshiring.",
  micFailed: "Ovoz yozilmadi. Qayta urinib ko‘ring.",
  emptySpeech: "Bo‘sh ovoz keldi. Qayta gapirib ko‘ring.",
  micNetwork: "Ovozni tanish xizmati javob bermadi. Qayta urinib ko‘ring.",
  listeningHint: "Gapiring…",
  noTts: "Bu brauzer javobni ovoz chiqarib o‘qiy olmaydi. Matn kartada qoladi.",
  noVoice: "Ovoz topilmadi. Javobni o‘qib bo‘lmaydi, matn kartada qoladi.",
  ttsFailed: "Javobni o‘qish to‘xtadi. Matn kartada qoladi.",
};

const TUTOR_MODES = {
  beginner: {
    label: "Noldan (A1–A2)",
    hint: "Oddiy gaplar, asosiy so‘zlar, sabrli izoh.",
    coach:
      "Teach from zero in simple connected words. Spoken Uzbek stays everyday and kind. Set up the one useful point, carry it into the full English sentence as plain words, and land on asking them to try that sentence. The only punctuation allowed is a period.",
  },
  conversation: {
    label: "Jonli Muloqot (B1–B2)",
    hint: "Kundalik nutq, idiomalar va phrasal verb.",
    coach:
      "This is Jonli suhbat: talk like a person across the table, openly and in a thought that builds. If the English is off, say what is off, carry the reason into the full natural English sentence as plain words, and land on the next question. The only punctuation allowed is a period.",
  },
  advanced: {
    label: "Mukammal / Advanced (C1)",
    hint: "Nozik ifoda va aniqroq lug‘at.",
    coach:
      "Coach nuanced C1–C2 English in complete spoken Uzbek. Open on the tone or collocation, carry it into one full sharper English sentence as plain words, and land on a follow-up. The only punctuation allowed is a period.",
  },
  ielts: {
    label: "IELTS Tayyorgarlik (Band 6.5–8.5+)",
    hint: "Speaking 1–3, band bahosi va mashq.",
    coach:
      "Coach IELTS Speaking Parts 1, 2, and 3 toward a higher band. Start from the relevant criterion in words, such as lexical resource or fluency, carry that into one full higher-band English sentence as plain words, and land on one Speaking question. The only punctuation allowed is a period.",
  },
};

const SYSTEM_INSTRUCTION = `You are a real person: a candid, articulate Uzbek-speaking English coach sitting with one learner.
They may be a complete beginner or an IELTS candidate. They mix Uzbek and English. They say ordinary things, such as kecha do‘stim bilan gaplashdim, or they want a real sentence for a friend.

Never open like a textbook. Do not start a reply with salom qandaysan, salom qandeysan, or a line shaped like X ingliz tilida. Answer the person directly and calmly. If they want the English for do‘st, put it in one lived sentence. Do‘st bu friend va do‘stingni sog‘insang I miss you friend deyasan.

You understand Uzbek accurately, including spoken spelling and code-switching. Treat o‘, o', oʻ, g‘, and g' as normal Uzbek letters. Understand the learner if they use slang. Do not answer with a slang pack, and do not invent catchphrases. Leave the wording clean so a custom phrase list can be added later.
Write idiomatic spoken Uzbek, the way a sharp warm person actually talks, not a word-for-word translation from English. Use ordinary Uzbek word order and real endings. The verb usually sits near the end of the clause. Spell o‘ and g‘ as Uzbek letters. Start from what they just said, carry the idea one step further, and land on something they can say. Do not jump from a label to a finished answer. Do not announce the steps. Vary the opening. Explain the shade of meaning in plain words. Do not recycle one correction template. Avoid stiff lines such as iltimos e'tibor bering, quyidagi iborani qo'llang, demak xulosa qilsak, birinchi navbatda, and xulosa qilib aytganda.
For a translation or meaning question, give the everyday English first. Add one more precise or formal alternative only when it actually changes the meaning or the register.

Stay concise enough to hear in one calm breath. spoken_reply is usually one flowing sentence, or two when the thought truly turns. Finish the thought. Never stop mid-word, and do not pad with a lecture.

Your own English is always a full natural grammatical sentence. Never speak broken bot English as yourself, such as I am go or thanks or menks. You may repeat a broken phrase only when it is the learner's exact mistake, and the next sentence must be the complete correct one, for example I am going to school. or Thank you.

The words inside reaction_and_correction and spoken_reply may contain only letters, spaces, and periods. In Uzbek a period closes a completed sentence, when the thought has a finished shape and the next thought begins. Do not put a period after one word, inside a phrase, or in the middle of an unfinished clause. Connect an unfinished step with va, chunki, or shuning uchun. No commas, quotation marks, exclamation marks, question marks, colons, semicolons, hyphens, dashes, brackets, slashes, or emojis. The only mark allowed inside a word is the Uzbek letter in o‘ and g‘. Show a question by word order, and if that question is a finished sentence close it with a period.

Never use prosto or vapshe, in any spelling. Do not replace them with another filler such as karochi, norm, tema, varianti, or takshta. If you need simply, at all, or really, say shunchaki, umuman, aslo, or haqiqatan.

Return ONLY JSON with these fields:
- reaction_and_correction (string)
- spoken_reply (string)
- notebook (array, possibly empty)

reaction_and_correction:
- Write a short human explanation in spoken Uzbek, as a mentor sitting next to them, not a checklist.
- Letters, spaces, and periods only. No other punctuation and no symbols.
- Notice the exact words they just used. If the English or Uzbek answer is wrong, say what they tried and what is off, stay warm and direct, then give the full correct sentence. If the answer is right, say so in ordinary words before you add anything.
- If the word, phrase, grammar, or tone is wrong or awkward, say it openly and specifically. You may say Nima deyapsan u bunaqa deyilmaydi boshqacha deyiladi when the miss is obvious, but do not start every reply that way. Then give one finished reason and the full natural English sentence as words.
- Soften only the sharpness for A1, never the honesty. For a correct line, react like a person who noticed, and skip the scolding.
- When the mode is IELTS, or they ask for formal English, show the everyday sentence and one higher-band sentence, with one concrete reason they differ.
- Add one coaching tip matched to the level. If they ask for a mashq or exercise, give one complete short task.
- No stock fillers and no slang quota. Never write prosto or vapshe.
- Start the string with the single word SURPRISE when you corrected a mistake, handled an Uzbek mix-up or translation, gave a sharp IELTS tip, or reacted strongly. Otherwise start with the single word CALM. Do not put a colon after it.
- After that word, write for the learner. Do not mention the word. End on a finished thought.

spoken_reply:
- This is said aloud in one even unhurried flow. Sound like a calm person thinking out loud, not a bot and not a list of short stops.
- Build the thought in order. Open from their words, including a wrong answer, continue with the reason or the shade of meaning, and land on one practical line they can actually say. Do not skip ahead to the English sentence with no setup, and do not stop on a bare label.
- Letters, spaces, and periods only. No commas, quotation marks, exclamation marks, question marks, colons, dashes, brackets, or emojis.
- Put a period only where a sentence is grammatically finished. Do not put one after a fragment or inside a phrase. A second period starts the next finished sentence.
- Never mix Uzbek and English inside the same sentence. Write one finished Uzbek sentence, then a period, then the English sentence or phrase, then a period, then the next Uzbek sentence, then a period.
- Join an unfinished Uzbek step with chunki, shuning uchun, or va. Do not use formulaic bridges such as demak, xulosa, birinchi, or ikkinchi.
- The English sentence is plain words with no quotation marks. Example shape, not a script to copy: Kecha haqida gapirsang ish tugaganini aytasan. I went to school yesterday. Endi kecha nima qilganingni shu gap bilan aytib ber.
- Do not begin with salom qandaysan or X ingliz tilida. Start on the useful thought.
- If nothing was wrong, still answer in full Uzbek words. When you offer English, keep that full sentence as words. Then ask exactly one follow-up by word order.
- Vary the wording from turn to turn. Match their level with simpler or slightly richer Uzbek. A1 is simpler, not broken. IELTS ends with one complete Speaking question in words.
- If they ask for a mashq, give one complete spoken task and still end with a question in words.
- Never add a turn-taking cue such as sen navbating, your turn, or endi sen gapir. The reply ends, then you wait.
- Never write prosto or vapshe.
- No SURPRISE or CALM word here. No markdown.

notebook:
- Each item is { "kind": "correction" or "phrase" or "word", "title": "...", "note": "..." }.
- correction: a real mistake and the full better English sentence.
- phrase: one useful natural English sentence from this turn.
- word: a translation or vocabulary note, with the Uzbek word and the English.
- title and note are letters, spaces, and periods only.
- Use an empty array when nothing is worth keeping.
- Do not put SURPRISE, CALM, prosto, or vapshe in notebook fields.

The learner's earlier turns are included in the conversation. Remember them when you answer a follow-up.
No markdown. Do not leave any field unfinished.`;

const avatarEl = document.getElementById("avatar");
const statusEl = document.getElementById("status");
const statusTextEl = document.getElementById("status-text");
const subtitleEl = document.getElementById("subtitle");
const modeListEl = document.getElementById("mode-list");
const modeHintEl = document.getElementById("mode-hint");
const stageModeEl = document.getElementById("stage-mode");
const formEl = document.getElementById("composer");
const inputEl = document.getElementById("user-input");
const micBtn = document.getElementById("mic-btn");
const micLabelEl = document.getElementById("mic-label");
const langBtn = document.getElementById("lang-toggle");
const langValueEl = document.getElementById("lang-value");
const userCardEl = document.getElementById("card-user");
const analysisCardEl = document.getElementById("card-analysis");
const replyCardEl = document.getElementById("card-reply");
const stopSpeechBtn = document.getElementById("stop-speech");
const handsFreeBtn = document.getElementById("hands-free");
const replayBtn = document.getElementById("replay-speech");
const rateGroupEl = document.querySelector(".rate-group");
const speechNoticeEl = document.getElementById("speech-notice");
const notebookListEl = document.getElementById("notebook-list");
const notebookEmptyEl = document.getElementById("notebook-empty");
const notebookClearEl = document.getElementById("notebook-clear");

/** @type {"uz-UZ" | "en-US"} */
let speechLang = "uz-UZ";
let micActive = false;
let sequenceTimers = [];
let requestSerial = 0;
/** @type {AbortController | null} */
let activeRequest = null;
/**
 * Recent tutor turns. Memory only — not localStorage — so a follow-up
 * still sees the question that came before it.
 * @type {{ user: string, model: string }[]}
 */
const conversation = [];
/** @type {"offline" | "backend"} */
let chatMode = "offline";
let chatModeReady = Promise.resolve();
/** @type {keyof typeof TUTOR_MODES} */
let tutorMode = "beginner";
/**
 * Latest tutor line queued for speechSynthesis.
 * @type {{ text: string, lang: "uz-UZ" | "en-US" } | null}
 */
let pendingSpeech = null;
/** @type {SpeechRecognition | null} */
let recognition = null;
let listeningGeneration = 0;
let liveTranscript = "";
let speechToken = 0;
let speechArmed = false;
let handsFree = true;
let quietStrikes = 0;
let speechRate = 0.9;
let rateChosen = false;
/** @type {{ text: string, lang: "uz-UZ" | "en-US" } | null} */
let lastSpoken = null;
let listenTimer = 0;
let holdingMic = false;
let holdReleasePending = false;
let committedFinal = "";
let pendingInterim = "";
let speechWatchdog = 0;
let handsFreeTimer = 0;
let resumeAfterThisSpeech = false;

/**
 * Single place that changes the character.
 * Restarting the attribute replays one-shot animations such as surprise.
 * @param {"idle" | "listening" | "thinking" | "speaking" | "surprised"} state
 */
function setAvatarState(state) {
  if (!AVATAR_STATES.includes(state)) return;

  avatarEl.dataset.state = "";
  void avatarEl.offsetWidth;
  avatarEl.dataset.state = state;
  if (state === "idle" || state === "listening" || state === "thinking") {
    delete avatarEl.dataset.mood;
  }

  statusEl.dataset.state = state;
  statusTextEl.textContent = STATUS_TEXT[state];
  if (state !== "speaking") stopMouth();
  if (state === "thinking") setSticker(replyMood || "think", true);
  else if (state === "surprised") setSticker(replyMood || "scream", true);
  else if (state !== "speaking") setSticker("calm", true);
}

const FACE_SPECS = [
  ["calm", "#ffffff", "#d5e4f5", "open", "soft", ""],
  ["grin", "#fffdf5", "#f0d48a", "open", "grin", "blush"],
  ["beam", "#fff8ee", "#f0b429", "shut", "teeth", "blush"],
  ["squint", "#fff7fb", "#ffb3c9", "shut", "laugh", "blush"],
  ["sweatlaugh", "#fff7fb", "#ffb3c9", "shut", "laugh", "sweat"],
  ["joy", "#fff4f8", "#ff9bb5", "shut", "laugh", "tears"],
  ["rofl", "#fff1f6", "#ff8fab", "shut", "laugh", "tilt"],
  ["angel", "#f7fbff", "#b9d4ff", "shut", "soft", "halo"],
  ["melt", "#fff8f2", "#ffc7a3", "sleepy", "soft", "melt"],
  ["soft", "#ffffff", "#f3c1d3", "open", "soft", "blush"],
  ["love", "#fff5f8", "#ff9ec4", "heart", "soft", "blush"],
  ["tearsmile", "#f7fbff", "#b9d4ff", "open", "soft", "tear"],
  ["kiss", "#fff5f8", "#ffb3d0", "shut", "kiss", "blush"],
  ["star", "#fffdf2", "#f0d36a", "star", "grin", ""],
  ["zany", "#f6fff4", "#9adf7a", "wink", "tongue", ""],
  ["money", "#f4fff6", "#7dcea0", "dollar", "grin", ""],
  ["hug", "#fff7f2", "#ffc2a8", "shut", "soft", "hug"],
  ["giggle", "#fff7fb", "#ffb3c9", "open", "flat", "giggle"],
  ["think", "#f7fbff", "#9dcbff", "up", "flat", "chin"],
  ["shush", "#f8fafc", "#c5d0dc", "open", "flat", "shush"],
  ["peek", "#ffffff", "#d5e4f5", "peek", "soft", "peek"],
  ["salute", "#f4f8ff", "#9db7e8", "open", "flat", "salute"],
  ["sick", "#f3fff6", "#8fd19a", "sleepy", "wavy", ""],
  ["vomit", "#f3fff4", "#7dcea0", "shut", "wavy", "vomit"],
  ["mask", "#f7fbff", "#b9d4ff", "open", "flat", "mask"],
  ["hot", "#fff1ee", "#ff8d7a", "sleepy", "tongue", "hot"],
  ["cold", "#f3f8ff", "#8eb6ff", "shut", "wavy", "cold"],
  ["shake", "#ffffff", "#d5e4f5", "wide", "flat", ""],
  ["drool", "#f7fbff", "#b9d4ff", "sleepy", "soft", "drool"],
  ["cowboy", "#fff8ee", "#e2b56a", "open", "grin", "hat"],
  ["spiral", "#f8f6ff", "#c4b5fd", "spiral", "oh", ""],
  ["blown", "#fff7ee", "#ffb35c", "wide", "oh", "blown"],
  ["dizzy", "#f8f6ff", "#c4b5fd", "cross", "wavy", ""],
  ["woozy", "#f8fff4", "#b7e4a8", "uneven", "wavy", ""],
  ["monocle", "#f7fbff", "#9dcbff", "open", "flat", "monocle"],
  ["plead", "#f7fbff", "#b9d4ff", "wide", "soft", "plead"],
  ["scream", "#fff6f4", "#ffb0a4", "wide", "oh", "scream"],
  ["huff", "#fff4f2", "#ffb0a4", "open", "flat", "steam"],
  ["swear", "#fff1ee", "#ff8d7a", "shut", "flat", "scribble"],
  ["rage", "#ffe8e4", "#ff6b57", "wide", "frown", "steam"],
  ["angry", "#fff4f2", "#ff8d7a", "open", "frown", "brows"],
  ["persevere", "#fff6f2", "#ffc2a8", "shut", "flat", "sweat"],
  ["anxious", "#f4f8ff", "#b9cff0", "wide", "wavy", "sweat"],
  ["yawn", "#f7fbff", "#c5d7ee", "sleepy", "oh", "yawn"],
];

const STICKER_ALIAS = { laugh: "joy", explain: "think", sad: "plead" };
const STICKER_IDS = new Set(FACE_SPECS.map((spec) => spec[0]));
const MOOD_PALETTES = {
  firm: ["think", "persevere", "huff", "monocle", "plead", "angry", "grin"],
  warm: ["soft", "love", "angel", "kiss", "tearsmile", "grin", "hug"],
  laugh: ["squint", "joy", "rofl", "sweatlaugh", "beam", "giggle"],
  think: ["think", "monocle", "peek", "salute", "shush"],
  low: ["plead", "anxious", "tearsmile", "yawn", "melt"],
  sick: ["sick", "woozy", "dizzy", "spiral", "mask", "cold", "vomit"],
  calm: ["calm", "soft", "think", "grin", "peek", "salute", "beam"],
};
const WORD_MOOD = {
  yaxshi: "grin",
  zor: "beam",
  ajoyib: "star",
  great: "grin",
  good: "soft",
  nice: "soft",
  happy: "grin",
  rahmat: "soft",
  thanks: "soft",
  thank: "soft",
  hello: "cowboy",
  hey: "cowboy",
  salom: "soft",
  kul: "squint",
  kulgi: "joy",
  haha: "joy",
  qiziq: "joy",
  funny: "rofl",
  love: "love",
  miss: "tearsmile",
  friend: "hug",
  dost: "hug",
  sevgi: "love",
  sevaman: "love",
  sweet: "kiss",
  think: "think",
  oyla: "think",
  why: "monocle",
  how: "monocle",
  nima: "think",
  qanday: "think",
  meaning: "monocle",
  quiet: "shush",
  jim: "shush",
  sekin: "shush",
  look: "peek",
  see: "peek",
  qara: "peek",
  ready: "salute",
  tayyor: "salute",
  sick: "sick",
  kasal: "sick",
  ill: "mask",
  hot: "hot",
  issiq: "hot",
  cold: "cold",
  sovuq: "cold",
  wow: "blown",
  voy: "blown",
  really: "scream",
  xato: "huff",
  wrong: "angry",
  mistake: "persevere",
  error: "persevere",
  deyil: "angry",
  emas: "huff",
  yoq: "huff",
  stop: "rage",
  bas: "rage",
  sorry: "plead",
  afsus: "plead",
  sad: "plead",
  yomon: "anxious",
  qiyin: "anxious",
  worry: "anxious",
  tired: "yawn",
  sleep: "drool",
  charchadim: "yawn",
  yes: "beam",
  ha: "soft",
  right: "grin",
  togri: "grin",
  correct: "salute",
  money: "money",
  crazy: "zany",
};
const MISS_PATTERNS = [
  /\bi\s+am\s+go\b/,
  /\bi\s+going\b/,
  /\bi\s+go\s+yesterday\b/,
  /\byesterday\s+i\s+go\b/,
  /\bhe\s+go\b/,
  /\bshe\s+go\b/,
  /\bthey\s+is\b/,
  /\bhe\s+don't\b/,
  /\bshe\s+don't\b/,
  /\bi\s+is\b/,
  /\bdon't\s+no\b/,
  /\bme\s+(is|am|are|want)\b/,
  /\bthanks\s+you\b/,
  /\bmore\s+(good|better)\b/,
  /\bi\s+want\s+go\b/,
  /\bi\s+can\s+to\b/,
  /\bgo\s+to\s+home\b/,
  /\bi\s+am\s+agree\b/,
];

let stickersReady = false;
let stickerName = "calm";
let stickerAt = 0;
let replyMood = "think";
let userMissed = false;
let speechPalette = "calm";
let speechCursor = 0;

function svgNode(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
  return node;
}

function starPoints(cx, cy, outer, inner) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(" ");
}

function mountStickers() {
  if (stickersReady || !avatarEl) return;
  stickersReady = true;
  avatarEl.querySelectorAll(".sticker").forEach((node) => node.remove());
  FACE_SPECS.forEach((spec) => avatarEl.appendChild(buildSticker(spec)));
}

function buildSticker(spec) {
  const [id, fill, stroke, eyes, mouth, extra] = spec;
  const svg = svgNode("svg", { class: `sticker sticker-${id}`, viewBox: "0 0 200 200", "aria-hidden": "true" });
  const root = extra === "tilt" ? svgNode("g", { transform: "rotate(-8 100 108)" }) : svg;
  if (extra === "tilt") svg.appendChild(root);
  const add = (node) => root.appendChild(node);
  add(svgNode("rect", { x: "18", y: "18", width: "164", height: "164", rx: "36", fill, stroke, "stroke-width": "4" }));
  if (extra === "halo") {
    add(svgNode("ellipse", { cx: "100", cy: "16", rx: "36", ry: "10", fill: "none", stroke: "#f5c542", "stroke-width": "6" }));
  }
  if (extra === "hat") {
    add(svgNode("path", { d: "M58 70h84l-12-26H70z", fill: "#c9892d" }));
    add(svgNode("rect", { x: "40", y: "66", width: "120", height: "12", rx: "4", fill: "#8a5a16" }));
  }
  if (extra === "brows" || mouth === "frown" || extra === "steam") addBrows(add, "angry");
  else if (extra === "plead" || extra === "tear" || eyes === "wide" && mouth === "wavy") addBrows(add, "sad");
  else if (extra === "chin" || extra === "monocle") addBrows(add, "think");
  addEyes(add, eyes);
  addMouth(add, mouth);
  addExtra(add, extra);
  return svg;
}

function addBrows(add, kind) {
  const stroke = kind === "angry" ? "#c2412d" : "#2457c5";
  if (kind === "angry") {
    add(svgNode("path", { d: "M58 70l28 14", fill: "none", stroke, "stroke-width": "7", "stroke-linecap": "round" }));
    add(svgNode("path", { d: "M142 70l-28 14", fill: "none", stroke, "stroke-width": "7", "stroke-linecap": "round" }));
    return;
  }
  if (kind === "sad") {
    add(svgNode("path", { d: "M58 86c10-12 22-12 30 0", fill: "none", stroke, "stroke-width": "5", "stroke-linecap": "round" }));
    add(svgNode("path", { d: "M112 86c8-12 20-12 30 0", fill: "none", stroke, "stroke-width": "5", "stroke-linecap": "round" }));
    return;
  }
  add(svgNode("path", { d: "M58 74l26 8", fill: "none", stroke, "stroke-width": "6", "stroke-linecap": "round" }));
  add(svgNode("path", { d: "M116 78h28", fill: "none", stroke, "stroke-width": "6", "stroke-linecap": "round" }));
}

function addEyes(add, type) {
  const left = 76;
  const right = 124;
  const y = 96;
  if (type === "shut") {
    add(svgNode("path", { d: "M60 96c10 12 22 12 32 0", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    add(svgNode("path", { d: "M108 96c10 12 22 12 32 0", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    return;
  }
  if (type === "heart") {
    [left, right].forEach((cx) => {
      add(svgNode("path", {
        d: `M${cx} ${y + 8} C${cx - 16} ${y - 10} ${cx - 8} ${y - 20} ${cx} ${y - 6} C${cx + 8} ${y - 20} ${cx + 16} ${y - 10} ${cx} ${y + 8} Z`,
        fill: "#e11d48",
      }));
    });
    return;
  }
  if (type === "star") {
    [left, right].forEach((cx) => add(svgNode("polygon", { points: starPoints(cx, y, 14, 6), fill: "#f5b400" })));
    return;
  }
  if (type === "dollar") {
    [left, right].forEach((cx) => {
      add(svgNode("circle", { cx, cy: y, r: "14", fill: "#147a3d" }));
      add(svgNode("path", {
        d: `M${cx + 4} ${y - 8}c-8-2-12 2-8 6s12 4 8 8-2 8-8 6`,
        fill: "none",
        stroke: "#fff",
        "stroke-width": "3",
        "stroke-linecap": "round",
      }));
    });
    return;
  }
  if (type === "spiral") {
    [left, right].forEach((cx) => {
      add(svgNode("path", {
        d: `M${cx} ${y} m-1 0 a2 2 0 1 1 5 0 a5 5 0 1 1 -10 0 a8 8 0 1 1 16 0`,
        fill: "none",
        stroke: "#5b4b8a",
        "stroke-width": "3",
      }));
    });
    return;
  }
  if (type === "cross") {
    [left, right].forEach((cx) => {
      add(svgNode("path", { d: `M${cx - 10} ${y - 10}l20 20M${cx + 10} ${y - 10}l-20 20`, fill: "none", stroke: "#5b4b8a", "stroke-width": "5", "stroke-linecap": "round" }));
    });
    return;
  }
  if (type === "wink") {
    add(svgNode("path", { d: "M60 96c10 12 22 12 32 0", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    addOpenEye(add, right, y, 12);
    return;
  }
  if (type === "sleepy") {
    [left, right].forEach((cx) => {
      add(svgNode("path", { d: `M${cx - 14} ${y} h28`, fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
      add(svgNode("path", { d: `M${cx - 12} ${y} a12 10 0 0 0 24 0`, fill: "#1d4fbe" }));
    });
    return;
  }
  if (type === "wide") {
    [left, right].forEach((cx) => addOpenEye(add, cx, y, 16));
    return;
  }
  if (type === "peek") {
    add(svgNode("path", { d: "M48 78h40v28H48z", fill: "#1b2838" }));
    addOpenEye(add, right, y, 12);
    return;
  }
  if (type === "uneven") {
    addOpenEye(add, left, y - 6, 11);
    addOpenEye(add, right, y + 8, 14);
    return;
  }
  if (type === "up") {
    [left, right].forEach((cx) => {
      add(svgNode("circle", { cx, cy: y, r: "13", fill: "#fff", stroke: "#1d4fbe", "stroke-width": "3" }));
      add(svgNode("circle", { cx, cy: y - 5, r: "5", fill: "#1d4fbe" }));
    });
    return;
  }
  [left, right].forEach((cx) => addOpenEye(add, cx, y, 13));
}

function addOpenEye(add, cx, cy, r) {
  add(svgNode("circle", { cx, cy, r, fill: "#1d4fbe" }));
  add(svgNode("circle", { cx: cx + 4, cy: cy - 4, r: "4", fill: "#fff" }));
}

function addMouth(add, type) {
  if (type === "grin" || type === "soft") {
    const drop = type === "grin" ? 18 : 12;
    add(svgNode("path", { d: `M70 128c16 ${drop} 44 ${drop} 60 0`, fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    return;
  }
  if (type === "teeth" || type === "laugh") {
    add(svgNode("path", { d: "M68 118c16 30 48 30 64 0", fill: "#1b2838" }));
    add(svgNode("rect", { x: "78", y: "124", width: "44", height: "8", fill: "#fff" }));
    return;
  }
  if (type === "frown") {
    add(svgNode("path", { d: "M72 146c14-18 42-18 56 0", fill: "none", stroke: "#c2412d", "stroke-width": "6", "stroke-linecap": "round" }));
    return;
  }
  if (type === "oh") {
    add(svgNode("ellipse", { cx: "100", cy: "136", rx: "16", ry: "18", fill: "#1b2838" }));
    return;
  }
  if (type === "kiss") {
    add(svgNode("circle", { cx: "100", cy: "136", r: "8", fill: "none", stroke: "#e11d48", "stroke-width": "4" }));
    return;
  }
  if (type === "flat") {
    add(svgNode("path", { d: "M76 136h48", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    return;
  }
  if (type === "tongue") {
    add(svgNode("path", { d: "M74 128c12 10 40 10 52 0", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
    add(svgNode("ellipse", { cx: "100", cy: "142", rx: "10", ry: "12", fill: "#ff7a93" }));
    return;
  }
  if (type === "wavy") {
    add(svgNode("path", { d: "M70 136c10 10 14-10 24 0s14-10 26 0", fill: "none", stroke: "#1b2838", "stroke-width": "6", "stroke-linecap": "round" }));
  }
}

function addExtra(add, extra) {
  if (extra === "blush" || extra === "giggle" || extra === "kiss") {
    add(svgNode("circle", { cx: "52", cy: "118", r: "8", fill: "#ffb3c9" }));
    add(svgNode("circle", { cx: "148", cy: "118", r: "8", fill: "#ffb3c9" }));
  }
  if (extra === "tear" || extra === "plead") {
    add(svgNode("path", { d: "M124 112c4 12 4 20 0 28", fill: "none", stroke: "#5aa7ff", "stroke-width": "5", "stroke-linecap": "round" }));
  }
  if (extra === "tears") {
    add(svgNode("path", { d: "M70 108c6 16 6 28 0 40", fill: "none", stroke: "#5aa7ff", "stroke-width": "5", "stroke-linecap": "round" }));
    add(svgNode("path", { d: "M130 108c6 16 6 28 0 40", fill: "none", stroke: "#5aa7ff", "stroke-width": "5", "stroke-linecap": "round" }));
  }
  if (extra === "sweat") {
    add(svgNode("path", { d: "M146 70c8 10 8 16 0 24c-6-8-6-14 0-24z", fill: "#7ec8ff" }));
  }
  if (extra === "melt") {
    add(svgNode("path", { d: "M40 150c8 18 8 28 0 36M160 146c-8 16-6 28 2 36", fill: "none", stroke: "#ffb089", "stroke-width": "8", "stroke-linecap": "round" }));
  }
  if (extra === "mask") {
    add(svgNode("rect", { x: "58", y: "118", width: "84", height: "36", rx: "16", fill: "#e8eef5", stroke: "#8aa4c8", "stroke-width": "3" }));
    add(svgNode("path", { d: "M58 132H36M142 132h22", fill: "none", stroke: "#8aa4c8", "stroke-width": "4" }));
  }
  if (extra === "hot") {
    add(svgNode("path", { d: "M148 58c8-14 18-8 12 6", fill: "none", stroke: "#ff6b57", "stroke-width": "4", "stroke-linecap": "round" }));
  }
  if (extra === "cold") {
    add(svgNode("path", { d: "M46 64h16M54 56v16M148 150h14M155 143v14", fill: "none", stroke: "#6aa7ff", "stroke-width": "3" }));
  }
  if (extra === "drool") {
    add(svgNode("path", { d: "M118 142c6 16 4 28-2 36", fill: "none", stroke: "#7ec8ff", "stroke-width": "5", "stroke-linecap": "round" }));
  }
  if (extra === "vomit") {
    add(svgNode("path", { d: "M88 146c8 16 20 22 24 34", fill: "none", stroke: "#67b36a", "stroke-width": "8", "stroke-linecap": "round" }));
  }
  if (extra === "steam" || extra === "blown") {
    add(svgNode("path", { d: "M78 58c6-12 16-8 12 4M112 52c8-14 18-6 10 8", fill: "none", stroke: "#ff8d7a", "stroke-width": "4", "stroke-linecap": "round" }));
  }
  if (extra === "scribble") {
    add(svgNode("path", { d: "M72 128l10 12 8-14 10 16 8-12 10 14", fill: "none", stroke: "#c2412d", "stroke-width": "4", "stroke-linecap": "round" }));
  }
  if (extra === "monocle") {
    add(svgNode("circle", { cx: "124", cy: "96", r: "18", fill: "none", stroke: "#2457c5", "stroke-width": "4" }));
    add(svgNode("path", { d: "M142 108c10 16 10 28 4 36", fill: "none", stroke: "#2457c5", "stroke-width": "3" }));
  }
  if (extra === "shush") {
    add(svgNode("rect", { x: "118", y: "118", width: "14", height: "36", rx: "7", fill: "#f3c7a8" }));
  }
  if (extra === "peek") {
    add(svgNode("path", { d: "M42 86h52v22H42z", fill: "#f3c7a8" }));
  }
  if (extra === "salute") {
    add(svgNode("path", { d: "M108 78h34", fill: "none", stroke: "#f3c7a8", "stroke-width": "10", "stroke-linecap": "round" }));
  }
  if (extra === "hug") {
    add(svgNode("path", { d: "M36 110c-8 20 8 36 20 28M164 110c8 20-8 36-20 28", fill: "none", stroke: "#f3c7a8", "stroke-width": "10", "stroke-linecap": "round" }));
  }
  if (extra === "giggle") {
    add(svgNode("path", { d: "M78 124c14 16 30 16 44 0v16H78z", fill: "#f3c7a8" }));
  }
  if (extra === "chin") {
    add(svgNode("circle", { cx: "132", cy: "150", r: "10", fill: "#f3c7a8" }));
  }
  if (extra === "yawn") {
    add(svgNode("path", { d: "M126 118c18 8 22 28 8 36", fill: "none", stroke: "#f3c7a8", "stroke-width": "10", "stroke-linecap": "round" }));
  }
  if (extra === "scream") {
    add(svgNode("circle", { cx: "48", cy: "92", r: "12", fill: "#f3c7a8" }));
    add(svgNode("circle", { cx: "152", cy: "92", r: "12", fill: "#f3c7a8" }));
  }
}

function setSticker(next, force) {
  mountStickers();
  const name = STICKER_ALIAS[next] || next;
  if (!STICKER_IDS.has(name) || !avatarEl) return;
  const now = performance.now();
  if (!force && name !== stickerName && now - stickerAt < 150) return;
  if (name === stickerName) return;
  stickerName = name;
  stickerAt = now;
  avatarEl.dataset.sticker = name;
  avatarEl.querySelectorAll(".sticker.is-shown").forEach((node) => node.classList.remove("is-shown"));
  const face = avatarEl.querySelector(`.sticker-${name}`);
  if (face) face.classList.add("is-shown");
}

function normalizeToken(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[‘’ʼ`ʻ]/g, "'")
    .replace(/[^a-z0-9']/g, "");
}

function wordMood(raw) {
  const word = normalizeToken(raw);
  if (!word) return "";
  if (WORD_MOOD[word]) return WORD_MOOD[word];
  if (word.startsWith("kul")) return "joy";
  if (word.startsWith("oyla") || word.startsWith("o'yla")) return "think";
  if (word.startsWith("xato") || word.startsWith("noto")) return "huff";
  if (word.startsWith("afsus")) return "plead";
  if (word.startsWith("charch")) return "yawn";
  if (word.startsWith("sogin")) return "tearsmile";
  return "";
}

function paletteForText(text) {
  const sample = String(text || "").toLowerCase().replace(/[‘’ʼ`ʻ]/g, "'");
  if (/\b(xato|noto\w*|wrong|mistake|deyil|emas|boshqacha|stop|angry)\b/.test(sample)) return "firm";
  if (/\b(kasal|sick|dizzy|sovuq|issiq|hot|cold|vomit)\b/.test(sample)) return "sick";
  if (/\b(afsus|sorry|sad|qiyin|yomon|worry|tired)\b/.test(sample)) return "low";
  if (/\b(kul\w*|haha|funny|qiziq)\b/.test(sample)) return "laugh";
  if (/\b(sevgi|sevaman|love|friend|dost|miss|rahmat|thanks)\b/.test(sample)) return "warm";
  if (/\b(nima|qanday|why|how|think|oyla)\b/.test(sample)) return "think";
  return "calm";
}

function isLikelyMiss(text) {
  const sample = String(text || "").toLowerCase().replace(/[‘’ʼ`ʻ]/g, "'");
  return MISS_PATTERNS.some((pattern) => pattern.test(sample));
}

function noteUserLine(text) {
  userMissed = isLikelyMiss(text);
  const hit = wordMood(text) || stickerFromText(text);
  if (userMissed) replyMood = "think";
  else if (hit) replyMood = hit;
  else replyMood = "soft";
  speechPalette = userMissed ? "firm" : paletteForText(text);
}

function stickerFromText(text) {
  const parts = String(text || "").split(/\s+/);
  for (let i = 0; i < parts.length; i += 1) {
    const hit = wordMood(parts[i]);
    if (hit) return hit;
  }
  return "";
}

function openingSticker(text) {
  return stickerFromText(text) || (MOOD_PALETTES[speechPalette] || MOOD_PALETTES.calm)[0];
}

function nextSpeechSticker(word, paceFast) {
  const hit = wordMood(word);
  if (hit) return hit;
  const palette = MOOD_PALETTES[speechPalette] || MOOD_PALETTES.calm;
  if (paceFast) return speechCursor % 2 === 0 ? "huff" : "shake";
  speechCursor += 1;
  let pick = palette[speechCursor % palette.length];
  if (pick === stickerName) pick = palette[(speechCursor + 1) % palette.length];
  return pick;
}

let mouthFrame = 0;
let mouthBoost = 0;
let mouthBoostAt = 0;
let mouthRunning = false;

function setMouth(level) {
  const next = Math.max(0, Math.min(1, Number(level) || 0));
  avatarEl.style.setProperty("--mouth", next.toFixed(3));
}

function stopMouth() {
  mouthRunning = false;
  mouthBoost = 0;
  if (mouthFrame) cancelAnimationFrame(mouthFrame);
  mouthFrame = 0;
  setMouth(0);
  setSticker("calm", true);
}

function startMouth() {
  if (mouthRunning) return;
  mouthRunning = true;
  const tick = (now) => {
    if (!mouthRunning) return;
    const since = now - mouthBoostAt;
    const decay = mouthBoost * Math.exp(-since / 150);
    let speaking = false;
    try {
      speaking = speechOutputSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
    } catch {
      speaking = false;
    }
    const cadence = speaking && since > 260 ? 0.16 * (0.5 + 0.5 * Math.sin(now / 170)) : 0;
    setMouth(Math.min(1, decay + cadence));
    mouthFrame = requestAnimationFrame(tick);
  };
  mouthFrame = requestAnimationFrame(tick);
}

function nudgeMouth(sample, boundary) {
  const now = performance.now();
  const gap = mouthBoostAt ? now - mouthBoostAt : 999;
  const paceFast = boundary === "word" && gap > 40 && gap < 150;
  const vowels = (String(sample || "").match(/[aeiouy]/gi) || []).length;
  mouthBoost = boundary === "word" ? Math.min(1, 0.58 + vowels * 0.12) : Math.min(0.82, 0.36 + vowels * 0.16);
  mouthBoostAt = now;
  startMouth();
  if (boundary === "sentence") {
    speechPalette = paletteForText(sample) === "calm" ? speechPalette : paletteForText(sample);
    speechCursor = 0;
    setSticker(openingSticker(sample), true);
    return;
  }
  if (boundary !== "word" && now - stickerAt < 220) return;
  setSticker(nextSpeechSticker(sample, paceFast));
}

function clearSequence() {
  sequenceTimers.forEach((id) => clearTimeout(id));
  sequenceTimers = [];
}

function after(ms, fn) {
  const id = window.setTimeout(fn, ms);
  sequenceTimers.push(id);
}

function setCard(el, text, isEmpty) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("is-empty", Boolean(isEmpty));
}

function setSubtitle(text, isEmpty) {
  subtitleEl.textContent = text;
  subtitleEl.classList.toggle("is-empty", Boolean(isEmpty));
}

function syncMicButton() {
  micBtn.classList.toggle("is-live", micActive);
  micBtn.classList.toggle("is-holding", holdingMic && micActive);
  if (!(holdingMic && micActive)) micBtn.classList.remove("is-hearing");
  micBtn.setAttribute("aria-pressed", String(micActive));
  micLabelEl.textContent = micActive ? "Gapiring" : "Mikrofon";
  micBtn.setAttribute(
    "aria-label",
    micActive ? "Qo‘yib yuborsangiz yuboriladi" : "Bosib turing va gapiring"
  );
  inputEl.classList.toggle("is-live", micActive);
}

function syncStopButton() {
  if (!stopSpeechBtn) return;
  stopSpeechBtn.disabled = !speechArmed;
  stopSpeechBtn.classList.toggle("is-live", speechArmed);
  stopSpeechBtn.setAttribute("aria-disabled", String(!speechArmed));
}

function syncReplayButton() {
  if (!replayBtn) return;
  const ready = Boolean(lastSpoken && lastSpoken.text);
  replayBtn.disabled = !ready;
  replayBtn.setAttribute("aria-disabled", String(!ready));
}

function syncHandsFreeButton() {
  if (!handsFreeBtn) return;
  handsFreeBtn.classList.toggle("is-on", handsFree);
  handsFreeBtn.setAttribute("aria-pressed", String(handsFree));
}

function syncRateButtons() {
  if (!rateGroupEl) return;
  const active = String(speechRate);
  rateGroupEl.querySelectorAll("[data-rate]").forEach((button) => {
    const on = button.dataset.rate === active;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-checked", String(on));
  });
}

function clearListenTimer() {
  if (!listenTimer) return;
  clearTimeout(listenTimer);
  listenTimer = 0;
}

function clearSpeechWatchdog() {
  if (!speechWatchdog) return;
  clearInterval(speechWatchdog);
  speechWatchdog = 0;
}

function clearHandsFreeTimer() {
  if (!handsFreeTimer) return;
  clearTimeout(handsFreeTimer);
  handsFreeTimer = 0;
}

function showSpeechNotice(message) {
  speechNoticeEl.textContent = message || "";
}

function clearSpeechNotice() {
  speechNoticeEl.textContent = "";
}

function toggleLanguage() {
  speechLang = speechLang === "uz-UZ" ? "en-US" : "uz-UZ";
  langValueEl.textContent = speechLang;
  langBtn.setAttribute("aria-pressed", String(speechLang === "en-US"));
  langBtn.setAttribute(
    "aria-label",
    speechLang === "en-US" ? "Til: en-US. uz-UZ ga o‘tish" : "Til: uz-UZ. en-US ga o‘tish"
  );
  document.documentElement.dataset.speechLang = speechLang;
}

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speechOutputSupported() {
  return "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
}

/**
 * Stop the microphone without sending. Handlers are removed first so
 * abort() cannot submit or show a second error.
 * @param {{ submit?: boolean }} [options]
 */
function stopListening(options) {
  const submit = Boolean(options && options.submit);
  if (!micActive && !recognition) {
    holdReleasePending = false;
    holdingMic = false;
    document.documentElement.classList.remove("is-holding-mic");
    return false;
  }

  clearListenTimer();
  listeningGeneration += 1;
  const transcript = (committedFinal.trim() || pendingInterim.trim() || liveTranscript.trim());
  liveTranscript = "";
  committedFinal = "";
  pendingInterim = "";
  micActive = false;
  holdingMic = false;
  holdReleasePending = false;
  document.documentElement.classList.remove("is-holding-mic");
  syncMicButton();

  const rec = recognition;
  recognition = null;
  if (rec) {
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        // The recognizer had already stopped.
      }
    }
  }

  if (!submit) return false;
  if (!transcript || looksLikeEcho(transcript)) {
    const echoed = Boolean(transcript);
    quietStrikes = 0;
    setAvatarState("idle");
    setCard(userCardEl, echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech, false);
    setSubtitle(echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech, false);
    showSpeechNotice(echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech);
    return false;
  }

  quietStrikes = 0;
  clearSpeechNotice();
  inputEl.value = transcript;
  formEl.requestSubmit();
  return true;
}

function cancelSpeech() {
  speechToken += 1;
  speechArmed = false;
  pendingSpeech = null;
  clearSpeechWatchdog();
  syncStopButton();
  if (!speechOutputSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore browsers that throw when nothing is queued
  }
  stopMouth();
}

/**
 * Drop any in-flight tutor call, recording, or spoken reply so a test-bar
 * preview or a new message cannot be overwritten by a late response.
 */
function beginTurn() {
  clearSequence();
  clearHandsFreeTimer();
  resumeAfterThisSpeech = false;
  requestSerial += 1;
  cancelSpeech();
  stopListening({ submit: false });
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
  }
  return requestSerial;
}

function recognitionErrorMessage(code) {
  if (code === "not-allowed" || code === "service-not-allowed") return MESSAGES.micDenied;
  if (code === "no-speech") return MESSAGES.noSpeech;
  if (code === "audio-capture") return MESSAGES.noMic;
  if (code === "network") return MESSAGES.micNetwork;
  if (code === "aborted") return "";
  return MESSAGES.micFailed;
}

function normalizeHeard(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9‘'’\u0400-\u04ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeEcho(text) {
  if (!lastSpoken) return false;
  const heard = normalizeHeard(text);
  const spoken = normalizeHeard(lastSpoken.text);
  if (heard.length < 12 || spoken.length < 12) return false;
  if (spoken.includes(heard) || heard.includes(spoken)) return true;
  const heardWords = heard.split(" ").filter((word) => word.length > 2);
  const spokenWords = new Set(spoken.split(" "));
  if (heardWords.length < 4) return false;
  const hits = heardWords.filter((word) => spokenWords.has(word)).length;
  return hits / heardWords.length > 0.72;
}

function speechJoin(left, right) {
  return `${left || ""} ${right || ""}`.replace(/\s+/g, " ").trim();
}

function appendFinalChunk(piece) {
  const next = String(piece || "").replace(/\s+/g, " ").trim();
  if (!next) return;
  const base = committedFinal.trim();
  if (!base) {
    committedFinal = next;
    return;
  }
  const baseWords = base.split(" ");
  const nextWords = next.split(" ");
  let overlap = 0;
  const max = Math.min(baseWords.length, nextWords.length);
  for (let size = max; size > 0; size -= 1) {
    if (baseWords.slice(-size).join(" ").toLowerCase() === nextWords.slice(0, size).join(" ").toLowerCase()) {
      overlap = size;
      break;
    }
  }
  const fresh = nextWords.slice(overlap).join(" ").trim();
  if (!fresh) return;
  committedFinal = `${base} ${fresh}`.trim();
}

function showHeardText() {
  const shown = speechJoin(committedFinal, pendingInterim);
  liveTranscript = committedFinal.trim() || pendingInterim.trim();
  inputEl.value = shown;
  if (!shown) return;
  setCard(userCardEl, shown, false);
  setSubtitle(shown, false);
  statusTextEl.textContent = STATUS_TEXT.listening;
  if (holdingMic && speechJoin(committedFinal, pendingInterim)) micBtn.classList.add("is-hearing");
}

function absorbResults(event, committedIndexes) {
  let interim = "";
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const piece = result[0]?.transcript || "";
    if (result.isFinal) {
      if (committedIndexes.has(index)) continue;
      committedIndexes.add(index);
      appendFinalChunk(piece);
      continue;
    }
    if (index >= event.resultIndex) interim = speechJoin(interim, piece);
  }
  pendingInterim = interim.trim();
  showHeardText();
}

function attachRecognizer(Recognition, generation, hold) {
  const previous = recognition;
  if (previous) {
    previous.onresult = null;
    previous.onerror = null;
    previous.onend = null;
  }
  const rec = new Recognition();
  recognition = rec;
  rec.lang = speechLang;
  rec.continuous = hold;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  const committedIndexes = new Set();

  rec.onresult = (event) => {
    if (generation !== listeningGeneration) return;
    absorbResults(event, committedIndexes);
  };

  rec.onerror = (event) => {
    if (generation !== listeningGeneration) return;
    if (event.error === "aborted") return;
    if (hold && holdingMic && event.error === "no-speech") return;
    if (!hold && event.error === "no-speech") {
      stopListening({ submit: true });
      return;
    }
    const message = recognitionErrorMessage(event.error);
    if (!message) return;
    stopListening({ submit: false });
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setHandsFree(false, true);
    }
    setAvatarState("idle");
    setCard(userCardEl, message, false);
    setSubtitle(message, false);
    showSpeechNotice(message);
  };

  rec.onend = () => {
    if (generation !== listeningGeneration) return;
    if (hold && holdingMic) {
      pendingInterim = "";
      showHeardText();
      recognition = null;
      const restart = () => {
        if (!holdingMic || generation !== listeningGeneration) return;
        try {
          attachRecognizer(Recognition, generation, true);
        } catch {
          window.setTimeout(() => {
            if (!holdingMic || generation !== listeningGeneration) return;
            try {
              attachRecognizer(Recognition, generation, true);
            } catch {
              stopListening({ submit: Boolean(liveTranscript.trim()) });
            }
          }, 80);
        }
      };
      restart();
      return;
    }
    stopListening({ submit: true });
  };

  rec.start();
}

function startListening(options) {
  const hold = Boolean(options && options.hold);
  if (hold) {
    cancelSpeech();
    clearHandsFreeTimer();
    resumeAfterThisSpeech = false;
  } else if (speechArmed) return;
  unlockSpeech();
  const Recognition = getRecognitionCtor();
  if (!Recognition) {
    holdingMic = false;
    document.documentElement.classList.remove("is-holding-mic");
    beginTurn();
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.unsupportedMic, false);
    setSubtitle(MESSAGES.unsupportedMic, false);
    showSpeechNotice(MESSAGES.unsupportedMic);
    return;
  }

  beginTurn();
  if (hold) {
    holdingMic = true;
    document.documentElement.classList.add("is-holding-mic");
  }
  clearSpeechNotice();

  const generation = ++listeningGeneration;
  liveTranscript = "";
  committedFinal = "";
  pendingInterim = "";
  micActive = true;
  syncMicButton();
  setAvatarState("listening");
  setCard(userCardEl, MESSAGES.listeningHint, false);
  setSubtitle(MESSAGES.listeningHint, false);

  try {
    attachRecognizer(Recognition, generation, hold);
  } catch {
    clearListenTimer();
    listeningGeneration += 1;
    recognition = null;
    micActive = false;
    holdingMic = false;
    document.documentElement.classList.remove("is-holding-mic");
    syncMicButton();
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.micFailed, false);
    setSubtitle(MESSAGES.micFailed, false);
    showSpeechNotice(MESSAGES.micFailed);
    return;
  }

  if (hold) return;
  clearListenTimer();
  listenTimer = window.setTimeout(() => {
    if (generation !== listeningGeneration) return;
    stopListening({ submit: true });
  }, LISTEN_LIMIT_MS);
}

function finishHold() {
  if (holdReleasePending || !holdingMic) return;
  holdingMic = false;
  holdReleasePending = true;
  document.documentElement.classList.remove("is-holding-mic");
  const spoken = (speechJoin(committedFinal, pendingInterim) || inputEl.value).trim();
  pendingInterim = "";
  committedFinal = spoken;
  liveTranscript = spoken;
  if (spoken) inputEl.value = spoken;
  const sent = stopListening({ submit: true });
  if (!sent && spoken && !looksLikeEcho(spoken)) {
    inputEl.value = spoken;
    holdReleasePending = false;
    formEl.requestSubmit();
  }
}

function beginHold(event) {
  if (holdingMic) return;
  if (event && event.button != null && event.button !== 0) return;
  if (event) event.preventDefault();
  holdingMic = true;
  document.documentElement.classList.add("is-holding-mic");
  if (event && event.pointerId != null && micBtn.setPointerCapture) {
    try {
      micBtn.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail if the pointer already ended.
    }
  }
  startListening({ hold: true });
}

function pointerIsHold() {
  return holdingMic && !holdReleasePending;
}

function bindPushToTalk() {
  micBtn.addEventListener("pointerdown", beginHold);
  micBtn.addEventListener("pointerup", (event) => {
    if (!pointerIsHold()) return;
    event.preventDefault();
    finishHold();
  });
  micBtn.addEventListener("pointercancel", (event) => {
    if (!holdingMic) return;
    event.preventDefault();
    finishHold();
  });
  micBtn.addEventListener("contextmenu", (event) => event.preventDefault());
  micBtn.addEventListener("click", (event) => event.preventDefault());
  micBtn.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    beginHold({ button: 0, preventDefault() {} });
  });
  micBtn.addEventListener("keyup", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    finishHold();
  });
  const releaseHold = (event) => {
    if (!holdingMic) return;
    if (event) event.preventDefault();
    finishHold();
  };
  micBtn.addEventListener("mouseup", releaseHold);
  micBtn.addEventListener("touchend", releaseHold);
  window.addEventListener("pointerup", () => {
    if (holdingMic) finishHold();
  });
  window.addEventListener("pointercancel", () => {
    if (holdingMic) finishHold();
  });
  window.addEventListener("mouseup", () => {
    if (holdingMic) finishHold();
  });
  window.addEventListener("touchend", () => {
    if (holdingMic) finishHold();
  });
}

function ensureVoices() {
  const current = window.speechSynthesis.getVoices();
  if (current.length) return Promise.resolve(current);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, VOICE_WAIT_MS);
  });
}

const UZBEK_WORDS = new Set(
  `nima deyil deyapsan deyiladi deyasan deyilmaydi boshqacha qanday qandaysan rahmat yaxshi sen men bu mana va chunki shuning uchun yo'q yoq emas qil ayt aytasan ayting aytadi gapir gap ha lekin endi kel kecha bugun ertaga ish tugagan kerak to'g'ri tog'ri to'gri shu yerda bilan deb qilganingni qilding qildim aytib ber do'st dost ingliz tilida tilidan haqida gapirsang bo'ladi boladi bo'lsang bolsang sening mening uning biz siz ular bor ham esa agar unda keyin oldin ichida maktab maktabda do'stim dostim gaplashdim sog'insang soginsang mumkin ishlatasan yana bir qayta takrorla eshit yoz yozing o'qi o'qing ko'r ko'ring tushunarli mayli xo'sh qara hoy gapni shu gap bilan endi nima haqida ishlatasan bo'lgan qilgan keldim keldi bordim bordi aytdim`.split(
    /\s+/
  )
);

const ENGLISH_WORDS = new Set(
  `i you he she it we they me him her us them my your his our their a an the to of in on at for with from by as is am are was were be been being do does did have has had will would can could should may might might must not no yes and or but if then so that this these those there here what when where who why how went go going gone school yesterday today tomorrow friend thank thanks please sorry hello good morning night want need like love miss said say says very really just about because before after into over under again now well right wrong english sentence home walked way all yesterday i'm don't doesn't didn't it's that's you're we're they're i've can't won't miss friend`.split(
    /\s+/
  )
);

function foldWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[ʻʼ’‘\u2018\u2019\u02BB\u02BC]/g, "'");
}

function tokenLang(token) {
  const key = foldWord(String(token || "").replace(/\.+$/g, ""));
  if (!key) return "";
  if (ENGLISH_WORDS.has(key)) return "en-US";
  if (UZBEK_WORDS.has(key) || /o'|g'/.test(key)) return "uz-UZ";
  return "";
}

/**
 * Keep word order. Uzbek runs use an Uzbek voice and English runs use an English voice.
 */
function segmentLanguages(text) {
  const source = String(text || "").trim();
  if (!source) return [];
  const tokens = source.match(/[0-9A-Za-z\u0400-\u04FF\u2018\u2019\u02BB\u02BC']+\.?|\./g) || [];
  const labels = tokens.map((token) => tokenLang(token));
  for (let index = 0; index < labels.length; index += 1) {
    if (!labels[index] && index > 0) labels[index] = labels[index - 1];
  }
  for (let index = labels.length - 1; index >= 0; index -= 1) {
    if (!labels[index]) labels[index] = index + 1 < labels.length ? labels[index + 1] : "uz-UZ";
  }
  const parts = [];
  tokens.forEach((token, index) => {
    const lang = labels[index] || "uz-UZ";
    const prev = parts[parts.length - 1];
    if (prev && prev.lang === lang) {
      prev.text = token === "." ? `${prev.text}.` : `${prev.text} ${token}`;
      return;
    }
    if (token === ".") {
      if (prev) prev.text = `${prev.text}.`;
      return;
    }
    parts.push({ text: token, lang });
  });
  return parts
    .map((part) => ({ text: part.text.replace(/\s+\./g, ".").replace(/\s+/g, " ").trim(), lang: part.lang }))
    .filter((part) => part.text && part.text !== ".");
}

/**
 * One language per sentence. A period closes the Uzbek sentence, then the
 * English sentence, then the next Uzbek sentence.
 */
function languageSentences(text) {
  return segmentLanguages(text)
    .map((part) => {
      const line = part.text.replace(/\.+$/g, "").trim();
      return line ? `${line}.` : "";
    })
    .filter(Boolean)
    .join(" ");
}

function splitSentences(text) {
  const parts = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const mark = text[index];
    if (!".!?…".includes(mark)) continue;
    const next = text[index + 1];
    if (next && !/\s/.test(next)) continue;
    const piece = text.slice(start, index + 1).trim();
    if (piece) parts.push(piece);
    start = index + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

/**
 * Browsers clip a long utterance before the last words. Break only on a
 * sentence or a space, so a word is never cut in half.
 */
function splitForSpeech(segment) {
  const pieces = [];
  let buffer = "";
  const pushBuffer = () => {
    const text = buffer.trim();
    if (text) pieces.push({ text, lang: segment.lang });
    buffer = "";
  };
  splitSentences(segment.text).forEach((sentence) => {
    const next = sentence.trim();
    if (!next) return;
    const joined = buffer ? `${buffer} ${next}` : next;
    if (buffer && joined.length > 420) pushBuffer();
    buffer = buffer ? `${buffer} ${next}` : next;
  });
  pushBuffer();
  const even = [];
  pieces.forEach((piece) => {
    let rest = piece.text;
    while (rest.length > 420) {
      let cut = rest.lastIndexOf(" ", 420);
      if (cut < 24) cut = rest.indexOf(" ");
      if (cut <= 0) break;
      even.push({ text: rest.slice(0, cut).trim(), lang: segment.lang });
      rest = rest.slice(cut).trim();
    }
    if (rest) even.push({ text: rest, lang: segment.lang });
  });
  return even;
}

function spokenSegments(text) {
  return segmentLanguages(text).flatMap(splitForSpeech);
}

/**
 * Tutor lines keep letters, spaces, and periods. Uzbek o‘ and g‘ stay
 * inside the word. Every other mark is removed before the screen and the voice.
 */
function plainWords(value) {
  let text = String(value || "")
    .replace(/\b(?:vapshe|vabshe|vobshe|prosto|prosta)\b/gi, " ")
    .replace(/вообще|вобще|просто/gi, " ");
  text = text.replace(/([oOgG])['\u2018\u2019\u02BB\u02BC]/g, "$1\u2018");
  text = text.replace(/[^A-Za-z0-9\u0400-\u04FF\u2018\u2019\u02BC\s.]/g, " ");
  text = text.replace(/^(?:surprise|calm)\b\.?\s*/i, "");
  text = text.replace(
    /(?<![A-Za-z\u0400-\u04FF])[\u2018\u2019\u02BC]+|[\u2018\u2019\u02BC]+(?![A-Za-z\u0400-\u04FF])/g,
    " "
  );
  text = text.replace(/(\d)\.(\d)/g, "$1\u0001$2");
  text = text.replace(/(?:\s*\.\s*)+/g, ". ");
  text = text.replace(/\u0001/g, ".");
  text = text.replace(/^(?:\.\s*)+/, "");
  return languageSentences(relaxStops(text.replace(/\s+/g, " ").trim()));
}

/**
 * A period is a full breath, not a stop after every few words.
 * Short pieces are joined so the voice keeps speaking.
 */
function relaxStops(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const pieces = trimmed
    .replace(/(\d)\.(\d)/g, "$1\u0001$2")
    .split(/\.\s*/)
    .map((part) => part.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
  if (!pieces.length) return "";
  const kept = [];
  let bucket = "";
  const wordsIn = (line) => line.split(/\s+/).filter(Boolean).length;
  pieces.forEach((piece, index) => {
    bucket = bucket ? `${bucket} ${piece}` : piece;
    const last = index === pieces.length - 1;
    if (!last && wordsIn(bucket) < 2) return;
    kept.push(bucket.trim());
    bucket = "";
  });
  if (bucket.trim()) kept.push(bucket.trim());
  const line = kept.filter(Boolean).join(". ");
  if (!line) return "";
  return line.endsWith(".") ? line : `${line}.`;
}

const FALLBACK_SPOKEN = "Kechirasiz bu gapni yana bir marta ayting.";

function ensureSpoken(value) {
  const clean = plainWords(value);
  return clean || FALLBACK_SPOKEN;
}

function prepareSpokenText(text) {
  return ensureSpoken(text);
}

function voiceName(voice) {
  return `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
}

function voiceNaturalScore(voice) {
  const name = voiceName(voice);
  let score = 0;
  if (/natural|neural|premium|enhanced|google|siri|online/.test(name)) score += 24;
  if (/robot|compact|espeak/.test(name)) score -= 30;
  if (
    /\bmale\b|\bman\b|david|daniel|alex\b|fred|mark|james|ryan|george|brian|matthew|andrew|eric|john|paul|rishi|arthur|gordon|ralph|aaron|christopher|oliver|nathan|ahmet|emre|tolga|erkek|erkak|yusuf|mehmet/.test(
      name
    )
  ) {
    score += 16;
  }
  if (
    /\bfemale\b|\bwoman\b|zira|hazel|samantha|victoria|susan|karen|moira|fiona|tessa|serena|kate|salli|ivy|joanna|kimberly|linda|ayanda|yelda|heather|catherine|allison|jenny|aria|natasha|irina|milena|ayse|ayşe|fatma|zehra|emel|filiz/.test(
      name
    )
  ) {
    score -= 10;
  }
  if (voice.localService) score += 2;
  return score;
}

function bestVoice(voices) {
  let best = null;
  let bestScore = -1;
  voices.forEach((voice) => {
    const score = voiceNaturalScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });
  return best;
}

function chooseVoice(voices, lang) {
  const list = Array.isArray(voices) ? voices : [];
  const uzbek = lang !== "en-US";
  if (uzbek) {
    const uz = list.filter((voice) => {
      const voiceLang = String(voice.lang || "").toLowerCase();
      return voiceLang === "uz" || voiceLang.startsWith("uz-") || /uzbek|o‘zbek|ozbek/.test(voiceName(voice));
    });
    if (uz.length) return bestVoice(uz);
    const turkish = list.filter((voice) => {
      const voiceLang = String(voice.lang || "").toLowerCase();
      return voiceLang === "tr" || voiceLang.startsWith("tr-");
    });
    if (turkish.length) return bestVoice(turkish);
    return null;
  }
  const english = list.filter((voice) => String(voice.lang || "").toLowerCase().startsWith("en"));
  if (!english.length) return null;
  let best = null;
  let bestScore = -1;
  english.forEach((voice) => {
    const voiceLang = String(voice.lang || "").toLowerCase();
    let score = voiceNaturalScore(voice);
    if (voiceLang === "en-us") score += 20;
    else if (voiceLang === "en-gb") score += 16;
    else score += 8;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });
  return best;
}

function chunkProsody() {
  return { rate: 0.9, pitch: 0.92 };
}

function activeSpeechRate() {
  return 0.9;
}

function finishSpeech(token, serial, reason) {
  if (token !== speechToken) return;
  speechToken += 1;
  clearSpeechWatchdog();
  speechArmed = false;
  syncStopButton();
  resumeAfterThisSpeech = false;
  if (serial !== requestSerial) return;
  setAvatarState("idle");
}

function watchSpeech(token, serial, maxMs) {
  clearSpeechWatchdog();
  const startedAt = Date.now();
  let sawSpeaking = false;
  let quietSince = 0;
  speechWatchdog = window.setInterval(() => {
    if (token !== speechToken) {
      clearSpeechWatchdog();
      return;
    }
    let active = false;
    try {
      active = window.speechSynthesis.speaking || window.speechSynthesis.pending;
      window.speechSynthesis.resume();
    } catch {
      active = false;
    }
    if (active) {
      sawSpeaking = true;
      quietSince = 0;
    }
    const elapsed = Date.now() - startedAt;
    if (sawSpeaking && !active) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince > 1500) finishSpeech(token, serial, "end");
      return;
    }
    if (!sawSpeaking && elapsed > 1600) {
      showSpeechNotice(MESSAGES.ttsFailed);
      finishSpeech(token, serial, "error");
      return;
    }
    if (elapsed > maxMs) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // The queue may already be empty.
      }
      finishSpeech(token, serial, sawSpeaking ? "end" : "error");
    }
  }, 300);
}

async function speakReply(text, lang, serial, options) {
  const lively = Boolean(options && options.lively);
  const token = ++speechToken;
  lastSpoken = { text, lang, lively };
  syncReplayButton();
  if (!speechOutputSupported()) {
    speechArmed = false;
    resumeAfterThisSpeech = false;
    syncStopButton();
    showSpeechNotice(MESSAGES.noTts);
    if (serial === requestSerial) setAvatarState("idle");
    return;
  }

  if (serial !== requestSerial) return;
  speechArmed = true;
  resumeAfterThisSpeech = false;
  syncStopButton();
  setAvatarState("speaking");
  startMouth();
  const voices = await ensureVoices();
  if (token !== speechToken || serial !== requestSerial) return;

  const rate = activeSpeechRate();
  const segments = spokenSegments(prepareSpokenText(text));
  if (!segments.length) {
    speechArmed = false;
    resumeAfterThisSpeech = false;
    syncStopButton();
    if (serial === requestSerial) setAvatarState("idle");
    return;
  }
  if (lively) avatarEl.dataset.mood = "lively";

  const maxMs = Math.min(
    180000,
    Math.max(12000, (text.length / Math.max(rate, 0.75) / 7) * 1000 + segments.length * 700 + 5000)
  );
  let index = 0;

  const speakNext = () => {
    if (token !== speechToken || serial !== requestSerial) return;
    if (index >= segments.length) {
      finishSpeech(token, serial, "end");
      return;
    }
    const segment = segments[index];
    index += 1;
    const prosody = chunkProsody(segment, rate);
    let utterance;
    try {
      utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.lang = segment.lang;
      utterance.rate = prosody.rate;
      utterance.pitch = prosody.pitch;
      const voice = chooseVoice(voices, segment.lang);
      if (voice) {
        try {
          utterance.voice = voice;
          if (voice.lang) utterance.lang = voice.lang;
        } catch {
          utterance.lang = segment.lang;
        }
      }
      utterance.onstart = () => {
        if (token !== speechToken) return;
        nudgeMouth(segment.text.slice(0, 8), "word");
        speechCursor = 0;
        setSticker(openingSticker(segment.text), true);
      };
      utterance.onboundary = (event) => {
        if (token !== speechToken) return;
        const at = event.charIndex || 0;
        const len = event.charLength || 4;
        const word = segment.text.slice(at, at + Math.max(len, 1));
        nudgeMouth(word, event.name);
      };
      utterance.onend = () => {
        if (token !== speechToken) return;
        window.setTimeout(speakNext, 30);
      };
      utterance.onerror = (event) => {
        if (token !== speechToken) return;
        const interrupted = event.error === "interrupted" || event.error === "canceled";
        if (!interrupted) showSpeechNotice(MESSAGES.ttsFailed);
        finishSpeech(token, serial, interrupted ? "stop" : "error");
      };
    } catch {
      showSpeechNotice(MESSAGES.ttsFailed);
      finishSpeech(token, serial, "error");
      return;
    }

    avatarEl.dataset.mood = segment.lang === "en-US" ? "clear" : lively ? "lively" : "uz";
    const start = () => {
      if (token !== speechToken || serial !== requestSerial) return;
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        showSpeechNotice(MESSAGES.ttsFailed);
        finishSpeech(token, serial, "error");
      }
    };
    if (index === 1 && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // An empty queue can throw in a few browsers.
      }
      window.setTimeout(start, 60);
      return;
    }
    start();
  };

  watchSpeech(token, serial, maxMs);
  speakNext();
}

function stopSpeaking() {
  if (!speechArmed && !(speechOutputSupported() && window.speechSynthesis.speaking)) return;
  clearSequence();
  clearHandsFreeTimer();
  resumeAfterThisSpeech = false;
  cancelSpeech();
  setAvatarState("idle");
}

function replaySpeech() {
  if (!lastSpoken) return;
  unlockSpeech();
  clearHandsFreeTimer();
  resumeAfterThisSpeech = false;
  stopListening({ submit: false });
  cancelSpeech();
  void speakReply(lastSpoken.text, lastSpoken.lang, requestSerial, {
    replay: true,
    lively: Boolean(lastSpoken.lively),
  });
}

function setHandsFree(enabled, persist) {
  handsFree = Boolean(enabled);
  if (!handsFree) {
    clearHandsFreeTimer();
    resumeAfterThisSpeech = false;
  }
  syncHandsFreeButton();
  if (!persist) return;
  try {
    localStorage.setItem(HANDS_FREE_KEY, handsFree ? "1" : "0");
  } catch {
    // The toggle still applies until reload.
  }
}

function setSpeechRate(rate, persist) {
  const next = Number(rate);
  if (next !== 0.85 && next !== 1 && next !== 1.15) return;
  speechRate = next;
  rateChosen = true;
  syncRateButtons();
  if (!persist) return;
  try {
    localStorage.setItem(RATE_KEY, String(next));
  } catch {
    // The chosen speed still applies until reload.
  }
}

function loadVoicePrefs() {
  let savedHands = "";
  try {
    savedHands = localStorage.getItem(HANDS_FREE_KEY) || "";
  } catch {
    savedHands = "";
  }
  speechRate = 0.9;
  rateChosen = false;
  handsFree = savedHands !== "0";
  syncRateButtons();
  syncHandsFreeButton();
}

function tutorError(userMessage) {
  const error = new Error(userMessage);
  error.userMessage = userMessage;
  return error;
}

function unlockSpeech() {
  if (!speechOutputSupported()) return;
  try {
    window.speechSynthesis.resume();
    const blip = new SpeechSynthesisUtterance(" ");
    blip.volume = 0;
    window.speechSynthesis.speak(blip);
  } catch {
    // A phone browser can block speech until a later tap. Text still shows.
  }
}

function detectChatMode() {
  if (location.protocol === "file:") return chatModeReady;
  chatModeReady = (async () => {
    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(1500),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.mode === "backend") chatMode = "backend";
    } catch {
      chatMode = "offline";
    }
  })();
  return chatModeReady;
}

function readSavedMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved && TUTOR_MODES[saved]) return saved;
  } catch {
    // Ignore storage failures and keep the default level.
  }
  return "beginner";
}

function applyTutorMode(mode, persist) {
  if (!TUTOR_MODES[mode]) return;
  tutorMode = mode;
  if (modeHintEl) modeHintEl.textContent = TUTOR_MODES[mode].hint;
  if (stageModeEl) stageModeEl.textContent = TUTOR_MODES[mode].label;
  if (!modeListEl) return;
  modeListEl.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
  if (!persist) return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // The choice still applies for this page load.
  }
}

function buildUserTurn(text, lang) {
  const langNote =
    lang === "en-US"
      ? "The learner's selected speech language is en-US."
      : "The learner's selected speech language is uz-UZ. They may write in Uzbek, English, or a mix.";
  const mode = TUTOR_MODES[tutorMode];
  return `Coach mode: ${mode.label}. ${mode.coach}\n${langNote}\nLearner message:\n${text}`;
}

function buildTutorRequestBody(text, lang) {
  const messages = [];
  conversation.forEach((turn) => {
    messages.push({ role: "user", content: turn.user });
    messages.push({ role: "assistant", content: turn.model });
  });
  messages.push({ role: "user", content: buildUserTurn(text, lang) });

  return {
    system: `${SYSTEM_INSTRUCTION}\n\nActive coach mode: ${TUTOR_MODES[tutorMode].label}. ${TUTOR_MODES[tutorMode].coach}`,
    messages,
  };
}

function mapHttpError(status, body) {
  const code = typeof body?.error === "string" ? body.error : "";
  if (status === 503 && code === "missing-server-key") return tutorError(MESSAGES.missingServerKey);
  if (code === "invalid-body") return tutorError(MESSAGES.malformed);
  if (status === 400 || status === 401 || status === 403) return tutorError(MESSAGES.badKey);
  if (status === 429 || code === "quota") return tutorError(MESSAGES.quota);
  if (status >= 500 || status === 404 || status === 408) return tutorError(MESSAGES.server);
  return tutorError(MESSAGES.server);
}

function isQuotaResponse(status, body) {
  if (status === 429 || body?.error === "quota") return true;
  const detail = body?.error && typeof body.error === "object" ? JSON.stringify(body.error) : "";
  return /resource_exhausted|quota|rate.?limit/i.test(detail);
}

const QUOTA_LINES = [
  {
    spoken: "Hozir navbat to‘lib qoldi. Bir zum kut, keyin shu gapingni qayta ayt.",
    reaction: "Bu seniki emas. Hozir joy to‘lib qoldi, gaping saqlangan. Birozdan yana yubor.",
  },
  {
    spoken: "Hozir o‘zim navbatdaman. Gaping yo‘qolmadi, bir zumdan qayta yubor.",
    reaction: "Chegara to‘ldi. Matn joyida turibdi, qayta yuborsang bo‘ldi.",
  },
  {
    spoken: "Gapirding, lekin hozir joy yo‘q. Bir daqiqa dam olib, yana yoz yoki gapir.",
    reaction: "Hozir server band. Xato seniki emas. Biroz kutib, yana yuboramiz.",
  },
];
let quotaTurn = 0;

function quotaTutorReply() {
  const line = QUOTA_LINES[quotaTurn % QUOTA_LINES.length];
  quotaTurn += 1;
  return {
    surprise: false,
    holdMic: true,
    reaction: line.reaction,
    spoken: line.spoken,
    notebook: [],
    model: JSON.stringify({
      reaction_and_correction: line.reaction,
      spoken_reply: line.spoken,
      notebook: [],
    }),
  };
}

function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const aborted = new Error("aborted");
      aborted.name = "AbortError";
      reject(aborted);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const aborted = new Error("aborted");
      aborted.name = "AbortError";
      reject(aborted);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function extractCandidateText(payload) {
  if (typeof payload?.text === "string") return payload.text.trim();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part?.text || "").join("").trim();
  return "";
}

function fallbackSurprise(userText, reaction) {
  const combined = `${userText}\n${reaction}`.toLowerCase();
  const uzbekMix =
    /[ʻʼ’‘]|o'|g'|ingliz|nima deyiladi|qanday|tarjima|deyiladi|iltimos|rahmat/.test(combined);
  const correction =
    /mistake|wrong|instead|should be|shouldn't|error|xato|noto|tense|preposition|article|word choice|more natural|try saying/.test(
      reaction.toLowerCase()
    );
  return uzbekMix || correction;
}

/**
 * The model flags a strong reaction with a SURPRISE: or CALM: prefix.
 * The prefix is removed before the card is shown.
 */
function splitReaction(raw, userText) {
  const text = String(raw || "").trim();
  const tagged = text.match(/^(SURPRISE|CALM)\b\s*[:\-–—]?\s*/i);
  if (!tagged) {
    return { surprise: fallbackSurprise(userText, text), reaction: text };
  }
  const reaction = text.slice(tagged[0].length).trim();
  return { surprise: tagged[1].toUpperCase() === "SURPRISE", reaction };
}

function parseTutorJson(raw, userText) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw tutorError(MESSAGES.malformed);
  }

  const reactionRaw = data?.reaction_and_correction;
  const spokenRaw = data?.spoken_reply;
  if (typeof reactionRaw !== "string" && typeof spokenRaw !== "string") {
    throw tutorError(MESSAGES.malformed);
  }

  const spoken = ensureSpoken(typeof spokenRaw === "string" ? spokenRaw : reactionRaw);
  const { surprise, reaction: reactionText } = splitReaction(reactionRaw, userText);
  const reaction = ensureSpoken(reactionText || spoken);

  const notebook = parseNotebook(data, surprise, reaction);
  return {
    surprise,
    reaction,
    spoken,
    notebook,
    model: JSON.stringify({
      reaction_and_correction: reaction,
      spoken_reply: spoken,
      notebook,
    }),
  };
}

function dropForbiddenWord(value) {
  return plainWords(value);
}

function clipText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const space = slice.lastIndexOf(" ");
  return (space > 24 ? slice.slice(0, space) : slice).trim();
}

function normalizeNote(item) {
  const kind = String(item?.kind || "").toLowerCase();
  if (kind !== "correction" && kind !== "phrase" && kind !== "word") return null;
  const title = clipText(dropForbiddenWord(item?.title), 90);
  const note = clipText(dropForbiddenWord(item?.note), 320);
  if (!title || !note) return null;
  return { kind, title, note };
}

function parseNotebook(data, surprise, reaction) {
  const items = [];
  if (Array.isArray(data?.notebook)) {
    data.notebook.forEach((item) => {
      const note = normalizeNote(item);
      if (note) items.push(note);
    });
  }
  if (!items.length && surprise && reaction) {
    const clean = clipText(reaction, 320);
    const sentence = clean.split(". ")[0];
    items.push({
      kind: "correction",
      title: clipText(sentence, 90),
      note: clean,
    });
  }
  return items;
}

function noteKey(item) {
  return `${item.kind}|${item.title}|${item.note}`;
}

function readNotebook() {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNote).filter(Boolean);
  } catch {
    return [];
  }
}

function writeNotebook(items) {
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(items.slice(0, NOTEBOOK_LIMIT)));
}

function renderNotebook() {
  if (!notebookListEl || !notebookEmptyEl) return;
  const items = readNotebook();
  notebookListEl.replaceChildren();
  notebookEmptyEl.hidden = items.length > 0;
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = `note note-${item.kind}`;
    const kind = document.createElement("span");
    kind.className = "note-kind";
    kind.textContent = item.kind === "phrase" ? "Ibora" : item.kind === "word" ? "So‘z" : "Xato";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const note = document.createElement("p");
    note.textContent = item.note;
    row.append(kind, title, note);
    notebookListEl.append(row);
  });
}

function saveNotebookEntries(entries) {
  return;
  if (!entries || !entries.length) return;
  try {
    const current = readNotebook();
    const seen = new Set(current.map(noteKey));
    const fresh = [];
    entries.forEach((item) => {
      const key = noteKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      fresh.push(item);
    });
    if (!fresh.length) return;
    writeNotebook([...fresh, ...current]);
    renderNotebook();
  } catch {
    // A full or blocked localStorage should not stop the tutor reply.
  }
}

function clearNotebook() {
  try {
    localStorage.removeItem(NOTEBOOK_KEY);
  } catch {
    // Ignore storage failures and still clear the panel.
  }
  renderNotebook();
}

/**
 * @param {{ key: string, text: string, lang: "uz-UZ" | "en-US", signal: AbortSignal }} request
 * @param {boolean} [allowClientRetry]
 */
async function requestTutorReply(request, allowClientRetry = true) {
  let response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTutorRequestBody(request.text, request.lang)),
      signal: request.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw tutorError(MESSAGES.network);
  }

  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    if (isQuotaResponse(response.status, body)) {
      if (allowClientRetry && body?.retried !== true) {
        await waitForRetry(800, request.signal);
        return requestTutorReply(request, false);
      }
      return quotaTutorReply();
    }
    throw mapHttpError(response.status, body);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw tutorError(MESSAGES.malformed);
  }

  const rawText = extractCandidateText(payload);
  if (!rawText) throw tutorError(MESSAGES.malformed);
  return parseTutorJson(rawText, request.text);
}

function rememberTurn(userText, modelText) {
  conversation.push({ user: userText, model: modelText });
  if (conversation.length > MAX_TURNS) {
    conversation.splice(0, conversation.length - MAX_TURNS);
  }
}

function showFailure(serial, userMessage, restoreText) {
  if (serial !== requestSerial) return;
  const spoken = ensureSpoken(userMessage);
  setCard(analysisCardEl, spoken, false);
  setCard(replyCardEl, spoken, false);
  setSubtitle(spoken, false);
  if (restoreText) inputEl.value = restoreText;
  setAvatarState("idle");
  void speakReply(spoken, "uz-UZ", serial, { lively: false });
}

function presentReply(serial, text, tutor, langAtSend) {
  if (serial !== requestSerial) return;
  const reaction = ensureSpoken(tutor.reaction);
  const spoken = ensureSpoken(tutor.spoken);
  setCard(analysisCardEl, reaction, false);
  setCard(replyCardEl, spoken, false);
  setSubtitle(spoken, false);
  if (tutor.holdMic) {
    if (text) inputEl.value = text;
  } else {
    rememberTurn(text, tutor.model);
    saveNotebookEntries(tutor.notebook);
  }
  pendingSpeech = { text: spoken, lang: langAtSend };
  clearSpeechNotice();
  speechArmed = true;
  syncStopButton();

  const speak = () => {
    if (serial !== requestSerial) return;
    void speakReply(spoken, langAtSend, serial, {
      lively: tutor.surprise,
      hold: Boolean(tutor.holdMic),
    });
  };

  speechPalette = tutor.surprise || userMissed ? "firm" : paletteForText(spoken);
  replyMood = tutor.surprise || userMissed ? "huff" : (stickerFromText(spoken) || "soft");
  if (tutor.surprise || userMissed) {
    setAvatarState("surprised");
    avatarEl.dataset.mood = "lively";
    after(SURPRISE_MS, speak);
    return;
  }
  speak();
}

async function handleSubmit(event) {
  event.preventDefault();
  unlockSpeech();
  const text = inputEl.value.trim();
  const serial = beginTurn();

  if (!text) {
    replyMood = "anxious";
    setAvatarState("surprised");
    setCard(userCardEl, "Iltimos, avval matn yozing.", false);
    setSubtitle("Iltimos, avval matn yozing.", false);
    setCard(analysisCardEl, EMPTY_COPY.analysis, true);
    setCard(replyCardEl, EMPTY_COPY.reply, true);
    after(SURPRISE_MS, () => {
      if (serial !== requestSerial) return;
      setAvatarState("idle");
    });
    inputEl.focus();
    return;
  }

  await chatModeReady;
  if (serial !== requestSerial) return;

  if (chatMode !== "backend") {
    setCard(userCardEl, text, false);
    setCard(analysisCardEl, MESSAGES.offline, false);
    setCard(replyCardEl, MESSAGES.noReply, false);
    setSubtitle(MESSAGES.offline, false);
    replyMood = "anxious";
    setAvatarState("surprised");
    after(SURPRISE_MS, () => {
      if (serial !== requestSerial) return;
      setAvatarState("idle");
    });
    inputEl.focus();
    return;
  }

  setCard(userCardEl, text, false);
  setCard(analysisCardEl, "Bir zum…", false);
  setCard(replyCardEl, "Bir zum…", false);
  setSubtitle("Bir zum…", false);
  noteUserLine(text);
  setAvatarState("thinking");
  inputEl.value = "";

  const controller = new AbortController();
  activeRequest = controller;
  const langAtSend = speechLang;
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);

  try {
    const tutor = await requestTutorReply({
      text,
      lang: langAtSend,
      signal: controller.signal,
    });
    if (serial !== requestSerial) return;
    presentReply(serial, text, tutor, langAtSend);
  } catch (error) {
    if (serial !== requestSerial) return;
    if (error.name === "AbortError") {
      if (timedOut) showFailure(serial, MESSAGES.timeout, text);
      return;
    }
    showFailure(serial, error.userMessage || MESSAGES.network, text);
  } finally {
    window.clearTimeout(timeoutId);
    if (activeRequest === controller) activeRequest = null;
  }
}

function handleModeClick(event) {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  applyTutorMode(button.dataset.mode, true);
}

function init() {
  document.documentElement.dataset.speechLang = speechLang;

  applyTutorMode(readSavedMode(), false);
  loadVoicePrefs();
  setAvatarState("idle");
  syncStopButton();
  syncReplayButton();
  micBtn.setAttribute("aria-label", "Bosib turing va gapiring");
  if (speechOutputSupported()) window.speechSynthesis.getVoices();
  void detectChatMode();

  if (modeListEl) modeListEl.addEventListener("click", handleModeClick);
  if (rateGroupEl) {
    rateGroupEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-rate]");
      if (!button) return;
      setSpeechRate(button.dataset.rate, true);
    });
  }
  if (replayBtn) replayBtn.addEventListener("click", replaySpeech);
  formEl.addEventListener("submit", handleSubmit);
  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    formEl.requestSubmit();
  });
  bindPushToTalk();
  if (stopSpeechBtn) stopSpeechBtn.addEventListener("click", stopSpeaking);
  if (langBtn) langBtn.addEventListener("click", toggleLanguage);
  if (notebookClearEl) notebookClearEl.addEventListener("click", clearNotebook);
}

init();
