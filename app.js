/**
 * AI Ingliz tili ustozi
 *
 * Chat goes to /api/chat. The Gemini key stays in the server environment.
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
  user: "Hali xabar yo‘q.",
  analysis: "Tahlil va maslahat shu yerda chiqadi.",
  reply: "Ustoz javobi shu yerda chiqadi.",
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
const HANDS_FREE_GAP_MS = 700;

const MESSAGES = {
  missingServerKey: "Serverda GEMINI_API_KEY yo‘q. Render sozlamasiga kalitni qo‘ying.",
  offline: "Ustoz serveri topilmadi. Sahifani server manzili orqali oching.",
  badKey: "API kaliti yaroqsiz yoki muddati o‘tgan. Serverdagi kalitni tekshiring.",
  quota: "So‘rovlar chegarasi to‘ldi. Biroz kuting va qayta yuboring.",
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
      "Teach from zero. Use very short sentences and one new pattern at a time. Patient encouragement may mix simple Uzbek and simple English. Correct only the single most useful mistake. End the coaching tip with a line the learner can repeat today.",
  },
  conversation: {
    label: "Jonli Muloqot (B1–B2)",
    hint: "Kundalik nutq, idiomalar va phrasal verb.",
    coach:
      "Coach natural everyday speaking. Offer one idiom or phrasal verb when it fits. Support Uzbek-English code-switching, then show the fluent English version. Keep the tone lively, like a conversation partner.",
  },
  advanced: {
    label: "Mukammal / Advanced (C1)",
    hint: "Nozik ifoda va aniqroq lug‘at.",
    coach:
      "Coach nuanced, precise English. Replace a vague word with a sharper one. Comment on tone, collocation, and register. Keep praise specific and the upgrade small enough to use immediately.",
  },
  ielts: {
    label: "IELTS Tayyorgarlik (Band 6.5–8.5+)",
    hint: "Speaking 1–3, band bahosi va mashq.",
    coach:
      "Coach IELTS Speaking Parts 1, 2, and 3 toward Band 6.5–8.5. In the reaction, name the relevant criterion: Lexical Resource, Grammatical Range & Accuracy, Fluency, or Coherence & Cohesion. Give a rough band note only when you can justify it, plus one upgrade that would score higher. The spoken follow-up must be a short Speaking drill.",
  },
};

const SYSTEM_INSTRUCTION = `You are a lively, witty, expressive personal English tutor sitting with one learner.
They may be a complete beginner or an IELTS candidate. They often mix Uzbek and English, and they ask translation questions such as:
"Do‘st" ingliz tilida nima deyiladi?

Understand Uzbek-English code-switching. Treat o‘, o', oʻ, g‘, and g' as normal Uzbek letters.
For a translation or meaning question, give the everyday English first, then a more formal or IELTS alternative when the words differ.

Return ONLY JSON with these fields:
- reaction_and_correction (string)
- spoken_reply (string)
- notebook (array, possibly empty)

reaction_and_correction:
- React like a lively tutor, then correct grammar, tense, preposition, word choice, or a pronunciation note you can infer from spelling.
- Give a natural English alternative. When the active mode is IELTS, or the learner asks for formal English, show the everyday line and the IELTS/formal line.
- Add one mini coaching tip matched to the active level.
- Start the string with "SURPRISE:" when you corrected a mistake, handled an Uzbek mix-up or translation, gave a sharp IELTS tip, or reacted strongly. Otherwise start with "CALM:".
- After that tag, write for the learner. Do not mention the tag.

spoken_reply:
- A short, natural line a tutor would say out loud, plus exactly one targeted practice prompt or follow-up question that moves the learner forward in the active mode.
- Mostly English, so it can be spoken later. A few Uzbek words are welcome for A1–A2 or when the learner asked in Uzbek.
- Do not use the SURPRISE or CALM tags here.

notebook:
- Each item is { "kind": "correction" | "phrase" | "word", "title": "...", "note": "..." }.
- correction: a real mistake and the better English.
- phrase: one useful natural English phrase from this turn.
- word: a translation or vocabulary note, with the Uzbek word and the English.
- Use an empty array when nothing is worth keeping.
- Do not put SURPRISE or CALM tags in notebook fields.

The learner's earlier turns are included in the conversation. Remember them when you answer a follow-up.
Keep every field concise. No markdown.`;

const avatarEl = document.getElementById("avatar");
const statusEl = document.getElementById("status");
const statusTextEl = document.getElementById("status-text");
const modeListEl = document.getElementById("mode-list");
const modeHintEl = document.getElementById("mode-hint");
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
let handsFree = false;
let speechRate = 1;
let rateChosen = false;
/** @type {{ text: string, lang: "uz-UZ" | "en-US" } | null} */
let lastSpoken = null;
let listenTimer = 0;
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
  el.textContent = text;
  el.classList.toggle("is-empty", Boolean(isEmpty));
}

function syncMicButton() {
  micBtn.classList.toggle("is-live", micActive);
  micBtn.setAttribute("aria-pressed", String(micActive));
  micLabelEl.textContent = micActive ? "To‘xtatish" : "Mikrofon";
  micBtn.setAttribute("aria-label", micActive ? "Yozishni to‘xtatish" : "Mikrofonni yoqish");
  inputEl.classList.toggle("is-live", micActive);
}

function syncStopButton() {
  stopSpeechBtn.disabled = !speechArmed;
  stopSpeechBtn.classList.toggle("is-live", speechArmed);
  stopSpeechBtn.setAttribute("aria-disabled", String(!speechArmed));
}

function syncReplayButton() {
  const ready = Boolean(lastSpoken && lastSpoken.text);
  replayBtn.disabled = !ready;
  replayBtn.setAttribute("aria-disabled", String(!ready));
}

function syncHandsFreeButton() {
  handsFreeBtn.classList.toggle("is-on", handsFree);
  handsFreeBtn.setAttribute("aria-pressed", String(handsFree));
  handsFreeBtn.textContent = handsFree ? "Qo‘lsiz: yoniq" : "Qo‘lsiz suhbat";
}

function syncRateButtons() {
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
  const transcript = liveTranscript.trim();
  liveTranscript = "";
  micActive = false;
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
  if (!transcript) {
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.emptySpeech, false);
    showSpeechNotice(MESSAGES.emptySpeech);
    return;
  }

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

function startListening() {
  unlockSpeech();
  const Recognition = getRecognitionCtor();
  if (!Recognition) {
    beginTurn();
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.unsupportedMic, false);
    showSpeechNotice(MESSAGES.unsupportedMic);
    return;
  }

  beginTurn();
  clearSpeechNotice();

  const generation = ++listeningGeneration;
  liveTranscript = "";
  micActive = true;
  syncMicButton();
  setAvatarState("listening");
  setCard(userCardEl, MESSAGES.listeningHint, false);

  const rec = new Recognition();
  recognition = rec;
  rec.lang = speechLang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    if (generation !== listeningGeneration) return;
    let finalText = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    liveTranscript = `${finalText} ${interim}`.trim();
    if (!liveTranscript) return;
    inputEl.value = liveTranscript;
    setCard(userCardEl, liveTranscript, false);
    statusTextEl.textContent = STATUS_TEXT.listening;
  };

  rec.onerror = (event) => {
    if (generation !== listeningGeneration) return;
    const message = recognitionErrorMessage(event.error);
    if (!message) return;
    stopListening({ submit: false });
    setAvatarState("idle");
    setCard(userCardEl, message, false);
    showSpeechNotice(message);
  };

  rec.onend = () => {
    if (generation !== listeningGeneration) return;
    stopListening({ submit: true });
  };

  clearListenTimer();
  listenTimer = window.setTimeout(() => {
    if (generation !== listeningGeneration) return;
    if (liveTranscript.trim()) {
      stopListening({ submit: true });
      return;
    }
    stopListening({ submit: false });
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.noSpeech, false);
    showSpeechNotice(MESSAGES.noSpeech);
  }, LISTEN_LIMIT_MS);

  try {
    rec.start();
  } catch {
    clearListenTimer();
    listeningGeneration += 1;
    recognition = null;
    micActive = false;
    syncMicButton();
    setAvatarState("idle");
    setCard(userCardEl, MESSAGES.micFailed, false);
    showSpeechNotice(MESSAGES.micFailed);
  }
}

function toggleMic() {
  if (micActive) {
    stopListening({ submit: true });
    return;
  }
  startListening();
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

function chooseVoice(voices, lang) {
  const want = lang.toLowerCase();
  const prefix = want.slice(0, 2);
  let best = null;
  let bestScore = -1;
  voices.forEach((voice) => {
    const voiceLang = String(voice.lang || "").toLowerCase();
    let score = -1;
    if (voiceLang === want) score = 50;
    else if (voiceLang.startsWith(prefix)) score = 30;
    else if (voiceLang.startsWith("en")) score = 8;
    if (score < 0) return;
    const name = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
    if (/natural|neural|premium|enhanced|google|siri/.test(name)) score += 24;
    if (voice.localService) score += 2;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });
  return best;
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
  const resume = reason === "end" && resumeAfterThisSpeech && handsFree;
  resumeAfterThisSpeech = false;
  if (serial !== requestSerial) return;
  setAvatarState("idle");
  if (!resume) return;
  clearHandsFreeTimer();
  handsFreeTimer = window.setTimeout(() => {
    handsFreeTimer = 0;
    if (!handsFree || micActive || speechArmed) return;
    startListening();
  }, HANDS_FREE_GAP_MS);
}

function watchSpeech(token, serial, maxMs) {
  clearSpeechWatchdog();
  const startedAt = Date.now();
  let sawSpeaking = false;
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
    if (active) sawSpeaking = true;
    const elapsed = Date.now() - startedAt;
    if (sawSpeaking && !active) {
      finishSpeech(token, serial, "end");
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
  const allowResume = !(options && options.replay);
  const token = ++speechToken;
  lastSpoken = { text, lang };
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
  resumeAfterThisSpeech = allowResume && handsFree;
  syncStopButton();
  setAvatarState("speaking");
  const voices = await ensureVoices();
  if (token !== speechToken || serial !== requestSerial) return;

  if (!voices.length) {
    speechArmed = false;
    resumeAfterThisSpeech = false;
    syncStopButton();
    showSpeechNotice(MESSAGES.noVoice);
    setAvatarState("idle");
    return;
  }

  const rate = activeSpeechRate();
  let utterance;
  try {
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    const voice = chooseVoice(voices, lang);
    if (voice) {
      try {
        utterance.voice = voice;
        if (voice.lang) utterance.lang = voice.lang;
      } catch {
        utterance.lang = lang;
      }
    }
    utterance.onend = () => finishSpeech(token, serial, "end");
    utterance.onerror = (event) => {
      if (token !== speechToken) return;
      const interrupted = event.error === "interrupted" || event.error === "canceled";
      if (!interrupted) showSpeechNotice(MESSAGES.ttsFailed);
      finishSpeech(token, serial, interrupted ? "stop" : "error");
    };
  } catch {
    speechArmed = false;
    resumeAfterThisSpeech = false;
    syncStopButton();
    showSpeechNotice(MESSAGES.ttsFailed);
    if (serial === requestSerial) setAvatarState("idle");
    return;
  }

  const maxMs = Math.min(50000, Math.max(5000, (text.length / Math.max(rate, 0.7) / 12) * 1000 + 2500));
  const queue = () => {
    if (token !== speechToken || serial !== requestSerial) return;
    try {
      window.speechSynthesis.speak(utterance);
      watchSpeech(token, serial, maxMs);
    } catch {
      showSpeechNotice(MESSAGES.ttsFailed);
      finishSpeech(token, serial, "error");
    }
  };
  // Chrome drops speak() if it shares a turn with cancel(). The request
  // path already cancelled older audio in beginTurn().
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // An empty queue can throw in a few browsers.
    }
    window.setTimeout(queue, 60);
    return;
  }
  queue();
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
  void speakReply(lastSpoken.text, lastSpoken.lang, requestSerial, { replay: true });
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
  handsFree = savedHands === "1";
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
  modeHintEl.textContent = TUTOR_MODES[mode].hint;
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
  const contents = [];
  conversation.forEach((turn) => {
    contents.push({ role: "user", parts: [{ text: turn.user }] });
    contents.push({ role: "model", parts: [{ text: turn.model }] });
  });
  contents.push({ role: "user", parts: [{ text: buildUserTurn(text, lang) }] });

  return {
    systemInstruction: {
      parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nActive coach mode: ${TUTOR_MODES[tutorMode].label}. ${TUTOR_MODES[tutorMode].coach}` }],
    },
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1536,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          reaction_and_correction: { type: "STRING" },
          spoken_reply: { type: "STRING" },
          notebook: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                kind: { type: "STRING" },
                title: { type: "STRING" },
                note: { type: "STRING" },
              },
              required: ["kind", "title", "note"],
            },
          },
        },
        required: ["reaction_and_correction", "spoken_reply"],
      },
    },
  };
}

async function mapHttpError(response) {
  const status = response.status;
  let code = "";
  try {
    code = (await response.json())?.error || "";
  } catch {
    code = "";
  }
  if (status === 503 && code === "missing-server-key") return tutorError(MESSAGES.missingServerKey);
  if (code === "invalid-body") return tutorError(MESSAGES.malformed);
  if (status === 400 || status === 401 || status === 403) return tutorError(MESSAGES.badKey);
  if (status === 429) return tutorError(MESSAGES.quota);
  if (status >= 500 || status === 404 || status === 408) return tutorError(MESSAGES.server);
  return tutorError(MESSAGES.server);
}

function extractCandidateText(payload) {
  if (payload?.promptFeedback?.blockReason) return "";
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part.text || "").join("").trim();
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

  const spoken = spokenRaw.trim();
  const { surprise, reaction } = splitReaction(reactionRaw, userText);
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

function clipText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function normalizeNote(item) {
  const kind = String(item?.kind || "").toLowerCase();
  if (kind !== "correction" && kind !== "phrase" && kind !== "word") return null;
  const title = clipText(item?.title, 90);
  const note = clipText(item?.note, 320);
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
 */
async function requestTutorReply(request) {
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

  if (!response.ok) throw await mapHttpError(response);

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
  if (restoreText) inputEl.value = restoreText;
  setAvatarState("idle");
}

function presentReply(serial, text, tutor, langAtSend) {
  if (serial !== requestSerial) return;
  setCard(analysisCardEl, tutor.reaction, false);
  setCard(replyCardEl, tutor.spoken, false);
  rememberTurn(text, tutor.model);
  saveNotebookEntries(tutor.notebook);
  pendingSpeech = { text: tutor.spoken, lang: langAtSend };
  clearSpeechNotice();
  speechArmed = true;
  syncStopButton();

  const speak = () => {
    if (serial !== requestSerial) return;
    void speakReply(tutor.spoken, langAtSend, serial);
  };

  if (tutor.surprise) {
    setAvatarState("surprised");
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
    setAvatarState("surprised");
    after(SURPRISE_MS, () => {
      if (serial !== requestSerial) return;
      setAvatarState("idle");
    });
    inputEl.focus();
    return;
  }

  setCard(userCardEl, text, false);
  setCard(analysisCardEl, "…", false);
  setCard(replyCardEl, "…", false);
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
  langBtn.setAttribute("aria-label", "Til: uz-UZ. en-US ga o‘tish");

  applyTutorMode(readSavedMode(), false);
  loadVoicePrefs();
  setAvatarState("idle");
  syncStopButton();
  syncReplayButton();
  renderNotebook();
  micBtn.setAttribute("aria-label", "Mikrofonni yoqish");
  if (speechOutputSupported()) window.speechSynthesis.getVoices();
  void detectChatMode();

  modeListEl.addEventListener("click", handleModeClick);
  handsFreeBtn.addEventListener("click", () => setHandsFree(!handsFree, true));
  rateGroupEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rate]");
    if (!button) return;
    setSpeechRate(button.dataset.rate, true);
  });
  replayBtn.addEventListener("click", replaySpeech);
  formEl.addEventListener("submit", handleSubmit);
  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    formEl.requestSubmit();
  });
  micBtn.addEventListener("click", toggleMic);
  stopSpeechBtn.addEventListener("click", stopSpeaking);
  langBtn.addEventListener("click", toggleLanguage);
  notebookClearEl.addEventListener("click", clearNotebook);
}

init();
