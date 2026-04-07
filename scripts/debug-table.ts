import { JSDOM } from 'jsdom';

async function main() {
  const html = await fetch('https://navis.health/pitches/p13nAI.html').then(r => r.text());
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const slides = doc.querySelectorAll('section.slide, .slide');
  const slide = slides[9]; // Slide 10

  const table = slide.querySelector('table');
  if (!table) {
    console.log('No table found');
    return;
  }

  console.log('Table found!\n');

  // Get headers
  const headers = table.querySelectorAll('th');
  console.log('Headers:');
  headers.forEach((th, i) => {
    console.log('  ' + i + ': ' + th.textContent?.trim());
  });

  // Get rows
  const rows = table.querySelectorAll('tbody tr');
  console.log('\nRows: ' + rows.length);
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('td');
    const rowData: string[] = [];
    cells.forEach(cell => {
      // Check for checkmark or X
      const hasCheck = cell.querySelector('.text-green-500, [class*="green"]');
      const hasX = cell.querySelector('.text-slate-500, [class*="slate"]');
      if (hasCheck) rowData.push('✓');
      else if (hasX) rowData.push('✗');
      else rowData.push(cell.textContent?.trim() || '');
    });
    console.log('  Row ' + i + ': ' + rowData.join(' | '));
  });

  // Extract as comparison data
  console.log('\n\nStructured extraction:');
  const comparisonData = {
    headers: Array.from(headers).map(th => th.textContent?.trim()).filter(Boolean),
    rows: Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return Array.from(cells).map(cell => {
        const hasCheck = cell.querySelector('[class*="green"]');
        const hasX = cell.querySelector('[class*="slate"]');
        if (hasCheck) return true;
        if (hasX) return false;
        return cell.textContent?.trim() || '';
      });
    })
  };
  console.log(JSON.stringify(comparisonData, null, 2));
}

main().catch(console.error);
