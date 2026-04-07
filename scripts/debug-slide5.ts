// Debug slide 5 card extraction
import { JSDOM } from 'jsdom';

async function main() {
  const html = await fetch('https://navis.health/pitches/p13nAI.html').then(r => r.text());
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const slides = doc.querySelectorAll('section.slide, .slide');
  const slide5 = slides[4];

  console.log('\n=== SLIDE 5 DEBUG ===\n');
  console.log('HTML structure:');

  // Check for space-y containers
  const spaceContainers = slide5.querySelectorAll('[class*="space-y"]');
  console.log(`Found ${spaceContainers.length} space-y containers`);

  spaceContainers.forEach((container, i) => {
    console.log(`\nContainer ${i}: class="${container.className}"`);
    const children = container.querySelectorAll(':scope > div');
    console.log(`  Children: ${children.length}`);

    children.forEach((child, j) => {
      console.log(`  Child ${j}: class="${child.className.substring(0, 80)}..."`);
      const boldEl = child.querySelector('.font-bold, .font-semibold, span.font-bold');
      const emojiSpan = child.querySelector('span.text-2xl');
      console.log(`    Bold text: "${boldEl?.textContent?.trim()}"`);
      console.log(`    Emoji span: "${emojiSpan?.textContent?.trim()}"`);
    });
  });

  // Try to extract cards with the updated logic
  console.log('\n=== CARD EXTRACTION ===\n');

  const cards: any[] = [];
  const seenTitles = new Set<string>();

  const extractCardFromEl = (child: Element) => {
    const emojiSpan = child.querySelector('span.text-2xl, span.text-3xl');
    const emojiText = emojiSpan?.textContent?.trim() || '';

    const boldEl = child.querySelector('.font-bold, .font-semibold, h3, span.font-bold');
    let title = boldEl?.textContent?.trim() || '';

    const subtitleEl = child.querySelector('.text-slate-400, .text-slate-500, .text-sm:not(.font-bold), .text-xs');
    let subtitle = subtitleEl?.textContent?.trim();
    if (subtitle) subtitle = subtitle.replace(/^[-—–]\s*/, '');

    if (title && title.length < 60 && !seenTitles.has(title)) {
      seenTitles.add(title);
      cards.push({ emoji: emojiText, title, subtitle });
    }
  };

  // Pattern 2: Space-y containers with rounded cards
  spaceContainers.forEach(container => {
    const children = container.querySelectorAll(':scope > div[class*="rounded"]');
    console.log(`Space-y container: ${children.length} rounded children`);
    if (children.length >= 3) {
      children.forEach(child => extractCardFromEl(child));
    }
  });

  console.log('Extracted cards:', cards);
}

main().catch(console.error);
