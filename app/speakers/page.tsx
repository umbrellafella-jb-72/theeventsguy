import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { GuyPortrait } from '@/components/Art';
import { SpeakerDirectory } from '@/components/SpeakerDirectory';
import type { SpeakerEvent, SpeakerView } from '@/components/SpeakerCard';
import { ReportButton } from '@/components/portal/Bits';
import { eventById, eventHref, speakers, type EventItem } from '@/lib/data';
import { allSpeakers } from '@/lib/portal';
import { storeReady } from '@/lib/store';
import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Speakers portal — The Events Guy', description: 'A curated list of ecommerce speakers in the UK and Europe: specialities, LinkedIn profiles and where they’re speaking next.' };

const shortDate = (e: EventItem) => e.dates.replace(/\s*20\d\d/g, '');
const toEvents = (ids: string[]): SpeakerEvent[] => ids.map(id => eventById.get(id)).filter((e): e is EventItem => !!e)
  .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  .map(e => ({ id: e.id, name: e.name, when: shortDate(e), city: e.city, award: e.format === 'Awards', href: e.format === 'Awards' ? `/awards#aw-${e.id}` : eventHref(e) }));

// Shown only while there are no real profiles, so the layout can be judged. Fictional people.
const EXAMPLES: SpeakerView[] = [
  { id: 'example-1', name: 'Alex Example', role: 'Head of Ecommerce', company: 'Example Retail Ltd', bio: 'Grew a mid-size fashion retailer’s online share from 20% to 55%. Talks about replatforming, retention and making marketplaces pay.', linkedin: 'https://www.linkedin.com/', topics: ['CX & retention', 'Marketplaces & Amazon', 'Shopify'], image: null, featured: true, openTo: ['Keynotes', 'Panels'], events: [], enquire: false, portal: false },
  { id: 'example-2', name: 'Sam Sample', role: 'Founder', company: 'Sample Agency', bio: 'Runs a growth agency for DTC brands. Speaks on paid social after the cookie, creator partnerships and AI search.', linkedin: 'https://www.linkedin.com/', topics: ['DTC & brands', 'Marketing', 'Search & SEO', 'AI'], image: null, featured: false, openTo: ['Panels', 'Podcasts'], events: [], enquire: false, portal: false },
  { id: 'example-3', name: 'Jo Placeholder', role: 'Director of Payments', company: 'Placeholder Pay', bio: 'Fifteen years in checkout and fraud. Explains new payment rules in plain English and judges two industry awards.', linkedin: 'https://www.linkedin.com/', topics: ['Payments & fintech', 'Data & analytics'], image: null, featured: false, openTo: ['Judging', 'Workshops'], events: [], enquire: false, portal: false },
];

// The speakers portal. Curated: speakers come from the Speakers tab of the sheet (chosen by The
// Events Guy, with Featured = Spotlight), plus profiles speakers publish themselves, which only
// appear once an admin approves them.
export default async function Speakers({ searchParams }: { searchParams: Promise<{ reported?: string }> }) {
  const sp = await searchParams;
  const viewer = await sessionUser();
  const canEnquire = can(viewer, 'directory.speakers') && can(viewer, 'enquiry.send');
  const portal = storeReady() ? (await allSpeakers().catch(() => [])).filter(p => p.status === 'published') : [];
  const curated: SpeakerView[] = speakers.map(s => ({
    id: s.id, name: s.name, role: s.role, company: s.company, bio: s.bio, linkedin: s.linkedin, topics: s.topics ?? [], image: s.image ?? null,
    featured: Boolean(s.featured), openTo: s.openTo ?? [], events: toEvents(s.events), enquire: false, portal: false,
  }));
  const own: SpeakerView[] = portal.map(p => ({
    id: p.userId, name: p.name, role: p.headline, company: p.company, bio: p.bio, linkedin: p.linkedin, topics: p.topics, image: p.image ?? null,
    featured: false, openTo: p.openTo, events: toEvents(p.events), enquire: canEnquire && viewer?.id !== p.userId, portal: true,
  }));
  const seen = new Set<string>();
  const all = [...curated, ...own]
    .filter(s => (seen.has(s.name.toLowerCase()) ? false : (seen.add(s.name.toLowerCase()), true)))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.events[0] ? 0 : 1) - (b.events[0] ? 0 : 1) || a.name.localeCompare(b.name));
  const example = all.length === 0;
  const list = example ? EXAMPLES : all;

  // Enquire and report buttons for self-published profiles (server-rendered, passed into the cards).
  const extras: Record<string, React.ReactNode> = {};
  for (const s of own) extras[s.id] = <>
    {s.enquire && <Link className="btn btn-secondary btn-sm" href={`/portal/enquire?type=speaker&id=${s.id}`}>Send enquiry</Link>}
    <ReportButton type="speaker" id={s.id} label={s.name} back="/speakers" />
  </>;

  return (
    <>
      <PageHero eyebrow="Speakers portal" scene="bridge" title="The speakers worth booking"
        intro="A curated list of the people on stage at UK and European ecommerce events: what they specialise in, where they’re speaking next, and their LinkedIn profile.">
        <Link className="btn btn-primary" href={viewer ? '/portal/speaker' : '/login?next=/portal/speaker'}>Apply to be listed</Link>
        {canEnquire ? <Link className="btn btn-secondary" href="/portal/directory">Organiser directory</Link> : null}
      </PageHero>
      <div className="wrap section">
        {sp.reported && <p className="note banner">Thanks — an admin will take a look.</p>}
        {example && <p className="note">These are example cards showing how the portal will look. Real speakers appear here as you add them to the Speakers tab of the sheet, or approve their profiles.</p>}
        <SpeakerDirectory speakers={list} example={example} extras={extras} />

        <section className="sp-apply">
          <GuyPortrait size={140} className="sp-apply-guy" />
          <div>
            <h2>Speaking at an event in the guide?</h2>
            <p>Create a free account, switch on the Speaker role and send us your profile: your specialities, a short bio, your LinkedIn and a cartoon portrait. Every profile is reviewed before it’s listed, and organisers can send you enquiries without ever seeing your email.</p>
            <Link className="btn btn-secondary btn-sm" href={viewer ? '/portal/speaker' : '/login?next=/portal/speaker'}>Apply to be listed</Link>
          </div>
        </section>
      </div>
    </>
  );
}
