// Google reCAPTCHA v3 for the public application forms (invisible: no puzzle, it scores the
// visit). Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY in Vercel to switch it on;
// without them the forms still work, protected by the hidden honeypot field and rate limits.
export const recaptchaSiteKey = () => process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
export const recaptchaReady = () => Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY);
const minScore = () => { const n = Number(process.env.RECAPTCHA_MIN_SCORE); return n > 0 && n <= 1 ? n : 0.5; };

export type CaptchaResult = { ok: boolean; skipped?: boolean; score?: number; reason?: string };

/** Check a token with Google. Fails closed when reCAPTCHA is set up and Google can't be reached. */
export async function verifyRecaptcha(token: string, action: string, ip?: string): Promise<CaptchaResult> {
  if (!recaptchaReady()) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'no token' };
  try {
    const body = new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) });
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const j = await r.json() as { success: boolean; score?: number; action?: string; 'error-codes'?: string[] };
    if (!j.success) return { ok: false, reason: (j['error-codes'] || []).join(',') || 'rejected' };
    if (j.action && j.action !== action) return { ok: false, score: j.score, reason: 'wrong action' };
    if (typeof j.score === 'number' && j.score < minScore()) return { ok: false, score: j.score, reason: 'low score' };
    return { ok: true, score: j.score };
  } catch { return { ok: false, reason: 'couldn’t reach Google' }; }
}
