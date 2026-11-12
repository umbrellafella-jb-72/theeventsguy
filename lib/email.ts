// Sends email through Resend. Without RESEND_API_KEY and EMAIL_FROM it logs instead, so
// development and previews never send real mail.
export const emailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string; unsubscribeUrl?: string; replyTo?: string }): Promise<boolean> {
  if (!emailReady()) { console.log(`[email] not configured — would send "${msg.subject}" to ${msg.to}\n${msg.text}`); return false; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM, to: msg.to, reply_to: msg.replyTo, subject: msg.subject, text: msg.text, html: msg.html,
      headers: msg.unsubscribeUrl ? { 'List-Unsubscribe': `<${msg.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined,
    }),
  });
  if (!res.ok) console.error(`[email] Resend ${res.status} for ${msg.to}`);
  return res.ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** A plain, brand-coloured email around a list of events. */
export function eventsEmail(o: { heading: string; intro: string; items: { name: string; when: string; where: string; url: string }[]; footer: string; manageUrl: string; unsubscribeUrl: string }) {
  const text = [o.heading, '', o.intro, '', ...o.items.map(i => `• ${i.name}\n  ${i.when} · ${i.where}\n  ${i.url}`), '', o.footer,
    `Email settings: ${o.manageUrl}`, `Unsubscribe: ${o.unsubscribeUrl}`].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#121a1c">
  <div style="background:#17262b;color:#edeeea;padding:20px 24px;border-top:4px solid #c9992e"><b style="font-size:13px;letter-spacing:.1em">THE EVENTS GUY</b>
  <h1 style="margin:8px 0 0;font-size:24px;text-transform:uppercase">${esc(o.heading)}</h1></div>
  <div style="padding:20px 24px;background:#fafaf7"><p style="margin:0 0 16px;line-height:1.5">${esc(o.intro)}</p>
  ${o.items.map(i => `<div style="border:1px solid #d2d5cf;border-left:4px solid #0a6449;padding:12px 14px;margin:0 0 10px;background:#fff">
    <a href="${esc(i.url)}" style="color:#0a6449;font-weight:bold;font-size:17px;text-decoration:none">${esc(i.name)}</a>
    <div style="color:#4f5a5b;font-size:14px;margin-top:4px">${esc(i.when)} · ${esc(i.where)}</div></div>`).join('')}
  <p style="color:#4f5a5b;font-size:13px;line-height:1.5;margin:16px 0 0">${esc(o.footer)}<br>
  <a href="${esc(o.manageUrl)}" style="color:#0a6449">Email settings</a> · <a href="${esc(o.unsubscribeUrl)}" style="color:#0a6449">Unsubscribe</a></p></div></div>`;
  return { text, html };
}

/** A short branded email: heading, paragraphs, optional button. For auto-replies and membership emails. */
export function noticeEmail(o: { heading: string; paras: string[]; button?: { label: string; url: string }; footer?: string }) {
  const text = [o.heading, '', ...o.paras.flatMap(p => [p, '']), o.button ? `${o.button.label}: ${o.button.url}\n` : '', o.footer ?? 'The Events Guy · theeventsguy.co.uk'].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#121a1c">
  <div style="background:#17262b;color:#edeeea;padding:20px 24px;border-top:4px solid #c9992e"><b style="font-size:13px;letter-spacing:.1em">THE EVENTS GUY</b>
  <h1 style="margin:8px 0 0;font-size:22px;text-transform:uppercase">${esc(o.heading)}</h1></div>
  <div style="padding:20px 24px;background:#fafaf7">${o.paras.map(p => `<p style="margin:0 0 14px;line-height:1.55">${esc(p)}</p>`).join('')}
  ${o.button ? `<p style="margin:18px 0"><a href="${esc(o.button.url)}" style="background:#0a6449;color:#fff;padding:12px 18px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block">${esc(o.button.label)}</a></p>` : ''}
  <p style="color:#4f5a5b;font-size:13px;line-height:1.5;margin:16px 0 0">${esc(o.footer ?? 'The Events Guy · theeventsguy.co.uk')}</p></div></div>`;
  return { text, html };
}
