export type Product = { name: string; price: string; deal: string };

// Everything the store sells.
export const PRODUCTS: Product[] = [
  { name: 'Fountain pen', price: '$49.00', deal: '20% off' },
  { name: 'Ballpoint pen', price: '$4.50', deal: '10% off' },
  { name: 'Pencil set (12)', price: '$9.00', deal: '10% off' },
  { name: 'Notebook (A5)', price: '$14.00', deal: '15% off' },
  { name: 'Sketchbook', price: '$18.00', deal: '10% off' },
  { name: 'Sticky notes', price: '$5.00', deal: '10% off' },
  { name: 'Washi tape', price: '$6.50', deal: '10% off' },
  { name: 'Paper clips', price: '$3.00', deal: 'full price' },
];

// Plain-text catalog appended to the system prompt so the model knows the stock.
export function catalogText(): string {
  return 'Store catalog: ' + PRODUCTS.map((p) => `${p.name} (${p.price}, ${p.deal})`).join('; ') + '.';
}
