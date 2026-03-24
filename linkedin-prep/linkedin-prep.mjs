#!/usr/bin/env node

/**
 * LinkedIn Prep - Analyze your LinkedIn connections for warm intros
 *
 * Usage:
 *   node linkedin-prep.mjs import ~/Downloads/Connections.csv
 *   node linkedin-prep.mjs intros "Stripe"
 *   node linkedin-prep.mjs search "product manager"
 *   node linkedin-prep.mjs stats
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse';
import { homedir } from 'os';
import { join } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = join(homedir(), '.linkedin-prep');
const CONNECTIONS_FILE = join(DATA_DIR, 'connections.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function loadConnections() {
  if (!existsSync(CONNECTIONS_FILE)) {
    console.log('\n❌ No connections imported yet.');
    console.log('Run: node linkedin-prep.mjs import ~/Downloads/Connections.csv\n');
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONNECTIONS_FILE, 'utf-8'));
}

function saveConnections(connections) {
  writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

function printHeader(title) {
  console.log('\n' + '━'.repeat(50));
  console.log(`  ${title}`);
  console.log('━'.repeat(50) + '\n');
}

function normalizeCompany(company) {
  if (!company) return '';
  return company
    .toLowerCase()
    .replace(/,?\s*(inc\.?|llc|ltd|corp\.?|corporation|company)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesCompany(connection, query) {
  const normalized = normalizeCompany(query);
  const connCompany = normalizeCompany(connection.company);
  return connCompany.includes(normalized) || normalized.includes(connCompany);
}

function matchesQuery(connection, query) {
  const q = query.toLowerCase();
  return (
    (connection.firstName?.toLowerCase() || '').includes(q) ||
    (connection.lastName?.toLowerCase() || '').includes(q) ||
    (connection.company?.toLowerCase() || '').includes(q) ||
    (connection.position?.toLowerCase() || '').includes(q)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Import Command
// ─────────────────────────────────────────────────────────────────────────────

async function importConnections(csvPath) {
  if (!existsSync(csvPath)) {
    console.log(`\n❌ File not found: ${csvPath}\n`);
    process.exit(1);
  }

  printHeader('📥 IMPORTING LINKEDIN CONNECTIONS');

  const connections = [];
  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  for await (const record of parser) {
    // LinkedIn CSV format varies, handle common formats
    const connection = {
      firstName: record['First Name'] || record.firstName || '',
      lastName: record['Last Name'] || record.lastName || '',
      email: record['Email Address'] || record.email || '',
      company: record['Company'] || record.company || '',
      position: record['Position'] || record.position || record.title || '',
      connectedOn: record['Connected On'] || record.connectedOn || '',
    };

    if (connection.firstName || connection.lastName) {
      connections.push(connection);
    }
  }

  saveConnections(connections);

  console.log(`✓ Imported ${connections.length} connections`);
  console.log(`  Saved to: ${CONNECTIONS_FILE}\n`);

  // Show quick stats
  const withEmail = connections.filter(c => c.email).length;
  const companies = [...new Set(connections.map(c => normalizeCompany(c.company)).filter(Boolean))];

  console.log(`  With email: ${withEmail} (${Math.round(withEmail/connections.length*100)}%)`);
  console.log(`  Unique companies: ${companies.length}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Find Intros Command
// ─────────────────────────────────────────────────────────────────────────────

function findIntros(targetCompany) {
  const connections = loadConnections();

  printHeader(`🎯 WARM INTROS TO ${targetCompany.toUpperCase()}`);

  // Find direct connections at target company
  const direct = connections.filter(c => matchesCompany(c, targetCompany));

  // Find potential intro paths (ex-employees, similar companies, etc.)
  // This is a simplified version - in reality you'd need more data
  const exEmployees = connections.filter(c => {
    const pos = (c.position || '').toLowerCase();
    return pos.includes('former') || pos.includes('ex-');
  }).filter(c => matchesCompany(c, targetCompany));

  // Find connections at similar/adjacent companies (tech, fintech, etc.)
  const adjacentKeywords = getAdjacentCompanies(targetCompany);
  const adjacent = connections.filter(c =>
    adjacentKeywords.some(kw => matchesCompany(c, kw))
  ).slice(0, 5);

  // Print results
  if (direct.length > 0) {
    console.log('DIRECT CONNECTIONS (1st degree):');
    direct.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.position || 'Unknown role'}`);
      if (c.connectedOn) console.log(`     Connected: ${c.connectedOn}`);
      if (c.email) console.log(`     Email: ${c.email}`);
      console.log('     → Direct outreach possible\n');
    });
  } else {
    console.log('DIRECT CONNECTIONS: None found\n');
  }

  if (exEmployees.length > 0) {
    console.log('EX-EMPLOYEES IN YOUR NETWORK:');
    exEmployees.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.position}`);
      console.log('     → Ask for intro to current employees\n');
    });
  }

  if (adjacent.length > 0 && direct.length === 0) {
    console.log('CONNECTIONS AT RELATED COMPANIES:');
    adjacent.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.position} @ ${c.company}`);
      console.log('     → May know someone at target\n');
    });
  }

  // Print message templates
  console.log('─'.repeat(50));
  console.log('\n📝 SUGGESTED MESSAGE:\n');

  if (direct.length > 0) {
    console.log(`"Hey [Name], hope you're doing well! I'm exploring`);
    console.log(`opportunities and noticed you're at ${targetCompany}. Would`);
    console.log(`love to learn about your experience there - any chance`);
    console.log(`you have 15 min for a quick chat?"\n`);
  } else {
    console.log(`"Hey [Name], hope you're doing well! I'm exploring`);
    console.log(`opportunities at ${targetCompany} and thought you might`);
    console.log(`know someone there. Would you be comfortable making`);
    console.log(`an intro if you do? Happy to send a blurb to forward."\n`);
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`\nSUMMARY: ${direct.length} direct, ${exEmployees.length} ex-employees\n`);
}

function getAdjacentCompanies(company) {
  // Map of companies to related companies (simplified)
  const adjacencyMap = {
    stripe: ['square', 'paypal', 'adyen', 'braintree', 'plaid'],
    google: ['meta', 'microsoft', 'amazon', 'apple'],
    meta: ['google', 'tiktok', 'snap', 'twitter', 'x'],
    amazon: ['google', 'microsoft', 'walmart', 'shopify'],
    apple: ['google', 'microsoft', 'meta'],
    netflix: ['disney', 'hbo', 'spotify', 'youtube'],
    airbnb: ['uber', 'lyft', 'doordash', 'instacart'],
    uber: ['lyft', 'doordash', 'airbnb', 'instacart'],
  };

  const key = normalizeCompany(company);
  return adjacencyMap[key] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Command
// ─────────────────────────────────────────────────────────────────────────────

function searchConnections(query) {
  const connections = loadConnections();

  printHeader(`🔍 SEARCH: "${query}"`);

  const matches = connections.filter(c => matchesQuery(c, query));

  if (matches.length === 0) {
    console.log('No matches found.\n');
    return;
  }

  console.log(`Found ${matches.length} matches:\n`);

  // Group by company
  const byCompany = {};
  matches.forEach(c => {
    const company = c.company || 'Unknown';
    if (!byCompany[company]) byCompany[company] = [];
    byCompany[company].push(c);
  });

  // Sort by company size
  const sorted = Object.entries(byCompany).sort((a, b) => b[1].length - a[1].length);

  sorted.slice(0, 10).forEach(([company, people]) => {
    console.log(`${company} (${people.length}):`);
    people.slice(0, 3).forEach(p => {
      console.log(`  - ${p.firstName} ${p.lastName} - ${p.position || 'N/A'}`);
    });
    if (people.length > 3) {
      console.log(`  ... and ${people.length - 3} more`);
    }
    console.log('');
  });

  if (sorted.length > 10) {
    console.log(`... and ${sorted.length - 10} more companies\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Command
// ─────────────────────────────────────────────────────────────────────────────

function showStats() {
  const connections = loadConnections();

  printHeader('📊 YOUR LINKEDIN NETWORK');

  const withEmail = connections.filter(c => c.email).length;

  console.log(`Total Connections: ${connections.length.toLocaleString()}`);
  console.log(`With Email: ${withEmail} (${Math.round(withEmail/connections.length*100)}%)\n`);

  // Top companies
  const companyCounts = {};
  connections.forEach(c => {
    const company = normalizeCompany(c.company);
    if (company) {
      companyCounts[company] = (companyCounts[company] || 0) + 1;
    }
  });

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('TOP COMPANIES:');
  topCompanies.forEach(([company, count]) => {
    const displayName = company.charAt(0).toUpperCase() + company.slice(1);
    console.log(`  ${displayName.padEnd(20)} - ${count} connections`);
  });

  // Top titles
  const titleCounts = {};
  connections.forEach(c => {
    const title = (c.position || '').toLowerCase();
    // Extract common titles
    const keywords = ['product manager', 'software engineer', 'director', 'vp', 'ceo', 'founder', 'manager', 'designer', 'analyst'];
    keywords.forEach(kw => {
      if (title.includes(kw)) {
        const displayTitle = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        titleCounts[displayTitle] = (titleCounts[displayTitle] || 0) + 1;
      }
    });
  });

  const topTitles = Object.entries(titleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  console.log('\nTOP TITLES:');
  topTitles.forEach(([title, count]) => {
    console.log(`  ${title.padEnd(20)} - ${count}`);
  });

  // Connection growth by year
  const byYear = {};
  connections.forEach(c => {
    if (c.connectedOn) {
      // Parse various date formats
      const match = c.connectedOn.match(/(\d{4})/);
      if (match) {
        const year = match[1];
        byYear[year] = (byYear[year] || 0) + 1;
      }
    }
  });

  const years = Object.entries(byYear)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5);

  if (years.length > 0) {
    console.log('\nNETWORK GROWTH:');
    years.forEach(([year, count]) => {
      console.log(`  ${year}: +${count} connections`);
    });
  }

  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];
const arg = args.slice(1).join(' ');

switch (command) {
  case 'import':
    if (!arg) {
      console.log('\nUsage: node linkedin-prep.mjs import <path-to-Connections.csv>\n');
      process.exit(1);
    }
    importConnections(arg.replace(/^~/, homedir()));
    break;

  case 'intros':
    if (!arg) {
      console.log('\nUsage: node linkedin-prep.mjs intros <company-name>\n');
      process.exit(1);
    }
    findIntros(arg);
    break;

  case 'search':
    if (!arg) {
      console.log('\nUsage: node linkedin-prep.mjs search <query>\n');
      process.exit(1);
    }
    searchConnections(arg);
    break;

  case 'stats':
    showStats();
    break;

  default:
    console.log(`
LinkedIn Prep - Find warm intros from your network

Commands:
  import <csv>     Import LinkedIn connections export
  intros <company> Find warm intros to a company
  search <query>   Search connections by name, company, or title
  stats            Show network statistics

Examples:
  node linkedin-prep.mjs import ~/Downloads/Connections.csv
  node linkedin-prep.mjs intros Stripe
  node linkedin-prep.mjs search "product manager"
  node linkedin-prep.mjs stats
`);
}
