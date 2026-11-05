import { run } from '@backroad/backroad';
import 'dotenv/config';
import { DEFAULT_SYSTEM, answer, nudgeFor, toLLM, type Msg } from './ai';
import { PRODUCTS } from './catalog';
import { retrieve } from './retrieval';

// Sidebar inspector: native collapses, scrolls with the sidebar.
function Inspector(sb: any, history: Msg[], payload: object[], system: string, nudge: string | null, docs: string[]) {
  sb.write({ body: `**Inspector** · ${history.length} messages` });
  if (nudge) sb.collapse({ label: '⚡ trigger fired' }).write({ body: nudge });
  else sb.write({ body: '_Trigger: not fired — system unchanged._' });
  sb.collapse({ label: `Retrieved docs · ${docs.length}` }).write({ body: docs.length > 0 ? docs.join(', ') : 'none' });
  sb.collapse({ label: '0. system (base)' }).write({ body: system });
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const box = sb.collapse({ label: `${i + 1}. ${m.by} · ${m.content.length} chars` });
    box.write({ body: m.content });
  }
  if (payload.length > 0) sb.collapse({ label: `LLM payload · ${payload.length} (item 0 = system)` }).json({ src: payload, id: 'llm-payload' });
}

run(
  async (br) => {
    // STEP 1/5: Restore state + render main UI.
    let history = br.getOrDefault<Msg[]>('history', []);
    let payload = br.getOrDefault<object[]>('payload', []);

    const [chat, side] = br.columns({ columns: [2, 1] });

    chat.title({ label: 'Stationery shop assistant' });
    chat.write({ body: 'Ask for recommendations — fountain pens are 20% off this week.' });

    // Settings + catalog in the main UI.
    const settings = chat.collapse({ label: 'Settings & Catalog' });
    const system = settings.textArea({ id: 'system', label: 'System prompt', defaultValue: DEFAULT_SYSTEM, rows: 6 }) || DEFAULT_SYSTEM;
    settings.write({ body: '**Catalog**' });
    settings.table({
      data: PRODUCTS,
      columns: { name: { header: 'Item' }, price: { header: 'Price' }, deal: { header: 'Deal' } },
    });

    for (const m of history) chat.chatMessage({ by: m.by }).write({ body: m.content });

    // STEP 2/5: Handle input actions.
    if (chat.button({ id: 'clear', label: 'Clear chat' })) {
      history = [];
      payload = [];
      br.setValue('history', history);
      br.setValue('payload', payload);
    }
    if (!process.env.OPENAI_API_KEY) chat.write({ body: '_Demo mode: set `OPENAI_API_KEY` for real answers._' });

    const next = chat.chatInput({ id: 'chat', placeholder: 'Looking for stationery?…' });
    // RAG PIPELINE: Retrieve -> Augment prompt -> Generate
    // toLLM() = Retrieve + Augment prompt, answer() = Generate.
    // STEP 3/5: RAG + LLM — toLLM() retrieves docs & builds prompt, answer() calls LLM.
    if (next) {
      const req = toLLM(history, next, system);
      br.setValue('payload', req);
      chat.chatMessage({ by: 'human' }).write({ body: next });
      const text = await chat.chatMessage({ by: 'ai' }).writeStream(answer(history, next, system));
      payload = [...req, { role: 'assistant', content: text }];
      history = [...history, { by: 'human', content: next }, { by: 'ai', content: text }];
      br.setValue('payload', payload);
      br.setValue('history', history);
    }

    // STEP 4/5: Recompute RAG context for display only (not used for answer).
    const lastUser = next ?? [...history].reverse().find((m) => m.by === 'human')?.content ?? null;
    const docs = lastUser ? retrieve(lastUser).map((p) => p.name) : [];
    // STEP 5/5: Render inspector in right column (no state change).
    Inspector(side, history, payload, system, lastUser ? nudgeFor(lastUser) : null, docs);
  },
  { server: { port: 3334 }},
);
