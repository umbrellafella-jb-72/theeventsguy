// The public application forms: speakers "Apply to be listed" and sponsors "Request a sponsor
// profile". Wording: Admin → Emails & forms. Bot protection: reCAPTCHA v3 (ProtectedForm), a hidden
// honeypot field and rate limits.
import { ProtectedForm } from './ProtectedForm';
import { MarketingOptIn } from '../MarketingOptIn';
import { formCopy } from '@/lib/forms';
import { recaptchaSiteKey } from '@/lib/recaptcha';
import { OPEN_TO, SECTOR_OPTIONS } from '@/lib/portal';

const ERRORS: Record<string, string> = {
  missing: 'Please fill in the fields marked as required.',
  linkedin: 'That LinkedIn link doesn’t look right. It should look like linkedin.com/in/your-name.',
  captcha: 'We couldn’t confirm you’re not a bot. Please try again; if it keeps happening, email us instead.',
  busy: 'Too many applications from your connection in the last hour. Please try again later.',
};
const Honeypot = () => <div className="hp" aria-hidden="true"><label>Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label></div>;
const Req = () => <span className="req" aria-hidden="true"> *</span>;

function Result({ applied, error, copy }: { applied?: boolean; error?: string; copy: Record<string, string> }) {
  if (applied) return <div className="apply-done" role="status"><h2>{copy.thanksHeading}</h2><p className="muted">{copy.thanksText}</p></div>;
  return error && ERRORS[error] ? <p className="note banner" role="alert" id="apply-error">{ERRORS[error]}</p> : null;
}

export async function SpeakerApplyForm({ applied, error }: { applied?: boolean; error?: string }) {
  const c = await formCopy('speakerApply');
  if (applied) return <Result applied copy={c} />;
  const err = error && ERRORS[error] ? 'apply-error' : undefined;
  return (
    <ProtectedForm siteKey={recaptchaSiteKey()} action="speaker_apply" className="enquiry apply-form" id="apply-form">
      <h2>{c.heading}</h2>
      {c.intro && <p className="muted">{c.intro}</p>}
      <Result error={error} copy={c} />
      <p className="muted small">Fields marked * are required.</p>
      <input type="hidden" name="kind" value="speaker" />
      <Honeypot />
      <div className="field-row">
        <label htmlFor="sa-name">Your name<Req /><input id="sa-name" name="name" required autoComplete="name" aria-describedby={err} /></label>
        <label htmlFor="sa-email">Email<Req /><input id="sa-email" name="email" type="email" required autoComplete="email" aria-describedby={err} /><span className="hint">Never shown on the site. Sign in with it later to edit your profile.</span></label>
      </div>
      <div className="field-row">
        <label htmlFor="sa-headline">Job title<input id="sa-headline" name="headline" maxLength={120} autoComplete="organization-title" placeholder="Head of Ecommerce" /></label>
        <label htmlFor="sa-company">Company<input id="sa-company" name="company" maxLength={120} autoComplete="organization" /></label>
      </div>
      <label htmlFor="sa-li">LinkedIn profile<Req /><input id="sa-li" name="linkedin" type="text" inputMode="url" required placeholder="linkedin.com/in/your-name" aria-describedby={err} /><span className="hint">We use your public profile to fill in your listing and photo. Your photo only goes live with your OK.</span></label>
      <label htmlFor="sa-topics">What you speak about<Req /><input id="sa-topics" name="topics" required maxLength={400} placeholder="Retention; marketplaces; AI in customer service" aria-describedby={err} /><span className="hint">Separate topics with commas or semicolons.</span></label>
      <label htmlFor="sa-events">Events you’re speaking at (optional)<input id="sa-events" name="events" maxLength={600} placeholder="Retail Expo 2027, Shoptalk Europe…" /></label>
      <label htmlFor="sa-bio">Short bio (optional)<textarea id="sa-bio" name="bio" rows={4} maxLength={1200} /></label>
      <fieldset className="check-grid-wrap"><legend>Open to (optional)</legend><div className="check-grid">{OPEN_TO.map(o => <label key={o} className="check"><input type="checkbox" name="openTo" value={o} /> {o}</label>)}</div></fieldset>
      <MarketingOptIn />
      <button className="btn btn-primary" type="submit">{c.button}</button>
    </ProtectedForm>
  );
}

export async function SponsorProfileForm({ applied, error }: { applied?: boolean; error?: string }) {
  const c = await formCopy('sponsorProfile');
  if (applied) return <Result applied copy={c} />;
  const err = error && ERRORS[error] ? 'apply-error' : undefined;
  return (
    <ProtectedForm siteKey={recaptchaSiteKey()} action="sponsor_profile" className="enquiry apply-form" id="sponsor-form">
      <h2>{c.heading}</h2>
      {c.intro && <p className="muted">{c.intro}</p>}
      <Result error={error} copy={c} />
      <p className="muted small">Fields marked * are required.</p>
      <input type="hidden" name="kind" value="sponsor" />
      <Honeypot />
      <div className="field-row">
        <label htmlFor="sp-company">Company<Req /><input id="sp-company" name="company" required maxLength={160} autoComplete="organization" aria-describedby={err} /></label>
        <label htmlFor="sp-web">Website<input id="sp-web" name="website" type="text" inputMode="url" maxLength={300} placeholder="yourbrand.co.uk" /></label>
      </div>
      <div className="field-row">
        <label htmlFor="sp-name">Your name<Req /><input id="sp-name" name="name" required autoComplete="name" aria-describedby={err} /></label>
        <label htmlFor="sp-email">Work email<Req /><input id="sp-email" name="email" type="email" required autoComplete="email" aria-describedby={err} /><span className="hint">Never shown on the site. Sign in with it later to edit your profile.</span></label>
      </div>
      <label htmlFor="sp-about">About your brand<Req /><textarea id="sp-about" name="about" rows={4} required maxLength={1200} aria-describedby={err} /><span className="hint">Shown on your public profile once approved.</span></label>
      <label htmlFor="sp-int">What you want to sponsor<input id="sp-int" name="interests" maxLength={400} placeholder="Retailer dinners; awards categories; AI meetups" /></label>
      <fieldset className="check-grid-wrap"><legend>Sectors you target</legend><div className="check-grid">{SECTOR_OPTIONS.map(s => <label key={s} className="check"><input type="checkbox" name="sectors" value={s} /> {s}</label>)}</div></fieldset>
      <label htmlFor="sp-budget">Typical budget per event (optional)<input id="sp-budget" name="budget" maxLength={120} placeholder="£2k–£10k" /><span className="hint">Private: only signed-in organisers and our team see it.</span></label>
      <MarketingOptIn />
      <button className="btn btn-primary" type="submit">{c.button}</button>
    </ProtectedForm>
  );
}
