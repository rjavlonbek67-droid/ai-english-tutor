/**
 * AI Ingliz tili ustozi — production server.
 *
 * Local run:
 *   1. Copy .env.example to .env and set GROQ_API_KEY.
 *   2. npm install
 *   3. npm start
 *   4. Open http://localhost:3000
 *
 * Render, Railway, and similar hosts:
 *   - Start command: npm start
 *   - Set the GROQ_API_KEY environment variable in the host dashboard.
 *   - Optional GROQ_MODEL picks the first Groq model. Others are tried if it is unavailable.
 *   - Do not commit .env, paste the key into chat, or put it in a screenshot.
 *   - The browser calls /api/chat and /api/speak. The key stays in process.env.
 *   - Spoken replies are generated live. No audio files are stored.
 */

import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeSegments, synthesizeParts } from "./tts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const FALLBACK_MODELS = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"];

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    mode: "backend",
    configured: Boolean(groqKey()),
  });
});

const speakHits = new Map();

function allowSpeak(ip) {
  const now = Date.now();
  const recent = (speakHits.get(ip) || []).filter((stamp) => now - stamp < 60000);
  if (recent.length >= 80) {
    speakHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  speakHits.set(ip, recent);
  return true;
}

app.post("/api/speak", async (req, res) => {
  if (!allowSpeak(req.ip || "local")) {
    res.status(429).json({ error: "tts" });
    return;
  }
  const segments = normalizeSegments(req.body);
  if (!segments.length) {
    res.status(400).json({ error: "invalid-body" });
    return;
  }
  try {
    const parts = await synthesizeParts(segments);
    res.json({
      parts: parts.map((part) => ({
        lang: part.lang,
        words: part.words,
        audio: part.audio.toString("base64"),
      })),
    });
  } catch {
    res.status(502).json({ error: "tts" });
  }
});

app.post("/api/chat", async (req, res) => {
  const key = groqKey();
  if (!key) {
    res.status(503).json({ error: "missing-server-key" });
    return;
  }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "invalid-body" });
    return;
  }

  try {
    const forwarded = await forwardToGroq(req.body, key);
    res.status(forwarded.status);
    res.type(forwarded.type);
    res.send(forwarded.text);
  } catch {
    res.status(502).json({ error: "upstream-network" });
  }
});

function groqKey() {
  return process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : "";
}

function groqModels() {
  const chosen = String(process.env.GROQ_MODEL || "").trim();
  const models = [];
  if (chosen) models.push(chosen);
  FALLBACK_MODELS.forEach((model) => {
    if (!models.includes(model)) models.push(model);
  });
  return models;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toGroqMessages(body) {
  const messages = [];
  const system = typeof body.system === "string" ? body.system.trim() : "";
  if (system) messages.push({ role: "system", content: system });
  const turns = Array.isArray(body.messages) ? body.messages : [];
  turns.forEach((turn) => {
    const role = turn?.role === "assistant" ? "assistant" : turn?.role === "user" ? "user" : "";
    const content = typeof turn?.content === "string" ? turn.content.trim() : "";
    if (!role || !content) return;
    messages.push({ role, content });
  });
  return messages;
}

function isQuotaAttempt(attempt) {
  const sample = attempt.text.slice(0, 1500).toLowerCase();
  const marked =
    sample.includes("resource_exhausted") ||
    sample.includes("quota") ||
    sample.includes("rate limit") ||
    sample.includes("rate_limit") ||
    sample.includes("rate-limit");
  if (attempt.status === 429) return true;
  return marked && (attempt.status === 403 || attempt.status === 500 || attempt.status === 503);
}

function quotaWaitMs(attempt) {
  const header = Number(attempt.retryAfter);
  let wait = Number.isFinite(header) && header > 0 ? header * 1000 : 0;
  const match = attempt.text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (match) wait = Math.max(wait, Number(match[1]) * 1000);
  if (!wait) return 900;
  if (wait > 2000) return 0;
  return Math.round(wait);
}

function modelUnavailable(attempt) {
  if (attempt.status === 404 || attempt.status === 503) return true;
  if (attempt.status !== 400) return false;
  return /model|decommission|not found|does not exist|unknown model/.test(attempt.text.toLowerCase());
}

function jsonModeRejected(attempt) {
  return attempt.status === 400 && /response_format|json_object|json mode/i.test(attempt.text);
}

function quotaResult() {
  return {
    status: 429,
    type: "application/json; charset=utf-8",
    text: JSON.stringify({ error: "quota", retried: true }),
  };
}

function jsonResult(status, error) {
  return {
    status,
    type: "application/json; charset=utf-8",
    text: JSON.stringify({ error }),
  };
}

async function callGroq(model, messages, key, jsonMode) {
  const payload = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 3072,
  };
  if (jsonMode) payload.response_format = { type: "json_object" };
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  return {
    ok: response.ok,
    status: response.status,
    type: response.headers.get("content-type") || "application/json",
    text: await response.text(),
    retryAfter: response.headers.get("retry-after") || "",
  };
}

function tutorText(attempt) {
  let content = "";
  try {
    const data = JSON.parse(attempt.text);
    const message = data?.choices?.[0]?.message?.content;
    if (typeof message === "string") content = message;
    else if (Array.isArray(message)) {
      content = message.map((part) => part?.text || part?.content || "").join("");
    }
  } catch {
    content = "";
  }
  const text = String(content || "").trim();
  if (!text) {
    return {
      status: 200,
      type: "application/json; charset=utf-8",
      text: JSON.stringify({
        text: JSON.stringify({
          reaction_and_correction: "Kechirasiz bu safar javob to‘liq kelmadi.",
          spoken_reply: "Kechirasiz bu safar javob to‘liq kelmadi. Gapni yana bir marta ayting.",
          notebook: [],
        }),
      }),
    };
  }
  return {
    status: 200,
    type: "application/json; charset=utf-8",
    text: JSON.stringify({ text }),
  };
}

async function forwardToGroq(body, key) {
  const messages = toGroqMessages(body);
  if (!messages.some((message) => message.role === "user")) return jsonResult(400, "invalid-body");

  const models = groqModels();
  let last = jsonResult(502, "upstream-network");
  let quotaRetried = false;

  for (let index = 0; index < models.length; index += 1) {
    let attempt = await callGroq(models[index], messages, key, true);
    if (jsonModeRejected(attempt)) attempt = await callGroq(models[index], messages, key, false);
    if (attempt.ok) return tutorText(attempt);
    if (attempt.status === 401) return jsonResult(401, "bad-key");

    if (isQuotaAttempt(attempt)) {
      const wait = quotaWaitMs(attempt);
      if (quotaRetried || wait === 0) return quotaResult();
      quotaRetried = true;
      await sleep(wait);
      if (index < models.length - 1) continue;
      const again = await callGroq(models[index], messages, key, true);
      if (again.ok) return tutorText(again);
      return quotaResult();
    }

    if (!modelUnavailable(attempt)) {
      if (attempt.status === 403) return jsonResult(403, "bad-key");
      return jsonResult(attempt.status >= 500 ? attempt.status : 502, "upstream");
    }
    last = jsonResult(502, "upstream");
  }

  return last;
}

app.use((req, res, next) => {
  let pathname = req.path.toLowerCase();
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    res.status(400).end();
    return;
  }
  if (
    pathname === "/.env" ||
    pathname.startsWith("/.env") ||
    pathname.startsWith("/.git") ||
    pathname === "/config.js" ||
    pathname === "/config.local.js" ||
    pathname === "/server.js" ||
    pathname === "/tts.js" ||
    pathname === "/package.json" ||
    pathname === "/package-lock.json" ||
    pathname.includes("node_modules")
  ) {
    res.status(404).end();
    return;
  }
  next();
});

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Tutor server listening on ${port}`);
});
