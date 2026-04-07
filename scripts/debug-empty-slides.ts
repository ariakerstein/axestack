import { JSDOM } from 'jsdom';

async function main() {
  const html = await fetch('https://navis.health/pitches/p13nAI.html').then(r => r.text());
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const slides = doc.querySelectorAll('section.slide, .slide');

  // Debug slide 10 and 13
  for (const idx of [9, 12]) { // 0-indexed
    const slide = slides[idx];
    const title = slide.querySelector('h1, h2')?.textContent?.trim() || 'No title';
    console.log('\n' + '='.repeat(60));
    console.log('SLIDE ' + (idx + 1) + ': ' + title);
    console.log('='.repeat(60));

    // Check for table-like structures
    const tables = slide.querySelectorAll('table');
    console.log('Tables: ' + tables.length);

    // Check for grid structures
    const grids = slide.querySelectorAll('.grid');
    console.log('Grids: ' + grids.length);
    grids.forEach((grid, i) => {
      const children = grid.querySelectorAll(':scope > div');
      console.log('  Grid ' + i + ': ' + children.length + ' children, class=' + grid.className.substring(0, 60));
    });

    // Check for any text content
    const allDivs = slide.querySelectorAll('div');
    console.log('Total divs: ' + allDivs.length);

    // Look for specific patterns
    const rowDivs = slide.querySelectorAll('[class*="flex"][class*="items-center"]');
    console.log('Flex row divs: ' + rowDivs.length);

    // Check text content
    const pTags = slide.querySelectorAll('p');
    console.log('P tags: ' + pTags.length);
    pTags.forEach((p, i) => {
      const text = p.textContent?.trim();
      if (text && text.length > 5 && text.length < 100) {
        console.log('  p' + i + ': ' + text.substring(0, 50));
      }
    });

    // Check spans
    const spans = slide.querySelectorAll('span');
    console.log('Spans: ' + spans.length);
    const seenSpans = new Set<string>();
    spans.forEach((span, i) => {
      const text = span.textContent?.trim();
      if (text && text.length > 3 && text.length < 50 && !seenSpans.has(text)) {
        seenSpans.add(text);
        console.log('  span' + i + ': ' + text);
      }
    });

    // Get inner HTML preview
    const inner = slide.innerHTML;
    console.log('\nHTML preview (first 500 chars):');
    console.log(inner.substring(0, 500));
  }
}

main().catch(console.error);
