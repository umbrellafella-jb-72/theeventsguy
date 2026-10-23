/** Interlaced rings — The Events Guy Celtic knot motif. Each ring is drawn over a wider
 *  ground-coloured stroke so it weaves over the one before it. */
export function Knot({ rings = 3, r = 28, stroke = 3, gap = true, className }: { rings?: number; r?: number; stroke?: number; gap?: boolean; className?: string }) {
  const step = r * 1.25, pad = stroke * 3;
  const w = step * (rings - 1) + r * 2 + pad * 2, h = r * 2 + pad * 2;
  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {Array.from({ length: rings }, (_, i) => (
        <g key={i}>
          {gap && <circle className="knot-gap" cx={pad + r + i * step} cy={pad + r} r={r} strokeWidth={stroke * 3} />}
          <circle className="knot" cx={pad + r + i * step} cy={pad + r} r={r} strokeWidth={stroke} />
        </g>
      ))}
    </svg>
  );
}

export function KnotRule() {
  return <div className="knot-rule" role="separator"><Knot rings={3} r={10} stroke={2} gap={false} /></div>;
}
