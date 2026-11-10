import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { SpeakerCard } from '@/components/SpeakerCard';
import { ReportButton } from '@/components/portal/Bits';
import { eventById, speakers, type EventItem, type Speaker } from '@/lib/data';
import { allSpeakers } from '@/lib/portal';
import { storeReady } from '@/lib/store';
import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Speakers — The Events Guy' };

// Public speaker profiles: the Speakers tab of the sheet, plus approved profiles speakers publish themselves.
export default async function Speakers({ searchParams }: { searchParams: Promise<{ reported?: string }> }) {
  const sp = await searchParams;
  const viewer = await sessionUser();
  const portal = storeReady() ? (await allSpeakers().catch(() => [])).filter(p => p.status === 'published') : [];
  const fromPortal: { s: Speaker; portal: boolean }[] = portal.map(p => ({ portal: true, s: { id: p.userId, name: p.name, role: p.headline, company: p.company, bio: p.bio, linkedin: p.linkedin, events: p.events } }));
  const all = [...speakers.map(s => ({ s, portal: false })), ...fromPortal]
    .map(x => ({ ...x, ev: x.s.events.map(id => eventById.get(id)).filter((e): e is EventItem => !!e) }))
    .sort((a, b) => (a.ev[0]?.sortKey ?? '9999').localeCompare(b.ev[0]?.sortKey ?? '9999') || a.s.name.localeCompare(b.s.name));
  const canEnquire = can(viewer, 'directory.speakers') && can(viewer, 'enquiry.send');
  return (
    <>
      <PageHero eyebrow="Speakers" scene="bridge" title="Who's on stage"
        intro="The people speaking at the events in the guide: a short bio, their LinkedIn profile, and a link straight to each event they are speaking at.">
        <Link className="btn btn-secondary" href={viewer ? '/portal/speaker' : '/login?next=/portal/speaker'}>Add your speaker profile</Link>
      </PageHero>
      <div className="wrap section">
        {sp.reported && <p className="note banner">Thanks — an admin will take a look.</p>}
        {all.length ? (
          <div className="speaker-grid">{all.map(({ s, ev, portal: own }) => (
            <div key={s.id} className="speaker-wrap">
              <SpeakerCard s={s} events={ev} />
              {own && <div className="speaker-extra">
                {canEnquire && viewer?.id !== s.id && <Link className="btn btn-primary btn-sm" href={`/portal/enquire?type=speaker&id=${s.id}`}>Send enquiry</Link>}
                <ReportButton type="speaker" id={s.id} label={s.name} back="/speakers" />
              </div>}
            </div>
          ))}</div>
        ) : (
          <div className="empty-panel">
            <h2>Speaker profiles are on their way</h2>
            <p>Speaking at an event in the guide? Create a free account, switch on the Speaker role and publish your profile.</p>
          </div>
        )}
      </div>
    </>
  );
}
