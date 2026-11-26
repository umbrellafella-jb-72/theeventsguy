import { recaptchaReady } from '@/lib/recaptcha';
import { TEMPLATES, SAMPLE_VARS, getTemplate, renderEvents, renderNotice, type TemplateKey } from '@/lib/templates';
import { FORMS, formCopy, type FormKey } from '@/lib/forms';
import { emailLog, emailReady } from '@/lib/email';
import { publicEmail } from '@/lib/alerts';
import { saveEmailTemplate, saveFormText, saveTestRecipients, sendTestEmail } from '@/app/portal/actions';
import { testSettings } from '@/lib/testmail';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const TAGS: Record<string, string> = {
  login: 'Sign-in link', welcome: 'Membership confirmation', paymentFailed: 'Payment failed', renewing: 'Renewal reminder', cancelling: 'Cancellation',
  ended: 'Membership ended', refunded: 'Refund', ack_services: 'Services auto-reply', ack_sponsors: 'Sponsors auto-reply', ack_awards: 'Awards auto-reply',
  message: 'Portal message', reminder: 'Event reminder', digest: 'New events', 'team-alert': 'Team alert', 'alert-services': 'Team alert: Services',
  'alert-sponsors': 'Team alert: Sponsors', 'alert-awards': 'Team alert: Awards', 'alert-speakerApply': 'Team alert: Speaker application', 'alert-sponsorProfile': 'Team alert: Sponsor profile', ack_speakerApply: 'Speaker application auto-reply', ack_sponsorProfile: 'Sponsor profile auto-reply',
};
const tagLabel = (t: string) => (t.startsWith('test:') ? `Test: ${TAGS[t.slice(5)] ?? t.slice(5)}` : TAGS[t] ?? t);

/** Resend's view of the sending domain, if the key is allowed to read it. */
async function domainStatus(): Promise<string | null> {
  if (!process.env.RESEND_API_KEY) return null;
  const from = (process.env.EMAIL_FROM || '').match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  try {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (r.status === 401 || r.status === 403) return 'The API key can only send, so we can’t check the domain from here. Check it in Resend → Domains.';
    if (!r.ok) return null;
    const j = await r.json() as { data?: { name: string; status: string }[] };
    const d = j.data?.find(x => x.name.toLowerCase() === from);
    if (!d) return from ? `${from} isn’t added in Resend. Add it under Resend → Domains and add its DNS records, or emails to anyone but you will be refused.` : null;
    return d.status === 'verified' ? `${d.name} is verified in Resend.` : `${d.name} is “${d.status}” in Resend. Emails only go out once it’s verified (check the DNS records in Resend → Domains).`;
  } catch { return null; }
}

export async function EmailsAdmin({ sp, adminEmail }: { sp: Record<string, string | undefined>; adminEmail: string }) {
  const [log, domain, tests] = await Promise.all([emailLog(), domainStatus(), testSettings()]);
  const whoGets = [tests.me && 'you', ...tests.extra, tests.team && process.env.ENQUIRIES_TO && 'the team inbox'].filter(Boolean) as string[];
  const failures = log.filter(l => !l.ok);
  const keys = Object.keys(TEMPLATES) as TemplateKey[];
  const groups = ['Account', 'Membership', 'Forms', 'Updates'] as const;
  const tpls = Object.fromEntries(await Promise.all(keys.map(async k => [k, await getTemplate(k)] as const))) as Record<TemplateKey, Awaited<ReturnType<typeof getTemplate>>>;
  const previews = Object.fromEntries(await Promise.all(keys.map(async k => [k, TEMPLATES[k].kind === 'events'
    ? await renderEvents(k as 'reminder' | 'digest', SAMPLE_VARS, { items: [{ name: 'Retail Expo (sample)', when: 'Tomorrow · 18 Nov 2026', where: 'ExCeL, London', url: '#' }], manageUrl: '#', unsubscribeUrl: '#' })
    : await renderNotice(k, SAMPLE_VARS, '#')] as const)));
  const formKeys = Object.keys(FORMS) as FormKey[];
  const forms = Object.fromEntries(await Promise.all(formKeys.map(async k => [k, await formCopy(k)] as const)));

  return (
    <div className="emails-admin">
      <section className="acc-card">
        <h2>Email sending</h2>
        <ul className="status-list">
          <li className={emailReady() ? 'ok' : 'bad'}>{emailReady() ? `Resend is set up. Emails go from ${process.env.EMAIL_FROM}.` : 'Email isn’t set up: add RESEND_API_KEY and EMAIL_FROM in Vercel → Settings → Environment Variables, then redeploy.'}</li>
          {domain && <li className={/verified/.test(domain) && !/isn’t|only go out/.test(domain) ? 'ok' : 'warn'}>{domain}</li>}
          <li className={process.env.ENQUIRIES_TO ? 'ok' : 'warn'}>{process.env.ENQUIRIES_TO ? 'Team alerts: an inbox is set (ENQUIRIES_TO). It’s never shown on the site.' : 'Team alerts: ENQUIRIES_TO isn’t set, so form alerts go to the public address.'}</li>
          <li className="ok">Replies from customers go to {publicEmail()} (PUBLIC_EMAIL).</li>
          <li className={recaptchaReady() ? 'ok' : 'warn'}>{recaptchaReady() ? 'reCAPTCHA is protecting the speaker and sponsor application forms.' : 'reCAPTCHA isn’t set up: add NEXT_PUBLIC_RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY in Vercel. Until then the application forms rely on a hidden spam trap and rate limits.'}</li>
          <li className={failures.length ? 'bad' : 'ok'}>{failures.length ? `${failures.length} of the last ${log.length} emails failed. The most recent reason: ${failures[0].error}` : log.length ? `The last ${log.length} emails all went out.` : 'Nothing sent yet.'}</li>
        </ul>
      </section>

      <section className="acc-card" id="test-recipients">
        <h2>Who gets test emails</h2>
        <p className="muted">Every <b>Send a test</b> button below sends to everyone ticked or listed here.</p>
        {sp.recipients === 'saved' && <p className="note banner" role="status">Saved.</p>}
        {sp.recipients === 'bad' && <p className="note banner" role="alert">Saved, but these weren’t valid email addresses and were left out: {sp.badlist}</p>}
        <form action={saveTestRecipients} className="pform">
          <label className="check"><input type="checkbox" name="me" defaultChecked={tests.me} /> Me ({adminEmail})</label>
          <label className="check"><input type="checkbox" name="team" defaultChecked={tests.team} disabled={!process.env.ENQUIRIES_TO} /> The team alert inbox (ENQUIRIES_TO){process.env.ENQUIRIES_TO ? '' : ' — not set up yet'}. The address isn’t shown here.</label>
          <label>Other addresses<textarea name="emails" rows={3} defaultValue={tests.extra.join('\n')} placeholder={'dylan@example.com\nalan@example.com'} /><span className="hint">One per line, or separated by commas. Up to 10. Anyone listed here is visible to other admins.</span></label>
          <button className="btn btn-primary btn-sm" type="submit">Save recipients</button>
        </form>
      </section>

      {sp.test && <p className="note banner" role="status">{sp.test === 'sent' ? `Test sent to ${sp.of === '1' ? '1 address' : `${sp.of} addresses`}. Check inboxes (and spam).` : sp.test === 'some' ? `Test sent to ${sp.n} of ${sp.of} addresses. The reasons for the others are in Recent emails below.` : sp.test === 'busy' ? 'Too many test emails in the last hour.' : sp.test === 'demo' ? 'Demo accounts can’t receive email. Add addresses under “Who gets test emails”, or sign in with your own account.' : sp.test === 'none' ? 'No one to send to: tick “Me” or add addresses under “Who gets test emails”.' : 'The test didn’t go out. The reason is in Recent emails below.'}</p>}

      <h2 className="admin-sub">Recent emails</h2>
      {log.length === 0 ? <p className="muted">No emails recorded yet.</p> : (
        <div className="table-wrap"><table className="mail-log">
          <thead><tr><th>When</th><th>Email</th><th>To</th><th>Result</th></tr></thead>
          <tbody>{log.slice(0, 40).map((l, i) => (
            <tr key={i} className={l.ok ? '' : 'is-bad'}><td>{when(l.at)}</td><td>{tagLabel(l.tag)}<div className="muted small">{l.subject}</div></td><td>{l.to}</td><td>{l.ok ? 'Sent' : <span>Failed<div className="small">{l.error}</div></span>}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      <h2 className="admin-sub">Email wording</h2>
      <p className="muted">Edit what each email says. Words in {'{curly brackets}'} are filled in when it’s sent. Links and buttons are added by the site. Blank lines start a new paragraph. <b>Reset</b> puts back the original wording.</p>
      {groups.map(g => (
        <section key={g} className="tpl-group"><h3>{g}</h3>
          {keys.filter(k => TEMPLATES[k].group === g).map(k => {
            const d = TEMPLATES[k], t = tpls[k], open = sp.saved === k || sp.key === k;
            return (
              <details key={k} id={`tpl-${k}`} className="tpl" open={open}>
                <summary><b>{d.label}</b>{t.edited && <span className="badge badge-glen">Edited</span>}<span className="muted"> · {d.when}</span></summary>
                {sp.saved === k && <p className="note banner" role="status">{sp.reset ? 'Back to the original wording.' : 'Saved. New emails use this wording now.'}</p>}
                <div className="tpl-body">
                  <form action={saveEmailTemplate} className="pform">
                    <input type="hidden" name="key" value={k} />
                    <label>Subject<input name="subject" defaultValue={t.subject} maxLength={200} required /></label>
                    <label>Heading<input name="heading" defaultValue={t.heading} maxLength={200} required /></label>
                    <label>Message<textarea name="body" rows={7} defaultValue={t.body} maxLength={4000} required /></label>
                    {d.button !== undefined && <label>Button<input name="button" defaultValue={t.button ?? ''} maxLength={80} /></label>}
                    {d.footer !== undefined && <label>Footer line<input name="footer" defaultValue={t.footer ?? ''} maxLength={300} /></label>}
                    {Object.keys(d.vars).length > 0 && <p className="hint">You can use: {Object.entries(d.vars).map(([v, why], i) => <span key={v}>{i ? ' · ' : ''}<code>{`{${v}}`}</code> {why}</span>)}</p>}
                    <div className="tpl-actions">
                      <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      {t.edited && <button className="btn btn-ghost btn-sm" type="submit" name="reset" value="1" formNoValidate>Reset to original</button>}
                    </div>
                  </form>
                  <div className="tpl-preview">
                    <div className="label">Preview (sample details)</div>
                    <div className="small"><b>Subject:</b> {previews[k].subject}</div>
                    <div className="mail-preview" dangerouslySetInnerHTML={{ __html: previews[k].html }} />
                    <form action={sendTestEmail}><input type="hidden" name="key" value={k} /><button className="btn btn-secondary btn-sm" type="submit">Send a test</button><span className="hint"> to {whoGets.length ? whoGets.join(', ') : 'no one yet'}</span></form>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      ))}

      <h2 className="admin-sub">Form wording</h2>
      <p className="muted">The words on the site’s forms. Changes show on the site straight away.</p>
      {formKeys.map(k => {
        const d = FORMS[k], c = forms[k];
        return (
          <details key={k} id={`form-${k}`} className="tpl" open={sp.form === k}>
            <summary><b>{d.label}</b>{c.edited && <span className="badge badge-glen">Edited</span>}<span className="muted"> · {d.where}</span></summary>
            {sp.form === k && <p className="note banner" role="status">{sp.reset ? 'Back to the original wording.' : 'Saved.'}</p>}
            <form action={saveFormText} className="pform">
              <input type="hidden" name="key" value={k} />
              {Object.entries(d.fields).map(([f, fd]) => (
                <label key={f}>{fd.label}{fd.long ? <textarea name={f} rows={f === 'interests' ? 7 : 3} defaultValue={c[f]} /> : <input name={f} defaultValue={c[f]} />}{fd.hint && <span className="hint">{fd.hint}</span>}</label>
              ))}
              <div className="tpl-actions">
                <button className="btn btn-primary btn-sm" type="submit">Save</button>
                {c.edited && <button className="btn btn-ghost btn-sm" type="submit" name="reset" value="1" formNoValidate>Reset to original</button>}
              </div>
            </form>
          </details>
        );
      })}
    </div>
  );
}
