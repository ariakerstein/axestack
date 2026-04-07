#!/usr/bin/env npx tsx
/**
 * Export pitch deck HTML to PowerPoint (PPTX)
 * Usage: npx tsx scripts/export-pitch-to-pptx.ts public/pitches/sean2.html
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import PptxGenJSModule from 'pptxgenjs';
const PptxGenJS = (PptxGenJSModule as any).default || PptxGenJSModule;

// Color mappings
const COLORS = {
  white: 'FFFFFF',
  slate900: '0f172a',
  slate800: '1e293b',
  slate700: '334155',
  slate600: '475569',
  slate500: '64748b',
  slate400: '94a3b8',
  slate300: 'cbd5e1',
  slate100: 'f1f5f9',
  slate50: 'f8fafc',
  red700: 'b91c1c',
  red600: 'dc2626',
  red500: 'ef4444',
  red100: 'fee2e2',
  red50: 'fef2f2',
  emerald700: '047857',
  emerald600: '059669',
  emerald500: '10b981',
  emerald400: '34d399',
  emerald100: 'd1fae5',
  emerald50: 'ecfdf5',
  blue700: '1d4ed8',
  blue600: '2563eb',
  blue500: '3b82f6',
  blue400: '60a5fa',
  blue300: '93c5fd',
  blue200: 'bfdbfe',
  blue100: 'dbeafe',
  amber400: 'fbbf24',
  amber100: 'fef3c7',
  orange700: 'c2410c',
  orange100: 'ffedd5',
  purple400: 'c084fc',
  purple100: 'f3e8ff',
};

function getBackgroundColor(classes: string): string {
  if (classes.includes('bg-slate-900') || classes.includes('from-blue-600')) return COLORS.slate800;
  if (classes.includes('bg-slate-50')) return COLORS.slate50;
  if (classes.includes('bg-white')) return COLORS.white;
  return COLORS.white;
}

function getCellBgColor(classes: string): string {
  if (classes.includes('bg-red-50') || classes.includes('from-red')) return COLORS.red100;
  if (classes.includes('bg-emerald-50') || classes.includes('from-emerald')) return COLORS.emerald100;
  if (classes.includes('bg-blue-50')) return COLORS.blue100;
  if (classes.includes('bg-amber-100') || classes.includes('bg-amber')) return COLORS.amber100;
  if (classes.includes('bg-orange-100') || classes.includes('bg-orange')) return COLORS.orange100;
  if (classes.includes('bg-slate-800') || classes.includes('from-slate-800')) return COLORS.slate800;
  if (classes.includes('bg-slate-100')) return COLORS.slate100;
  if (classes.includes('bg-slate-50')) return COLORS.slate50;
  if (classes.includes('from-emerald-500')) return COLORS.emerald500;
  return COLORS.white;
}

interface SlideContent {
  bgColor: string;
  isDark: boolean;
  tagline?: string;
  heading?: string;
  subheading?: string;
  grids: GridContent[];
  tables: TableContent[];
  callouts: string[];
  bullets: string[];
  videoUrl?: string;
  imageUrl?: string;
}

interface GridContent {
  cols: number;
  cells: CellContent[];
}

interface CellContent {
  bgColor: string;
  title?: string;
  items: string[];
  isHero?: boolean;
}

interface TableContent {
  headers: string[];
  rows: string[][];
  headerColors?: string[];
  cellColors?: string[][];
}

function extractSlideContent($: cheerio.CheerioAPI, slide: cheerio.Element): SlideContent {
  const $slide = $(slide);
  const classes = $slide.attr('class') || '';
  const isDark = classes.includes('bg-slate-900') || classes.includes('from-blue-600');

  const content: SlideContent = {
    bgColor: getBackgroundColor(classes),
    isDark,
    grids: [],
    tables: [],
    callouts: [],
    bullets: [],
  };

  // Tagline
  const tagline = $slide.find('p.uppercase, p[class*="tracking-widest"]').first();
  if (tagline.length) {
    content.tagline = tagline.text().trim().toUpperCase();
  }

  // Heading
  const heading = $slide.find('h1, h2').first();
  if (heading.length) {
    content.heading = heading.text().trim();
  }

  // Subheading
  const subheading = $slide.find('h1 + p, h2 + p').first();
  if (subheading.length && !subheading.hasClass('uppercase')) {
    content.subheading = subheading.text().trim();
  }

  // Process grids
  $slide.find('.grid').each((_, grid) => {
    const $grid = $(grid);
    const colsMatch = $grid.attr('class')?.match(/grid-cols-(\d+)/);
    const cols = colsMatch ? parseInt(colsMatch[1]) : 2;
    const cells: CellContent[] = [];

    $grid.children().each((_, child) => {
      const $child = $(child);
      const childClasses = $child.attr('class') || '';
      const cell: CellContent = {
        bgColor: getCellBgColor(childClasses),
        items: [],
        isHero: childClasses.includes('from-emerald-500') || childClasses.includes('shadow-xl'),
      };

      // Title
      const cellTitle = $child.find('h3, p.font-bold').first();
      if (cellTitle.length) {
        cell.title = cellTitle.text().trim();
      }

      // List items
      const seenItems = new Set<string>();
      $child.find('.flex.items-start, .flex.items-center').each((_, item) => {
        const rawText = $(item).text().trim();
        const hasCheck = rawText.includes('✓');
        const hasX = rawText.includes('✗');
        const symbol = hasCheck ? '✓ ' : (hasX ? '✗ ' : '• ');
        const cleanText = rawText.replace(/[✓✗]/g, '').trim();
        if (cleanText && !seenItems.has(cleanText)) {
          seenItems.add(cleanText);
          cell.items.push(symbol + cleanText);
        }
      });

      // Standalone paragraphs
      $child.find('> p, > div > p').not('.font-bold').each((_, p) => {
        const $p = $(p);
        if ($p.parents('.flex').length === 0) {
          const pText = $p.text().trim();
          if (pText && !seenItems.has(pText) && pText !== cell.title) {
            cell.items.push(pText);
          }
        }
      });

      cells.push(cell);
    });

    if (cells.length > 0) {
      content.grids.push({ cols, cells });
    }
  });

  // Process HTML tables
  $slide.find('table').each((_, table) => {
    const $table = $(table);
    const tableContent: TableContent = { headers: [], rows: [], headerColors: [], cellColors: [] };

    $table.find('thead tr, tr:first-child').first().find('th, td').each((_, cell) => {
      const $cell = $(cell);
      tableContent.headers.push($cell.text().trim());
      const cellClasses = $cell.attr('class') || '';
      const color = cellClasses.includes('red') ? COLORS.red700 :
                   (cellClasses.includes('orange') ? COLORS.orange700 :
                   (cellClasses.includes('emerald') ? COLORS.emerald700 : COLORS.slate800));
      tableContent.headerColors!.push(color);
    });

    $table.find('tbody tr, tr:not(:first-child)').each((_, tr) => {
      const row: string[] = [];
      const rowColors: string[] = [];
      $(tr).find('td').each((_, cell) => {
        const $cell = $(cell);
        row.push($cell.text().trim());
        const cellClasses = $cell.attr('class') || '';
        rowColors.push(getCellBgColor(cellClasses));
      });
      if (row.length > 0) {
        tableContent.rows.push(row);
        tableContent.cellColors!.push(rowColors);
      }
    });

    if (tableContent.headers.length > 0 || tableContent.rows.length > 0) {
      content.tables.push(tableContent);
    }
  });

  // Callouts
  $slide.find('[class*="bg-gradient-to-r"]').each((_, box) => {
    const $box = $(box);
    const mainP = $box.find('> p').first();
    if (mainP.length) {
      const text = mainP.text().trim();
      if (text) content.callouts.push(text);
    }
  });

  // Video
  $slide.find('iframe').each((_, iframe) => {
    const src = $(iframe).attr('src') || '';
    if (src.includes('loom')) {
      content.videoUrl = src.replace('/embed/', '/share/');
    }
  });

  // Images
  $slide.find('img').each((_, img) => {
    const src = $(img).attr('src');
    if (src && !src.includes('logo')) {
      content.imageUrl = src.startsWith('http') ? src : `https://navis.health/pitches/${src.replace('../', '')}`;
    }
  });

  return content;
}

function createSlide(pptx: PptxGenJS, content: SlideContent, slideNum: number): void {
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: content.bgColor };

  const textColor = content.isDark ? COLORS.white : COLORS.slate900;
  const subtextColor = content.isDark ? COLORS.slate400 : COLORS.slate600;

  let yPos = 0.3;

  // Tagline
  if (content.tagline) {
    slide.addText(content.tagline, {
      x: 0.5, y: yPos, w: 9, h: 0.3,
      fontSize: 10, color: COLORS.slate500,
      fontFace: 'Arial',
    });
    yPos += 0.4;
  }

  // Heading
  if (content.heading) {
    slide.addText(content.heading, {
      x: 0.5, y: yPos, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: textColor,
      fontFace: 'Arial',
    });
    yPos += 0.7;
  }

  // Subheading
  if (content.subheading) {
    slide.addText(content.subheading, {
      x: 0.5, y: yPos, w: 9, h: 0.4,
      fontSize: 14, color: subtextColor,
      fontFace: 'Arial',
    });
    yPos += 0.5;
  }

  // Video placeholder
  if (content.videoUrl) {
    slide.addText('📹 VIDEO DEMO', {
      x: 1.5, y: 2, w: 7, h: 0.5,
      fontSize: 20, bold: true, color: COLORS.slate700,
      fontFace: 'Arial', align: 'center',
    });
    slide.addText(content.videoUrl, {
      x: 1.5, y: 2.6, w: 7, h: 0.4,
      fontSize: 12, color: COLORS.blue600,
      fontFace: 'Arial', align: 'center',
      hyperlink: { url: content.videoUrl },
    });
    slide.addShape('rect', {
      x: 1.5, y: 1.8, w: 7, h: 1.5,
      fill: { color: COLORS.slate100 },
      line: { color: COLORS.slate300, width: 1 },
    });
    yPos = 3.5;
  }

  // Grids as tables
  content.grids.forEach((grid) => {
    if (yPos > 4.5) return; // Skip if no room

    const tableData: PptxGenJS.TableRow[] = [];
    const numRows = Math.ceil(grid.cells.length / grid.cols);

    for (let r = 0; r < numRows; r++) {
      const row: PptxGenJS.TableCell[] = [];
      for (let c = 0; c < grid.cols; c++) {
        const cellIdx = r * grid.cols + c;
        const cell = grid.cells[cellIdx];

        if (cell) {
          let cellText = '';
          if (cell.title) cellText += cell.title + '\n';
          cellText += cell.items.join('\n');

          const isDarkCell = cell.bgColor === COLORS.slate800;

          row.push({
            text: cellText,
            options: {
              fill: { color: cell.bgColor },
              color: isDarkCell ? COLORS.white : COLORS.slate700,
              fontSize: 10,
              fontFace: 'Arial',
              valign: 'top',
              bold: false,
            },
          });
        } else {
          row.push({ text: '', options: { fill: { color: COLORS.white } } });
        }
      }
      tableData.push(row);
    }

    if (tableData.length > 0) {
      slide.addTable(tableData, {
        x: 0.5, y: yPos, w: 9,
        colW: 9 / grid.cols,
        border: { type: 'solid', color: COLORS.slate300, pt: 0.5 },
        margin: 0.1,
      });
      yPos += numRows * 0.8 + 0.3;
    }
  });

  // HTML Tables
  content.tables.forEach((table) => {
    if (yPos > 4.5) return;

    const tableData: PptxGenJS.TableRow[] = [];

    // Header row
    if (table.headers.length > 0) {
      const headerRow: PptxGenJS.TableCell[] = table.headers.map((h, i) => ({
        text: h,
        options: {
          fill: { color: COLORS.slate100 },
          color: table.headerColors?.[i] || COLORS.slate800,
          fontSize: 10,
          bold: true,
          fontFace: 'Arial',
        },
      }));
      tableData.push(headerRow);
    }

    // Data rows
    table.rows.forEach((row, rowIdx) => {
      const dataRow: PptxGenJS.TableCell[] = row.map((cell, colIdx) => ({
        text: cell,
        options: {
          fill: { color: table.cellColors?.[rowIdx]?.[colIdx] || COLORS.white },
          color: COLORS.slate700,
          fontSize: 9,
          fontFace: 'Arial',
        },
      }));
      tableData.push(dataRow);
    });

    if (tableData.length > 0) {
      const numCols = Math.max(table.headers.length, table.rows[0]?.length || 1);
      slide.addTable(tableData, {
        x: 0.5, y: yPos, w: 9,
        colW: 9 / numCols,
        border: { type: 'solid', color: COLORS.slate300, pt: 0.5 },
        margin: 0.05,
      });
      yPos += tableData.length * 0.4 + 0.3;
    }
  });

  // Callouts
  content.callouts.forEach((callout) => {
    if (yPos > 4.8) return;

    slide.addText(callout, {
      x: 0.5, y: yPos, w: 9, h: 0.5,
      fontSize: 12, bold: true, color: COLORS.white,
      fill: { color: COLORS.slate800 },
      fontFace: 'Arial', align: 'center',
      valign: 'middle',
    });
    yPos += 0.6;
  });

  // Slide number
  slide.addText(String(slideNum), {
    x: 9, y: 5.2, w: 0.5, h: 0.3,
    fontSize: 10, color: COLORS.slate400,
    fontFace: 'Arial', align: 'right',
  });
}

function exportToPptx(inputPath: string, outputPath: string): void {
  const html = fs.readFileSync(inputPath, 'utf-8');
  const $ = cheerio.load(html);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
  pptx.title = $('title').text() || 'Pitch Deck';
  pptx.author = 'Navis Health';

  const slides = $('section.slide');
  console.log(`Found ${slides.length} slides`);

  slides.each((index, slide) => {
    console.log(`Processing slide ${index + 1}...`);
    const content = extractSlideContent($, slide);
    createSlide(pptx, content, index + 1);
  });

  pptx.writeFile({ fileName: outputPath })
    .then(() => {
      console.log(`\n✅ PPTX created: ${outputPath}`);
      console.log('\nOpen in PowerPoint or upload to Google Drive → Open with Google Slides');
    })
    .catch((err) => {
      console.error('Error creating PPTX:', err);
    });
}

// Main
const args = process.argv.slice(2);
const inputFile = args[0] || 'public/pitches/sean2.html';
const inputPath = path.resolve(inputFile);
const outputPath = inputPath.replace('.html', '.pptx');

console.log(`Converting: ${inputPath}`);
console.log(`Output: ${outputPath}`);

exportToPptx(inputPath, outputPath);
