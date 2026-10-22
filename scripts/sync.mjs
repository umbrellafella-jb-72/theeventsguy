#!/usr/bin/env node
// Monthly refresh: pulls the sheet's tabs and writes data/events.json.
//
//   npm run sync -- path/to/multi-tab-export      a "## Sheet name:" export holding every tab
//   npm run sync                                   download each tab from its CSV export URL (GitHub Action)
//
// Each tab's CSV link goes in its own env var (see TABS below):
//   https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { buildDataset } from './tagging.mjs';

// The Americas and rest-of-world tabs are left out for now.
const TABS = [
  { tab: 'UK & Ireland', kind: 'events', area: 'UK & Ireland', env: 'SHEET_CSV_URL', key: 'Event' },
  { tab: 'Rest of Europe', kind: 'events', area: 'Europe', env: 'SHEET_CSV_URL_EUROPE', key: 'Event' },
  { tab: 'Awards', kind: 'awards', env: 'SHEET_CSV_URL_AWARDS', key: 'Awards' },
  { tab: 'Webinars & Podcasts', kind: 'media', env: 'SHEET_CSV_URL_MEDIA', key: 'Name' },
];

const input = process.argv[2];
const csv = text => parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });

async function download(url, tab) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Could not download "${tab}" (${res.status}). Is it shared "anyone with the link"?`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text)) throw new Error(`Got a sign-in page instead of CSV for "${tab}" — check the sharing setting.`);
  return text;
}

async function loadTabs() {
  const out = {};
  if (input) {
    const text = await readFile(input, 'utf8');
    if (!text.includes('## Sheet name:')) throw new Error('Expected a multi-tab export with "## Sheet name:" headers.');
    const parts = text.split(/^## Sheet name:\s*/m);
    for (const t of TABS) {
      const hit = parts.find(p => p.split('\n')[0].trim() === t.tab);
      if (!hit) { console.warn(`! Tab "${t.tab}" not found — skipped`); continue; }
      out[t.tab] = csv(hit.split('\n').slice(1).join('\n'));
    }
    return { out, source: 'file' };
  }
  for (const t of TABS) {
    const url = process.env[t.env];
    if (!url) { console.warn(`! ${t.env} not set — "${t.tab}" skipped`); continue; }
    out[t.tab] = csv(await download(url, t.tab));
  }
  if (!Object.keys(out).length) throw new Error('No tabs loaded. Give a file path or set the SHEET_CSV_URL* variables.');
  return { out, source: 'google-sheet' };
}

const { out, source } = await loadTabs();
for (const t of TABS) {
  const rows = out[t.tab];
  if (rows && rows.length && !(t.key in rows[0])) throw new Error(`"${t.tab}" has no "${t.key}" column — has the sheet layout changed?`);
}

const data = buildDataset({
  events: TABS.filter(t => t.kind === 'events' && out[t.tab]).map(t => ({ rows: out[t.tab], area: t.area })),
  awards: out['Awards'] || [],
  media: out['Webinars & Podcasts'] || [],
}, { source, tabs: TABS.filter(t => out[t.tab]).map(t => t.tab) });

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/events.json', import.meta.url), JSON.stringify(data, null, 1));

// Report: what to tidy in the sheet next month.
const count = k => data.events.reduce((m, e) => ((m[e[k]] = (m[e[k]] || 0) + 1), m), {});
const noTopic = data.events.filter(e => !e.topics.length);
console.log(`✓ ${data.events.length} events and awards, ${data.media.length} webinars & podcasts → data/events.json`);
console.log('  Tabs:   ', data.tabs.join(', '));
console.log('  Areas:  ', count('area'));
console.log('  Formats:', count('format'));
console.log('  Regions:', count('region'));
console.log('  Prices: ', count('priceTag'));
console.log(`  Awards: ${data.stats.awardsMergedFromEventTabs} merged with their event-tab twin, ${data.stats.awardsSkippedOutOfScope} skipped (US / APAC / MENA)`);
console.log(`  ${data.events.filter(e => !e.months.length).length} with no date yet (shown under "Dates TBC")`);
console.log(`  ${noTopic.length} with no topic tag — add a "Tags" column to the sheet to set them by hand`);
const tbc = data.events.filter(e => e.region === 'Location TBC' && e.area === 'Europe').map(e => e.city);
if (tbc.length) console.log('  Europe locations not recognised:', [...new Set(tbc)].join(' | '));
