#!/usr/bin/env npx tsx
/**
 * Export pitch deck HTML to Google Docs-compatible format
 * Usage: npx tsx scripts/export-pitch-to-gdocs.ts public/pitches/sean2.html
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const TAILWIND_TO_INLINE: Record<string, string> = {
  // Text sizes
  'text-5xl': 'font-size: 32px; font-weight: bold;',
  'text-4xl': 'font-size: 28px; font-weight: bold;',
  'text-3xl': 'font-size: 24px;',
  'text-2xl': 'font-size: 20px;',
  'text-xl': 'font-size: 18px;',
  'text-lg': 'font-size: 16px;',
  'text-base': 'font-size: 14px;',
  'text-sm': 'font-size: 13px;',
  'text-xs': 'font-size: 11px;',

  // Font weights
  'font-bold': 'font-weight: bold;',
  'font-semibold': 'font-weight: 600;',
  'font-medium': 'font-weight: 500;',

  // Text colors
  'text-white': 'color: #ffffff;',
  'text-slate-900': 'color: #0f172a;',
  'text-slate-800': 'color: #1e293b;',
  'text-slate-700': 'color: #334155;',
  'text-slate-600': 'color: #475569;',
  'text-slate-500': 'color: #64748b;',
  'text-slate-400': 'color: #94a3b8;',
  'text-slate-300': 'color: #cbd5e1;',
  'text-red-700': 'color: #b91c1c;',
  'text-red-600': 'color: #dc2626;',
  'text-red-500': 'color: #ef4444;',
  'text-red-400': 'color: #f87171;',
  'text-emerald-700': 'color: #047857;',
  'text-emerald-600': 'color: #059669;',
  'text-emerald-500': 'color: #10b981;',
  'text-emerald-400': 'color: #34d399;',
  'text-emerald-300': 'color: #6ee7b7;',
  'text-blue-700': 'color: #1d4ed8;',
  'text-blue-600': 'color: #2563eb;',
  'text-blue-500': 'color: #3b82f6;',
  'text-blue-400': 'color: #60a5fa;',
  'text-blue-300': 'color: #93c5fd;',
  'text-blue-200': 'color: #bfdbfe;',
  'text-purple-700': 'color: #7c3aed;',
  'text-purple-600': 'color: #9333ea;',
  'text-purple-400': 'color: #c084fc;',
  'text-purple-300': 'color: #d8b4fe;',
  'text-amber-700': 'color: #b45309;',
  'text-amber-400': 'color: #fbbf24;',
  'text-amber-300': 'color: #fcd34d;',
  'text-orange-800': 'color: #9a3412;',
  'text-orange-700': 'color: #c2410c;',
  'text-orange-600': 'color: #ea580c;',
  'text-cyan-700': 'color: #0e7490;',

  // Text alignment
  'text-center': 'text-align: center;',
  'text-left': 'text-align: left;',
  'text-right': 'text-align: right;',

  // Font style
  'italic': 'font-style: italic;',
  'uppercase': 'text-transform: uppercase;',

  // Spacing
  'mb-2': 'margin-bottom: 8px;',
  'mb-3': 'margin-bottom: 12px;',
  'mb-4': 'margin-bottom: 16px;',
  'mb-5': 'margin-bottom: 20px;',
  'mb-6': 'margin-bottom: 24px;',
  'mb-8': 'margin-bottom: 32px;',
  'mb-10': 'margin-bottom: 40px;',
  'mt-1': 'margin-top: 4px;',
  'mt-2': 'margin-top: 8px;',
  'mt-3': 'margin-top: 12px;',
  'mt-4': 'margin-top: 16px;',
  'mt-6': 'margin-top: 24px;',
  'p-2': 'padding: 8px;',
  'p-3': 'padding: 12px;',
  'p-4': 'padding: 16px;',
  'p-5': 'padding: 20px;',
  'px-2': 'padding-left: 8px; padding-right: 8px;',
  'px-4': 'padding-left: 16px; padding-right: 16px;',
  'px-8': 'padding-left: 32px; padding-right: 32px;',
  'py-2': 'padding-top: 8px; padding-bottom: 8px;',
  'py-4': 'padding-top: 16px; padding-bottom: 16px;',
  'py-5': 'padding-top: 20px; padding-bottom: 20px;',
};

// Background colors for context
const BG_COLORS: Record<string, string> = {
  'bg-white': '#ffffff',
  'bg-slate-50': '#f8fafc',
  'bg-slate-100': '#f1f5f9',
  'bg-slate-800': '#1e293b',
  'bg-slate-900': '#0f172a',
  'bg-red-50': '#fef2f2',
  'bg-red-100': '#fee2e2',
  'bg-emerald-50': '#ecfdf5',
  'bg-emerald-100': '#d1fae5',
  'bg-blue-50': '#eff6ff',
  'bg-blue-100': '#dbeafe',
  'bg-orange-50': '#fff7ed',
  'bg-amber-100': '#fef3c7',
  'bg-purple-100': '#f3e8ff',
  'bg-cyan-100': '#cffafe',
};

function convertTailwindToInline(classes: string): string {
  if (!classes) return '';

  const classArray = classes.split(/\s+/);
  const styles: string[] = [];

  for (const cls of classArray) {
    if (TAILWIND_TO_INLINE[cls]) {
      styles.push(TAILWIND_TO_INLINE[cls]);
    }
    if (BG_COLORS[cls]) {
      styles.push(`background-color: ${BG_COLORS[cls]};`);
    }
  }

  return styles.join(' ');
}

function extractTextContent($: cheerio.CheerioAPI, element: cheerio.Cheerio<cheerio.Element>): string {
  return element.text().trim();
}

function processSlide($: cheerio.CheerioAPI, slide: cheerio.Element, index: number): string {
  const $slide = $(slide);
  const lines: string[] = [];
  const processedTexts = new Set<string>(); // Track what we've already output

  // Get slide number
  const slideNum = $slide.find('.slide-number').text().trim() || String(index + 1);

  // Determine if dark slide
  const slideClasses = $slide.attr('class') || '';
  const isDark = slideClasses.includes('bg-slate-900') || slideClasses.includes('bg-gradient-to-br from-blue-600');

  lines.push(`<div style="page-break-after: always; padding: 40px; ${isDark ? 'background-color: #1e293b; color: white;' : 'background-color: white;'}">`);
  lines.push(`<p style="color: #94a3b8; font-size: 11px; text-align: right;">Slide ${slideNum}</p>`);

  // Process header/tagline
  const tagline = $slide.find('p.uppercase, p[class*="tracking-widest"]').first();
  if (tagline.length) {
    const taglineText = tagline.text().trim();
    processedTexts.add(taglineText);
    lines.push(`<p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">${taglineText}</p>`);
  }

  // Process main heading (h1 or h2)
  const heading = $slide.find('h1, h2').first();
  if (heading.length) {
    const headingText = heading.text().trim();
    processedTexts.add(headingText);
    lines.push(`<h2 style="font-size: 28px; font-weight: bold; margin-bottom: 12px; ${isDark ? 'color: white;' : 'color: #0f172a;'}">${headingText}</h2>`);
  }

  // Process subheading (first p after heading that's large)
  const subheading = $slide.find('h1 + p, h2 + p').first();
  if (subheading.length && !subheading.hasClass('uppercase')) {
    const subText = subheading.text().trim();
    if (!processedTexts.has(subText)) {
      processedTexts.add(subText);
      lines.push(`<p style="font-size: 16px; color: #64748b; margin-bottom: 20px;">${subheading.html()?.replace(/<span[^>]*>/g, '<b>').replace(/<\/span>/g, '</b>') || subText}</p>`);
    }
  }

  // Process grids as tables (but not nested in other grids)
  const grids = $slide.find('> div > .grid, > .grid').not('.grid .grid');
  grids.each((_, grid) => {
    const $grid = $(grid);
    const cols = $grid.attr('class')?.match(/grid-cols-(\d+)/)?.[1] || '2';
    const numCols = parseInt(cols);
    const children = $grid.children();

    if (children.length > 0) {
      lines.push(`<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`);

      let row: string[] = [];
      children.each((i, child) => {
        const $child = $(child);
        const bgClass = $child.attr('class') || '';
        let cellBg = '#ffffff';

        // Detect background color
        for (const [cls, color] of Object.entries(BG_COLORS)) {
          if (bgClass.includes(cls)) {
            cellBg = color;
            break;
          }
        }

        // Check for gradient backgrounds
        if (bgClass.includes('from-emerald') || bgClass.includes('bg-emerald')) cellBg = '#d1fae5';
        if (bgClass.includes('from-red') || bgClass.includes('bg-red')) cellBg = '#fee2e2';
        if (bgClass.includes('from-blue') || bgClass.includes('bg-blue')) cellBg = '#dbeafe';
        if (bgClass.includes('from-slate-800') || bgClass.includes('bg-slate-800')) cellBg = '#1e293b';
        if (bgClass.includes('bg-amber')) cellBg = '#fef3c7';
        if (bgClass.includes('bg-orange')) cellBg = '#ffedd5';

        const isHeroCell = bgClass.includes('from-emerald-500') || bgClass.includes('shadow-xl');

        // Extract content
        let cellContent = '';

        // Get title/heading in cell
        const cellTitle = $child.find('h3, > p.font-bold, > div > p.font-bold').first();
        if (cellTitle.length) {
          const titleText = cellTitle.text().trim();
          const titleColor = isHeroCell ? '#ffffff' : (cellBg === '#1e293b' ? '#ffffff' : '#1e293b');
          cellContent += `<p style="font-weight: bold; font-size: 14px; color: ${titleColor}; margin-bottom: 8px;">${titleText}</p>`;
          processedTexts.add(titleText);
        }

        // Get list items with checkmarks/x marks
        const seenItems = new Set<string>();
        $child.find('.flex.items-start, .flex.items-center').each((_, item) => {
          const $item = $(item);
          const rawText = $item.text().trim();
          const hasCheck = rawText.includes('✓');
          const hasX = rawText.includes('✗');
          const symbol = hasCheck ? '✓ ' : (hasX ? '✗ ' : '• ');
          const cleanText = rawText.replace(/^[✓✗]\s*/, '').replace(/✓|✗/g, '').trim();

          if (cleanText && !seenItems.has(cleanText)) {
            seenItems.add(cleanText);
            const textColor = cellBg === '#1e293b' ? '#cbd5e1' : '#475569';
            const symbolColor = hasCheck ? '#10b981' : (hasX ? '#ef4444' : textColor);
            cellContent += `<p style="font-size: 12px; color: ${textColor}; margin: 4px 0;"><span style="color: ${symbolColor};">${symbol}</span>${cleanText}</p>`;
            processedTexts.add(cleanText);
          }
        });

        // Get other standalone paragraphs (not in flex items)
        $child.find('> p, > div > p').not('.font-bold').each((_, p) => {
          const $p = $(p);
          const pText = $p.text().trim();
          // Skip if already processed or is inside a flex item
          if (pText && !processedTexts.has(pText) && !seenItems.has(pText) && $p.parents('.flex').length === 0) {
            const textColor = cellBg === '#1e293b' ? '#cbd5e1' : '#475569';
            cellContent += `<p style="font-size: 12px; color: ${textColor}; margin: 4px 0;">${pText}</p>`;
            processedTexts.add(pText);
          }
        });

        if (!cellContent) {
          // Fallback to simplified text
          const fallbackText = $child.clone().find('.flex').remove().end().text().trim().substring(0, 150);
          if (fallbackText) {
            cellContent = `<p style="font-size: 12px;">${fallbackText}</p>`;
          }
        }

        row.push(`<td style="padding: 12px; background-color: ${cellBg}; border: 1px solid #e2e8f0; vertical-align: top; width: ${100/numCols}%;">${cellContent}</td>`);

        if (row.length === numCols) {
          lines.push(`<tr>${row.join('')}</tr>`);
          row = [];
        }
      });

      // Handle remaining cells
      if (row.length > 0) {
        while (row.length < numCols) {
          row.push('<td style="padding: 12px; border: 1px solid #e2e8f0;"></td>');
        }
        lines.push(`<tr>${row.join('')}</tr>`);
      }

      lines.push('</table>');
    }
  });

  // Process standalone tables (not generated from grids)
  $slide.find('table').each((_, table) => {
    const $table = $(table);
    lines.push('<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">');

    $table.find('tr').each((_, tr) => {
      lines.push('<tr>');
      $(tr).find('th, td').each((_, cell) => {
        const $cell = $(cell);
        const tag = cell.tagName.toLowerCase();
        const bgClass = $cell.attr('class') || '';
        let cellBg = '#ffffff';

        for (const [cls, color] of Object.entries(BG_COLORS)) {
          if (bgClass.includes(cls)) {
            cellBg = color;
            break;
          }
        }

        const isHeader = tag === 'th';
        const textColor = bgClass.includes('red') ? '#b91c1c' :
                         (bgClass.includes('orange') ? '#c2410c' :
                         (bgClass.includes('emerald') ? '#047857' : '#1e293b'));

        const cellText = $cell.text().trim();
        processedTexts.add(cellText);
        lines.push(`<${tag} style="padding: 8px; border: 1px solid #e2e8f0; background-color: ${cellBg}; ${isHeader ? 'font-weight: bold;' : ''} color: ${textColor}; font-size: 12px;">${cellText}</${tag}>`);
      });
      lines.push('</tr>');
    });

    lines.push('</table>');
  });

  // Process main callout boxes (gradient backgrounds - only top-level ones)
  $slide.find('> div > [class*="bg-gradient-to-r"], > [class*="bg-gradient-to-r"]').each((_, box) => {
    const $box = $(box);
    const boxClasses = $box.attr('class') || '';

    // Skip small elements or already processed
    if ($box.find('p').length === 0) return;

    const isWhiteText = boxClasses.includes('text-white');
    const bgColor = boxClasses.includes('from-slate-800') ? '#1e293b' :
                   (boxClasses.includes('from-emerald') ? '#059669' : '#2563eb');

    // Get the main text content (first p or combined)
    const mainP = $box.find('> p').first();
    if (mainP.length) {
      const pText = mainP.text().trim();
      if (pText && !processedTexts.has(pText)) {
        processedTexts.add(pText);
        lines.push(`<div style="background-color: ${bgColor}; padding: 16px; border-radius: 8px; margin: 16px 0;">`);
        lines.push(`<p style="color: ${isWhiteText ? '#ffffff' : '#1e293b'}; font-size: 14px; text-align: center; font-weight: 600;">${pText}</p>`);
        lines.push('</div>');
      }
    }
  });

  // Process images (not logos)
  $slide.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    const alt = $img.attr('alt') || '';

    if (src && !src.includes('logo')) {
      const absoluteSrc = src.startsWith('http') ? src : `https://navis.health/pitches/${src.replace('../', '')}`;
      lines.push(`<p style="margin: 16px 0;"><img src="${absoluteSrc}" alt="${alt}" style="max-width: 100%; height: auto;"></p>`);
    }
  });

  // Process video/demo placeholders
  $slide.find('iframe').each((_, iframe) => {
    const $iframe = $(iframe);
    const src = $iframe.attr('src') || '';
    if (src.includes('loom')) {
      const loomUrl = src.replace('/embed/', '/share/');
      lines.push(`<div style="background-color: #f1f5f9; padding: 32px; text-align: center; border-radius: 8px; margin: 16px 0;">`);
      lines.push(`<p style="font-size: 16px; color: #475569;">📹 <b>Video Demo</b></p>`);
      lines.push(`<p style="font-size: 14px;"><a href="${loomUrl}" style="color: #2563eb;">${loomUrl}</a></p>`);
      lines.push('</div>');
    }
  });

  lines.push('</div>');

  return lines.join('\n');
}

function convertToGoogleDocs(inputPath: string): string {
  const html = fs.readFileSync(inputPath, 'utf-8');
  const $ = cheerio.load(html);

  // Get title
  const title = $('title').text() || 'Pitch Deck';

  // Build output HTML
  const output: string[] = [];

  output.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - Google Docs Export</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.5;
    }
    h1, h2, h3 { margin-top: 0; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 8px; }
    img { max-width: 100%; }
    a { color: #1a73e8; }
  </style>
</head>
<body>`);

  // Process each slide
  const slides = $('section.slide');
  console.log(`Found ${slides.length} slides`);

  slides.each((index, slide) => {
    console.log(`Processing slide ${index + 1}...`);
    output.push(processSlide($, slide, index));
  });

  output.push('</body></html>');

  return output.join('\n');
}

// Main execution
const args = process.argv.slice(2);
const inputFile = args[0] || 'public/pitches/sean2.html';

const inputPath = path.resolve(inputFile);
const outputPath = inputPath.replace('.html', '-gdocs.html');

console.log(`Converting: ${inputPath}`);
console.log(`Output: ${outputPath}`);

const result = convertToGoogleDocs(inputPath);
fs.writeFileSync(outputPath, result);

console.log(`\n✅ Export complete: ${outputPath}`);
console.log('\nTo use in Google Docs:');
console.log('1. Open the HTML file in a browser');
console.log('2. Select All (Cmd+A) and Copy (Cmd+C)');
console.log('3. Paste into Google Docs (Cmd+V)');
console.log('\nOr upload the HTML file directly to Google Drive and open with Google Docs.');
