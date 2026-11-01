# backroads-ai-assistant

Conversational stationery shop assistant built with Backroad. One Node process, no frontend code.

## Stack

Node 24 · `@backroad/backroad` · `openai` · `dotenv` · `tsx` + `typescript` (dev)

## Files

- `src/app.ts` — UI: title, sidebar system prompt, chat history, clear button, chat input
- `src/ai.ts` — `answer()` streams OpenAI replies; canned demo text without `OPENAI_API_KEY`
- `src/catalog.ts` — `PRODUCTS` list + `catalogText()` for the model prompt

## Run

```bash
nvm use 24
npm install
cp .env.example .env  # set OPENAI_API_KEY for real answers
npm run dev  # http://localhost:3334
```
