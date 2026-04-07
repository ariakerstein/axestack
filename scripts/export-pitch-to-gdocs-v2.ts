#!/usr/bin/env npx tsx
/**
 * Export pitch deck to Google Docs-compatible format (v2 - simplified)
 * Google Docs strips inline CSS, so we use semantic HTML only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

function processSlide($: cheerio.CheerioAPI, slide: cheerio.Element, index: number): string {
  const $slide = $(slide);
  const lines: string[] = [];
  const processedTexts = new Set<string>();

  const slideNum = $slide.find('.slide-number').text().trim() || String(index + 1);

  // Slide header
  lines.push(`<h1>Slide ${slideNum}</h1>`);
  lines.push('<hr>');

  // Get tagline/section label
  const tagline = $slide.find('p.uppercase, p[class*="tracking-widest"]').first();
  if (tagline.length) {
    const text = tagline.text().trim().toUpperCase();
    if (text) {
      processedTexts.add(text.toLowerCase());
      lines.push(`<p><i>${text}</i></p>`);
    }
  }

  // Main heading
  const heading = $slide.find('h1, h2').first();
  if (heading.length) {
    const text = heading.text().trim();
    processedTexts.add(text);
    lines.push(`<h2>${text}</h2>`);
  }

  // Subheading
  const subheading = $slide.find('h1 + p, h2 + p').first();
  if (subheading.length && !subheading.hasClass('uppercase')) {
    const text = subheading.text().trim();
    if (!processedTexts.has(text)) {
      processedTexts.add(text);
      lines.push(`<p>${text}</p>`);
    }
  }

  // Process grids as simple tables
  $slide.find('.grid').each((_, grid) => {
    const $grid = $(grid);
    const cols = $grid.attr('class')?.match(/grid-cols-(\d+)/)?.[1] || '2';
    const numCols = parseInt(cols);
    const children = $grid.children();

    if (children.length > 0) {
      lines.push('<table border="1" cellpadding="8" cellspacing="0">');

      let row: string[] = [];
      children.each((i, child) => {
        const $child = $(child);
        let cellContent = '';

        // Get title
        const cellTitle = $child.find('h3, p.font-bold').first();
        if (cellTitle.length) {
          const titleText = cellTitle.text().trim();
          cellContent += `<b>${titleText}</b><br>`;
          processedTexts.add(titleText);
        }

        // Get list items
        const seenItems = new Set<string>();
        $child.find('.flex.items-start, .flex.items-center').each((_, item) => {
          const $item = $(item);
          const rawText = $item.text().trim();
          const hasCheck = rawText.includes('✓');
          const hasX = rawText.includes('✗');
          const symbol = hasCheck ? '✓ ' : (hasX ? '✗ ' : '• ');
          const cleanText = rawText.replace(/[✓✗]/g, '').trim();

          if (cleanText && !seenItems.has(cleanText)) {
            seenItems.add(cleanText);
            cellContent += `${symbol}${cleanText}<br>`;
          }
        });

        // Get other paragraphs
        $child.find('> p, > div > p').not('.font-bold').each((_, p) => {
          const $p = $(p);
          const pText = $p.text().trim();
          if (pText && !processedTexts.has(pText) && !seenItems.has(pText) && $p.parents('.flex').length === 0) {
            cellContent += `${pText}<br>`;
          }
        });

        if (!cellContent) {
          const fallback = $child.clone().find('.flex').remove().end().text().trim().substring(0, 200);
          cellContent = fallback || '&nbsp;';
        }

        row.push(`<td valign="top">${cellContent}</td>`);

        if (row.length === numCols) {
          lines.push(`<tr>${row.join('')}</tr>`);
          row = [];
        }
      });

      if (row.length > 0) {
        while (row.length < numCols) row.push('<td>&nbsp;</td>');
        lines.push(`<tr>${row.join('')}</tr>`);
      }

      lines.push('</table>');
      lines.push('<br>');
    }
  });

  // Process HTML tables
  $slide.find('table').each((_, table) => {
    const $table = $(table);
    lines.push('<table border="1" cellpadding="8" cellspacing="0">');

    $table.find('tr').each((_, tr) => {
      lines.push('<tr>');
      $(tr).find('th, td').each((_, cell) => {
        const $cell = $(cell);
        const tag = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
        const text = $cell.text().trim();
        lines.push(`<${tag}>${text}</${tag}>`);
      });
      lines.push('</tr>');
    });

    lines.push('</table>');
    lines.push('<br>');
  });

  // Process callout boxes
  $slide.find('[class*="bg-gradient-to-r"]').each((_, box) => {
    const $box = $(box);
    const mainP = $box.find('> p').first();
    if (mainP.length) {
      const text = mainP.text().trim();
      if (text && !processedTexts.has(text)) {
        processedTexts.add(text);
        lines.push(`<blockquote><b>${text}</b></blockquote>`);
      }
    }
  });

  // Process images
  $slide.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    const alt = $img.attr('alt') || 'Image';

    if (src && !src.includes('logo')) {
      const absoluteSrc = src.startsWith('http') ? src : `https://navis.health/pitches/${src.replace('../', '')}`;
      lines.push(`<p>[IMAGE: ${alt}]<br><a href="${absoluteSrc}">${absoluteSrc}</a></p>`);
    }
  });

  // Process iframes (videos)
  $slide.find('iframe').each((_, iframe) => {
    const src = $(iframe).attr('src') || '';
    if (src.includes('loom')) {
      const loomUrl = src.replace('/embed/', '/share/');
      lines.push(`<p><b>📹 VIDEO DEMO:</b><br><a href="${loomUrl}">${loomUrl}</a></p>`);
    }
  });

  lines.push('<br><br>');
  lines.push('<p>───────────────────────────────────────</p>');
  lines.push('<br>');

  return lines.join('\n');
}

function convertToGoogleDocs(inputPath: string): string {
  const html = fs.readFileSync(inputPath, 'utf-8');
  const $ = cheerio.load(html);
  const title = $('title').text() || 'Pitch Deck';

  const output: string[] = [];

  output.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>`);

  output.push(`<h1>${title}</h1>`);
  output.push('<p><i>Google Docs Export</i></p>');
  output.push('<hr>');
  output.push('<br>');

  const slides = $('section.slide');
  console.log(`Found ${slides.length} slides`);

  slides.each((index, slide) => {
    console.log(`Processing slide ${index + 1}...`);
    output.push(processSlide($, slide, index));
  });

  output.push('</body></html>');

  return output.join('\n');
}

// Main
const args = process.argv.slice(2);
const inputFile = args[0] || 'public/pitches/sean2.html';
const inputPath = path.resolve(inputFile);
const outputPath = inputPath.replace('.html', '-gdocs.html');

console.log(`Converting: ${inputPath}`);
const result = convertToGoogleDocs(inputPath);
fs.writeFileSync(outputPath, result);

console.log(`\n✅ Export: ${outputPath}`);
console.log('\nTo import to Google Docs:');
console.log('1. Open HTML in browser');
console.log('2. Cmd+A, Cmd+C');
console.log('3. Paste into Google Docs');
