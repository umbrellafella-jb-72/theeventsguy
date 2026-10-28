import { PageHero } from '@/components/PageHero';
import { SpeakerCard } from '@/components/SpeakerCard';
import { eventById, speakers, type EventItem } from '@/lib/data';

export const metadata = { title: 'Speakers — The Events Guy' };

export default function Speakers() {
  const withEvents = speakers.map(s => ({ s, ev: s.events.map(id => eventById.get(id)).filter((e): e is EventItem => !!e) }))
    .sort((a, b) => (a.ev[0]?.sortKey ?? '9999').localeCompare(b.ev[0]?.sortKey ?? '9999') || a.s.name.localeCompare(b.s.name));
  return (
    <>
      <PageHero eyebrow="Speakers" scene="bridge" title="Who's on stage"
        intro="The people speaking at the events in the guide: a short bio, their LinkedIn profile, and a link straight to each event they are speaking at." />
      <div className="wrap section">
        {withEvents.length ? (
          <div className="speaker-grid">{withEvents.map(({ s, ev }) => <SpeakerCard key={s.id} s={s} events={ev} />)}</div>
        ) : (
          <div className="empty-panel">
            <h2>Speaker profiles are on their way</h2>
            <p>Profiles appear here once speakers are added to the guide. Speaking at an event in the guide? Send us your bio and LinkedIn profile through the enquiry form on the Services page.</p>
          </div>
        )}
      </div>
    </>
  );
}
