import Link from 'next/link';
import { needPermission } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { allOpps, getOpp } from '@/lib/portal';
import { eventById, eventLabel } from '@/lib/data';
import { deleteOpportunity, saveOpportunity } from '../actions';
import { EventOptions, SectorChecks, StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My sponsorship opportunities — The Events Guy' };

export default async function OppManager({ searchParams }: { searchParams: Promise<{ edit?: string; saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const me = await needPermission('/portal/opportunities', 'opportunity.post');
  const mine = (await allOpps()).filter(o => o.ownerId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const editing = sp.edit && sp.edit !== 'new' ? await getOpp(sp.edit) : null;
  const canEdit = editing && (editing.ownerId === me.id || can(me, 'content.moderate'));
  const o = canEdit ? editing : null;
  const showForm = sp.edit === 'new' || Boolean(o);
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href="/account">My account</Link> / Sponsorship opportunities</p>
      <h1 className="page-title">Sponsorship opportunities</h1>
      <p className="muted" style={{ maxWidth: '65ch' }}>Post what you’re offering sponsors. Everyone sees the title, event and summary; budgets, packages and your contact details are only shown to signed-in sponsors and organisers. New posts go live once an admin approves them.</p>
      {sp.saved && <p className="note banner">Saved. {can(me, 'content.moderate') ? '' : 'It’s waiting for approval.'} <Link href={`/opportunities/${sp.saved}`}>View it</Link></p>}
      {sp.deleted && <p className="note banner">Deleted.</p>}
      {!showForm && <p><Link className="btn btn-primary" href="/portal/opportunities?edit=new">Post an opportunity</Link></p>}
      {showForm && (
        <form action={saveOpportunity} className="pform">
          <h2>{o ? 'Edit opportunity' : 'New opportunity'}</h2>
          {o && <input type="hidden" name="id" value={o.id} />}
          <label>Title<input name="title" required maxLength={120} defaultValue={o?.title ?? ''} placeholder="Headline sponsor, Retail Supper Club, March" /></label>
          <EventOptions id="opp-ev" />
          <label>Event in the guide (optional)<input name="eventId" list="opp-ev" placeholder="Start typing an event…" defaultValue={o?.eventId && eventById.get(o.eventId) ? eventLabel(eventById.get(o.eventId)!) : ''} /></label>
          <div className="field-row">
            <label>Or event name<input name="eventName" maxLength={120} defaultValue={o && !o.eventId ? o.eventName ?? '' : ''} /></label>
            <label>When<input name="when" maxLength={80} defaultValue={o && !o.eventId ? o.when ?? '' : ''} placeholder="Tue 2 Mar 2027" /></label>
            <label>City<input name="city" maxLength={80} defaultValue={o && !o.eventId ? o.city ?? '' : ''} /></label>
          </div>
          <label>Summary (public)<textarea name="summary" rows={3} maxLength={600} required defaultValue={o?.summary ?? ''} /></label>
          <label>Audience (public)<input name="audience" maxLength={300} defaultValue={o?.audience ?? ''} placeholder="40 heads of ecommerce from UK retailers" /></label>
          <div className="field-row"><label>Reply by<input name="deadline" type="date" defaultValue={o?.deadline ?? ''} /></label></div>
          <fieldset><legend>Sectors</legend><SectorChecks name="sectors" selected={o?.sectors ?? []} /></fieldset>
          <fieldset className="private"><legend>Private — signed-in sponsors and organisers only</legend>
            <label>Packages on offer<textarea name="packages" rows={4} maxLength={2000} defaultValue={o?.packages ?? ''} placeholder="Headline: …  Drinks: …  Lanyards: …" /></label>
            <div className="field-row">
              <label>Budget / price range<input name="budget" maxLength={120} defaultValue={o?.budget ?? ''} placeholder="£1,500–£6,000 + VAT" /></label>
              <label>Contact route<input name="contact" maxLength={200} defaultValue={o?.contact ?? ''} placeholder="Ask via The Events Guy, or partnerships@…" /></label>
            </div>
          </fieldset>
          <div className="ev-actions"><button className="btn btn-primary" type="submit">Save</button><Link className="btn btn-ghost" href="/portal/opportunities">Cancel</Link></div>
        </form>
      )}
      <h2 className="sub-title">Yours</h2>
      {mine.length === 0 ? <p className="muted">Nothing posted yet.</p> : (
        <div className="plist">{mine.map(x => (
          <div key={x.id} className="prow">
            <div><b>{x.title}</b><span className="muted"> · {x.eventName ?? 'No event'}{x.when ? ` · ${x.when}` : ''}</span></div>
            <div className="prow-actions"><StatusBadge status={x.status} />
              <Link className="btn btn-ghost btn-sm" href={`/opportunities/${x.id}`}>View</Link>
              <Link className="btn btn-secondary btn-sm" href={`/portal/opportunities?edit=${x.id}`}>Edit</Link>
              <form action={deleteOpportunity}><input type="hidden" name="id" value={x.id} /><button className="btn btn-ghost btn-sm" type="submit">Delete</button></form>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
