import { awards, todayKey, type EventItem } from './data';
import { entryInfo } from './awards';
import { QUIZ, type QuizAnswers } from './award-quiz';

export type Match = { e: EventItem; score: number; reasons: string[]; entryOpen: boolean };

const goalTopics = (g: string) => (QUIZ[1].options.find(o => o.v === g) as { topics?: readonly string[] } | undefined)?.topics ?? [];

/** Awards ranked against the quiz answers. Only upcoming awards whose entries aren't known to be closed. */
export function matchAwards(a: QuizAnswers, limit = 6): Match[] {
  const today = todayKey();
  const horizon = a.when === 'any' ? null : new Date(Date.now() + (+a.when + 1) * 31 * 864e5).toISOString().slice(0, 10);
  const out: Match[] = [];
  for (const e of awards) {
    if (e.months.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) && e.sortKey < today) continue;
    const entry = entryInfo(e.entryDeadline, today) as { state: string; next: string | null };
    if (entry.state === 'closed') continue;
    let score = 0; const reasons: string[] = [];
    // Where
    if (a.where.includes(e.area)) { score += 3; reasons.push(e.area); }
    else if (e.area === 'Global & online') score += 1;
    else continue;
    // What
    const hits = [...new Set(a.goals.flatMap(goalTopics).filter(t => e.topics.includes(t)))];
    score += hits.length * 3; reasons.push(...hits.slice(0, 2));
    if (a.goals.includes('people') && /people|team|leader|rising|individual|talent/i.test(`${e.categories ?? ''} ${e.name}`)) { score += 3; reasons.push('People & teams'); }
    // Who
    if (a.who === 'agency' && e.topics.includes('Agencies')) { score += 3; reasons.push('Agency categories'); }
    if (a.who === 'tech' && (e.topics.includes('Commerce tech') || e.topics.includes('Tech & startups'))) { score += 2; reasons.push('Tech categories'); }
    if (a.who === 'brand' && (e.topics.includes('Retail') || e.topics.includes('DTC & brands'))) score += 2;
    // Sector
    if (e.sectors.includes(a.sector) && a.sector !== 'Cross-sector') { score += 2; reasons.push(a.sector); }
    else if (e.sectors.includes('Cross-sector')) score += 1;
    // Timing: entries open, and a deadline you could meet
    if (entry.state === 'open' && entry.next) {
      if (!horizon || entry.next <= horizon) score += 2;
      if (a.when === '1' && entry.next > horizon!) score -= 2;
    }
    if (score >= 5) out.push({ e, score, reasons: [...new Set(reasons)].slice(0, 3), entryOpen: entry.state === 'open' });
  }
  // One entry per award: the next edition, not this year's and next year's.
  const base = (n: string) => n.toLowerCase().replace(/\b20\d\d\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const seen = new Set<string>();
  return out.sort((x, y) => y.score - x.score || x.e.sortKey.localeCompare(y.e.sortKey))
    .filter(m => (seen.has(base(m.e.name)) ? false : (seen.add(base(m.e.name)), true))).slice(0, limit);
}
