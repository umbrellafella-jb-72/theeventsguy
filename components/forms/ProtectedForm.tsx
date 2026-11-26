'use client';
// A form protected by reCAPTCHA v3. Google's script is only loaded once someone starts using the
// form (nothing from Google loads on a plain page view). On submit we fetch a token, put it in a
// hidden field and send the form as normal. Without a site key it's an ordinary form.
import { useRef, type ReactNode } from 'react';

declare global { interface Window { grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, o: { action: string }) => Promise<string> } } }

let loading: Promise<void> | null = null;
function load(siteKey: string) {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true; s.onload = () => window.grecaptcha!.ready(() => resolve()); s.onerror = () => { loading = null; reject(new Error('reCAPTCHA failed to load')); };
    document.head.appendChild(s);
  });
  return loading;
}

export function ProtectedForm({ siteKey, action, className, children, id }: { siteKey: string; action: string; className?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const sending = useRef(false);
  const warm = () => { if (siteKey) load(siteKey).catch(() => {}); };
  return (
    <form ref={ref} id={id} className={className} action="/api/apply" method="post" onFocus={warm} onPointerDown={warm}
      onSubmit={async e => {
        if (!siteKey) return; // plain form
        e.preventDefault();
        if (sending.current) return; sending.current = true;
        const f = ref.current!; const btn = f.querySelector<HTMLButtonElement>('button[type=submit]');
        if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent || ''; btn.textContent = 'Sending…'; }
        // Never leave someone stuck on "Sending…": if Google hasn't answered in 8 seconds (blocked by
        // an ad blocker, or the key isn't set up for this domain) send anyway and let the server decide.
        const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('reCAPTCHA timed out')), 8000));
        try {
          const token = await Promise.race([load(siteKey).then(() => window.grecaptcha!.execute(siteKey, { action })), timeout]);
          (f.elements.namedItem('captcha') as HTMLInputElement).value = token;
        } catch (err) { (f.elements.namedItem('captcha_error') as HTMLInputElement).value = String((err as Error)?.message || err).slice(0, 200); }
        HTMLFormElement.prototype.submit.call(f);
      }}>
      <input type="hidden" name="captcha" defaultValue="" />
      <input type="hidden" name="captcha_error" defaultValue="" />
      {children}
      {siteKey && <p className="form-privacy recaptcha-note">This form is protected by reCAPTCHA, and Google’s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy<span className="sr-only"> (opens in a new tab)</span></a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service<span className="sr-only"> (opens in a new tab)</span></a> apply.</p>}
    </form>
  );
}
