#!/usr/bin/env node
// Monthly refresh: pulls the UK & Ireland tab and writes data/events.json.
//
//   npm run sync -- path/to/export.csv            a CSV of the tab
//   npm run sync -- path/to/multi-tab-export.txt  a "## Sheet name:" export (picks SHEET_TAB)
//   SHEET_CSV_URL=... npm run sync                 the sheet's CSV export URL (GitHub Action)
//
// Env: SHEET_TAB (default "UK & Ireland").
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { buildDataset } from './tagging.mjs';

const TAB = process.env.SHEET_TAB || 'UK & Ireland';
const input = process.argv[2];

async function loadText() {
  if (input) return { text: await readFile(input, 'utf8'), source: 'file' };
  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error('Give a file path, or set SHEET_CSV_URL to the sheet\'s CSV export link.');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Could not download the sheet (${res.status}). Is it shared "anyone with the link"?`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text)) throw new Error('Got a sign-in page instead of CSV — check the sheet sharing setting.');
  return { text, source: 'google-sheet' };
}

function pickTab(text) {
  if (!text.includes('## Sheet name:')) return text;
  const parts = text.split(/^## Sheet name:\s*/m);
  const hit = parts.find(p => p.split('\n')[0].trim() === TAB);
  if (!hit) throw new Error(`Tab "${TAB}" not found. Tabs: ${parts.slice(1).map(p => p.split('\n')[0].trim()).join(', ')}`);
  return hit.split('\n').slice(1).join('\n');
}

const { text, source } = await loadText();
const rows = parse(pickTab(text), { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });
if (!rows.length || !('Event' in rows[0])) throw new Error('No "Event" column found — has the sheet layout changed?');

const data = buildDataset(rows, { source, tab: TAB });
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/events.json', import.meta.url), JSON.stringify(data, null, 1));

// Report: what to tidy in the sheet next month.
const count = k => data.events.reduce((m, e) => ((m[e[k]] = (m[e[k]] || 0) + 1), m), {});
const noTopic = data.events.filter(e => !e.topics.length);
const noMonth = data.events.filter(e => !e.months.length);
console.log(`✓ ${data.events.length} events written to data/events.json`);
console.log('  Formats:', count('format'));
console.log('  Regions:', count('region'));
console.log('  Prices: ', count('priceTag'));
console.log(`  ${noMonth.length} with no date yet (shown under "Dates TBC")`);
console.log(`  ${noTopic.length} with no topic tag — add a "Tags" column to the sheet to set them by hand:`);
noTopic.slice(0, 15).forEach(e => console.log('   -', e.name));
if (data.events.some(e => e.format === 'Other')) console.log('  "Other" format:', data.events.filter(e => e.format === 'Other').map(e => `${e.name} [${e.type}]`).join('; '));
