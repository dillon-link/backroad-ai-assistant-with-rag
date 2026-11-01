import { PRODUCTS, type Product } from './catalog';

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Score each product by name-token overlap with the query.
// k = 3 means top-k: return at most 3 products.
export function retrieve(query: string, k = 3): Product[] {
  const q = new Set(tokens(query));
  if (q.size === 0) return [];
  return PRODUCTS.map((p) => {
    const score = tokens(p.name).filter((t) => q.has(t)).length;
    return { p, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => r.p);
}

// Only these docs go into the prompt.
export function formatDocs(docs: Product[]): string {
  if (docs.length === 0) return 'No catalog items matched this query.';
  return 'Relevant catalog items: ' + docs.map((p) => `${p.name} (${p.price}, ${p.deal})`).join('; ') + '.';
}
