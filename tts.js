/**
 * Live neural speech for tutor replies.
 * The same Uzbek/Turkish voice and the same English voice are used on every phone.
 * Nothing is saved to disk. If the upstream handshake fails, the caller falls back.
 * The client token below is the public Edge read-aloud constant, not a private API key.
 */

import { createHash, randomBytes } from "crypto";
import { WebSocket } from "ws";

const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;
const PREFIX = Buffer.from(
  ["Q29weXJpZ2h0IChDKSBNaWNyb3NvZnQg", "Q29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQu"].join(""),
  "base64"
);
const COEFFICIENTS = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
];

const VOICES = {
  "en-US": { name: "en-US-AndrewNeural", xml: "en-US" },
  "uz-UZ": { name: "tr-TR-AhmetNeural", xml: "tr-TR" },
};

function secToken() {
  const epochSeconds = BigInt(Math.floor(Date.now() / 1000)) + WINDOWS_FILE_TIME_EPOCH;
  const roundedSeconds = epochSeconds - (epochSeconds % 300n);
  const ticks = roundedSeconds * 10000000n;
  const data = Buffer.from(`${ticks}${TRUSTED_CLIENT_TOKEN}`, "ascii");
  const sha = createHash("sha256").update(PREFIX).update(data).digest();
  const cs64 = cs64Digest(data, sha);
  return `${cs64.toString("hex").toUpperCase()}-${sha.toString("hex").toUpperCase()}`;
}

function cs64Digest(data, shaDigest) {
  const mul = Math.imul;
  const rol16 = (value) => ((value << 16) | (value >>> 16)) >>> 0;
  const keyA = (shaDigest.readUInt32LE(0) | 1) >>> 0;
  const keyB = (shaDigest.readUInt32LE(4) | 1) >>> 0;
  const factors = [mul(keyA, 0x82893933) >>> 0, mul(keyB, 0x82893933) >>> 0];
  const terms = COEFFICIENTS.map(([coefficient], index) => mul(coefficient, factors[index % 2]) >>> 0);
  const offsets = COEFFICIENTS.map(([, offset]) => offset);
  const padded = Buffer.alloc(Math.ceil((data.length + 1) / 8) * 8);
  padded.set(data, 1);
  for (let index = 0; index < padded.length / 4; index += 1) {
    const word = padded.readUInt32LE(index * 4);
    let term = mul(word, index % 2 === 0 ? keyA : keyB);
    let offset = mul(rol16(word), index % 2 === 0 ? 0xef0569fb : 0xc31713db);
    if (index === 0) {
      term = (term + mul(0xf2f90b1a, factors[0])) >>> 0;
      offset = (offset + 0x0b1a0000) >>> 0;
    }
    terms.push(term >>> 0);
    offsets.push(offset >>> 0);
  }
  let swapAcc = 0;
  let swapLast = 0;
  let state = 0;
  let acc = 0;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];
    let turn = rol16((offsets[index] + x) >>> 0);
    let mixed = mul(turn, 0x76f50f34);
    swapAcc += (mul(rol16(mixed), 0xc3efea97) + mixed) >>> 0;
    turn = rol16((offsets[index + 1] + y) >>> 0);
    mixed = mul(turn, 0x1881ce3c);
    swapLast = (mul(rol16(mixed), 0x35bd1ec9) + mixed) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;
    state = (mul(state, keyA) + x) >>> 0;
    [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83].forEach((constant) => {
      state = mul(rol16(state), constant) >>> 0;
    });
    acc += state;
    turn = (mul(state, keyB) + y) >>> 0;
    turn = mul(rol16(turn), 0xa27416f5) >>> 0;
    turn = mul(rol16(turn), 0xd38396ff) >>> 0;
    state = mul(rol16(mul(rol16(turn), 0x7c932b89)), 0xbfa49f69) >>> 0;
    acc = (acc + state) >>> 0;
  }
  const result = Buffer.allocUnsafe(8);
  result.writeUInt32LE((swapLast ^ state) >>> 0, 0);
  result.writeUInt32LE((swapAcc ^ acc) >>> 0, 4);
  return result;
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (mark) => {
    if (mark === "<") return "&lt;";
    if (mark === ">") return "&gt;";
    if (mark === "&") return "&amp;";
    if (mark === '"') return "&quot;";
    return "&apos;";
  });
}

function percent(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function prosodyFor(rate, pitch) {
  const safeRate = Math.min(1.06, Math.max(0.94, Number(rate) || 1));
  const safePitch = Math.min(1.05, Math.max(0.9, Number(pitch) || 1));
  return {
    rate: percent((safeRate - 1) * 100),
    pitch: percent((safePitch - 1) * 100),
  };
}

export function cleanSpokenLine(value) {
  let text = String(value || "");
  text = text.replace(/\b(?:vapshe|vabshe|vobshe|prosto|prosta)\b/gi, " ");
  text = text.replace(/вообще|вобще|просто/gi, " ");
  text = text.replace(/([oOgG])['\u2018\u2019\u02BB\u02BC]/g, "$1\u2018");
  text = text.replace(/[^A-Za-z0-9\u0400-\u04FF\u2018\u2019\u02BC\s.]/g, " ");
  text = text.replace(
    /(?<![A-Za-z\u0400-\u04FF])[\u2018\u2019\u02BC]+|[\u2018\u2019\u02BC]+(?![A-Za-z\u0400-\u04FF])/g,
    " "
  );
  text = text.replace(/(?:\s*\.\s*)+/g, ". ");
  text = text.replace(/\s+/g, " ").trim();
  if (!text || text === ".") return "";
  return text.endsWith(".") ? text : `${text}.`;
}

export function normalizeSegments(body) {
  const source = Array.isArray(body?.segments) ? body.segments : [];
  const segments = [];
  source.slice(0, 8).forEach((segment) => {
    const text = cleanSpokenLine(segment?.text).slice(0, 220);
    if (!text) return;
    const lang = segment?.lang === "en-US" ? "en-US" : "uz-UZ";
    segments.push({
      text,
      lang,
      rate: Number(segment?.rate) || 1,
      pitch: Number(segment?.pitch) || 1,
    });
  });
  const total = segments.reduce((sum, segment) => sum + segment.text.length, 0);
  if (total > 900) return segments.slice(0, 4);
  return segments;
}

function asBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(String(data));
}

function readWords(message) {
  const splitAt = message.indexOf("\r\n\r\n");
  if (splitAt < 0) return [];
  try {
    const payload = JSON.parse(message.slice(splitAt + 4));
    const rows = Array.isArray(payload?.Metadata) ? payload.Metadata : [];
    return rows
      .filter((row) => row?.Type === "WordBoundary" && row?.Data?.text?.Text)
      .slice(0, 80)
      .map((row) => {
        const start = Math.max(0, Math.floor(Number(row.Data.Offset) / 10000));
        const duration = Math.max(0, Math.floor(Number(row.Data.Duration) / 10000));
        const text = cleanSpokenLine(row.Data.text.Text).replace(/\.+$/, "").trim();
        return {
          text,
          start,
          end: start + duration,
        };
      })
      .filter((word) => word.text);
  } catch {
    return [];
  }
}

function synthesizeOne(segment) {
  const voice = VOICES[segment.lang] || VOICES["uz-UZ"];
  const prosody = prosodyFor(segment.rate, segment.pitch);
  const token = secToken();
  const connectionId = randomBytes(16).toString("hex");
  const url =
    "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
    `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${token}` +
    `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
    `&ConnectionId=${connectionId}`;
  const socket = new WebSocket(url, {
    headers: {
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        `(KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0 Safari/537.36 ` +
        `Edg/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0`,
      "Accept-Language": "en-US,en;q=0.9",
    },
    origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    handshakeTimeout: 8000,
    perMessageDeflate: false,
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const words = [];
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      try {
        socket.close();
      } catch {
        socket.terminate();
      }
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("tts-timeout")), 9000);

    socket.on("error", (error) => finish(error));
    socket.on("close", (code) => {
      if (!settled) finish(new Error(`tts-closed-${code}`));
    });
    socket.on("message", (data, isBinary) => {
      const frame = asBuffer(data);
      if (isBinary) {
        if (frame.length < 2) return;
        const offset = frame.readUInt16BE(0) + 2;
        if (offset < 2 || offset >= frame.length) return;
        const audio = frame.subarray(offset);
        if (audio.length) chunks.push(audio);
        return;
      }
      const message = frame.toString("utf8");
      if (message.includes("Path:audio.metadata")) words.push(...readWords(message));
      if (message.includes("Path:turn.end")) {
        const audio = Buffer.concat(chunks);
        if (audio.length < 256) finish(new Error("tts-empty"));
        else finish(null, { lang: segment.lang, audio, words: words.slice(0, 80) });
      }
    });
    socket.on("open", () => {
      socket.send(
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "true",
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        })}`
      );
      const requestId = randomBytes(16).toString("hex");
      const ssml =
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.xml}">` +
        `<voice name="${voice.name}">` +
        `<prosody rate="${prosody.rate}" pitch="${prosody.pitch}" volume="+0%">` +
        `${escapeXml(segment.text)}` +
        `</prosody></voice></speak>`;
      socket.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });
  });
}

export async function synthesizeParts(segments) {
  const parts = await Promise.all(segments.map((segment) => synthesizeOne(segment)));
  return parts;
}
