import { run } from '@backroad/backroad';
import 'dotenv/config';
import { DEFAULT_SYSTEM, answer, nudgeFor, toLLM, type Msg } from './ai';
import { PRODUCTS } from './catalog';

// Sidebar inspector: native collapses, scrolls with the sidebar.
function Inspector(sb: any, history: Msg[], payload: object[], system: string, nudge: string | null) {
  sb.write({ body: `**Inspector** · ${history.length} messages` });
  if (nudge) sb.collapse({ label: '⚡ trigger fired' }).write({ body: nudge });
  else sb.write({ body: '_Trigger: not fired — system unchanged._' });
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
    let history = br.getOrDefault<Msg[]>('history', []);
    let payload = br.getOrDefault<object[]>('payload', []);

    br.title({ label: 'Stationery shop assistant' });
    br.write({ body: 'Ask for recommendations — fountain pens are 20% off this week.' });

    // Settings + catalog in the main UI.
    const settings = br.collapse({ label: 'Settings & Catalog' });
    const system = settings.textArea({ id: 'system', label: 'System prompt', defaultValue: DEFAULT_SYSTEM, rows: 6 }) || DEFAULT_SYSTEM;
    settings.write({ body: '**Catalog**' });
    settings.table({
      data: PRODUCTS,
      columns: { name: { header: 'Item' }, price: { header: 'Price' }, deal: { header: 'Deal' } },
    });

    for (const m of history) br.chatMessage({ by: m.by }).write({ body: m.content });

    if (br.button({ id: 'clear', label: 'Clear chat' })) {
      history = [];
      payload = [];
      br.setValue('history', history);
      br.setValue('payload', payload);
    }
    if (!process.env.OPENAI_API_KEY) br.write({ body: '_Demo mode: set `OPENAI_API_KEY` for real answers._' });

    const next = br.chatInput({ id: 'chat', placeholder: 'Looking for stationery?…' });
    if (next) {
      const req = toLLM(history, next, system);
      br.setValue('payload', req);
      br.chatMessage({ by: 'human' }).write({ body: next });
      const text = await br.chatMessage({ by: 'ai' }).writeStream(answer(history, next, system));
      payload = [...req, { role: 'assistant', content: text }];
      history = [...history, { by: 'human', content: next }, { by: 'ai', content: text }];
      br.setValue('payload', payload);
      br.setValue('history', history);
    }

    // Inspector last, so it shows this run's fresh payload — not the previous run's.
    const lastUser = next ?? [...history].reverse().find((m) => m.by === 'human')?.content ?? null;
    Inspector(br.sidebar({}), history, payload, system, lastUser ? nudgeFor(lastUser) : null);
  },
  { server: { port: 3334 }},
);
