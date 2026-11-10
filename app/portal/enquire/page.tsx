import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { getOpp, getSpeaker, getSponsor } from '@/lib/portal';
import { sendEnquiry } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Send an enquiry — The Events Guy' };

export default async function Enquire({ searchParams }: { searchParams: Promise<{ type?: string; id?: string; error?: string }> }) {
  const sp = await searchParams;
  const type = (sp.type ?? '') as 'speaker' | 'sponsor' | 'opportunity', id = sp.id ?? '';
  const { me } = await pageUser(`/portal/enquire?type=${type}&id=${id}`);
  const label = type === 'speaker' ? (await getSpeaker(id))?.name : type === 'sponsor' ? (await getSponsor(id))?.company : type === 'opportunity' ? (await getOpp(id))?.title : null;
  const allowed = can(me, 'enquiry.send') && (type === 'speaker' ? can(me, 'directory.speakers') : type === 'sponsor' ? can(me, 'directory.sponsors') : can(me, 'opportunity.seeDetails'));
  const needs = type === 'opportunity' ? 'Sponsor or Organiser' : 'Organiser';
  return (
    <div className="wrap section portal">
      <h1 className="page-title">Send an enquiry</h1>
      {!label ? <p className="note">That profile or opportunity isn’t available.</p> : !allowed ? (
        <div className="lock-panel"><h2>Enquiries to {label} need the {needs} role</h2><p>Switch it on in your account — it’s free.</p><Link className="btn btn-primary" href="/account#roles">Go to my roles</Link></div>
      ) : (
        <form action={sendEnquiry} className="pform">
          {sp.error && <p className="note">{sp.error === 'slow' ? 'You’ve sent a lot of enquiries today. Please try again tomorrow.' : 'Add a message and try again.'}</p>}
          <p>To: <b>{label}</b>. They’ll get an email to say you’ve been in touch and can reply here. Your email address isn’t shared.</p>
          <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
          <label>Subject<input name="subject" maxLength={140} defaultValue={`About: ${label}`} /></label>
          <label>Message<textarea name="message" rows={6} required maxLength={3000} /></label>
          <button className="btn btn-primary" type="submit">Send enquiry</button>
        </form>
      )}
    </div>
  );
}
