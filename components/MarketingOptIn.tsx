import Link from 'next/link';
import { formCopy } from '@/lib/forms';
/** Unticked opt-in for the roundup, plus the privacy line. Leaving it unticked means no marketing email.
 *  Wording: Admin → Emails & forms. */
export async function MarketingOptIn() {
  const c = await formCopy('optin');
  const [before, after] = c.privacy.split(/privacy policy/i);
  return (
    <>
      <label className="optin"><input type="checkbox" name="marketing" value="yes" /> <span>{c.label}</span></label>
      <p className="form-privacy">{after !== undefined ? <>{before}<Link href="/privacy">privacy policy</Link>{after}</> : c.privacy}</p>
    </>
  );
}
