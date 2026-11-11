// A speaker's portrait in The Events Guy's style: a round, gold-backed cartoon with a dark ring.
// With a cartoon image (Image column on the sheet, or the speaker's own profile) we show that;
// until then, an illustrated placeholder — a speaker silhouette at the mic. The placeholder is
// deliberately not a likeness: it never guesses anyone's appearance.

const BACKS = [
  ['#f4b24c', '#e08f2c'], // the Guy's amber
  ['#f2c45a', '#d9982a'], // gold
  ['#eea65a', '#d2742f'], // copper
  ['#e9b86a', '#c98a3a'], // sand
];

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

/** Hair outlines drawn behind the head; the variant only changes the silhouette's hair line. */
const HAIR = [
  'M68 78c0-26 14-42 32-42s32 16 32 42c-4-12-14-20-32-20s-28 8-32 20z',             // short
  'M64 84c0-30 15-48 36-48s36 18 36 48c0 22-2 40-8 52H72c-6-12-8-30-8-52z',        // longer
  'M68 80c0-26 14-42 32-42s32 16 32 42c-4-12-14-20-32-20s-28 8-32 20zM100 18a14 14 0 1 0 0.1 0z', // hair up
];

export function SpeakerAvatar({ id, name, image, size = 120 }: { id: string; name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className="sp-avatar" style={{ width: size, height: size }}><img src={image} alt={`Cartoon portrait of ${name}`} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" /></span>;
  }
  const h = hash(id);
  const [a, b] = BACKS[h % BACKS.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const gid = `spg-${id.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <span className="sp-avatar is-placeholder" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${name} — portrait coming soon`}>
        <defs>
          <radialGradient id={gid} cx="45%" cy="38%" r="70%"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>
          <clipPath id={`${gid}-c`}><circle cx="100" cy="100" r="92" /></clipPath>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#${gid})`} />
        <g clipPath={`url(#${gid}-c)`}>
          {/* spotlight */}
          <ellipse cx="100" cy="70" rx="70" ry="52" fill="#fff" opacity=".18" />
          {/* shoulders */}
          <path d="M28 205c4-38 30-62 72-62s68 24 72 62z" fill="#17262b" />
          {/* lanyard and badge */}
          <path d="M84 146l16 34 16-34" fill="none" stroke="#0a6449" strokeWidth="6" strokeLinejoin="round" />
          <rect x="89" y="176" width="22" height="16" rx="3" fill="#c9992e" />
          {/* neck and head */}
          <path d={hair} fill="#1d2d32" />
          <rect x="88" y="112" width="24" height="36" rx="10" fill="#2a3b40" />
          <ellipse cx="69" cy="86" rx="6" ry="9" fill="#2a3b40" />
          <ellipse cx="131" cy="86" rx="6" ry="9" fill="#2a3b40" />
          <ellipse cx="100" cy="82" rx="31" ry="37" fill="#2a3b40" />
          {/* rim light */}
          <path d="M76 62c6-12 14-18 24-18" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
          {/* microphone */}
          <g transform="rotate(-18 138 150)">
            <rect x="133" y="136" width="10" height="44" rx="4" fill="#121a1c" />
            <circle cx="138" cy="130" r="13" fill="#6b7570" />
            <circle cx="138" cy="130" r="13" fill="none" stroke="#121a1c" strokeWidth="2" strokeDasharray="2 3" />
          </g>
          <path d="M120 176c6-14 12-22 20-26 6 4 9 10 8 18-8 6-17 10-28 8z" fill="#17262b" />
        </g>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#17262b" strokeWidth="7" />
      </svg>
    </span>
  );
}
