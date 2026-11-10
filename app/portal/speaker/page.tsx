import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { getSpeaker } from '@/lib/portal';
import { eventById, eventLabel } from '@/lib/data';
import { saveSpeakerProfile } from '../actions';
import { EventOptions, StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My speaker profile — The Events Guy' };
const OPEN_TO = ['Keynotes', 'Panels', 'Workshops', 'Judging awards', 'Podcasts & webinars', 'Hosting / MC'];

export default async function SpeakerEditor({ searchParams }: { searchParams: Promise<{ saved?: string; as?: string }> }) {
  const sp = await searchParams;
  const { me, t } = await pageUser('/portal/speaker', sp.as);
  if (!can(t, 'speakerProfile.publish') && !can(me, 'content.moderate')) {
    return <div className="wrap section"><h1 className="page-title">Speaker profile</h1><div className="lock-panel"><h2>Add the Speaker role first</h2><p>Speaker profiles are free. Switch on the Speaker role in your account, then come back here.</p><Link className="btn btn-primary" href="/account#roles">Go to my roles</Link></div></div>;
  }
  const p = await getSpeaker(t.id);
  const evs = (p?.events ?? []).map(id => eventById.get(id)).filter(Boolean).map(e => eventLabel(e!));
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href={t.id === me.id ? '/account' : '/admin?tab=users'}>{t.id === me.id ? 'My account' : 'Admin'}</Link> / Speaker profile</p>
      <h1 className="page-title">{t.id === me.id ? 'My speaker profile' : `Speaker profile: ${t.email}`}</h1>
      <div className="portal-status">{p ? <StatusBadge status={p.status} /> : <span className="badge">Not published yet</span>}
        {p?.status === 'published' && <Link href={`/speakers#sp-${p.userId}`}>See it live</Link>}
        <span className="muted">Public: name, headline, bio, topics, events and LinkedIn. Organisers can send you enquiries; your email is never shown.</span></div>
      {sp.saved && <p className="note banner">{t.id === me.id && p?.status === 'pending' ? 'Saved — it goes live once an admin approves it.' : 'Saved.'}</p>}
      <form action={saveSpeakerProfile} className="pform">
        {t.id !== me.id && <input type="hidden" name="as" value={t.id} />}
        <div className="field-row">
          <label>Name<input name="name" required maxLength={80} defaultValue={p?.name ?? t.name ?? ''} /></label>
          <label>Headline<input name="headline" maxLength={120} placeholder="Head of Ecommerce, Brand Co" defaultValue={p?.headline ?? ''} /></label>
        </div>
        <div className="field-row">
          <label>Company<input name="company" maxLength={120} defaultValue={p?.company ?? ''} /></label>
          <label>LinkedIn profile<input name="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" defaultValue={p?.linkedin ?? ''} /></label>
        </div>
        <label>Short bio<textarea name="bio" rows={5} maxLength={1200} required defaultValue={p?.bio ?? ''} /></label>
        <div className="field-row">
          <label>Topics you speak on<input name="topics" placeholder="Retention; marketplaces; AI search" defaultValue={(p?.topics ?? []).join('; ')} /></label>
          <label>Website<input name="website" type="url" defaultValue={p?.website ?? ''} /></label>
        </div>
        <fieldset><legend>Open to</legend><div className="check-grid">{OPEN_TO.map(o => <label key={o} className="check"><input type="checkbox" name="openTo" value={o} defaultChecked={p?.openTo.includes(o)} /> {o}</label>)}</div></fieldset>
        <fieldset><legend>Events you’re speaking at (from the guide)</legend>
          <EventOptions id="ev-list" />
          <div className="event-picks">{[0, 1, 2, 3, 4].map(i => <input key={i} name="events" list="ev-list" placeholder="Start typing an event…" defaultValue={evs[i] ?? ''} />)}</div>
        </fieldset>
        <button className="btn btn-primary" type="submit">Save profile</button>
      </form>
    </div>
  );
}
