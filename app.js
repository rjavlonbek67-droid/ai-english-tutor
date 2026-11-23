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
  subtitle: "Salom. Gapiring yoki yozing.",
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
  server: "Gemini serveri hozir javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.",
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
      "Teach from zero in complete, simple sentences. Never stop halfway through a word or a sentence. Spoken Uzbek stays everyday and kind. Correct the one most useful mistake, put the full English sentence in quotes, and ask them to repeat that whole sentence.",
  },
  conversation: {
    label: "Jonli Muloqot (B1–B2)",
    hint: "Kundalik nutq, idiomalar va phrasal verb.",
    coach:
      "This is Jonli suhbat: talk like a person across the table, openly and in finished sentences. If the English is off, say it straight, give one clear reason, the full natural English sentence in quotes, and the next question. Keep it human and a little nuanced, not a script.",
  },
  advanced: {
    label: "Mukammal / Advanced (C1)",
    hint: "Nozik ifoda va aniqroq lug‘at.",
    coach:
      "Coach nuanced C1–C2 English in complete spoken Uzbek. Name the tone or collocation problem, put one full sharper English sentence inside quotes, and ask a follow-up. Do not compress the answer into a fragment.",
  },
  ielts: {
    label: "IELTS Tayyorgarlik (Band 6.5–8.5+)",
    hint: "Speaking 1–3, band bahosi va mashq.",
    coach:
      "Coach IELTS Speaking Parts 1, 2, and 3 toward Band 6.5–8.5. In the reaction, name the relevant criterion: Lexical Resource, Grammatical Range & Accuracy, Fluency, or Coherence & Cohesion. Give a rough band note only when you can justify it. Speak in complete Uzbek sentences, put one full higher-band English sentence inside quotes, and end with one complete Speaking question.",
  },
};

const SYSTEM_INSTRUCTION = `You are a real person: a candid, articulate Uzbek-speaking English coach sitting with one learner.
They may be a complete beginner or an IELTS candidate. They mix Uzbek and English, and they ask things like:
"Do‘st" ingliz tilida nima deyiladi?

You understand Uzbek accurately, including spoken spelling and code-switching. Treat o‘, o', oʻ, g‘, and g' as normal Uzbek letters. Understand the learner if they use slang. Do not answer with a slang pack, and do not invent catchphrases. Leave the wording clean so a custom phrase list can be added later.
Write Uzbek the way a sharp, warm person actually talks: open, free, and a little more thoughtful than a slogan. Vary the opening and the shape of the sentence. Explain the shade of meaning in plain words. Do not recycle one correction template. Avoid stiff lines such as "iltimos e'tibor bering", "quyidagi iborani qo'llang", and "demak, xulosa qilsak". Do not translate English word for word.
For a translation or meaning question, give the everyday English first. Add one more precise or formal alternative only when it actually changes the meaning or the register.

Stay concise enough to hear in one breath. spoken_reply is usually three or four connected sentences: the point, one thoughtful reason, the model English, and one question. Finish every sentence. Never stop mid-word or mid-sentence, and do not pad with a lecture.

Your own English is always a full, natural, grammatical sentence inside straight double quotes. Never speak broken bot English as yourself, such as "I am go", "thanks", or "menks". You may repeat a broken phrase only when it is the learner's exact mistake, and the next quote must be the complete correct sentence, for example "I am going to school." or "Thank you."

Never use "prosto" or "vapshe", in any spelling: prosto, prosta, просто, vapshe, vabshe, vobshe, вообще, or вобще. Do not replace them with another filler such as karochi, norm, tema, varianti, or takshta. If you need "simply", "at all", or "really", say shunchaki, umuman, aslo, or haqiqatan.

Return ONLY JSON with these fields:
- reaction_and_correction (string)
- spoken_reply (string)
- notebook (array, possibly empty)

reaction_and_correction:
- Write a short, human explanation in spoken Uzbek, as a mentor sitting next to them, not a checklist.
- If the word, phrase, grammar, or tone is wrong or awkward, say it openly and specifically. You may say "Nima deyapsan, u bunaqa deyilmaydi, boshqacha deyiladi ..." when the miss is obvious, but do not start every reply that way. Then give one finished reason and the full natural English sentence.
- Soften only the sharpness for A1, never the honesty, and never by cutting the sentence short. For a correct line, react like a person who noticed, and skip the scolding.
- When the mode is IELTS, or they ask for formal English, show the everyday sentence and one higher-band sentence, with one concrete reason they differ.
- Add one coaching tip matched to the level. If they ask for a mashq or exercise, give one complete short task.
- No stock fillers and no slang quota. Never write "prosto", "prosta", "vapshe", or "vabshe".
- Start the string with "SURPRISE:" when you corrected a mistake, handled an Uzbek mix-up or translation, gave a sharp IELTS tip, or reacted strongly. Otherwise start with "CALM:".
- After that tag, write for the learner. Do not mention the tag. End on a finished sentence.

spoken_reply:
- This is said aloud in one even flow. Sound like a person talking, not a bot pausing at every mark.
- Write cohesive sentences that carry the thought from start to finish. Join a reason with chunki, shuning uchun, or va instead of stopping and restarting.
- Punctuation is only a period, a question mark, and a comma where a person would take a light breath. No ellipsis, dash, emoji, bullet, asterisk, slash, parenthesis, semicolon, or stacked marks. Those make the voice stutter.
- Put ONLY the model English sentence in straight double quotes. Example shape, not a script to copy: Kecha uchun went kerak, chunki ish tugagan. To‘g‘ri gap shu, "I went to school yesterday." Kecha nima qilding?
- If nothing was wrong, still answer in full Uzbek sentences. When you offer English, keep that full sentence inside quotes. Then ask exactly one follow-up question.
- Vary the wording from turn to turn. Match their level with simpler or slightly richer Uzbek. A1 is simpler, not broken. IELTS ends with one complete Speaking question.
- If they ask for a mashq, give one complete spoken task and still end with a question.
- End on the follow-up question. Do not end with a comma, a dash, or a half word.
- Never add a turn-taking cue such as "sen navbating", "your turn", "endi sen gapir", or anything that says the microphone is open. The reply ends, then you wait.
- Never write "prosto", "prosta", "vapshe", or "vabshe".
- No SURPRISE or CALM tags here. No markdown.

notebook:
- Each item is { "kind": "correction" | "phrase" | "word", "title": "...", "note": "..." }.
- correction: a real mistake and the full better English sentence.
- phrase: one useful natural English sentence from this turn.
- word: a translation or vocabulary note, with the Uzbek word and the English.
- Use an empty array when nothing is worth keeping.
- Each title and note is a complete phrase, not a cut-off word.
- Do not put SURPRISE or CALM tags, "prosto", or "vapshe" in notebook fields.

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
let speechRate = 1;
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
  if (!micActive && !recognition) return;

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

  if (!submit) return;
  if (!transcript || looksLikeEcho(transcript)) {
    const echoed = Boolean(transcript);
    quietStrikes = 0;
    setAvatarState("idle");
    setCard(userCardEl, echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech, false);
    setSubtitle(echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech, false);
    showSpeechNotice(echoed ? "O‘z javobim eshitildi." : MESSAGES.emptySpeech);
    return;
  }

  quietStrikes = 0;
  clearSpeechNotice();
  inputEl.value = transcript;
  formEl.requestSubmit();
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
  if (!holdingMic || holdReleasePending) return;
  holdingMic = false;
  holdReleasePending = true;
  document.documentElement.classList.remove("is-holding-mic");
  const spoken = speechJoin(committedFinal, pendingInterim);
  pendingInterim = "";
  committedFinal = spoken;
  liveTranscript = spoken;
  if (spoken) inputEl.value = spoken;
  stopListening({ submit: true });
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
  window.addEventListener("pointerup", () => {
    if (holdingMic) finishHold();
  });
  window.addEventListener("pointercancel", () => {
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

function looksLikeUzbek(text) {
  return /[ʻʼ’‘]|o‘|g‘|\bo['']|\bg['']|\b(nima|deyil|deyapsan|boshqacha|qanday|rahmat|yaxshi|sen|men|bu|prosta|vabshe|karochi|norm|tema|varianti|takshta|yo‘q|emas|qil|ayt|gapir|ha|lekin|endi|kel)\b/i.test(
    text
  );
}

/**
 * Uzbek stays outside quotes so it can use an Uzbek cadence.
 * The model English phrase stays inside quotes and is spoken clearly.
 */
function splitSpokenLine(text) {
  const source = String(text || "").trim();
  const parts = [];
  const pattern = /"([^"]+)"|“([^”]+)”|«([^»]+)»/g;
  let last = 0;
  let match = pattern.exec(source);
  while (match) {
    const before = source.slice(last, match.index).replace(/\s+/g, " ").trim();
    if (before) parts.push({ text: before, lang: looksLikeUzbek(before) ? "uz-UZ" : "en-US" });
    const english = (match[1] || match[2] || match[3] || "").replace(/\s+/g, " ").trim();
    if (english) parts.push({ text: english, lang: "en-US" });
    last = match.index + match[0].length;
    match = pattern.exec(source);
  }
  const tail = source.slice(last).replace(/\s+/g, " ").trim();
  if (tail) parts.push({ text: tail, lang: looksLikeUzbek(tail) || parts.length ? "uz-UZ" : "en-US" });
  if (!parts.length && source) parts.push({ text: source, lang: looksLikeUzbek(source) ? "uz-UZ" : "en-US" });
  return parts;
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
  return splitSpokenLine(text).flatMap(splitForSpeech);
}

/**
 * Keep the written reply as it is. The voice hears a cleaned line so it
 * does not spell out stars, links, or leftover marks.
 */
function prepareSpokenText(text) {
  const cleaned = dropForbiddenWord(String(text || ""))
    .replace(/^(SURPRISE|CALM)\s*:\s*/i, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/gm, "")
    .replace(/[*_#~`|\\^]+/g, " ")
    .replace(/[<>[\]{}()]/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, " ")
    .replace(/[—–]/g, " ")
    .replace(/\.{3,}|…+/g, " ")
    .replace(/[;:]+/g, ", ")
    .replace(/([!?])\1+/g, "$1")
    .replace(/\s+,/g, ",")
    .replace(/,(\s*,)+/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || dropForbiddenWord(String(text || "")).replace(/\s+/g, " ").trim();
}

function chooseVoice(voices, lang) {
  const uzbek = lang !== "en-US";
  let best = null;
  let bestScore = -1;
  voices.forEach((voice) => {
    const voiceLang = String(voice.lang || "").toLowerCase();
    const name = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
    let score = -1;
    if (uzbek) {
      if (voiceLang === "uz-uz" || voiceLang === "uz-latn-uz" || voiceLang === "uz") score = 100;
      else if (voiceLang.startsWith("uz")) score = 90;
      else if (/uzbek|o‘zbek|ozbek/.test(name)) score = 84;
      else if (voiceLang.startsWith("tr")) score = 46;
      else if (voiceLang.startsWith("az")) score = 40;
      else if (voiceLang.startsWith("kk") || voiceLang.startsWith("ky") || voiceLang.startsWith("tk")) score = 32;
    } else if (voiceLang === "en-us") score = 50;
    else if (voiceLang.startsWith("en")) score = 34;
    if (score < 0) return;
    if (/natural|neural|premium|enhanced|google|siri|online/.test(name)) score += 24;
    if (/robot|compact|espeak/.test(name)) score -= 18;
    if (voice.localService) score += 2;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });
  return best;
}

function chunkProsody(segment, rate) {
  const even = Math.max(0.85, Math.min(rate, 1.02));
  return {
    rate: segment.lang === "en-US" ? Math.min(even, 1) : even,
    pitch: 1,
  };
}

function activeSpeechRate() {
  if (rateChosen) return speechRate;
  return tutorMode === "beginner" ? 0.85 : 1;
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
  let savedRate = "";
  let savedHands = "";
  try {
    savedRate = localStorage.getItem(RATE_KEY) || "";
    savedHands = localStorage.getItem(HANDS_FREE_KEY) || "";
  } catch {
    savedRate = "";
    savedHands = "";
  }
  if (savedRate === "0.85" || savedRate === "1" || savedRate === "1.15") {
    speechRate = Number(savedRate);
    rateChosen = true;
  } else {
    speechRate = tutorMode === "beginner" ? 0.85 : 1;
    rateChosen = false;
  }
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
  const tagged = text.match(/^(SURPRISE|CALM)\s*:\s*/i);
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
  if (typeof reactionRaw !== "string" || typeof spokenRaw !== "string") {
    throw tutorError(MESSAGES.malformed);
  }

  const spoken = prepareSpokenText(spokenRaw.trim());
  const { surprise, reaction: reactionText } = splitReaction(reactionRaw, userText);
  const reaction = dropForbiddenWord(reactionText);
  if (!reaction || !spoken) throw tutorError(MESSAGES.malformed);

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
  return String(value || "")
    .replace(/\b(?:vapshe|vabshe|vobshe|prosto|prosta)\b/gi, "")
    .replace(/вообще|вобще|просто/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^\s*[,;:]\s*/, "")
    .trim();
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
  setCard(analysisCardEl, userMessage, false);
  setCard(replyCardEl, MESSAGES.noReply, false);
  setSubtitle(userMessage, false);
  if (restoreText) inputEl.value = restoreText;
  setAvatarState("idle");
}

function presentReply(serial, text, tutor, langAtSend) {
  if (serial !== requestSerial) return;
  setCard(analysisCardEl, tutor.reaction, false);
  setCard(replyCardEl, tutor.spoken, false);
  setSubtitle(tutor.spoken, false);
  if (tutor.holdMic) {
    if (text) inputEl.value = text;
  } else {
    rememberTurn(text, tutor.model);
    saveNotebookEntries(tutor.notebook);
  }
  pendingSpeech = { text: tutor.spoken, lang: langAtSend };
  clearSpeechNotice();
  speechArmed = true;
  syncStopButton();

  const speak = () => {
    if (serial !== requestSerial) return;
    void speakReply(tutor.spoken, langAtSend, serial, {
      lively: tutor.surprise,
      hold: Boolean(tutor.holdMic),
    });
  };

  if (tutor.surprise) {
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
  setAvatarState("thinking");
  inputEl.value = "";

  const controller = new AbortController();
  activeRequest = controller;
  const langAtSend = speechLang;

  try {
    const tutor = await requestTutorReply({
      text,
      lang: langAtSend,
      signal: controller.signal,
    });
    if (serial !== requestSerial) return;
    presentReply(serial, text, tutor, langAtSend);
  } catch (error) {
    if (error.name === "AbortError" || serial !== requestSerial) return;
    showFailure(serial, error.userMessage || MESSAGES.network, text);
  } finally {
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
