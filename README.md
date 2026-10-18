# 一人工作台 · One-person Workbench

A web workbench for one-person media companies: pluggable AI agents (chief editor, topic scout, writer, fact-checker, designer, scheduler) that help run several content accounts.

**Status: step 1 (skeleton).** Login, model connections, agent settings, and chatting with any agent. The content workflow (topics → drafts → review) comes in step 2.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev                  # http://localhost:3000
```

1. Log in with `APP_PASSWORD`.
2. **设置 → 模型连接**: add a connection (Claude, DeepSeek, or any OpenAI-compatible API).
3. **设置 → 品牌**: account name, positioning, voice. These are prepended to every agent's prompt.
4. **Agent → 写手**: pick a connection and model, save, and chat.

Optional: put brand values in `data/brand.local.json` (same keys as the brand form) to seed them on first run.

## How it fits together

| Piece | Where |
|---|---|
| Model layer (Anthropic + OpenAI-compatible via AI SDK) | `lib/models.ts` |
| Built-in agents, brand fields, connection presets | `lib/defaults.ts` |
| SQLite schema (Drizzle) | `lib/schema.ts`, `lib/db.ts` |
| API keys encrypted with AES-256-GCM | `lib/crypto.ts` |
| Single-password login | `lib/session.ts`, `proxy.ts` |
| Streaming chat | `app/api/chat/route.ts` |

Adding an agent = one entry in `DEFAULT_AGENTS`.

## Secrets

This repo is public. Keys and passwords live only in `.env.local` and in the local database (`data/`), both gitignored. API keys are encrypted at rest and shown only by their last 4 characters.
