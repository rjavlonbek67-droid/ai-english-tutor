/**
 * AI Ingliz tili ustozi — production server.
 *
 * Local run:
 *   1. Copy .env.example to .env and set GEMINI_API_KEY.
 *   2. npm install
 *   3. npm start
 *   4. Open http://localhost:3000
 *
 * Render, Railway, and similar hosts:
 *   - Start command: npm start
 *   - Set the GEMINI_API_KEY environment variable in the host dashboard.
 *   - Do not commit .env, paste the key into chat, or put it in a screenshot.
 *   - The browser only calls /api/chat. The key stays in process.env.
 */

import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash"];

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    mode: "backend",
    configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
  });
});

app.post("/api/chat", async (req, res) => {
  const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
  if (!key) {
    res.status(503).json({ error: "missing-server-key" });
    return;
  }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "invalid-body" });
    return;
  }

  try {
    const forwarded = await forwardToGemini(req.body, key);
    res.status(forwarded.status);
    res.type(forwarded.type);
    res.send(forwarded.text);
  } catch {
    res.status(502).json({ error: "upstream-network" });
  }
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isQuotaAttempt(attempt) {
  const sample = attempt.text.slice(0, 1500).toLowerCase();
  const marked =
    sample.includes("resource_exhausted") ||
    sample.includes("quota") ||
    sample.includes("rate limit") ||
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

function quotaResult() {
  return {
    status: 429,
    type: "application/json; charset=utf-8",
    text: JSON.stringify({ error: "quota", retried: true }),
  };
}

async function callModel(model, body, key) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );
  return {
    ok: response.ok,
    status: response.status,
    type: response.headers.get("content-type") || "application/json",
    text: await response.text(),
    retryAfter: response.headers.get("retry-after") || "",
  };
}

function publicResult(attempt) {
  return { status: attempt.status, type: attempt.type, text: attempt.text };
}

async function forwardToGemini(body, key) {
  let last = { status: 502, type: "application/json", text: JSON.stringify({ error: "upstream-network" }) };
  let quotaRetried = false;

  for (let index = 0; index < GEMINI_MODELS.length; index += 1) {
    const attempt = await callModel(GEMINI_MODELS[index], body, key);
    last = publicResult(attempt);
    if (attempt.ok) return last;

    if (isQuotaAttempt(attempt)) {
      const wait = quotaWaitMs(attempt);
      if (quotaRetried || wait === 0) return quotaResult();
      quotaRetried = true;
      await sleep(wait);
      if (index < GEMINI_MODELS.length - 1) continue;
      const again = await callModel(GEMINI_MODELS[index], body, key);
      last = publicResult(again);
      if (again.ok) return last;
      return quotaResult();
    }

    const retryable = attempt.status === 404 || attempt.status === 503;
    if (!retryable) return last;
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
