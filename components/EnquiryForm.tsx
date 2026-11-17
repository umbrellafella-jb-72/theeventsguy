import { MarketingOptIn } from './MarketingOptIn';
import { formCopy, lines } from '@/lib/forms';

/** The Services and Sponsors enquiry form. Wording: Admin → Emails & forms. */
export async function EnquiryForm({ interest, sent, from }: { interest?: string; sent?: boolean; from: 'services' | 'sponsors' }) {
  const c = await formCopy(from);
  if (sent) return <div className="enquiry"><h2>{c.thanksHeading}</h2><p className="muted">{c.thanksText}</p></div>;
  const options = lines(c.interests);
  if (interest && !options.includes(interest)) options.unshift(interest);
  return (
    <form className="enquiry" action="/api/enquire" method="post">
      <div className="hp" aria-hidden="true"><label>Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label></div>
      <h2>{c.heading}</h2>
      {c.intro && <p className="muted">{c.intro}</p>}
      <input type="hidden" name="from" value={from} />
      <div className="field-row">
        <label htmlFor="enq-name">Name<input id="enq-name" name="name" required autoComplete="name" /></label>
        <label htmlFor="enq-email">Work email<input id="enq-email" name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="field-row">
        <label htmlFor="enq-company">Company<input id="enq-company" name="company" autoComplete="organization" /></label>
        <label htmlFor="enq-interest">Interested in
          <select id="enq-interest" name="interest" defaultValue={interest ?? options[0]}>{options.map(i => <option key={i}>{i}</option>)}</select>
        </label>
      </div>
      <label htmlFor="enq-msg">What do you need?<textarea id="enq-msg" name="message" rows={4} required /></label>
      <MarketingOptIn />
      <button className="btn btn-primary" type="submit">{c.button}</button>
    </form>
  );
}
