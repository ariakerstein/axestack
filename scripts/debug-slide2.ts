import { JSDOM } from 'jsdom';

async function main() {
  const html = await fetch('https://navis.health/pitches/p13nAI.html').then(r => r.text());
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const slides = doc.querySelectorAll('section.slide, .slide');
  const slide = slides[1]; // Slide 2

  console.log('=== SLIDE 2 DEBUG ===\n');

  // Title
  const h2 = slide.querySelector('h2');
  console.log('Title:', h2?.textContent?.trim());

  // Stats
  console.log('\n--- STATS ---');
  const textCenter = slide.querySelectorAll('.text-center');
  textCenter.forEach((el, i) => {
    const big = el.querySelector('.text-3xl');
    const small = el.querySelector('.text-sm');
    if (big) {
      console.log(`Stat ${i}: ${big.textContent?.trim()} - ${small?.textContent?.trim()}`);
    }
  });

  // Pain cards (red-50)
  console.log('\n--- PAIN CARDS (red-50) ---');
  const redCards = slide.querySelectorAll('.bg-red-50, [class*="bg-red"]');
  redCards.forEach((el, i) => {
    const text = el.querySelector('p')?.textContent?.trim();
    console.log(`Card ${i}: ${text}`);
  });

  // Dark callout
  console.log('\n--- DARK CALLOUT ---');
  const darkBox = slide.querySelector('.bg-slate-800');
  console.log('Callout:', darkBox?.querySelector('p')?.textContent?.trim());

  // Quote
  console.log('\n--- QUOTE ---');
  const quoteBox = slide.querySelector('.bg-slate-100');
  console.log('Quote:', quoteBox?.querySelector('p')?.textContent?.trim());

  // Image
  console.log('\n--- IMAGE ---');
  const img = slide.querySelector('img:not(.h-8)');
  console.log('Image:', img?.getAttribute('src'));

  // Grid structure
  console.log('\n--- GRID STRUCTURE ---');
  const grids = slide.querySelectorAll('.grid');
  grids.forEach((grid, i) => {
    console.log(`Grid ${i}: ${grid.className}`);
    const children = grid.querySelectorAll(':scope > div');
    console.log(`  Children: ${children.length}`);
  });
}

main().catch(console.error);
