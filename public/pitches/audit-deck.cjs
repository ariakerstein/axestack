#!/usr/bin/env node
/**
 * Pitch Deck Audit Script
 * Checks Kawasaki 10/20/30 compliance and design best practices
 */

const fs = require('fs');
const path = require('path');

// Tailwind font size mapping to pixels
const TAILWIND_SIZES = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
  'text-7xl': 72,
  'text-8xl': 96,
  'text-9xl': 128
};

const KAWASAKI_MIN_FONT = 30; // 30pt minimum

function extractSlides(html) {
  const slideRegex = /<section[^>]*class="slide[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
  const slides = [];
  let match;
  while ((match = slideRegex.exec(html)) !== null) {
    slides.push(match[1]);
  }
  return slides;
}

function findSmallFonts(html) {
  const smallFonts = [];

  // Check for small Tailwind classes
  for (const [className, size] of Object.entries(TAILWIND_SIZES)) {
    if (size < KAWASAKI_MIN_FONT && html.includes(className)) {
      // Find the actual text using this class
      const regex = new RegExp(`${className}[^>]*>([^<]+)<`, 'gi');
      let match;
      while ((match = regex.exec(html)) !== null) {
        const text = match[1].trim();
        if (text.length > 2) {
          smallFonts.push({ size, className, text: text.substring(0, 50) });
        }
      }
    }
  }

  return smallFonts;
}

function countTextLines(html) {
  // Count <p>, <li>, <span> elements with substantial text
  const textRegex = /<(?:p|li|span)[^>]*>([^<]{10,})</gi;
  let count = 0;
  let match;
  while ((match = textRegex.exec(html)) !== null) {
    count++;
  }
  return count;
}

function checkBrokenImages(html, basePath) {
  const images = [];
  const imgRegex = /src="([^"]+)"/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('http')) continue; // Skip external URLs

    const fullPath = path.resolve(basePath, src);
    if (!fs.existsSync(fullPath)) {
      images.push(src);
    }
  }

  return images;
}

function auditDeck(filePath) {
  console.log('\n===========================================');
  console.log('  PITCH DECK AUDIT - Kawasaki 10/20/30');
  console.log('===========================================\n');

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const basePath = path.dirname(filePath);
  const slides = extractSlides(html);

  let kawasakiScore = 0;
  let contentScore = 0;
  let designScore = 0;

  // ===== KAWASAKI CHECKS =====
  console.log('KAWASAKI 10/20/30 COMPLIANCE\n');

  // 1. Slide count
  const slideCount = slides.length;
  const slidePass = slideCount <= 10;
  console.log(`  Slides: ${slideCount}/10 ${slidePass ? '✓ PASS' : '✗ FAIL'}`);
  if (slidePass) kawasakiScore += 3;

  // 2. Font sizes
  let hasSmallFonts = false;
  const allSmallFonts = [];
  slides.forEach((slide, i) => {
    const small = findSmallFonts(slide);
    if (small.length > 0) {
      hasSmallFonts = true;
      allSmallFonts.push({ slide: i + 1, fonts: small });
    }
  });

  console.log(`  30pt+ Fonts: ${!hasSmallFonts ? '✓ PASS' : '✗ FAIL'}`);
  if (!hasSmallFonts) kawasakiScore += 3;

  if (hasSmallFonts) {
    console.log('    Small fonts found:');
    allSmallFonts.slice(0, 5).forEach(({ slide, fonts }) => {
      fonts.slice(0, 2).forEach(f => {
        console.log(`      Slide ${slide}: ${f.className} (${f.size}px) "${f.text}..."`);
      });
    });
    if (allSmallFonts.length > 5) {
      console.log(`      ... and ${allSmallFonts.length - 5} more slides with small fonts`);
    }
  }

  // 3. Text density per slide
  let denseSlides = 0;
  slides.forEach((slide, i) => {
    const lines = countTextLines(slide);
    if (lines > 8) {
      denseSlides++;
    }
  });
  const densityPass = denseSlides === 0;
  console.log(`  Text Density: ${densityPass ? '✓ PASS' : `✗ FAIL (${denseSlides} dense slides)`}`);
  if (densityPass) kawasakiScore += 2;

  // ===== DESIGN CHECKS =====
  console.log('\nDESIGN CHECKS\n');

  // 4. Broken images
  const brokenImages = checkBrokenImages(html, basePath);
  const imagesPass = brokenImages.length === 0;
  console.log(`  Images: ${imagesPass ? '✓ PASS' : `✗ FAIL (${brokenImages.length} broken)`}`);
  if (imagesPass) designScore += 1;

  if (!imagesPass) {
    brokenImages.slice(0, 3).forEach(img => {
      console.log(`    Missing: ${img}`);
    });
  }

  // 5. Consistency checks
  const hasDarkBg = html.includes('bg-slate-900') || html.includes('bg-gradient');
  const hasLightBg = html.includes('bg-white') || html.includes('bg-slate-50');
  const mixedBg = hasDarkBg && hasLightBg;
  console.log(`  Background: ${mixedBg ? 'Mixed (dark/light)' : hasDarkBg ? 'Dark theme' : 'Light theme'}`);
  designScore += 2; // Assume consistent

  // 6. Visual hierarchy
  const hasHeadlines = html.includes('text-5xl') || html.includes('text-6xl') || html.includes('text-7xl');
  console.log(`  Visual Hierarchy: ${hasHeadlines ? '✓ Has large headlines' : '✗ Missing large headlines'}`);
  if (hasHeadlines) designScore += 2;

  // ===== CONTENT CHECKS =====
  console.log('\nCONTENT CHECKS\n');

  // Check for key elements
  const hasProblem = html.toLowerCase().includes('problem');
  const hasSolution = html.toLowerCase().includes('solution');
  const hasTeam = html.toLowerCase().includes('team');
  const hasAsk = html.toLowerCase().includes('ask') || html.includes('$500K') || html.includes('$1.5M');
  const hasCompetition = html.toLowerCase().includes('competition') || html.toLowerCase().includes('why we win');
  const hasTraction = html.toLowerCase().includes('traction') || html.toLowerCase().includes('progress');

  console.log(`  Problem slide: ${hasProblem ? '✓' : '✗'}`);
  console.log(`  Solution slide: ${hasSolution ? '✓' : '✗'}`);
  console.log(`  Team slide: ${hasTeam ? '✓' : '✗'}`);
  console.log(`  Competition slide: ${hasCompetition ? '✓' : '✗'}`);
  console.log(`  Traction slide: ${hasTraction ? '✓' : '✗'}`);
  console.log(`  Ask slide: ${hasAsk ? '✓' : '✗'}`);

  if (hasProblem) contentScore += 2;
  if (hasSolution) contentScore += 1;
  if (hasTeam) contentScore += 1;
  if (hasCompetition) contentScore += 1;
  if (hasTraction) contentScore += 2;
  if (hasAsk) contentScore += 2;

  // ===== SCORING =====
  const totalScore = kawasakiScore + designScore + contentScore;
  const maxScore = 30;
  const percentage = Math.round((totalScore / maxScore) * 100);

  console.log('\n===========================================');
  console.log('  SCORES');
  console.log('===========================================\n');
  console.log(`  Kawasaki:  ${kawasakiScore}/8`);
  console.log(`  Design:    ${designScore}/10`);
  console.log(`  Content:   ${contentScore}/9`);
  console.log(`  ─────────────────`);
  console.log(`  TOTAL:     ${totalScore}/${maxScore} (${percentage}%)`);

  let grade;
  if (percentage >= 90) grade = 'A - Investor Ready';
  else if (percentage >= 80) grade = 'B - Minor fixes needed';
  else if (percentage >= 70) grade = 'C - Significant work needed';
  else if (percentage >= 60) grade = 'D - Major revision required';
  else grade = 'F - Start over';

  console.log(`  GRADE:     ${grade}`);
  console.log('\n');

  return { kawasakiScore, designScore, contentScore, totalScore, percentage };
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  // Default to current v3 deck
  const defaultPath = path.join(__dirname, '2026-v3.html');
  if (fs.existsSync(defaultPath)) {
    auditDeck(defaultPath);
  } else {
    console.log('Usage: node audit-deck.cjs <path-to-deck.html>');
    process.exit(1);
  }
} else {
  auditDeck(args[0]);
}
