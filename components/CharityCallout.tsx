import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHARITY } from '@/lib/charity';

function logoFile(): string | null {
  for (const ext of ['.svg', '.png', '.webp', '.jpg']) {
    const p = CHARITY.logo.replace(/\.\w+$/, ext);
    if (existsSync(join(process.cwd(), 'public', p))) return p;
  }
  return null;
}

export function CharityLogo() {
  const src = logoFile();
  return (
    <a className="charity-logo" href={CHARITY.url} target="_blank" rel="noopener noreferrer">
      {src
        ? <img src={src} alt={CHARITY.name} />
        : <span className="charity-name">{CHARITY.name}</span>}
    </a>
  );
}

export function CharityCallout() {
  return (
    <section className="charity" aria-labelledby="charity-title">
      <div className="wrap charity-inner">
        <div className="charity-share" aria-hidden="true">{CHARITY.share}</div>
        <div className="charity-text">
          <h2 id="charity-title">Half of every subscription goes to {CHARITY.name}</h2>
          <p>{CHARITY.blurb}</p>
          <p className="charity-small">Registered charity no. {CHARITY.number} · <a href={CHARITY.url} target="_blank" rel="noopener noreferrer">forgetmenotchild.co.uk</a></p>
        </div>
        <CharityLogo />
      </div>
    </section>
  );
}
