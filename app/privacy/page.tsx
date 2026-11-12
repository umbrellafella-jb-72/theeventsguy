import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Fill } from '@/components/Fill';
import { OPERATOR } from '@/lib/legal';

export const metadata = { title: 'Privacy — The Events Guy' };

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Privacy" scene="containers" title="Your privacy"
        intro="What we collect, why, who we share it with and how to get it changed or deleted. Plain English, no surprises." />
      <div className="wrap section prose">
        <p className="muted">Last updated {OPERATOR.updated}.</p>

        <h2>Who we are</h2>
        <p>The Events Guy (theeventsguy.co.uk) is run by <Fill v={OPERATOR.name} />{OPERATOR.companyNo ? <>, company number {OPERATOR.companyNo}</> : null}, <Fill v={OPERATOR.address} />. We’re the data controller for the personal data described here, registered with the Information Commissioner’s Office under number <Fill v={OPERATOR.ico} />. Contact us about privacy at <Fill v={OPERATOR.email} />.</p>

        <h2>What we collect</h2>
        <ul>
          <li><b>Your account:</b> your email address, and your name if you add it. We use your email to send sign-in links — there are no passwords.</li>
          <li><b>Membership:</b> your Stripe customer reference and when your membership is paid up to. Stripe holds your card details; we never see or store them.</li>
          <li><b>What you save:</b> your shortlist, saved searches and email settings.</li>
          <li><b>Profiles you publish:</b> if you’re a speaker, sponsor or organiser, what you put in your profile or opportunity, including any LinkedIn link or portrait. These are public once approved (sponsor budgets and contact details are only shown to organisers and sponsors).</li>
          <li><b>Messages:</b> enquiries you send or receive through the site, and anything you send through the contact forms (Services, Sponsors and the awards finder, including your quiz answers). We keep these as a record so we can reply and follow up.</li>
          <li><b>Roundup consent:</b> if you tick the box for our monthly roundup, when and where you agreed — and when you unsubscribe.</li>
          <li><b>Reports:</b> if you report content, what you report and why.</li>
          <li><b>Technical data:</b> your IP address, used briefly to stop spam and abuse (for example, limiting sign-in requests), and the cookies listed on our <Link href="/cookies">cookies page</Link>.</li>
        </ul>
        <p>We don’t use advertising trackers, and we don’t buy or sell personal data.</p>

        <h2>Why we use it, and our legal basis</h2>
        <ul>
          <li><b>To provide your account and membership</b> (contract): signing you in, unlocking the guide, calendar feeds, reminders and billing.</li>
          <li><b>To send the emails you’ve asked for</b> (contract): reminders and new-event digests. You can switch them off in your account at any time.</li>
          <li><b>To run the portal</b> (contract, and our legitimate interest in a safe, well-moderated directory): publishing approved profiles, passing on enquiries without sharing your email address, and handling reports.</li>
          <li><b>To send the monthly roundup</b> (consent): only if you ticked the box. Every roundup has a one-click unsubscribe, and you can switch it off in your account.</li>
          <li><b>To reply to enquiries</b> (legitimate interests): we send you an acknowledgement and follow up on what you asked about.</li>
          <li><b>To keep the site secure</b> (legitimate interests): rate limits, fraud prevention and spam protection.</li>
          <li><b>To meet our legal obligations</b> (legal obligation): keeping payment and tax records.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>Only the service providers that run the site for us, under contracts that protect your data. They’re listed, with what each one does, on our <Link href="/data-processing">data processing page</Link>. We’d also share data if the law required it.</p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Your account and saved items: until you ask us to delete your account, or after two years without a sign-in.</li>
          <li>Payment records: six years, as UK tax law requires (held by Stripe and in our accounts).</li>
          <li>Enquiries and reports: for as long as the accounts involved exist, so conversations stay readable.</li>
          <li>Contact-form enquiries: two years from your last contact with us, unless you become a customer.</li>
          <li>Rate-limit counters: minutes to hours.</li>
        </ul>

        <h2>Your rights</h2>
        <p>Under UK GDPR you can ask to see the personal data we hold about you, have it corrected or deleted, restrict or object to how we use it, or take a copy to another service. Email <Fill v={OPERATOR.email} /> and we’ll reply within one month. You can change your email settings and close your membership yourself from <Link href="/account">your account</Link>.</p>
        <p>If you’re unhappy with how we’ve handled your data, you can complain to the Information Commissioner’s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">ico.org.uk</a>. We’d appreciate the chance to sort it out first.</p>

        <h2>Data outside the UK</h2>
        <p>Some of our providers are based in, or store data in, the United States or the EU. Where data leaves the UK, it’s protected by the UK’s adequacy regulations or the UK International Data Transfer Addendum to the EU standard contractual clauses.</p>

        <h2>Changes</h2>
        <p>If we change this policy in a way that matters, we’ll email members before the change takes effect.</p>
      </div>
    </>
  );
}
