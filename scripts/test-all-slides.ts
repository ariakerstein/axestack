// Comprehensive test for all slides extraction
import { JSDOM } from 'jsdom';

interface ParsedStat { value: string; label: string; }
interface ParsedCard { title: string; subtitle?: string; emoji?: string; color: string; }
interface ParsedQuote { text: string; author: string; }

async function main() {
  const html = await fetch('https://navis.health/pitches/p13nAI.html').then(r => r.text());
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const slides = doc.querySelectorAll('section.slide, .slide');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PARSING ${slides.length} SLIDES FROM p13nAI.html`);
  console.log(`${'='.repeat(60)}\n`);

  const results: any[] = [];

  let idx = 0;
  for (const slideEl of slides) {
    const h1 = slideEl.querySelector('h1');
    const h2 = slideEl.querySelector('h2');
    const title = h1?.textContent?.trim() || h2?.textContent?.trim() || `Slide ${idx + 1}`;

    // Extract bullets
    const bullets: string[] = [];
    slideEl.querySelectorAll('li').forEach(li => {
      const text = li.textContent?.trim();
      if (text && text.length < 200 && text.length > 5) bullets.push(text);
    });

    // Extract stats (improved)
    const stats: ParsedStat[] = [];
    const seenValues = new Set<string>();

    // Stat value must be SHORT (under 15 chars) and look like a number/metric
    const isStatValue = (text: string): boolean => {
      if (!text || text.length > 15) return false;
      return !!(text.match(/^[\d$]/) || text.match(/\d[KMB%×x+]?$/i));
    };

    // Pattern 1: Big text elements
    const bigNumbers = slideEl.querySelectorAll('[class*="text-3xl"], [class*="text-4xl"], [class*="text-5xl"], [class*="text-6xl"]');
    bigNumbers.forEach(bigNum => {
      const value = bigNum.textContent?.trim() || '';
      if (value && !seenValues.has(value) && isStatValue(value)) {
        const parent = bigNum.parentElement;
        const labelEl = parent?.querySelector('[class*="text-sm"], [class*="text-xs"], p:not([class*="text-3"]):not([class*="text-4"]):not([class*="text-5"]):not([class*="text-6"])');
        const label = labelEl?.textContent?.trim() || '';
        if (label && label !== value) {
          stats.push({ value, label });
          seenValues.add(value);
        }
      }
    });

    // Pattern 2: Flex containers with p tags
    if (stats.length === 0) {
      const flexContainers = slideEl.querySelectorAll('.flex, .grid');
      flexContainers.forEach(container => {
        const divs = container.querySelectorAll(':scope > div');
        divs.forEach(div => {
          const paragraphs = div.querySelectorAll('p');
          if (paragraphs.length >= 2) {
            const firstP = paragraphs[0]?.textContent?.trim() || '';
            const secondP = paragraphs[1]?.textContent?.trim() || '';
            if (isStatValue(firstP) && secondP.length > 0 && secondP.length < 30 && !seenValues.has(firstP)) {
              stats.push({ value: firstP, label: secondP });
              seenValues.add(firstP);
            }
          }
        });
      });
    }

    // Extract quote
    let quote: ParsedQuote | undefined;
    const italicEls = slideEl.querySelectorAll('.italic, em, i');
    for (const el of italicEls) {
      const text = el.textContent?.trim() || '';
      if (text.length >= 20 && text.length <= 300) {
        const parent = el.parentElement;
        const siblings = parent?.querySelectorAll('p');
        let author = '';
        if (siblings) {
          for (const sib of siblings) {
            const sibText = sib.textContent?.trim() || '';
            if (sibText.match(/^[-—–]\s*.+/)) {
              author = sibText.replace(/^[-—–]\s*/, '');
              break;
            }
          }
        }
        quote = { text: text.replace(/^[""]|[""]$/g, '').substring(0, 80) + '...', author };
        break;
      }
    }

    // Extract cards (matches DeckLibrary.tsx logic)
    const cards: ParsedCard[] = [];
    const seenCardTitles = new Set<string>();

    const extractCardFromEl = (child: Element) => {
      const emojiSpan = child.querySelector('span.text-2xl, span.text-3xl');
      const emojiText = emojiSpan?.textContent?.trim() || '';
      const boldEl = child.querySelector('.font-bold, .font-semibold, h3, span.font-bold');
      let cardTitle = boldEl?.textContent?.trim() || '';
      if (!cardTitle) {
        const firstP = child.querySelector('p, div > span');
        cardTitle = firstP?.textContent?.trim() || '';
      }
      const subtitleEl = child.querySelector('.text-slate-400, .text-slate-500, .text-sm:not(.font-bold), .text-xs');
      let subtitle = subtitleEl?.textContent?.trim();
      if (subtitle) subtitle = subtitle.replace(/^[-—–]\s*/, '');
      if (cardTitle && cardTitle.length < 60 && !seenCardTitles.has(cardTitle)) {
        seenCardTitles.add(cardTitle);
        cards.push({ title: cardTitle, subtitle, emoji: emojiText, color: 'gray' });
      }
    };

    // Pattern 1: Grid containers (2+ columns with card-like content)
    const gridContainers = slideEl.querySelectorAll('.grid');
    gridContainers.forEach(grid => {
      const children = grid.querySelectorAll(':scope > div');
      const hasCardStyling = Array.from(children).some(c =>
        c.className.includes('rounded') || c.className.includes('bg-')
      );
      if (children.length >= 2 && hasCardStyling) {
        children.forEach(child => extractCardFromEl(child));
      } else if (children.length >= 3) {
        children.forEach(child => extractCardFromEl(child));
      }
    });

    // Pattern 2: Space-y containers with rounded cards
    if (cards.length === 0) {
      const spaceContainers = slideEl.querySelectorAll('[class*="space-y"]');
      spaceContainers.forEach(container => {
        const children = container.querySelectorAll(':scope > div[class*="rounded"]');
        if (children.length >= 3) {
          children.forEach(child => extractCardFromEl(child));
        }
      });
    }

    // Pattern 3: Flex containers with card-like divs
    if (cards.length === 0) {
      const flexContainers = slideEl.querySelectorAll('.flex');
      flexContainers.forEach(container => {
        const children = container.querySelectorAll(':scope > div[class*="rounded"], :scope > div[class*="bg-"]');
        if (children.length >= 3) {
          children.forEach(child => extractCardFromEl(child));
        }
      });
    }

    // Pattern 4: Table-based comparison matrix (convert rows to cards)
    if (cards.length === 0) {
      const table = slideEl.querySelector('table');
      if (table) {
        const headers: string[] = [];
        table.querySelectorAll('th').forEach(th => {
          headers.push(th.textContent?.trim() || '');
        });
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            const featureName = cells[0]?.textContent?.trim() || '';
            if (featureName && featureName.length < 60) {
              cards.push({ title: featureName, color: 'gray' });
            }
          }
        });
      }
    }

    // Extract image
    let image: string | undefined;
    slideEl.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const isLogo = img.className.includes('opacity') || img.className.includes('h-8') || (src?.includes('logo') && !img.closest('.text-center'));
      if (src && !isLogo && !image) {
        image = src.split('/').pop();
      }
    });

    // Detect type
    const labelEl = slideEl.querySelector('.text-sm.uppercase, p.uppercase, [class*="tracking-widest"]');
    const label = labelEl?.textContent?.trim().toLowerCase() || '';
    const lowerTitle = title.toLowerCase();
    const allText = (label + ' ' + lowerTitle).toLowerCase();

    let type = 'custom';
    if (idx === 0) type = 'title';
    else if (allText.includes('problem') || allText.includes('pain')) type = 'problem';
    else if (allText.includes('solution')) type = 'solution';
    else if (allText.includes('market') || allText.includes('tam') || allText.includes('opportunity')) type = 'market';
    else if (allText.includes('team') || allText.includes('founder')) type = 'team';
    else if (allText.includes('traction') || allText.includes('signal')) type = 'traction';
    else if (allText.includes('ask') || allText.includes('raising') || allText.includes('funding')) type = 'ask';
    else if (allText.includes('business model') || allText.includes('revenue')) type = 'business-model';
    else if (allText.includes('why now') || allText.includes('timing')) type = 'why-now';
    else if (allText.includes('gtm') || allText.includes('go-to-market')) type = 'gtm';
    else if (allText.includes('appendix') || allText.includes('additional')) type = 'divider';

    // Suggest layout
    let layout = 'bullets-only';
    const hasStats = stats.length > 0;
    const hasQuote = !!quote;
    const hasImage = !!image;
    const hasCards = cards.length >= 3;

    if (hasStats && hasQuote) layout = 'proof-mixed';
    else if (cards.length >= 4) layout = 'card-grid-4';
    else if (cards.length === 3) layout = 'card-grid-3';
    else if (cards.length === 2) layout = 'comparison';
    else if (type === 'title') layout = 'title-center';
    else if (type === 'divider') layout = 'title-center';
    else if (stats.length >= 3) layout = 'three-stats';
    else if (stats.length === 2) layout = 'three-stats';
    else if (stats.length === 1 && !hasImage) layout = 'single-stat';
    else if (hasQuote && !hasImage) layout = 'quote-center';
    else if (hasImage && bullets.length > 0) layout = 'text-left-image';
    else if (hasImage) layout = 'full-image';
    else if (bullets.length >= 6) layout = 'three-columns';

    // Extract subtitle for divider slides
    let subtitle: string | undefined;
    const subtitleP = slideEl.querySelector('h2 + p, .text-2xl:not(h1):not(h2)');
    if (subtitleP) subtitle = subtitleP.textContent?.trim();

    // Content summary
    const content: string[] = [];
    if (stats.length > 0) content.push(`${stats.length} stats`);
    if (quote) content.push('quote');
    if (image) content.push('image');
    if (cards.length > 0) content.push(`${cards.length} cards`);
    if (bullets.length > 0) content.push(`${bullets.length} bullets`);
    if (type === 'divider' && subtitle) content.push('subtitle');

    const result = {
      slide: idx + 1,
      title: title.substring(0, 45) + (title.length > 45 ? '...' : ''),
      type,
      layout,
      content: content.join(', ') || 'empty',
      stats: stats.map(s => `${s.value} (${s.label})`).join(', '),
    };
    results.push(result);

    // Print result
    const statusIcon = content.length > 0 ? '✓' : '⚠';
    console.log(`${statusIcon} Slide ${String(idx + 1).padStart(2)}: ${result.title}`);
    console.log(`   Type: ${type.padEnd(12)} Layout: ${layout.padEnd(15)} Content: ${result.content}`);
    if (stats.length > 0) console.log(`   Stats: ${result.stats}`);
    if (quote) console.log(`   Quote: "${quote.text.substring(0, 50)}..." — ${quote.author}`);
    console.log('');

    idx++;
  }

  // Summary
  console.log(`${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  const layoutCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  let emptyCount = 0;

  results.forEach(r => {
    layoutCounts[r.layout] = (layoutCounts[r.layout] || 0) + 1;
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    if (r.content === 'empty') emptyCount++;
  });

  console.log('\nLayouts used:');
  Object.entries(layoutCounts).sort((a, b) => b[1] - a[1]).forEach(([layout, count]) => {
    console.log(`  ${layout}: ${count}`);
  });

  console.log('\nSlide types:');
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log(`\nEmpty slides (no content extracted): ${emptyCount}/${results.length}`);
  if (emptyCount > 0) {
    console.log('Empty slides:', results.filter(r => r.content === 'empty').map(r => r.slide).join(', '));
  }
}

main().catch(console.error);
