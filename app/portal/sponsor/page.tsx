import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { getSponsor } from '@/lib/portal';
import { saveSponsorProfile } from '../actions';
import { SectorChecks, StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My sponsor profile — The Events Guy' };

export default async function SponsorEditor({ searchParams }: { searchParams: Promise<{ saved?: string; as?: string }> }) {
  const sp = await searchParams;
  const { me, t } = await pageUser('/portal/sponsor', sp.as);
  if (!can(t, 'sponsorProfile.publish') && !can(me, 'content.moderate')) {
    return <div className="wrap section"><h1 className="page-title">Sponsor profile</h1><div className="lock-panel"><h2>Add the Sponsor role first</h2><p>Sponsor profiles are free. Switch on the Sponsor role in your account, then come back here.</p><Link className="btn btn-primary" href="/account#roles">Go to my roles</Link></div></div>;
  }
  const p = await getSponsor(t.id);
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href={t.id === me.id ? '/account' : '/admin?tab=users'}>{t.id === me.id ? 'My account' : 'Admin'}</Link> / Sponsor profile</p>
      <h1 className="page-title">{t.id === me.id ? 'My sponsor profile' : `Sponsor profile: ${t.email}`}</h1>
      <div className="portal-status">{p ? <StatusBadge status={p.status} /> : <span className="badge">Not published yet</span>}
        <span className="muted">Public: company, about, sectors and what you want to sponsor. Budget and contact name are only shown to signed-in organisers and admins.</span></div>
      {sp.saved && <p className="note banner">{t.id === me.id && p?.status === 'pending' ? 'Saved — it goes live once an admin approves it.' : 'Saved.'}</p>}
      <form action={saveSponsorProfile} className="pform">
        {t.id !== me.id && <input type="hidden" name="as" value={t.id} />}
        <div className="field-row">
          <label>Company<input name="company" required maxLength={120} defaultValue={p?.company ?? ''} /></label>
          <label>Website<input name="website" type="url" defaultValue={p?.website ?? ''} /></label>
        </div>
        <label>About<textarea name="about" rows={4} maxLength={1200} required defaultValue={p?.about ?? ''} placeholder="Who you are, who you want to reach" /></label>
        <label>What you want to sponsor<input name="interests" placeholder="Retailer dinners; awards categories; AI meetups" defaultValue={(p?.interests ?? []).join('; ')} /></label>
        <fieldset><legend>Sectors you target</legend><SectorChecks name="sectors" selected={p?.sectors ?? []} /></fieldset>
        <fieldset className="private"><legend>Private — organisers and admins only</legend>
          <div className="field-row">
            <label>Typical budget<input name="budget" maxLength={120} placeholder="£2k–£10k per event" defaultValue={p?.budget ?? ''} /></label>
            <label>Contact name<input name="contactName" maxLength={120} defaultValue={p?.contactName ?? ''} /></label>
          </div>
          <p className="muted">Organisers contact you through The Events Guy; your email address isn’t shown to anyone.</p>
        </fieldset>
        <button className="btn btn-primary" type="submit">Save profile</button>
      </form>
    </div>
  );
}
