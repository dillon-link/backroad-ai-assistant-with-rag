import OpenAI from 'openai';
import { PRODUCTS } from './catalog';
import { formatDocs, retrieve } from './retrieval';

export type Msg = { by: 'human' | 'ai'; content: string };

export const DEFAULT_SYSTEM =
  'You are a helpful assistant in a stationery shop. You should try to gently encourage ' +
  'the customer to browse items that are on sale. Fountain pens are 20% off, notebooks are 15% off, and most other items are 10% off. ' +
  "For example, if the customer says 'I'm looking for a gift', " +
  'you could reply something like, \'Wonderful - we have lots of staff picks - including several fountain pens that are part of our sale event.\' ' +
  'Encourage the customer to browse fountain pens if they are unsure what to get.';

const OFF_CATALOG = ['printer', 'laptop', 'e-reader', 'ereader', 'desk', 'chair', 'backpack', 'phone', 'tablet', 'monitor', 'shoe', 'hat', 'belt'];

const REQUEST_HINTS = ['do you have', 'do you sell', 'do you carry', 'looking for', 'looking to buy', 'want to buy', 'need a', 'need an', 'get a', 'how much', 'price of', 'buy a', 'sell'];

export function nudgeFor(message: string): string | null {
  const lower = message.toLowerCase();
  const inCatalog = PRODUCTS.some((p) => lower.includes(p.name.toLowerCase().split(' ')[0]));
  if (inCatalog) return null;
  const off = OFF_CATALOG.find((w) => lower.includes(w));
  if (off) return `The store does not sell ${off}s; say so briefly and point out fountain pens and other items on sale.`;
  const asking = REQUEST_HINTS.some((h) => lower.includes(h));
  if (asking) return 'The customer asked about something not in the catalog; say it is not carried and redirect them to fountain pens and other items on sale.';
  return null;
}

function relevantSystem(base: string, message: string): string {
  const nudge = nudgeFor(message);
  return nudge ? `${base} ${nudge}` : base;
}

export function toLLM(history: Msg[], message: string, system: string) {
  // ============================================================
  // RAG PIPELINE: Retrieve -> Augment prompt -> Generate
  // STEP 2/3 — AUGMENT PROMPT: retrieve(query) + formatDocs()
  // injects ONLY the retrieved docs into the system message.
  // ============================================================
  return [
    { role: 'system', content: `${relevantSystem(system, message)}\n${formatDocs(retrieve(message))}` }, // Retrieve -> Augment prompt
    ...history.map(
      (m): { role: 'user' | 'assistant'; content: string } => ({
        role: m.by === 'human' ? 'user' : 'assistant',
        content: m.content,
      }),
    ),
    { role: 'user', content: message },
  ];
}

export async function* answer(history: Msg[], message: string, system: string): AsyncGenerator<string> {
  // ============================================================
  // RAG PIPELINE: Retrieve -> Augment prompt -> Generate
  // STEP 3/3 — GENERATE: send the AUGMENTED prompt (toLLM) to the LLM.
  // ============================================================
  if (!process.env.OPENAI_API_KEY) {
    yield* demoReply();
    return;
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: toLLM(history, message, system) as { role: 'system' | 'user' | 'assistant'; content: string }[],
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (err) {
    yield `AI error: ${err instanceof Error ? err.message : 'request failed'}`;
  }
}

async function* demoReply(): AsyncGenerator<string> {
  const text =
    'Demo mode — no `OPENAI_API_KEY` set, so this is canned text. Copy `.env.example` to `.env`, set the key, and restart for real answers.';
  for (const word of text.split(' ')) {
    await new Promise((r) => setTimeout(r, 30));
    yield word + ' ';
  }
}
