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

async function forwardToGemini(body, key) {
  let last = { status: 502, type: "application/json", text: JSON.stringify({ error: "upstream-network" }) };

  for (let index = 0; index < GEMINI_MODELS.length; index += 1) {
    const model = GEMINI_MODELS[index];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const text = await response.text();
    last = {
      status: response.status,
      type: response.headers.get("content-type") || "application/json",
      text,
    };
    const retryable = response.status === 404 || response.status === 503;
    if (response.ok || !retryable || index === GEMINI_MODELS.length - 1) return last;
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
