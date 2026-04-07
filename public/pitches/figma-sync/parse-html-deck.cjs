#!/usr/bin/env node
/**
 * HTML Pitch Deck to JSON Parser v2
 * Comprehensive extraction for 1:1 Figma import
 */

const fs = require('fs');
const path = require('path');

function extractSlides(html) {
  const slideRegex = /<section (class="slide[^"]*")[^>]*(?:data-notes-key="([^"]*)")?[^>]*>([\s\S]*?)<\/section>/gi;
  const slides = [];
  let match;
  let index = 1;

  while ((match = slideRegex.exec(html)) !== null) {
    slides.push({
      index,
      classes: match[1] || '',
      notes: match[2] || '',
      html: match[3]
    });
    index++;
  }

  return slides;
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAllText(html) {
  const texts = [];

  // Extract paragraphs and headings
  const textRegex = /<(?:h[1-6]|p|span)[^>]*>([^<]+)</g;
  let match;
  while ((match = textRegex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text && text.length > 1) {
      texts.push(text);
    }
  }

  return texts;
}

function extractImages(html, basePath) {
  const images = [];
  const imgRegex = /<img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*(?:style="[^"]*height:\s*(\d+)px)?[^>]*>/gi;

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2] || '';

    // Skip tiny logos/icons
    if (src.includes('logo') && src.includes('circle-only')) continue;

    // Resolve relative paths
    let fullSrc = src;
    if (src.startsWith('../')) {
      fullSrc = src; // Keep relative for now
    }

    images.push({
      src: fullSrc,
      alt: alt
    });
  }

  return images;
}

function extractStats(html) {
  const stats = [];

  // Pattern 1: Large colored numbers with labels (e.g., "17→31" + "days to see oncologist")
  const statBlockRegex = /<span[^>]*text-[3-6]xl[^>]*font-bold[^>]*text-(?:red|orange|yellow|cyan|blue|emerald|purple|amber)-\d+[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>/gi;
  let match;
  while ((match = statBlockRegex.exec(html)) !== null) {
    stats.push({
      value: cleanText(match[1]),
      label: cleanText(match[2])
    });
  }

  // Pattern 2: Metrics cards (big number + label below)
  const metricRegex = /<p[^>]*text-[56]xl[^>]*font-bold[^>]*text-(?:blue|emerald|purple)-\d+[^>]*>([^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>/gi;
  while ((match = metricRegex.exec(html)) !== null) {
    stats.push({
      value: cleanText(match[1]),
      label: cleanText(match[2])
    });
  }

  // Pattern 3: Price/amount boxes (e.g., "$99/mo")
  const priceRegex = /<p[^>]*text-[56]xl[^>]*font-bold[^>]*>(\$[^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>/gi;
  while ((match = priceRegex.exec(html)) !== null) {
    stats.push({
      value: cleanText(match[1]),
      label: cleanText(match[2])
    });
  }

  return stats;
}

function extractTeam(html) {
  const team = [];

  // Look for team member patterns: img + name + title
  const teamRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*class="[^"]*rounded-full[^"]*"[^>]*>[\s\S]*?<p[^>]*font-bold[^>]*>([^<]+)<\/p>\s*<p[^>]*text-sm[^>]*>([^<]+)<\/p>/gi;

  let match;
  while ((match = teamRegex.exec(html)) !== null) {
    team.push({
      photo: match[1],
      name: cleanText(match[3]),
      title: cleanText(match[4].replace(/<[^>]+>/g, ' '))
    });
  }

  return team;
}

function extractTable(html) {
  if (!html.includes('<table')) return null;

  const table = {
    headers: [],
    rows: []
  };

  // Extract headers
  const headerRegex = /<th[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/th>/gi;
  let match;
  while ((match = headerRegex.exec(html)) !== null) {
    table.headers.push(cleanText(match[1]));
  }

  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let isFirstRow = true;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    if (isFirstRow && rowMatch[1].includes('<th')) {
      isFirstRow = false;
      continue; // Skip header row
    }

    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      // Check for emoji indicators
      let cellContent = cellMatch[1];
      if (cellContent.includes('🟢')) cells.push('yes');
      else if (cellContent.includes('🟡')) cells.push('partial');
      else if (cellContent.includes('🔴')) cells.push('no');
      else cells.push(cleanText(cellContent));
    }

    if (cells.length > 0) {
      table.rows.push(cells);
    }
  }

  return table.rows.length > 0 ? table : null;
}

function extractQuotes(html) {
  const quotes = [];

  // Look for italic text with attribution
  const quoteRegex = /<p[^>]*italic[^>]*>"?([^<]+)"?<\/p>\s*<p[^>]*>—\s*([^<]+)<\/p>/gi;

  let match;
  while ((match = quoteRegex.exec(html)) !== null) {
    quotes.push({
      text: cleanText(match[1]),
      attribution: cleanText(match[2])
    });
  }

  return quotes;
}

function extractBullets(html) {
  const bullets = [];

  // Grid items with flex layout (common pattern in slides)
  const gridItemRegex = /<div[^>]*flex[^>]*items-center[^>]*gap[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>/gi;

  let match;
  while ((match = gridItemRegex.exec(html)) !== null) {
    bullets.push(`${cleanText(match[1])} ${cleanText(match[2])}`);
  }

  // Also look for regular list items or bullet-like content
  const bulletRegex = /[•●]\s*([^<\n]+)/g;
  while ((match = bulletRegex.exec(html)) !== null) {
    bullets.push(cleanText(match[1]));
  }

  return bullets;
}

function extractHeadline(html) {
  // Try h1 first
  let match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (match) return cleanText(match[1]);

  // Then h2
  match = html.match(/<h2[^>]*text-[456]xl[^>]*font-bold[^>]*>([^<]+)</i);
  if (match) return cleanText(match[1]);

  match = html.match(/<h2[^>]*>([^<]+)</i);
  if (match) return cleanText(match[1]);

  return null;
}

function extractSubheadline(html) {
  // Look for text-xl or text-2xl after headline
  const match = html.match(/<p[^>]*text-[123]xl[^>]*text-(?:slate|emerald)-[34]00[^>]*>([^<]+)</i);
  if (match) return cleanText(match[1]);

  // Or text-lg subtitle
  const match2 = html.match(/<p[^>]*text-lg[^>]*text-slate-[45]00[^>]*>([^<]+)</i);
  if (match2) return cleanText(match2[1]);

  return null;
}

function extractLabel(html) {
  const match = html.match(/tracking-widest[^>]*>([^<]+)</i);
  if (match) return cleanText(match[1]);
  return null;
}

function extractBodyText(html) {
  const bodyTexts = [];

  // Look for significant paragraph text
  const pRegex = /<p[^>]*text-(?:xl|2xl|3xl)[^>]*font-bold[^>]*>([^<]+)</gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text.length > 10) {
      bodyTexts.push(text);
    }
  }

  return bodyTexts;
}

function detectSlideType(slideData) {
  const html = slideData.html;
  const classes = slideData.classes;

  if (html.includes('Navis Health</h1>') || slideData.index === 1) return 'title';
  if (html.includes('rounded-full') && html.includes('grid-cols-5')) return 'team';
  if (html.includes('<table')) return 'comparison';
  if (html.includes('italic') && html.includes('—')) return 'metrics'; // quotes = traction slide
  if (html.match(/\$[\d.]+[MKB]?\s*<\/p>/)) return 'ask';
  if (html.includes('→</div>') && html.includes('Now') && html.includes('Next')) return 'roadmap';
  if (html.includes('Appendix')) return 'appendix';

  return 'content';
}

function parseSlideContent(slideData, index) {
  const html = slideData.html;
  const classes = slideData.classes || '';

  const slide = {
    id: index,
    type: detectSlideType(slideData),
    background: 'light',
    label: extractLabel(html),
    speakerNotes: slideData.notes || null,
    content: {
      headline: extractHeadline(html),
      subheadline: extractSubheadline(html),
      body: extractBodyText(html),
      stats: extractStats(html),
      images: extractImages(html),
      team: extractTeam(html),
      table: extractTable(html),
      quotes: extractQuotes(html),
      bullets: extractBullets(html)
    }
  };

  // Detect background
  if (classes.includes('bg-slate-900') || classes.includes('from-slate-900') || classes.includes('from-slate-800')) {
    slide.background = 'dark';
  }
  if (classes.includes('bg-gradient-to-br from-slate-900')) {
    slide.background = 'gradient';
  }

  // Clean up empty arrays
  Object.keys(slide.content).forEach(key => {
    if (Array.isArray(slide.content[key]) && slide.content[key].length === 0) {
      delete slide.content[key];
    }
    if (slide.content[key] === null) {
      delete slide.content[key];
    }
  });

  return slide;
}

function parseDeck(htmlContent, sourceFile) {
  const slides = extractSlides(htmlContent);

  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Deck';

  const deck = {
    metadata: {
      id: path.basename(sourceFile, '.html'),
      title: title,
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      sourceFile: sourceFile,
      slideCount: slides.length
    },
    theme: {
      colors: {
        background: '#ffffff',
        backgroundDark: '#0f172a',
        text: '#1e293b',
        textLight: '#94a3b8',
        accent: '#10b981',
        blue: '#3b82f6',
        emerald: '#10b981',
        purple: '#8b5cf6',
        red: '#ef4444',
        amber: '#f59e0b'
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter'
      }
    },
    slides: slides.map(s => parseSlideContent(s, s.index))
  };

  return deck;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node parse-html-deck.cjs <input.html> [output.json]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.html', '.json');

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Parsing: ${inputFile}`);

  const htmlContent = fs.readFileSync(inputFile, 'utf-8');
  const deck = parseDeck(htmlContent, inputFile);

  fs.writeFileSync(outputFile, JSON.stringify(deck, null, 2));

  console.log(`Output: ${outputFile}`);
  console.log(`Slides: ${deck.slides.length}`);
  console.log('\nSlide summary:');
  deck.slides.forEach(s => {
    const content = [];
    if (s.content.stats?.length) content.push(`${s.content.stats.length} stats`);
    if (s.content.images?.length) content.push(`${s.content.images.length} imgs`);
    if (s.content.team?.length) content.push(`${s.content.team.length} team`);
    if (s.content.table) content.push('table');
    if (s.content.quotes?.length) content.push(`${s.content.quotes.length} quotes`);
    if (s.content.bullets?.length) content.push(`${s.content.bullets.length} bullets`);

    const contentStr = content.length > 0 ? ` [${content.join(', ')}]` : '';
    console.log(`  ${s.id}. [${s.type}/${s.background}] ${s.content.headline || s.label || '(no title)'}${contentStr}`);
  });
}

main();
