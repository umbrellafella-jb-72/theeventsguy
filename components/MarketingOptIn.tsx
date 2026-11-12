import Link from 'next/link';
/** Unticked opt-in for the monthly roundup, plus the privacy line. Leaving it unticked means no marketing email. */
export function MarketingOptIn() {
  return (
    <>
      <label className="optin"><input type="checkbox" name="marketing" value="yes" /> <span>Send me The Events Guy’s monthly roundup of new events and awards. Unsubscribe any time.</span></label>
      <p className="form-privacy">We’ll use your details to reply to this message. See our <Link href="/privacy">privacy policy</Link>.</p>
    </>
  );
}
