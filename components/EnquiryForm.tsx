import { INTERESTS } from '@/lib/offers';

export function EnquiryForm({ interest, sent, from }: { interest?: string; sent?: boolean; from: string }) {
  if (sent) return <div className="enquiry"><h2>Thanks — we have your message</h2><p className="muted">We will reply by email, usually within a couple of working days.</p></div>;
  return (
    <form className="enquiry" action="/api/enquire" method="post">
      <h2>Get in touch</h2>
      <input type="hidden" name="from" value={from} />
      <div className="field-row">
        <label htmlFor="enq-name">Name<input id="enq-name" name="name" required autoComplete="name" /></label>
        <label htmlFor="enq-email">Work email<input id="enq-email" name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="field-row">
        <label htmlFor="enq-company">Company<input id="enq-company" name="company" autoComplete="organization" /></label>
        <label htmlFor="enq-interest">Interested in
          <select id="enq-interest" name="interest" defaultValue={interest ?? INTERESTS[0]}>{INTERESTS.map(i => <option key={i}>{i}</option>)}</select>
        </label>
      </div>
      <label htmlFor="enq-msg">What do you need?<textarea id="enq-msg" name="message" rows={4} required /></label>
      <button className="btn btn-primary" type="submit">Send enquiry</button>
    </form>
  );
}
