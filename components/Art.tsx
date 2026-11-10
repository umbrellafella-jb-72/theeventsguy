// The Events Guy art: Celtic marks and Dublin-port scenes, drawn in theme tokens so they follow light/dark.
import { EGArt } from '@/lib/art';

const v = (t: string) => `var(--${t})`;
const ON_SURFACE = EGArt({ ink: v('ink'), ground: v('surface'), glen: v('glen'), torc: v('torc'), poolbeg: v('poolbeg'), quay: v('quay'), block: v('slate'), white: v('surface-raised') });
const ON_RAISED = EGArt({ ink: v('ink'), ground: v('surface-raised'), glen: v('glen'), torc: v('torc'), poolbeg: v('poolbeg'), quay: v('quay'), block: v('slate'), white: v('surface-raised') });
const ON_HARBOUR = EGArt({ ink: v('on-harbour'), ground: v('harbour'), glen: v('glen'), torc: v('torc'), poolbeg: v('poolbeg'), quay: v('quay'), block: v('quay'), white: v('on-harbour') });
type Ground = 'surface' | 'raised' | 'harbour';
const set = (g?: Ground) => (g === 'harbour' ? ON_HARBOUR : g === 'raised' ? ON_RAISED : ON_SURFACE);

function Svg({ svg, className, label }: { svg: string; className?: string; label?: string }) {
  return <span className={`art${className ? ` ${className}` : ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Triskele({ size = 32, tone = 'glen', ground, ring = true }: { size?: number; tone?: string; ground?: Ground; ring?: boolean }) {
  const A = set(ground);
  return <Svg svg={A.svg(A.triskele({ ink: v(tone), ring }), ` width="${size}" height="${size}" focusable="false"`)} />;
}

export function Triquetra({ size = 40, ground }: { size?: number; ground?: Ground }) {
  const A = set(ground);
  return <Svg svg={A.svg(A.triquetra(), ` width="${size}" height="${size}" focusable="false"`)} />;
}

export function Ogham({ text, height = 16, tone = 'ink-muted', ground, className }: { text: string; height?: number; tone?: string; ground?: Ground; className?: string }) {
  const A = set(ground), art = A.ogham({ text, ink: v(tone), stroke: 2 });
  return <Svg className={className} svg={A.svg(art, ` height="${height}" width="${Math.round(height * art.w / art.h)}" focusable="false"`)} />;
}

export function Logo() {
  return <><Triskele size={30} /><span className="wordmark">The Events Guy</span></>;
}

export function KnotRule({ id = 'hawser', ground }: { id?: string; ground?: Ground }) {
  const A = set(ground), tile = A.hawser({ width: 40, period: 40, height: 20, stroke: 2.2 });
  const band = (n: string) => `<svg width="100%" height="20" focusable="false"><defs><pattern id="${n}" width="40" height="20" patternUnits="userSpaceOnUse">${tile.body}</pattern></defs><rect width="100%" height="20" fill="url(#${n})"/></svg>`;
  return (
    <div className="knot-rule" role="separator">
      <Svg className="knot-band" svg={band(`${id}-a`)} />
      <Triquetra size={40} ground={ground} />
      <Svg className="knot-band" svg={band(`${id}-b`)} />
    </div>
  );
}

export type Scene = 'skyline' | 'crane' | 'chimneys' | 'containers' | 'bridge';
export function PortScene({ scene = 'skyline', className, align = 'xMidYMax' }: { scene?: Scene; className?: string; align?: string }) {
  const art = ON_HARBOUR[scene]();
  return <Svg className={className} svg={ON_HARBOUR.svg(art, ` preserveAspectRatio="${align} meet" width="100%" height="100%" focusable="false"`)} />;
}

// The Guy on his white disc (design system: Guy ground="light"). Stays white with dark lines in both themes.
const ON_LIGHT_DISC = EGArt({ ink: v('harbour'), ground: '#fafaf7', glen: v('glen'), torc: v('torc'), poolbeg: v('poolbeg'), quay: v('quay'), block: v('harbour'), white: '#fafaf7' });
export function Guy({ size = 220, className, expression = 'smile', label = 'The Events Guy', id = 'hero-guy' }: { size?: number; className?: string; expression?: 'smile' | 'wink' | 'grin'; label?: string; id?: string }) {
  const art = ON_LIGHT_DISC.guy({ ground: '#fafaf7', ink: v('harbour'), id, expression });
  return <Svg className={className} label={label} svg={ON_LIGHT_DISC.svg(art, ` width="${size}" height="${size}" focusable="false"`)} />;
}

/** The Events Guy himself: the illustrated portrait (public/the-guy.webp), cut out so his hair breaks the circle. */
export function GuyPortrait({ size = 220, className, label = 'The Events Guy' }: { size?: number; className?: string; label?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={`art guy-portrait${className ? ` ${className}` : ''}`}><img src="/the-guy.webp" alt={label} width={size} height={size} /></span>;
}
