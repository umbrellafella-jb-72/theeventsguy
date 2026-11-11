// "What awards should we enter?" — the quiz questions and how answers map to awards.
// Shared by the quiz (browser) and the results page (server). No event data in here.

export type QuizAnswers = { who: string; goals: string[]; where: string[]; sector: string; when: string };

export const QUIZ = [
  { key: 'who', q: 'Who would be entering?', multi: false, options: [
    { v: 'brand', label: 'A brand or retailer', hint: 'Your own store, products or team' },
    { v: 'agency', label: 'An agency or consultancy', hint: 'Work you’ve done for clients' },
    { v: 'tech', label: 'A tech platform or service', hint: 'Software, payments, logistics' },
    { v: 'person', label: 'An individual', hint: 'Leader, rising star, team member' },
  ] },
  { key: 'goals', q: 'What do you want recognised?', multi: true, hint: 'Pick up to three.', options: [
    { v: 'marketing', label: 'A marketing campaign', topics: ['Marketing', 'Affiliate & partnerships'] },
    { v: 'growth', label: 'Ecommerce growth', topics: ['Ecommerce (general)', 'Retail', 'DTC & brands'] },
    { v: 'cx', label: 'Customer experience', topics: ['CX & retention'] },
    { v: 'search', label: 'Search, SEO or content', topics: ['Search & SEO'] },
    { v: 'tech', label: 'Tech, AI or innovation', topics: ['AI', 'Commerce tech', 'Tech & startups', 'Data & analytics'] },
    { v: 'payments', label: 'Payments or fintech', topics: ['Payments & fintech'] },
    { v: 'ops', label: 'Delivery and operations', topics: ['Logistics & delivery', 'B2B commerce'] },
    { v: 'people', label: 'People and teams', topics: [] },
  ] },
  { key: 'where', q: 'Where do you want to win?', multi: true, options: [
    { v: 'UK & Ireland', label: 'UK & Ireland' },
    { v: 'Europe', label: 'Europe' },
    { v: 'Global & online', label: 'Global or online' },
  ] },
  { key: 'sector', q: 'Which sector are you in?', multi: false, options: [
    { v: 'Retail', label: 'Retail' }, { v: 'Fashion & beauty', label: 'Fashion & beauty' }, { v: 'Brands & DTC', label: 'Brands & DTC' },
    { v: 'Financial services', label: 'Financial services' }, { v: 'B2B & wholesale', label: 'B2B & wholesale' }, { v: 'Cross-sector', label: 'Something else' },
  ] },
  { key: 'when', q: 'When could you have an entry ready?', multi: false, options: [
    { v: '1', label: 'Within a month' }, { v: '3', label: 'In the next 3 months' }, { v: '6', label: 'In the next 6 months' }, { v: 'any', label: 'We’re planning ahead' },
  ] },
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean);

/** Answers from the address bar (?who=brand&goals=marketing,cx&where=UK%20%26%20Ireland…), validated. */
export function readAnswers(sp: Record<string, string | string[] | undefined>): QuizAnswers | null {
  const valid = (key: string) => QUIZ.find(x => x.key === key)!.options.map(o => o.v as string);
  const a: QuizAnswers = {
    who: one(sp.who), goals: many(sp.goals).filter(g => valid('goals').includes(g)).slice(0, 3),
    where: many(sp.where).filter(w => valid('where').includes(w)), sector: one(sp.sector), when: one(sp.when),
  };
  if (!valid('who').includes(a.who) || !a.goals.length || !a.where.length || !valid('sector').includes(a.sector) || !valid('when').includes(a.when)) return null;
  return a;
}

export const labelFor = (key: string, v: string) => (QUIZ.find(x => x.key === key)?.options.find(o => o.v === v)?.label ?? v);
export function summary(a: QuizAnswers) {
  return [`Entering as: ${labelFor('who', a.who)}`, `Recognition for: ${a.goals.map(g => labelFor('goals', g)).join(', ')}`,
    `Where: ${a.where.map(w => labelFor('where', w)).join(', ')}`, `Sector: ${labelFor('sector', a.sector)}`, `Entry ready: ${labelFor('when', a.when)}`].join('\n');
}
