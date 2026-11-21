# AI Ingliz tili ustozi

Personal English tutor with an animated face, microphone input, spoken replies, and coach modes from A1 through IELTS.

The browser calls `POST /api/chat`. The Gemini key stays in `GEMINI_API_KEY` on the server. There is no key box, and the key is not in the page.

## Local run

```bash
npm install
copy .env.example .env
```

Put the key only in `.env`, then:

```bash
npm start
```

Open `http://localhost:3000` on a computer or phone on the same network.

## Render

`render.yaml` describes a free Web Service with auto-deploy. Connect the GitHub repo, set `GEMINI_API_KEY` in Environment, and leave the start command as `npm start`.

Do not commit `.env`, paste the key into chat, or put it in a screenshot. `.gitignore` ignores `.env`, `node_modules/`, and local secret config files.

## Saved notes

Corrections, phrases, and word notes are stored in `localStorage` under **Xatolar va so‘zlar**. Recent chat turns stay in memory until the page is reloaded. The selected coach mode is remembered in this browser.
