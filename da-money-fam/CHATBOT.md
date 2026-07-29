# DMF Chatbot & Ad Studio Setup

This document outlines the setup and features for the DMF Premium Chatbot and integrated Ad Studio.

## Chatbot AI Providers

The chatbot uses a **cascading fallback** so a dead model slug does not break chat:

1. **Groq (recommended for chat)** — when `GROQ_API_KEY` is set. Default: `llama-3.3-70b-versatile`.
2. **OpenRouter Gemma** — `google/gemma-4-31b-it` (default when Groq is not configured).
3. **OpenRouter auto-router** — `openrouter/free` picks any available free model.
4. **Other OpenRouter models** — `openai/gpt-oss-20b`, `inclusionai/ling-3.0-flash`, `nvidia/nemotron-3-super-120b-a12b`.

**Rate limits (realistic):**

| Provider | Limits |
|---|---|
| Groq free | 30 req/min; up to 14,400 req/day on Llama 3.1 8B |
| OpenRouter free | 20 req/min; 50 req/day (no credits) or 1,000/day (after $10 lifetime credits) |
| Ollama local | Unlimited on your machine |

5. **Ollama (local, optional):** Set `OLLAMA_BASE_URL` for truly unlimited local inference.

**Configuration:** `OPENROUTER_API_KEY` is required for Seedance video. Add `GROQ_API_KEY` for best free chat volume (free at [console.groq.com](https://console.groq.com)).

Model list and default are exposed at `GET /api/chat`.

## Ad Studio (Seedance Video Generation)

Full-page studio at **/ad-studio** (Sora-style): library rail, preview canvas, prompt dock with **Single** / **Storyboard** (2–3 scenes), Look creative chips, 1–2 variants, remix from library. No ffmpeg merge — storyboards play as a playlist and download as separate MP4s.

Chat **Ads** tab opens `/ad-studio` (optional `?brief=`). Nav and Account also link to the studio.

Uses ByteDance Seedance 2.0 Fast via OpenRouter at 480p.

**Pricing:** **10 DMF Coinz** per clip (base). Storyboard = scenes × price. Variants = variations × price. Discounts for XP tiers and Fan Club:

| Who | Price (Coinz) | Discount |
|---|---|---|
| Signed-in, Level 1–2 (non Fan Club) | **10** | — |
| Level 3 Loyal Supporter | **9** | 10% |
| Level 4 Day-One Rider | **8** | 20% |
| Level 5 Inner Circle | **7** | 30% |
| Active Fan Club | **7** | 30% |

Users must be signed in and have sufficient Coinz. Buy more at [/coin-wallet](/coin-wallet).

**Reference images:** Up to 3 uploads with optional “Use as first frame.” Storyboard chains scenes by capturing the last frame of each clip in the browser (no server ffmpeg).

## Setup Notes

1. **Environment Variables:** Configure `OPENROUTER_API_KEY` (required) and `GROQ_API_KEY` (recommended for chat) in `.env.local`.
2. **Database:** Run [`supabase/ad-studio.sql`](supabase/ad-studio.sql) if `ad_studio_generations` is missing (local JSON fallback when Supabase is unset).
3. **Ollama:** Install Ollama and pull a model if using local chat (e.g. `ollama pull llama3.2:3b`).
