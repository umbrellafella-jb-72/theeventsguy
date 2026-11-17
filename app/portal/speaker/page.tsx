import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { getSpeaker } from '@/lib/portal';
import { eventById, eventLabel } from '@/lib/data';
import { saveSpeakerProfile } from '../actions';
import { hasPhoto, isStoredPhoto } from '@/lib/photos';
import { SpeakerAvatar } from '@/components/SpeakerAvatar';
import { EventOptions, StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My speaker profile — The Events Guy' };
const OPEN_TO = ['Keynotes', 'Panels', 'Workshops', 'Judging awards', 'Podcasts & webinars', 'Hosting / MC'];

export default async function SpeakerEditor({ searchParams }: { searchParams: Promise<{ saved?: string; as?: string; li?: string; got?: string; why?: string; new?: string; photo?: string }> }) {
  const sp = await searchParams;
  const { me, t } = await pageUser('/portal/speaker', sp.as);
  if (!can(t, 'speakerProfile.publish') && !can(me, 'content.moderate')) {
    return <div className="wrap section"><h1 className="page-title">Speaker profile</h1><div className="lock-panel"><h2>Add the Speaker role first</h2><p>Speaker profiles are free. Switch on the Speaker role in your account, then come back here.</p><Link className="btn btn-primary" href="/account#roles">Go to my roles</Link></div></div>;
  }
  const p = await getSpeaker(t.id);
  const admin = can(me, 'content.moderate');
  const stored = await hasPhoto(t.id);
  const managed = Boolean(p?.managed);
  const GOT: Record<string, string> = { name: 'name', headline: 'headline', company: 'company', about: 'about', photo: 'photo' };
  const got = (sp.got || '').split(',').filter(k => GOT[k]).map(k => GOT[k]);
  const evs = (p?.events ?? []).map(id => eventById.get(id)).filter(Boolean).map(e => eventLabel(e!));
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href={t.id === me.id ? '/account' : '/admin?tab=users'}>{t.id === me.id ? 'My account' : 'Admin'}</Link> / Speaker profile</p>
      <h1 className="page-title">{t.id === me.id ? 'My speaker profile' : `Speaker profile: ${managed ? p?.name ?? 'new speaker' : t.email}`}</h1>
      <div className="portal-status">{p ? <StatusBadge status={p.status} /> : <span className="badge">Not published yet</span>}
        {p?.status === 'published' && <Link href={`/speakers#sp-${p.userId}`}>See it live</Link>}
        <span className="muted">Public: name, headline, bio, topics, events and LinkedIn. Organisers can send you enquiries; your email is never shown.</span></div>
      {sp.li === 'ok' && <p className="note banner">{sp.new ? 'Speaker added. ' : ''}Filled from LinkedIn: {got.length ? got.join(', ') : 'nothing new'}. Check everything below{got.includes('photo') ? ', tick the photo box once the speaker has agreed' : ''}, then save.</p>}
      {sp.li === 'none' && <p className="note banner">{sp.new ? 'Speaker added, but ' : ''}LinkedIn didn’t share this profile{sp.why ? ` (${sp.why})` : ''}. Fill it in by hand below — you can upload their photo too.</p>}
      {sp.li === 'bad' && <p className="note banner">That isn’t a LinkedIn profile link. It should look like linkedin.com/in/their-name.</p>}
      {sp.li === 'busy' && <p className="note banner">Too many LinkedIn lookups in the last hour. Try again later, or fill it in by hand.</p>}
      {sp.li === 'exists' && <p className="note banner">That LinkedIn profile is already listed — here it is.</p>}
      {sp.photo === 'bad' && <p className="note banner">That photo couldn’t be used. Upload a JPG, PNG or WebP under 5 MB.</p>}
      {managed && admin && <p className="muted">Added by an admin from LinkedIn. This speaker has no sign-in, so enquiries to them are switched off.</p>}
      {sp.saved && <p className="note banner">{t.id === me.id && p?.status === 'pending' ? 'Saved — it goes live once an admin approves it.' : 'Saved.'}</p>}
      <form action={saveSpeakerProfile} className="pform">
        {/* Enter saves; the first submit button is the form's default. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Save profile</button>
        {t.id !== me.id && <input type="hidden" name="as" value={t.id} />}
        <div className="field-row">
          <label>Name<input name="name" required maxLength={80} defaultValue={p?.name ?? t.name ?? ''} /></label>
          <label>Headline<input name="headline" maxLength={120} placeholder="Head of Ecommerce, Brand Co" defaultValue={p?.headline ?? ''} /></label>
        </div>
        <div className="field-row">
          <label>Company<input name="company" maxLength={120} defaultValue={p?.company ?? ''} /></label>
          <label>LinkedIn profile<input name="linkedin" type="text" inputMode="url" placeholder="linkedin.com/in/your-name" defaultValue={p?.linkedin ?? ''} />
</label>
        </div>
        <p className="li-fill"><button className="btn btn-secondary btn-sm" type="submit" name="fill" value="1">Fill from LinkedIn</button> <span className="hint">Saves this form, then fills any blank fields and the photo from the public LinkedIn profile, when LinkedIn shares it.</span></p>
        <label>Short bio<textarea name="bio" rows={5} maxLength={1200} required defaultValue={p?.bio ?? ''} /></label>
        <div className="field-row">
          <label>Topic specialities<input name="topics" placeholder="Retention; marketplaces; AI search" defaultValue={(p?.topics ?? []).join('; ')} /><span className="hint">Up to 8, separated by semicolons. These are the filters people use to find you.</span></label>
          <label>Website<input name="website" type="url" defaultValue={p?.website ?? ''} /></label>
        </div>
        <fieldset className="photo-field"><legend>Photo</legend>
          <div className="photo-row">
            <SpeakerAvatar id={t.id} name={p?.name ?? t.name ?? 'Speaker'} image={stored ? `/api/speaker-photo/${t.id}?v=${Date.parse(p?.updatedAt ?? '') || 0}` : p?.image ?? null} size={112} />
            <div className="photo-controls">
              <label>Upload a photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><span className="hint">Square works best. We crop it to a circle. JPG, PNG or WebP, up to 5 MB.</span></label>
              <label className="check"><input type="checkbox" name="photoStyle" defaultChecked={(p?.photoStyle ?? 'guy') === 'guy'} /> Events Guy style (the photo in the site’s gold palette)</label>
              <label className="check"><input type="checkbox" name="photoConsent" defaultChecked={Boolean(p?.photoConsent)} /> {t.id === me.id ? 'Show my photo on my profile' : 'The speaker has agreed to their photo being shown'}</label>
              {stored && !p?.photoConsent && <p className="hint warn-hint">This photo isn’t showing publicly yet: tick the box above and save.</p>}
              {stored && <label className="check"><input type="checkbox" name="removePhoto" /> Remove this photo</label>}
              {!stored && <p className="hint">No photo yet. Upload one{p?.linkedin ? ', or use Fill from LinkedIn' : ''}. Until then the card shows an illustration.</p>}
            </div>
          </div>
          <label>Or a cartoon portrait link (optional)<input name="image" type="url" placeholder="https://…/portrait.png" defaultValue={p?.image && !isStoredPhoto(p.image, t.id) ? p.image : ''} /><span className="hint">Used when there’s no agreed photo.</span></label>
        </fieldset>
        <fieldset><legend>Open to</legend><div className="check-grid">{OPEN_TO.map(o => <label key={o} className="check"><input type="checkbox" name="openTo" value={o} defaultChecked={p?.openTo.includes(o)} /> {o}</label>)}</div></fieldset>
        <fieldset><legend>Events you’re speaking at (from the guide)</legend>
          <EventOptions id="ev-list" />
          <div className="event-picks">{[0, 1, 2, 3, 4].map(i => <input key={i} name="events" list="ev-list" placeholder="Start typing an event…" defaultValue={evs[i] ?? ''} />)}</div>
        </fieldset>
        {admin && <label className="check"><input type="checkbox" name="publish" defaultChecked={p?.status === 'published' || managed} /> Publish on the speakers page (no separate approval needed)</label>}
        <button className="btn btn-primary" type="submit">Save profile</button>
      </form>
    </div>
  );
}
