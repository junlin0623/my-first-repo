# 一人工作台 · One-person Workbench

A web workbench for one-person media companies: pluggable AI agents (chief editor, topic scout, writer, fact-checker, designer, scheduler) that help run several content accounts.

**Status: step 2 (content workflow).** Idea pool → daily topic list → writer drafts → fact-check → review and revise → approve → published, with 主编 (chief editor) on the home page dispatching work to the other agents. Image rendering (step 3) and scheduling (step 4) come next.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev                  # http://localhost:3000
```

1. Log in with `APP_PASSWORD`.
2. **设置 → 模型连接**: add a connection (Claude, DeepSeek, or any OpenAI-compatible API).
3. **设置 → 品牌**: account name, positioning, voice. These are prepended to every agent's prompt.
4. **Agent**: give 主编, 选题官, 写手 and 核查员 a connection and model.
5. **设置 → 导入旧项目** (optional): point it at an exported project folder to bring in old topic lists, drafts and card images.

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
| Drafts: write, check, revise (background jobs) | `lib/drafts.ts` |
| Ideas and topic lists (选题官) | `lib/scout.ts` |
| 主编 dispatch | `lib/chief.ts` |
| Old-project import | `lib/legacy.ts` |

Adding an agent = one entry in `DEFAULT_AGENTS`.

## Secrets

This repo is public. Keys and passwords live only in `.env.local` and in the local database (`data/`), both gitignored. API keys are encrypted at rest and shown only by their last 4 characters.
